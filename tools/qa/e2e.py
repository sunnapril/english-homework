"""End-to-end test copy: pages from the fix branch, real Chromium, real .gs code
(run by fake_appsscript_server.js). Faults are injected between browser and server."""
import json, pathlib, threading, functools, urllib.request, urllib.error, subprocess, time, os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

REPO = str(pathlib.Path(__file__).resolve().parents[2])
GS = 'http://127.0.0.1:8766'
SITE_PORT = 8770
SITE = f'http://127.0.0.1:{SITE_PORT}'
HERE = os.path.dirname(os.path.abspath(__file__))

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

_started = {}
def start():
    if _started: return
    _started['node'] = subprocess.Popen(['node', f'{HERE}/fake_appsscript_server.js'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(50):
        try: urllib.request.urlopen(GS + '/admin/state', timeout=1); break
        except Exception: time.sleep(0.1)
    srv = ThreadingHTTPServer(('127.0.0.1', SITE_PORT), functools.partial(Quiet, directory=REPO))
    threading.Thread(target=srv.serve_forever, daemon=True).start()

def backend_reset(gs='patched', coerce=False):
    urllib.request.urlopen(f'{GS}/admin/reset?gs={gs}&coerce={1 if coerce else 0}').read()

def state():
    return json.loads(urllib.request.urlopen(GS + '/admin/state').read())

class Faults:
    """post: 'ok' | 'abort' (network failure before Google) | 'deliver_then_abort' (Google saved it, reply lost)
       check: 'ok' | 'abort'"""
    def __init__(self): self.post = 'ok'; self.check = 'ok'; self.posts = 0; self.checks = 0

def forward(route, request, faults):
    u = request.url.split('/exec', 1)[1] if '/exec' in request.url else ''
    is_post = request.method == 'POST'
    if is_post: faults.posts += 1
    else: faults.checks += 1
    mode = faults.post if is_post else faults.check
    if mode == 'abort': return route.abort('internetdisconnected')
    req = urllib.request.Request(GS + '/exec' + u, data=(request.post_data_buffer if is_post else None),
                                 method=request.method, headers={'content-type': request.headers.get('content-type', '')})
    with urllib.request.urlopen(req, timeout=20) as r:
        body = r.read(); ctype = r.headers.get('content-type', 'text/plain')
    if mode == 'deliver_then_abort': return route.abort('connectionreset')
    route.fulfill(status=200, body=body, content_type=ctype)

def open_page(browser, path, faults):
    ctx = browser.new_context()
    ctx.route('https://script.google.com/**', lambda r, q: forward(r, q, faults))
    page = ctx.new_page(); page.on('dialog', lambda d: d.accept())
    page.goto(SITE + path); page.wait_for_timeout(300)
    return ctx, page
