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

// ---------- new words from a Google Sheet (optional) ----------
// A deck line "SHEET: <spreadsheet id> | <tab name>" adds the rows of that tab (Topic | Word | Meaning | Example | Russian | Picture).
// The sheet is read when the page opens, so new words appear without publishing the site. If it cannot be read, the built-in words still work.
const sheetLine = src.textContent.match(/^[ \t]*SHEET:[ \t]*([\w-]{20,})[ \t]*\|[ \t]*(.+?)[ \t]*$/m);
if (sheetLine && !window.__pqSheet) {
  window.__pqSheet = { status: 'loading', added: 0 };
  const csvRows = text => { const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c; }
    if (f || row.length) { row.push(f); rows.push(row); } return rows; };
  const url = `https://docs.google.com/spreadsheets/d/${sheetLine[1]}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(sheetLine[2])}`;
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 7000);
  const me = document.currentScript;
  const rerun = () => { const s2 = document.createElement('script'); s2.src = (me && me.src) || '/word-quiz/quiz.js'; document.body.appendChild(s2); };
  fetch(url, { signal: ctl.signal, credentials: 'omit' }).then(r => r.ok ? r.text() : Promise.reject(r.status)).then(text => {
    if (/^\s*</.test(text)) throw new Error('not shared');
    const groups = new Map(), synLines = []; let n = 0;
    csvRows(text).slice(1).forEach(r => {
      const c = r.map(x => String(x || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim());
      const [topic, word, meaning, example, ru, pic] = c;
      if (!word) return;
      if (/^syn$/i.test(topic)) { synLines.push('SYN: ' + word); return; }
      const wfm = String(topic || '').match(/^WF\b[\s·:|-]*(.*)$/i);
      if (wfm) { const t2 = wfm[1] || 'Word formation'; if (!groups.has(t2)) groups.set(t2, []); if (example && example.includes('___') && example.includes(' = ')) { groups.get(t2).push('WF: ' + example + ' | ' + word); n++; } return; }
      const t = topic || 'New words';
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t).push([word, meaning || word, example || '', ru || '', pic || ''].join(' | ').replace(/( \| )+$/, '')); n++;
    });
    const block = synLines.join('\n') + '\n' + [...groups].map(([t, rows]) => `## ${t}\n${rows.join('\n')}`).join('\n\n') + '\n';
    const txt = src.textContent, at = txt.search(/^##\s/m);
    src.textContent = at < 0 ? txt + '\n' + block : txt.slice(0, at) + block + '\n' + txt.slice(at);
    window.__pqSheet = { status: 'ok', added: n };
  }).catch(() => { window.__pqSheet = { status: 'failed', added: 0 }; })
    .finally(() => { clearTimeout(timer); rerun(); });
  return;
}

// ---------- parse ----------
const meta = {}, sets = [], errors = [], syn = [];
let cur = null;
src.textContent.split(/\r?\n/).forEach((raw, ln) => {
  const line = raw.trim(); let m;
  if (!line || line.startsWith('//') || /^SHEET:/.test(line)) return;
  if ((m = line.match(/^##\s+(.+)$/))) { cur = { name: m[1], items: [] }; sets.push(cur); return; }
  if ((m = line.match(/^SYN:\s*(.+)$/))) { syn.push(m[1].split(';').map(x => norm(x)).filter(Boolean)); return; }
  // word formation (OGE style): "WF: sentence with ___ = answer ; other answer | BASEWORD"
  if ((m = line.match(/^WF:\s*(.+)$/))) {
    if (!cur) { errors.push(`line ${ln + 1}: word formation before the first ## set`); return; }
    const [sent, base] = m[1].split('|').map(x => x.trim()), eq = (sent || '').lastIndexOf(' = ');
    if (eq < 0 || !base || !sent.slice(0, eq).includes('___')) { errors.push(`line ${ln + 1}: word formation needs "sentence with ___ = answer | BASEWORD"`); return; }
    const answers = sent.slice(eq + 3).split(';').map(x => x.trim()).filter(Boolean);
    (cur.wf = cur.wf || []).push({ wf: true, base: base.toUpperCase(), word: base.toUpperCase() + ' → ' + answers[0], meaning: 'word formation', example: sent.slice(0, eq).trim(), answers, ru: '', img: '', set: cur.name });
    return;
  }
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
const allWF = sets.flatMap(s => s.wf || []);
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
// words marked "I know this word": hidden in later rounds, kept in this browser only
const KKEY = 'pq-known:' + location.pathname;
let known = new Set(); try { known = new Set(JSON.parse(localStorage.getItem(KKEY) || '[]')); } catch (e) {}
const saveKnown = () => { try { localStorage.setItem(KKEY, JSON.stringify([...known])); } catch (e) {} };
const keyOf = it => it.set + '|' + it.word;
const knowLabel = k => known.has(k) ? '✓ Hidden from the next rounds · undo' : '✓ I know this word — don’t show it again';
document.addEventListener('click', e => { const b = e.target.closest('.knowbtn'); if (!b) return; const k = b.dataset.k; known.has(k) ? known.delete(k) : known.add(k); saveKnown(); b.textContent = knowLabel(k); b.classList.toggle('on', known.has(k)); });

const modes = () => [
  { id: 'choose', t: 'Meaning → word', s: 'Read the meaning. Choose the word.' },
  { id: 'gap', t: 'Fill the gap', s: 'Type the missing word or phrase.' },
  { id: 'explain', t: 'Word → explain', s: 'Say what it means and make a sentence. Then check.' },
].concat(all.filter(i => i.img).length >= 4 ? [{ id: 'picture', t: 'Picture → word', s: 'Look at the picture. Choose the word.' },
  { id: 'picturetype', t: 'Picture → type', s: /^de/i.test(meta.LANG || '') ? 'Look at the picture. Type the word (nouns with der / die / das).' : 'Look at the picture. Type the word.' }] : [])
  .concat(allWF.length >= 4 ? [{ id: 'wordform', t: 'Word formation', s: 'Change the word in CAPITALS so that it fits the sentence.' }] : []);

function home() {
  const MODES = modes();
  if (!MODES.some(m => m.id === settings.mode)) settings.mode = 'choose';
  const base = settings.mode === 'wordform' ? allWF : all;
  const inSets = base.filter(i => settings.sets.includes(i.set));
  const pool = inSets.filter(i => !known.has(keyOf(i))), hidden = inSets.length - pool.length;
  const sh = window.__pqSheet;
  app.innerHTML = `<header><h1>${esc(meta.TITLE || 'Word practice')}</h1><p>${all.length} words${allWF.length ? ` · ${allWF.length} word-formation tasks` : ''} · ${sets.length} topics${sh && sh.status === 'ok' && sh.added ? ` · ${sh.added} new from the table` : ''}</p>${sh && sh.status === 'failed' ? '<p class="muted">New words from the Google table could not be loaded (no internet or the table is not shared). The built-in words work.</p>' : ''}</header>`
    + (errors.length ? `<div class="err">Deck needs fixing:\n${esc(errors.join('\n'))}</div>` : '')
    + `<section><h2>1 · Words</h2><p>${pool.length === base.length ? `All ${base.length} ${base === allWF ? 'word-formation tasks' : 'words'}, in random order.` : `${pool.length} of ${base.length} ${base === allWF ? 'word-formation tasks' : 'words'}, in random order.`}</p>${known.size ? `<p class="muted">${hidden ? `${hidden} known ${hidden === 1 ? 'word is' : 'words are'} hidden.` : 'Known words are hidden.'} <button type="button" class="link" id="unhide">Show all ${known.size} again</button></p>` : ''}
       <details${pool.length === base.length ? '' : ' open'}><summary>Choose topics (optional)</summary><div class="row"><button type="button" class="link" id="allsets">Select all</button><button type="button" class="link" id="nosets">Clear</button></div><div class="chips">${sets.map(s => `<button type="button" class="chip${settings.sets.includes(s.name) ? ' on' : ''}" data-set="${esc(s.name)}">${esc(s.name)} <small>${base === allWF ? (s.wf || []).length : s.items.length}</small></button>`).join('')}</div>
       </details></section>
       <section><h2>2 · Mode</h2><div class="modes">${MODES.map(m => `<button type="button" class="mode${settings.mode === m.id ? ' on' : ''}" data-mode="${m.id}"><b>${m.t}</b><span>${m.s}</span></button>`).join('')}</div></section>
       <section><h2>3 · How many?</h2><div class="chips">${['5', '10', '20', 'all'].map(c => `<button type="button" class="chip${settings.count === c ? ' on' : ''}" data-count="${c}">${c === 'all' ? 'All' : c}</button>`).join('')}
       <label class="ru"><input type="checkbox" id="ru"${settings.ru ? ' checked' : ''}> Show Russian after each answer</label></div></section>
       <button type="button" class="go" id="go"${pool.length < 2 ? ' disabled' : ''}>Start ▸</button>`;
  app.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    const n = b.dataset.set; settings.sets = settings.sets.includes(n) ? settings.sets.filter(x => x !== n) : settings.sets.concat(n); save(); home(); });
  app.querySelector('#allsets').onclick = () => { settings.sets = sets.map(s => s.name); save(); home(); };
  app.querySelector('#nosets').onclick = () => { settings.sets = []; save(); home(); };
  app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { settings.mode = b.dataset.mode; save(); home(); });
  app.querySelectorAll('[data-count]').forEach(b => b.onclick = () => { settings.count = b.dataset.count; save(); home(); });
  app.querySelector('#ru').onchange = e => { settings.ru = e.target.checked; save(); };
  const unhide = app.querySelector('#unhide'); if (unhide) unhide.onclick = () => { known.clear(); saveKnown(); home(); };
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
function progress() { const r = round; return `<div class="bar"><span style="width:${100 * r.i / r.list.length}%"></span></div><div class="top"><button type="button" class="link" id="home">✕ Stop</button><span>${r.i + 1} / ${r.list.length}</span><span>✓ ${r.good}</span></div>${r.i ? '<button type="button" class="link prevbtn" id="prev">◂ Previous words</button><div id="prevbox"></div>' : ''}`; }
function after(it) {
  return afterInner(it) + `<button type="button" class="link knowbtn${known.has(keyOf(it)) ? ' on' : ''}" data-k="${esc(keyOf(it))}">${esc(knowLabel(keyOf(it)))}</button>`;
}
function afterInner(it) {
  if (it.wf) return `<div class="after"><p><b>${esc(it.base)}</b> → <b>${esc(it.answers[0])}</b></p><p class="ex">${esc(it.example).replace('___', `<u>${esc(it.answers[0])}</u>`)}</p></div>`;
  return `<div class="after"><p><b>${esc(it.word)}</b> — ${esc(it.meaning)}</p>${it.example ? `<p class="ex">${esc(it.example).replace('___', `<u>${esc(it.answers[it.answers.length > 1 ? 1 : 0])}</u>`)}</p>` : ''}${settings.ru && it.ru ? `<p class="ruline">${esc(it.ru)}</p>` : ''}</div>`;
}
function result(ok, it) { if (ok) round.good++; else if (!round.missed.includes(it)) round.missed.push(it); }
function next() { round.i++; round.i < round.list.length ? card() : finish(); }
function bindCommon() {
  app.querySelector('#home').onclick = home;
  const pb = app.querySelector('#prev');
  // look back at the last words without leaving the current card
  if (pb) pb.onclick = () => { const box = app.querySelector('#prevbox'); if (box.innerHTML) { box.innerHTML = ''; pb.textContent = '◂ Previous words'; return; }
    const prev = round.list.slice(Math.max(0, round.i - 3), round.i).reverse();
    box.innerHTML = prev.map(afterInner).join('') ; pb.textContent = '✕ Hide previous words'; };
}

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
  } else if (mode === 'wordform') {
    const parts = it.example.split('___');
    app.innerHTML = progress() + `<section class="card"><div class="wfrow"><p class="big">${esc(parts[0])}<input id="ans" autocomplete="off" spellcheck="false" aria-label="Changed word">${esc(parts.slice(1).join('___'))}</p><span class="wfbase">${esc(it.base)}</span></div>
      <div class="row"><button type="button" class="go" id="check">Check</button><button type="button" class="soft" id="letter">First letter</button></div><div id="fb"></div></section>`;
    bindCommon();
    const inp = app.querySelector('#ans'); inp.focus();
    app.querySelector('#letter').onclick = () => { inp.placeholder = it.answers[0][0] + '…'; inp.focus(); };
    let done = false;
    const check = () => {
      if (done) return; if (!inp.value.trim()) { inp.focus(); return; }
      done = true; const v = norm(inp.value), ok = it.answers.some(a => norm(a) === v); result(ok, it);
      inp.disabled = true; inp.classList.add(ok ? 'right' : 'wrong');
      app.querySelector('#fb').innerHTML = (ok ? '<p class="okmsg">✓ Correct</p>' : `<p class="nomsg">Correct answer: <b>${esc(it.answers[0])}</b></p><button type="button" class="link" id="typo">It was a typo — count it as correct</button>`)
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
