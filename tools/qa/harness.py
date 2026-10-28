"""Local integration harness: real pages from the repo, real Chromium,
mocked Apps Script endpoint. Nothing touches Google or Netlify."""
import json, hashlib, threading, sys, urllib.parse, functools
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

import pathlib
REPO = str(pathlib.Path(__file__).resolve().parents[2])
PORT = 8765
BASE = f'http://127.0.0.1:{PORT}'

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    h = functools.partial(Quiet, directory=REPO)
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def js_iso(v):
    t = str(v or '').strip()
    if not t: return ''
    try:
        d = datetime.fromisoformat(t.replace('Z', '+00:00')).astimezone(timezone.utc)
        return d.strftime('%Y-%m-%dT%H:%M:%S.') + f'{d.microsecond//1000:03d}Z'
    except Exception:
        return t

def digest(p):
    c = lambda v: str('' if v is None else v).strip()
    canon = [c(p.get(k)) for k in ('student','homework','score','percent','mistakes','answers','openAnswers')]
    canon += [js_iso(p.get('startedAt')), js_iso(p.get('finishedAt')), c(p.get('durationSeconds')), c(p.get('attemptId'))]
    return hashlib.sha256(json.dumps(canon, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()

class MockAppsScript:
    """mode: ok | post_fails | check_fails | drop_post"""
    def __init__(self, mode='ok'):
        self.mode = mode; self.rows = {}; self.posts = []; self.checks = 0
    def handle(self, route, request):
        url = request.url
        if request.method == 'POST':
            body = request.post_data or ''
            ctype = request.headers.get('content-type', '')
            if 'json' in ctype or body.startswith('{') or 'text/plain' in ctype:
                try: p = json.loads(body)
                except Exception: p = {'_raw': body}
            else:
                p = {k: v[0] for k, v in urllib.parse.parse_qs(body, keep_blank_values=True).items()}
            self.posts.append(p)
            if self.mode in ('post_fails',):
                return route.fulfill(status=500, body='<html>Google Apps Script error</html>', content_type='text/html')
            if self.mode == 'drop_post':
                return route.abort()
            aid = p.get('attemptId') or f"noid-{len(self.posts)}"
            self.rows[aid] = p
            return route.fulfill(status=200, body='<html>ok</html>', content_type='text/html')
        q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(url).query))
        if q.get('apiVersion') == 'v2-check':
            self.checks += 1
            cb = q.get('callback', 'cb')
            if self.mode == 'check_fails':
                return route.fulfill(status=500, body='', content_type='text/html')
            row = self.rows.get(q.get('attemptId'))
            if row:
                data = {'ok': True, 'received': True, 'attemptId': q['attemptId'], 'payloadDigest': digest(row), 'row': 7}
            else:
                data = {'ok': True, 'received': False}
            return route.fulfill(status=200, body=f'{cb}({json.dumps(data)})', content_type='application/javascript')
        return route.fulfill(status=200, body='ok')

def open_page(browser, path, mock):
    ctx = browser.new_context()
    ctx.route('https://script.google.com/**', mock.handle)
    page = ctx.new_page()
    page.goto(BASE + path)
    return ctx, page
