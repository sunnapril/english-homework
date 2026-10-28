/* Homework page from plain text.
 * The page contains <script type="text/plain" id="hw-content"> … </script> written in the simple format
 * described in /templates/HOMEWORK_FORMAT.md. This script builds the page (always the same look),
 * then connects the shared, confirmed sending (/assets/homework-submission.js).
 */
(() => {
'use strict';
const src = document.getElementById('hw-content');
if (!src) return;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// light formatting inside texts: **bold**
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const list = s => String(s || '').split(';').map(x => x.trim()).filter(Boolean);
const norm = s => String(s || '').trim().toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.!?]+$/, '').replace(/\s+/g, ' ');

// ---------- parse ----------
const meta = {}, sections = [], errors = [];
let cur = null;
src.textContent.split(/\r?\n/).forEach((raw, ln) => {
  const line = raw.trim();
  if (!line || line.startsWith('//') || /^(ПРОВЕРКА|ПРОВЕРКА:|CHECK:)/i.test(line)) return;  // comments and the count line from ChatGPT
  let m;
  if ((m = line.match(/^##\s+(.+)$/))) { cur = { title: m[1], type: 'gap', text: [], items: [], prompt: '' }; sections.push(cur); return; }
  if ((m = line.match(/^([A-Z]+):\s*(.*)$/))) {
    const k = m[1], v = m[2];
    if (!cur) { meta[k] = v; return; }
    if (k === 'TYPE') cur.type = v.toLowerCase();
    else if (k === 'TEXT') cur.text.push(v);
    else if (k === 'BANK') cur.bank = list(v);
    else if (k === 'AUDIO') cur.audio = v;
    else if (k === 'SCRIPT') (cur.script = cur.script || []).push(v);
    else if (k === 'IMAGE') { const [file, alt] = v.split('|').map(x => x.trim()); cur.image = { file, alt: alt || '' }; }
    else if (k === 'SUPPORT') cur.support = v;
    else if (k === 'PROMPT') cur.prompt = v;
    else errors.push(`line ${ln + 1}: unknown field ${k}`);
    return;
  }
  if (!cur) { errors.push(`line ${ln + 1}: text before the first ## section`); return; }
  if (line.startsWith('- ')) { cur.text.push(line); return; }
  if ((m = line.match(/^(\d+)[.)]\s+(.+)$/))) {
    if (cur.type === 'open') { cur.text.push(line); return; }
    const parts = m[2].split(/\s+\|\s+/);
    const head = parts.shift();
    const eq = head.lastIndexOf(' = ');
    if (eq < 0) { errors.push(`line ${ln + 1}: no answer (missing " = answer")`); return; }
    const item = { n: +m[1], sentence: head.slice(0, eq).trim(), answers: list(head.slice(eq + 3)) };
    parts.forEach(p => {
      const mm = p.match(/^(options|hint):\s*(.*)$/i);
      if (!mm) { errors.push(`line ${ln + 1}: unknown part "${p}"`); return; }
      if (mm[1].toLowerCase() === 'options') item.options = list(mm[2]); else item.hint = mm[2];
    });
    if (cur.type === 'choose') {
      if (!item.options || item.options.length < 2) errors.push(`line ${ln + 1}: choose task needs "| options: a ; b ; c"`);
      else if (!item.answers.some(a => item.options.some(o => norm(o) === norm(a)))) errors.push(`line ${ln + 1}: the answer is not one of the options`);
    }
    if (!item.answers.length) errors.push(`line ${ln + 1}: empty answer`);
    cur.items.push(item);
    return;
  }
  cur.text.push(line);
});
['STUDENT', 'HOMEWORK', 'TITLE'].forEach(k => { if (!meta[k]) errors.push(`missing ${k}:`); });
sections.forEach(s => {
  if (!['gap', 'choose', 'open', 'info'].includes(s.type)) errors.push(`section "${s.title}": unknown TYPE ${s.type}`);
  if ((s.type === 'gap' || s.type === 'choose') && !s.items.length) errors.push(`section "${s.title}": no numbered tasks`);
  s.items.forEach((it, i) => { if (it.n !== i + 1) errors.push(`section "${s.title}": task numbers jump at ${it.n}`); });
});

// ---------- render ----------
document.title = `${meta.STUDENT || ''} · ${meta.TITLE || 'Homework'}`;
const header = document.createElement('header');
header.innerHTML = `${meta.TAG ? `<span class="tag">${fmt(meta.TAG)}</span>` : ''}<h1>${fmt(meta.TITLE || '')}</h1>${meta.INTRO ? `<p class="sub">${fmt(meta.INTRO)}</p>` : ''}`;
const main = document.createElement('main');
if (errors.length) main.insertAdjacentHTML('afterbegin', `<div class="content-error">Content needs fixing before publishing:\n${esc(errors.join('\n'))}</div>`);

let sid = 0;
const textBlock = lines => {
  let h = '', ul = [];
  const flush = () => { if (ul.length) { h += `<ul>${ul.map(x => `<li>${fmt(x)}</li>`).join('')}</ul>`; ul = []; } };
  lines.forEach(l => { if (l.startsWith('- ')) ul.push(l.slice(2)); else { flush(); h += `<p>${fmt(l)}</p>`; } });
  flush(); return h ? `<div class="text">${h}</div>` : '';
};
const helpers = it => `<div class="actions">${it.hint ? '<button class="hintbtn" type="button">Hint</button>' : ''}<button class="show" type="button">Show correct answer</button></div>`
  + (it.hint ? `<div class="hint">${fmt(it.hint)}</div>` : '') + `<div class="answer"><b>Correct answer:</b> ${esc(it.answers[0])}</div><div class="feedback"></div>`;

sections.forEach(s => {
  const id = 's' + (++sid);
  const sec = document.createElement('section'); sec.id = id;
  let h = `<h2>${fmt(s.title)}</h2>`;
  if (s.items.length) h += `<p class="count">${s.items.length} ${s.items.length === 1 ? 'task' : 'tasks'}</p>`;
  h += textBlock(s.text);
  if (s.image) h += `<div class="media"><img src="${esc(s.image.file)}" alt="${esc(s.image.alt)}" loading="lazy"></div>`;
  if (s.audio) h += `<div class="media"><audio controls preload="metadata" src="${esc(s.audio)}"></audio><button class="back5" type="button">↶ Back 5 seconds</button></div>`;
  if (s.script) h += `<details class="script"><summary>Script · open after listening</summary>${s.script.map(l => `<p>${fmt(l)}</p>`).join('')}</details>`;
  if (s.bank) h += `<div class="sticky"><b>Word bank</b> <span class="sub">· tap a word after you use it</span><div class="bank">${s.bank.map(w => `<button class="chip" type="button">${esc(w)}</button>`).join('')}</div></div>`;
  s.items.forEach(it => {
    const data = esc(it.answers.join('|'));
    const field = s.type === 'choose'
      ? `<select class="inline" aria-label="Answer ${it.n}"><option value="">choose…</option>${it.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`
      : `<input class="inline" autocomplete="off" spellcheck="false" aria-label="Answer ${it.n}">`;
    const gap = it.sentence.indexOf('___');
    const sentence = gap >= 0 ? fmt(it.sentence.slice(0, gap)) + field + fmt(it.sentence.slice(gap + 3)) : `${fmt(it.sentence)} ${field}`;
    h += `<div class="q" data-answer="${data}"><div class="sentence"><b>${it.n}.</b> ${sentence}</div>${helpers(it)}</div>`;
  });
  if (s.type === 'gap' || s.type === 'choose') h += `<button class="check" type="button" data-section="${id}">Check this section</button><div class="score"></div>`;
  if (s.type === 'open') {
    if (s.support) h += `<button class="supportbtn" type="button">Useful language</button><div class="support">${fmt(s.support)}</div>`;
    const p = s.prompt || s.title.replace(/^\d+[.·)]?\s*/, '');
    h += `<textarea class="openanswer" data-prompt="${esc(p)}" aria-label="${esc(p)}" placeholder="Write your answer here."></textarea>`;
  }
  sec.innerHTML = h; main.appendChild(sec);
});
main.insertAdjacentHTML('beforeend', `<div class="submitbox"><b>Send your work to Irina</b><p>When you have finished, send your answers. Wait for <b>✓ Received by Irina</b>.</p>`
  + `<button class="send" id="send" type="button">Send answers</button> <button class="reset" id="reset" type="button">Clear saved answers</button><div id="status" aria-live="polite"></div></div>`);
src.after(header, main);

// ---------- behaviour ----------
const valueOf = q => q.querySelector('input,select')?.value || '';
document.addEventListener('click', e => {
  const t = e.target;
  if (t.classList.contains('chip')) t.classList.toggle('used');
  if (t.classList.contains('hintbtn')) t.closest('.q').querySelector('.hint').classList.toggle('open');
  if (t.classList.contains('show')) t.closest('.q').querySelector('.answer').classList.toggle('open');
  if (t.classList.contains('supportbtn')) t.nextElementSibling.classList.toggle('open');
  if (t.classList.contains('back5')) { const a = t.previousElementSibling; a.currentTime = Math.max(0, a.currentTime - 5); }
  if (t.matches('.check[data-section]')) {
    let good = 0; const qs = [...document.querySelectorAll(`#${t.dataset.section} .q[data-answer]`)];
    qs.forEach(q => {
      const v = valueOf(q), ok = !!v && q.dataset.answer.split('|').some(a => norm(a) === norm(v));
      if (ok) good++;
      q.classList.toggle('good', ok); q.classList.toggle('bad', !!v && !ok);
      q.querySelector('.feedback').textContent = ok ? '✓ Correct' : v ? 'Not quite. Open the hint, try again, or show the correct answer.' : 'Complete this item first.';
      q.querySelector('.show').classList.toggle('available', !!v && !ok);
      if (ok) q.querySelector('.answer').classList.remove('open');
    });
    t.nextElementSibling.textContent = `${good} / ${qs.length} correct`;
  }
});
document.getElementById('reset').onclick = () => {
  if (!confirm('Clear all saved answers and start again?')) return;
  document.querySelectorAll('main input,main textarea').forEach(x => x.value = '');
  document.querySelectorAll('main select').forEach(x => x.selectedIndex = 0);
  document.querySelectorAll('.chip').forEach(x => x.classList.remove('used'));
  document.querySelectorAll('.q').forEach(x => x.classList.remove('good', 'bad'));
  document.querySelectorAll('.feedback,.score').forEach(x => x.textContent = '');
  document.querySelectorAll('.hint,.answer,.support').forEach(x => x.classList.remove('open'));
  document.querySelectorAll('.show').forEach(x => x.classList.remove('available'));
  window.scrollTo(0, 0);
};
if (errors.length) { document.getElementById('send').disabled = true; return; }  // never send a broken page

// ---------- confirmed sending (shared, unchanged) ----------
window.HOMEWORK_SUBMISSION_CONFIG = {
  student: meta.STUDENT, homework: meta.HOMEWORK,
  submitButtonSelector: '#send', statusSelector: '#status', resetButtonSelector: '#reset',
  closedSelector: '.q[data-answer]', openSelector: '.openanswer', allAnswersSelector: 'main input,main select,main textarea',
  normalizeAnswer: norm
};
const shared = document.createElement('script'); shared.src = '/assets/homework-submission.js';
document.body.appendChild(shared);
})();
