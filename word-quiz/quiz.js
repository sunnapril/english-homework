/* Word practice for lessons. The page holds <script type="text/plain" id="deck"> in the format:
 *   STUDENT: Name
 *   TITLE: Page title
 *   ## Set name
 *   word | meaning | example with ___ (= other correct forms) | Russian | picture file (optional)
 * Modes: meaning → word (choose), fill the gap (type), word → explain (flashcard), picture → word (if pictures).
 * Nothing is sent anywhere; only the chosen settings are remembered on this device.
 */
(() => {
'use strict';
const src = document.getElementById('deck');
if (!src) return;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const norm = s => String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.!?,]+$/, '').replace(/\s+/g, ' ').trim();
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- parse ----------
const meta = {}, sets = [], errors = [], syn = [];
let cur = null;
src.textContent.split(/\r?\n/).forEach((raw, ln) => {
  const line = raw.trim(); let m;
  if (!line || line.startsWith('//')) return;
  if ((m = line.match(/^##\s+(.+)$/))) { cur = { name: m[1], items: [] }; sets.push(cur); return; }
  if ((m = line.match(/^SYN:\s*(.+)$/))) { syn.push(m[1].split(';').map(x => norm(x)).filter(Boolean)); return; }
  if ((m = line.match(/^([A-Z]+):\s*(.*)$/)) && !line.includes('|')) { meta[m[1]] = m[2]; return; }
  if (!cur) { errors.push(`line ${ln + 1}: word before the first ## set`); return; }
  const p = line.split('|').map(x => x.trim());
  if (p.length < 2 || !p[0] || !p[1]) { errors.push(`line ${ln + 1}: need at least "word | meaning"`); return; }
  const ex = p[2] || '', eq = ex.lastIndexOf(' = ');
  const item = { word: p[0], meaning: p[1], example: eq >= 0 ? ex.slice(0, eq).trim() : ex, ru: p[3] || '', img: p[4] || '', set: cur.name };
  const base = item.word.replace(/\s*\([^)]*\)/g, '').trim();
  item.answers = [base].concat(eq >= 0 ? ex.slice(eq + 3).split(';').map(x => x.trim()).filter(Boolean) : []);
  if (item.example && !item.example.includes('___')) errors.push(`line ${ln + 1}: the example needs ___`);
  cur.items.push(item);
});
const all = sets.flatMap(s => s.items);
// synonyms: accepted for each other when typing, never offered together as options
const baseOf = it => norm(it.answers[0]);
const synOf = it => { const b = baseOf(it); return syn.filter(g => g.includes(b)).flat(); };
const sameMeaning = (a, b) => baseOf(a) === baseOf(b) || synOf(a).includes(baseOf(b));

// ---------- layout ----------
document.title = meta.TITLE || 'Word practice';
const app = document.createElement('main'); app.className = 'pq';
src.after(app);
const KEY = 'pq-settings:' + location.pathname;
let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
const settings = Object.assign({ mode: 'choose', count: '10', ru: false, sets: sets.map(s => s.name) }, saved);
settings.sets = settings.sets.filter(n => sets.some(s => s.name === n));
if (!saved.sets) settings.sets = sets.map(s => s.name);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {} };

const modes = () => [
  { id: 'choose', t: 'Meaning → word', s: 'Read the meaning. Choose the word.' },
  { id: 'gap', t: 'Fill the gap', s: 'Type the missing word or phrase.' },
  { id: 'explain', t: 'Word → explain', s: 'Say what it means and make a sentence. Then check.' },
].concat(all.filter(i => i.img).length >= 4 ? [{ id: 'picture', t: 'Picture → word', s: 'Look at the picture. Choose the word.' },
  { id: 'picturetype', t: 'Picture → type', s: 'Look at the picture. Type the word (nouns with der / die / das).' }] : []);

function home() {
  const MODES = modes();
  if (!MODES.some(m => m.id === settings.mode)) settings.mode = 'choose';
  const pool = all.filter(i => settings.sets.includes(i.set));
  app.innerHTML = `<header><h1>${esc(meta.TITLE || 'Word practice')}</h1><p>${all.length} words · ${sets.length} topics</p></header>`
    + (errors.length ? `<div class="err">Deck needs fixing:\n${esc(errors.join('\n'))}</div>` : '')
    + `<section><h2>1 · Words</h2><p>${pool.length === all.length ? `All ${all.length} words, in random order.` : `${pool.length} of ${all.length} words, in random order.`}</p>
       <details${pool.length === all.length ? '' : ' open'}><summary>Choose topics (optional)</summary><div class="row"><button type="button" class="link" id="allsets">Select all</button><button type="button" class="link" id="nosets">Clear</button></div><div class="chips">${sets.map(s => `<button type="button" class="chip${settings.sets.includes(s.name) ? ' on' : ''}" data-set="${esc(s.name)}">${esc(s.name)} <small>${s.items.length}</small></button>`).join('')}</div>
       </details></section>
       <section><h2>2 · Mode</h2><div class="modes">${MODES.map(m => `<button type="button" class="mode${settings.mode === m.id ? ' on' : ''}" data-mode="${m.id}"><b>${m.t}</b><span>${m.s}</span></button>`).join('')}</div></section>
       <section><h2>3 · How many?</h2><div class="chips">${['10', '20', 'all'].map(c => `<button type="button" class="chip${settings.count === c ? ' on' : ''}" data-count="${c}">${c === 'all' ? 'All' : c}</button>`).join('')}
       <label class="ru"><input type="checkbox" id="ru"${settings.ru ? ' checked' : ''}> Show Russian after each answer</label></div></section>
       <button type="button" class="go" id="go"${pool.length < 2 ? ' disabled' : ''}>Start ▸</button>`;
  app.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    const n = b.dataset.set; settings.sets = settings.sets.includes(n) ? settings.sets.filter(x => x !== n) : settings.sets.concat(n); save(); home(); });
  app.querySelector('#allsets').onclick = () => { settings.sets = sets.map(s => s.name); save(); home(); };
  app.querySelector('#nosets').onclick = () => { settings.sets = []; save(); home(); };
  app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { settings.mode = b.dataset.mode; save(); home(); });
  app.querySelectorAll('[data-count]').forEach(b => b.onclick = () => { settings.count = b.dataset.count; save(); home(); });
  app.querySelector('#ru').onchange = e => { settings.ru = e.target.checked; save(); };
  app.querySelector('#go').onclick = () => {
    let list = shuffle(pool);
    if (settings.mode === 'picture' || settings.mode === 'picturetype') list = list.filter(i => i.img);
    if (settings.mode === 'gap') list = list.filter(i => i.example);
    if (settings.count !== 'all') list = list.slice(0, +settings.count);
    start(list, pool);
  };
}

// ---------- round ----------
let round;
function start(list, pool) { round = { list, pool, i: 0, good: 0, missed: [] }; card(); }
function progress() { const r = round; return `<div class="bar"><span style="width:${100 * r.i / r.list.length}%"></span></div><div class="top"><button type="button" class="link" id="home">✕ Stop</button><span>${r.i + 1} / ${r.list.length}</span><span>✓ ${r.good}</span></div>`; }
function after(it) {
  return `<div class="after"><p><b>${esc(it.word)}</b> — ${esc(it.meaning)}</p>${it.example ? `<p class="ex">${esc(it.example).replace('___', `<u>${esc(it.answers[it.answers.length > 1 ? 1 : 0])}</u>`)}</p>` : ''}${settings.ru && it.ru ? `<p class="ruline">${esc(it.ru)}</p>` : ''}</div>`;
}
function result(ok, it) { if (ok) round.good++; else if (!round.missed.includes(it)) round.missed.push(it); }
function next() { round.i++; round.i < round.list.length ? card() : finish(); }
function bindCommon() { app.querySelector('#home').onclick = home; }

function card() {
  const it = round.list[round.i], mode = settings.mode;
  if (mode === 'choose' || mode === 'picture') {
    const others = []; shuffle(round.pool).forEach(x => { if (others.length < 3 && x !== it && !sameMeaning(x, it) && !others.some(o => sameMeaning(o, x))) others.push(x); });
    const opts = shuffle([it, ...others]);
    const q = mode === 'picture' ? `<img class="pic" src="${esc(it.img)}" alt="">` : `<p class="big">${esc(it.meaning)}</p>`;
    app.innerHTML = progress() + `<section class="card">${q}<div class="opts">${opts.map((o, n) => `<button type="button" class="opt" data-n="${n}"><kbd>${n + 1}</kbd> ${esc(o.word)}</button>`).join('')}</div><div id="fb"></div></section>`;
    bindCommon();
    let done = false;
    const pick = n => {
      if (done) return; done = true;
      const ok = opts[n] === it; result(ok, it);
      app.querySelectorAll('.opt').forEach((b, k) => { b.disabled = true; if (opts[k] === it) b.classList.add('right'); else if (k === n) b.classList.add('wrong'); });
      app.querySelector('#fb').innerHTML = (ok ? '<p class="okmsg">✓ Correct</p>' : '<p class="nomsg">Not this time.</p>') + after(it) + '<button type="button" class="go" id="next">Next ▸</button>';
      app.querySelector('#next').onclick = next; app.querySelector('#next').focus();
    };
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(+b.dataset.n));
    keys = e => { if (/^[1-4]$/.test(e.key) && !done) pick(+e.key - 1); };
  } else if (mode === 'picturetype') {
    app.innerHTML = progress() + `<section class="card"><img class="pic" src="${esc(it.img)}" alt=""><p class="big center"><input id="ans" autocomplete="off" spellcheck="false" aria-label="The word"></p>
      <div class="row"><button type="button" class="go" id="check">Check</button><button type="button" class="soft" id="letter">First letter</button></div><div id="fb"></div></section>`;
    bindCommon();
    const inp = app.querySelector('#ans'); inp.focus();
    const full = it.answers[0], noun = full.replace(/^(der|die|das)\s+/i, '');
    app.querySelector('#letter').onclick = () => { inp.placeholder = (/^(der|die|das)\s/i.test(full) ? full.split(' ')[0] + ' ' : '') + noun[0] + '…'; inp.focus(); };
    let done = false;
    const check = () => {
      if (done) return; const v = norm(inp.value); if (!v) { inp.focus(); return; }
      if (v !== norm(full) && v === norm(noun) && noun !== full) { app.querySelector('#fb').innerHTML = '<p class="nomsg">Almost! Add the article: der, die or das.</p>'; inp.focus(); return; }
      done = true; const ok = v === norm(full) || synOf(it).includes(v); result(ok, it);
      inp.disabled = true; inp.classList.add(ok ? 'right' : 'wrong');
      app.querySelector('#fb').innerHTML = (ok ? '<p class="okmsg">✓ Correct</p>' : `<p class="nomsg">Correct answer: <b>${esc(full)}</b></p><button type="button" class="link" id="typo">It was a typo — count it as correct</button>`)
        + after(it) + '<button type="button" class="go" id="next">Next ▸</button>';
      const typo = app.querySelector('#typo');
      if (typo) typo.onclick = () => { round.missed = round.missed.filter(x => x !== it); round.good++; typo.remove(); };
      app.querySelector('#next').onclick = next; app.querySelector('#next').focus();
    };
    app.querySelector('#check').onclick = check;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    keys = null;
  } else if (mode === 'gap') {
    const parts = it.example.split('___');
    app.innerHTML = progress() + `<section class="card"><p class="big">${esc(parts[0])}<input id="ans" autocomplete="off" spellcheck="false" aria-label="Missing word">${esc(parts.slice(1).join('___'))}</p>
      <div class="row"><button type="button" class="go" id="check">Check</button><button type="button" class="soft" id="hint">Meaning</button><button type="button" class="soft" id="letter">First letter</button></div><div id="hintbox"></div><div id="fb"></div></section>`;
    bindCommon();
    const inp = app.querySelector('#ans'); inp.focus();
    app.querySelector('#hint').onclick = () => { app.querySelector('#hintbox').innerHTML = `<p class="muted">${esc(it.meaning)}</p>`; };
    app.querySelector('#letter').onclick = () => { inp.placeholder = (it.answers[it.answers.length > 1 ? 1 : 0])[0] + '…'; inp.focus(); };
    let done = false;
    const check = () => {
      if (done) return; if (!inp.value.trim()) { inp.focus(); return; }
      done = true; const v = norm(inp.value), ok = it.answers.some(a => norm(a) === v) || synOf(it).includes(v); result(ok, it);
      inp.disabled = true; inp.classList.add(ok ? 'right' : 'wrong');
      app.querySelector('#fb').innerHTML = (ok ? '<p class="okmsg">✓ Correct</p>' : `<p class="nomsg">Correct answer: <b>${esc(it.answers[it.answers.length > 1 ? 1 : 0])}</b></p><button type="button" class="link" id="typo">It was a typo — count it as correct</button>`)
        + after(it) + '<button type="button" class="go" id="next">Next ▸</button>';
      const typo = app.querySelector('#typo');
      if (typo) typo.onclick = () => { round.missed = round.missed.filter(x => x !== it); round.good++; typo.remove(); };
      app.querySelector('#next').onclick = next; app.querySelector('#next').focus();
    };
    app.querySelector('#check').onclick = check;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    keys = null;
  } else {  // explain
    app.innerHTML = progress() + `<section class="card"><p class="word">${esc(it.word)}</p><p class="muted">Explain it in English and make your own sentence.</p>
      <button type="button" class="go" id="show">Show the meaning</button><div id="fb"></div></section>`;
    bindCommon();
    const show = () => {
      app.querySelector('#show').remove();
      app.querySelector('#fb').innerHTML = after(it) + `<div class="row"><button type="button" class="go" id="yes">✓ Knew it</button><button type="button" class="soft" id="no">Not yet</button></div>`;
      app.querySelector('#yes').onclick = () => { result(true, it); next(); };
      app.querySelector('#no').onclick = () => { result(false, it); next(); };
    };
    app.querySelector('#show').onclick = show;
    keys = null;
  }
}
function finish() {
  const r = round;
  app.innerHTML = `<section class="card"><h2>${r.good} / ${r.list.length}</h2>`
    + (r.missed.length ? `<p>Words to practise again:</p><ul class="missed">${r.missed.map(it => `<li><b>${esc(it.word)}</b> — ${esc(it.meaning)}${settings.ru && it.ru ? ` <span class="ruline">· ${esc(it.ru)}</span>` : ''}</li>`).join('')}</ul>
       <div class="row"><button type="button" class="go" id="again">Repeat these ${r.missed.length} ▸</button><button type="button" class="soft" id="home">Back to the start</button></div>`
       : `<p class="okmsg">Every word right! 🎉</p><button type="button" class="go" id="home">Back to the start</button>`) + '</section>';
  app.querySelector('#home').onclick = home;
  const again = app.querySelector('#again'); if (again) again.onclick = () => start(shuffle(r.missed), r.pool);
}
let keys = null;
document.addEventListener('keydown', e => { if (keys) keys(e); });
// pictures that are not there yet are ignored, so a deck works before its pictures are ready
Promise.all(all.filter(i => i.img).map(i => new Promise(res => { const im = new Image(); im.onload = () => res(); im.onerror = () => { i.img = ''; res(); }; im.src = i.img; }))).then(home);
})();
