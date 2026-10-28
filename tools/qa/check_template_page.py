"""Check any homework page built with /assets/hw-template.js, on a local copy with a fake Google backend.

usage:  python3 tools/qa/check_template_page.py /homework/sergey/some-page/ [/homework/...]
needs:  tools/qa/gs/patched/Код.gs and ResultsV2.gs (current server code, kept out of git)

Checks: no content errors, every Check gives a full score with the keyed answers, hints / show answer,
answers survive reload, sending reaches the sheet with the full score and written answers,
a network failure is never shown as received, reset allows a new attempt, phone width, audio plays.
"""
import sys, time
from e2e import *

FILL = """(open)=>{document.querySelectorAll('.q[data-answer]').forEach(q=>{const f=q.querySelector('input,select');f.value=q.dataset.answer.split('|')[0];
  f.dispatchEvent(new Event(f.tagName==='SELECT'?'change':'input',{bubbles:true}))});
  document.querySelectorAll('.openanswer').forEach((t,i)=>{t.value=open+i;t.dispatchEvent(new Event('input',{bubbles:true}))})}"""
results = []
def ok(page, name, cond, detail=''):
    results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + f'[{page}] {name} ' + ('' if cond else str(detail)[:300]))
def wait(pg, sec=75):
    end = time.time() + sec
    while time.time() < end:
        s = pg.inner_text('#status')
        if s and 'Sending' not in s: return s
        pg.wait_for_timeout(250)
    return s

start()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for path in sys.argv[1:]:
        backend_reset('patched', coerce=True); fa = Faults(); ctx, pg = open_page(b, path, fa)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        err = pg.evaluate("document.querySelector('.content-error')?.textContent||''")
        ok(path, 'content has no errors', not err, err)
        n = pg.evaluate("document.querySelectorAll('.q[data-answer]').length"); nopen = pg.evaluate("document.querySelectorAll('.openanswer').length")
        print(f'      {n} closed tasks, {nopen} written answer(s); per section:', pg.evaluate("[...document.querySelectorAll('.count')].map(c=>c.textContent)"))
        pg.evaluate(FILL, 'OPEN-ANSWER-'); pg.evaluate("()=>document.querySelectorAll('.check').forEach(b=>b.click())")
        sc = pg.evaluate("[...document.querySelectorAll('.score')].map(x=>x.textContent)")
        ok(path, f'keyed answers give full score {sc}', all(s.split(' / ')[0] == s.split(' / ')[1].split()[0] for s in sc), sc)
        h = pg.evaluate("()=>{const q=document.querySelector('.q[data-answer]');if(!q)return true;const b=q.querySelector('.hintbtn');if(b){b.click();if(!q.querySelector('.hint').classList.contains('open'))return false}return true}")
        ok(path, 'hint opens', h)
        auds = pg.evaluate("""async()=>{const o=[];for(const a of document.querySelectorAll('audio')){a.muted=true;try{await a.play();await new Promise(r=>setTimeout(r,2000));o.push([a.currentSrc.split('/').pop(),+a.currentTime.toFixed(1)]);a.pause()}catch(e){o.push([a.currentSrc,String(e)])}}return o}""")
        if auds: ok(path, f'audio plays {auds}', all(isinstance(x[1], (int, float)) and x[1] > 0.5 for x in auds), auds)
        imgs = pg.evaluate("[...document.images].map(i=>[i.getAttribute('src'),i.naturalWidth])")
        if imgs: ok(path, f'images load {imgs}', all(w > 0 for _, w in imgs), imgs)
        pg.reload(); pg.wait_for_timeout(600)
        kept = pg.evaluate("[...document.querySelectorAll('.q input,.q select')].filter(f=>f.value).length")
        ok(path, f'answers kept after reload ({kept}/{n})', kept == n)
        pg.click('#send'); s = wait(pg); r = state()['v2'][1:]
        ok(path, f'send → {s[:30]} · score {r[0][3] if r else None}', 'Received' in s and r and r[0][3] == f'{n}/{n}' and (nopen == 0 or 'OPEN-ANSWER-' in r[0][7]), r[0][6][:160] if r else '')
        pg.click('#reset'); pg.wait_for_timeout(300)
        ok(path, 'reset allows a new attempt', not pg.evaluate("document.querySelector('#send').disabled"))
        fa.post = 'abort'; pg.evaluate(FILL, 'x'); pg.click('#send'); s = wait(pg)
        ok(path, 'network failure is not shown as received', 'Received' not in s, s)
        ok(path, 'no JavaScript errors', not errs, errs[:2]); ctx.close()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True); pg = ctx.new_page(); pg.goto(SITE + path); pg.wait_for_timeout(400)
        ov = pg.evaluate('document.documentElement.scrollWidth-innerWidth'); ok(path, f'phone width: no sideways scrolling ({ov})', ov <= 1); ctx.close()
    b.close()
print(f'\n{sum(results)}/{len(results)} checks passed')
sys.exit(0 if all(results) else 1)
