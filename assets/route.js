/* "Route" block for lessons: a topic as a climb from the first step to the summit.
 * Usage in any lesson page:
 *   <div class="route" data-key="sergey-past-regrets" data-goal="Talk about past regrets naturally">
 *     <ol>
 *       <li>wish + Past Perfect | I wish I had read the email.</li>
 *       <li>If only + Past Perfect | If only we hadn't ignored the warning.</li>
 *     </ol>
 *   </div>
 *   <script src="/assets/route.js"></script>
 * Each line: step title | example (example optional). Steps go bottom → top.
 * Tapping a station marks it as done; progress is remembered on that device.
 */
(() => {
'use strict';
const css = `
.route-wrap{position:relative;overflow:hidden;border-radius:22px;padding:22px 16px 120px;margin:18px 0;
 background:linear-gradient(#dfeef6 0%,#eef6f1 55%,#f6f2ea 100%);border:1px solid #d6e2dc;font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#24332f}
.route-wrap .mtn{position:absolute;left:0;right:0;bottom:0;width:100%;height:150px;pointer-events:none}
.route-goal{position:relative;z-index:2;display:flex;align-items:center;gap:10px;justify-content:center;font-weight:850;margin:0 0 14px;text-align:center}
.route-goal svg{flex:none}
.route-list{position:relative;z-index:2;list-style:none;margin:0;padding:0;display:flex;flex-direction:column-reverse;gap:14px}
.route-list::before{content:"";position:absolute;left:50%;top:6px;bottom:6px;border-left:3px dashed #c4513f;transform:translateX(-1.5px);pointer-events:none;z-index:0}
.route-step{position:relative;z-index:1;display:grid;grid-template-columns:1fr 46px 1fr;align-items:center;gap:10px}
.route-step .card{background:#fffdf9;border:1px solid #d8ded9;border-radius:14px;padding:9px 12px;box-shadow:0 3px 10px #24332f12}
.route-step .card b{display:block}
.route-step .card i{display:block;color:#5c6b66;font-size:.9rem;margin-top:2px}
.route-step:nth-child(odd) .card{grid-column:1;text-align:right}
.route-step:nth-child(even) .card{grid-column:3}
.route-step .stop{grid-column:2;grid-row:1;width:46px;height:46px;border-radius:50%;border:4px solid #c4513f;background:#fff;color:#c4513f;font:800 1rem system-ui;cursor:pointer;display:grid;place-items:center;padding:0}
.route-step.done .stop{background:#2f7866;border-color:#2f7866;color:#fff}
.route-step.current .stop{box-shadow:0 0 0 6px #c4513f33}
.route-step.current .card{border-color:#c4513f}
.route-progress{position:relative;z-index:2;text-align:center;margin-top:14px;font-weight:800;color:#2f4a43}
.route-reset{position:relative;z-index:2;display:block;margin:8px auto 0;border:1px solid #b8c8c0;background:#fff;border-radius:9px;padding:5px 10px;font:600 .85rem system-ui;cursor:pointer;color:#45534e}
@media(max-width:640px){.route-list::before{left:23px}.route-step{grid-template-columns:46px 1fr}.route-step .stop{grid-column:1}
 .route-step:nth-child(odd) .card,.route-step:nth-child(even) .card{grid-column:2;text-align:left}}`;
if (!document.getElementById('route-css')) { const st = document.createElement('style'); st.id = 'route-css'; st.textContent = css; document.head.appendChild(st); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mountain = '<svg class="mtn" viewBox="0 0 800 150" preserveAspectRatio="none" aria-hidden="true">'
 + '<path d="M0 150 L120 70 L190 105 L330 20 L420 80 L520 35 L640 100 L720 60 L800 95 L800 150 Z" fill="#9fb8c4"/>'
 + '<path d="M0 150 L90 105 L210 125 L330 60 L450 118 L560 75 L700 128 L800 110 L800 150 Z" fill="#6f8f9d"/>'
 + '<path d="M300 38 L330 20 L360 40 L345 46 L330 38 L315 47 Z M498 48 L520 35 L545 52 L528 55 L520 49 L508 56 Z" fill="#fff" opacity=".9"/></svg>';
const flag = '<svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true"><rect x="3" y="2" width="3" height="27" rx="1.5" fill="#24332f"/><path d="M6 3 L23 8 L6 14 Z" fill="#c4513f"/></svg>';
document.querySelectorAll('.route').forEach((box, bi) => {
  const items = [...box.querySelectorAll('li')].map(li => { const [t, ex] = li.textContent.split('|').map(x => x.trim()); return { t, ex }; });
  if (!items.length) return;
  const key = 'route:' + (box.dataset.key || location.pathname + ':' + bi);
  let done = [];
  try { done = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
  box.innerHTML = `<div class="route-wrap">${mountain}<p class="route-goal">${flag}<span>${esc(box.dataset.goal || 'Goal')}</span></p>`
    + `<ol class="route-list">${items.map((it, i) => `<li class="route-step"><div class="card"><b>${esc(it.t)}</b>${it.ex ? `<i>${esc(it.ex)}</i>` : ''}</div>`
    + `<button class="stop" type="button" aria-label="Step ${i + 1}: mark as done">${i + 1}</button></li>`).join('')}</ol>`
    + `<div class="route-progress"></div><button class="route-reset" type="button">Start the route again</button></div>`;
  const steps = [...box.querySelectorAll('.route-step')];
  const paint = () => {
    const first = steps.findIndex((_, i) => !done.includes(i));
    steps.forEach((s, i) => { s.classList.toggle('done', done.includes(i)); s.classList.toggle('current', i === first); s.querySelector('.stop').textContent = done.includes(i) ? '✓' : i + 1; });
    box.querySelector('.route-progress').textContent = first < 0 ? '🏁 Summit reached!' : `${done.length} of ${steps.length} steps done`;
    try { localStorage.setItem(key, JSON.stringify(done)); } catch (e) {}
  };
  steps.forEach((s, i) => s.querySelector('.stop').addEventListener('click', () => { done = done.includes(i) ? done.filter(x => x !== i) : [...done, i]; paint(); }));
  box.querySelector('.route-reset').addEventListener('click', () => { done = []; paint(); });
  paint();
});
})();
