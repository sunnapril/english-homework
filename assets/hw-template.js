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
const fmt = s => esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
const list = s => String(s || '').split(';').map(x => x.trim()).filter(Boolean);
const norm = s => { const r = String(s || '').trim().toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
  // LANG: de → ä/ae, ö/oe, ü/ue, ß/ss count as the same (students without a German keyboard)
  return /^de$/i.test(meta.LANG || '') ? r.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss') : r; };

// ---------- parse ----------
const meta = {}, sections = [], errors = [];
let cur = null;
src.textContent.split(/\r?\n/).forEach((raw, ln) => {
  const line = raw.trim();
  if (!line || line.startsWith('//') || /^(ПРОВЕРКА|ПРОВЕРКА:|CHECK:)/i.test(line)) return;  // comments and the count line from ChatGPT
  let m;
  if ((m = line.match(/^##\s+(.+)$/))) { cur = { title: m[1], type: 'gap', text: [], items: [], prompt: '', flow: [], grouped: false }; sections.push(cur); return; }
  // ### Title inside a section = a framed group (e.g. one short dialogue); plain lines after it stay inside the frame
  if ((m = line.match(/^###\s+(.+)$/)) && cur) { cur.grouped = true; cur.flow.push({ group: m[1] }); return; }
  if (cur && cur.grouped && /^[A-Z]{1,2}:\s/.test(line)) { cur.flow.push({ line }); return; }
  if ((m = line.match(/^([A-Z]+):\s*(.*)$/))) {
    const k = m[1], v = m[2];
    if (!cur) { meta[k] = v; return; }
    if (k === 'TYPE') cur.type = v.toLowerCase();
    else if (k === 'TEXT') cur.text.push(v);
    else if (k === 'BANK') cur.bank = list(v);
    else if (k === 'AUDIO') cur.audio = v;
    else if (k === 'VIDEO') { const [url, label, mode] = v.split('|').map(x => x.trim()); cur.video = { url, label: label || 'Watch the video', embed: /^embed$/i.test(mode || '') }; }
    else if (k === 'SCRIPT') (cur.script = cur.script || []).push(v);
    else if (k === 'IMAGE') { const [file, alt] = v.split('|').map(x => x.trim()); cur.image = { file, alt: alt || '' }; cur.text.push('\u0000IMG'); }
    else if (k === 'SUPPORT') cur.support = v;
    else if (k === 'PROMPT') cur.prompt = v;
    else if (k === 'COLUMNS') cur.columns = +v || 1;
    else if (k === 'VOCAB') { const [w, d, ru] = v.split('|').map(x => x.trim()); if (!w || !d) errors.push(`line ${ln + 1}: VOCAB needs "word | meaning"`); else (cur.vocab = cur.vocab || []).push({ w, d, ru }); }
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
    if (cur.type === 'fix' && item.answers.some(a => norm(a) === norm(item.sentence))) errors.push(`line ${ln + 1}: the correct sentence is the same as the sentence with the mistake`);
    cur.items.push(item); cur.flow.push({ item });
    return;
  }
  if (cur.grouped) cur.flow.push({ line }); else cur.text.push(line);
});
['STUDENT', 'HOMEWORK', 'TITLE'].forEach(k => { if (!meta[k]) errors.push(`missing ${k}:`); });
sections.forEach(s => {
  if (!['gap', 'choose', 'fix', 'order', 'open', 'info', 'article', 'lotto', 'chain'].includes(s.type)) errors.push(`section "${s.title}": unknown TYPE ${s.type}`);
  if (['gap', 'choose', 'fix', 'order', 'lotto', 'chain'].includes(s.type) && !s.items.length) errors.push(`section "${s.title}": no numbered tasks`);
  // TYPE order: the answers must be the positions 1…N, each used once
  if (s.type === 'order') { const pos = s.items.map(it => +it.answers[0]).sort((a, b) => a - b); if (pos.some((p, i) => p !== i + 1)) errors.push(`section "${s.title}": order answers must be 1–${s.items.length}, each once`); }
  s.items.forEach((it, i) => { if (it.n !== i + 1) errors.push(`section "${s.title}": task numbers jump at ${it.n}`); });
  // TYPE lotto: the answer is the list of numbers (1–49) to cross out
  if (s.type === 'lotto') s.items.forEach(it => { const ns = it.answers[0].split(',').map(x => +x.trim()); if (ns.some(n => !(n >= 1 && n <= 49))) errors.push(`section "${s.title}": lotto answer must be numbers 1–49 separated by commas`); else it.answers = [ns.sort((a, b) => a - b).join(', ')]; });
  // TYPE chain: every answer word must be in the chain
  if (s.type === 'chain') s.items.forEach(it => { const ch = it.sentence.replace(/[\[\]|\s]/g, '').toLowerCase(); it.answers[0].split(',').map(w => w.trim().toLowerCase()).forEach(w => { if (!ch.includes(w)) errors.push(`section "${s.title}": "${w}" is not in the word chain`); }); });
});

// Word bank: never shown in the order of the answers. Shuffled with a fixed seed (same order on every visit),
// re-shuffled until the answer words do not appear in task order.
const bankOrderMatches = (bank, items) => {
  const pos = items.map(it => bank.findIndex(w => it.answers.some(a => norm(a) === norm(w)))).filter(i => i >= 0);
  return pos.length > 1 && pos.every((p, i) => i === 0 || p > pos[i - 1]);
};
sections.forEach((s, si) => {
  if (!s.bank || s.bank.length < 3) return;
  let seed = 0; for (const ch of (meta.HOMEWORK || '') + '|' + s.title + '|' + si) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  for (let tries = 0; tries < 50; tries++) {
    const b = s.bank.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    s.bank = b;
    if (!bankOrderMatches(b, s.items)) break;
  }
});

// ---------- render ----------
// UI: ru → Russian buttons and messages (beginners' pages; task content stays in the target language). English is the default.
// LANG: de → German answers: ä/ae, ö/oe, ü/ue, ß/ss count as the same.
const L = /^ru$/i.test(meta.UI || '') ? 'ru' : 'en';
const UI = {
  ru: { 'Hint': 'Подсказка', 'Show correct answer': 'Показать ответ', 'Correct answer:': 'Правильный ответ:',
    'New vocabulary': 'Новые слова', 'words': 'слов', 'Script · open after listening': 'Текст аудио · откройте после прослушивания', 'Word bank': 'Слова', '· tap a word after you use it': '· нажмите на слово, когда используете его',
    '↶ Back 5 seconds': '↶ Назад на 5 секунд', 'choose…': 'выберите…', 'Check this section': 'Проверить задание', 'Useful language': 'Подсказки', 'Write your answer here.': 'Напишите ответ здесь.',
    'Tap the events in order: first, second, third… Tap a numbered event again to remove its number.': 'Нажимайте по порядку: первое, второе… Нажмите ещё раз, чтобы убрать номер.',
    '✓ Correct': '✓ Верно', 'Not quite. Open the hint, try again, or show the correct answer.': 'Пока неверно. Откройте подсказку и попробуйте ещё раз или посмотрите ответ.', 'Complete this item first.': 'Сначала выполните этот пункт.', 'correct': 'верно',
    'Clear all saved answers and start again?': 'Удалить все сохранённые ответы и начать заново?',
    'Send your work to Irina': 'Отправить ДЗ Ирине', 'When you have finished, send your answers. Wait for': 'Когда закончите, отправьте ответы и дождитесь надписи', 'Send answers': 'Отправить ответы', 'Clear saved answers': 'Очистить ответы', 'Next:': 'Дальше:',
    'Tap a word in the text to highlight it, like with a marker. Tap again to remove.': 'Нажмите на слово, чтобы выделить его маркером. Нажмите ещё раз — выделение исчезнет.',
    'crossed out': 'зачёркнуто', 'Tap letters to mark each word. Tap again to remove.': 'Нажимайте на буквы, чтобы выделить каждое слово. Повторное нажатие снимает выделение.', 'words marked': 'слов выделено' },
  // messages of the shared sender (display only; the sending itself is unchanged)
  ruStatus: { '✓ Received by Irina': '✓ Ирина получила ответы', '✓ Received by Irina. Start again for a new attempt.': '✓ Ирина получила ответы.', 'Received': 'Получено', 'Retry': 'Отправить ещё раз', 'Send answers': 'Отправить ответы', 'Sending…': 'Отправляется…',
    'Not confirmed. Your answers are stored on this device. Click Retry.': 'Получение не подтверждено. Ответы сохранены на этом устройстве. Нажмите «Отправить ещё раз».',
    'You are offline. Your answers are saved. Click Retry when online.': 'Нет интернета. Ответы сохранены — отправьте, когда появится связь.',
    'A submission was previously confirmed.': '✓ Ирина уже получила ответы.', 'An earlier submission is pending. Click Send answers to retry it.': 'Отправка не подтверждена. Нажмите «Отправить ответы» ещё раз.' }
};
const T = k => (L === 'ru' && UI.ru[k]) || k;
const countLabel = n => L === 'ru' ? `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'пункт' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'пункта' : 'пунктов'}` : `${n} ${n === 1 ? 'task' : 'tasks'}`;
// STUDENT: ask → a universal page: the student types their name before sending
const askName = /^ask$/i.test(meta.STUDENT || '');
document.title = askName ? (meta.TITLE || 'Homework') : `${meta.STUDENT || ''} · ${meta.TITLE || 'Homework'}`;
// THEME: magazine → serif "print magazine" look; ISSUE: masthead line; KICKER: the question under the headline
const theme = String(meta.THEME || '').toLowerCase().replace(/[^a-z-]/g, '');
if (theme) {
  document.body.classList.add('theme-' + theme);
  if (theme === 'magazine') document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,600;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">');
}
const issue = meta.ISSUE ? meta.ISSUE.split('|').map(x => x.trim()).filter(Boolean) : [];
const header = document.createElement('header');
header.innerHTML = (issue.length ? `<div class="masthead">${issue.map(x => `<span>${esc(x)}</span>`).join('<i></i>')}</div>` : '') + `${meta.TAG ? `<span class="tag">${fmt(meta.TAG)}</span>` : ''}<h1>${fmt(meta.TITLE || '')}</h1>${meta.KICKER ? `<p class="kicker">${fmt(meta.KICKER)}</p>` : ''}${meta.INTRO ? `<p class="sub">${fmt(meta.INTRO)}</p>` : ''}`;
const main = document.createElement('main');
if (errors.length) main.insertAdjacentHTML('afterbegin', `<div class="content-error">Content needs fixing before publishing:\n${esc(errors.join('\n'))}</div>`);

let sid = 0;
const textBlock = (lines, img) => {
  let h = '', ul = [];
  const flush = () => { if (ul.length) { h += `<ul>${ul.map(x => `<li>${fmt(x)}</li>`).join('')}</ul>`; ul = []; } };
  lines.forEach(l => { if (l === '\u0000IMG') { flush(); h += img ? `</div><div class="media"><img src="${esc(img.file)}" alt="${esc(img.alt)}" loading="lazy"></div><div class="text">` : ''; } else if (l.startsWith('- ')) ul.push(l.slice(2)); else { flush(); h += `<p>${fmt(l)}</p>`; } });
  flush(); return h ? `<div class="text">${h}</div>`.replace(/<div class="text"><\/div>/g, '') : '';
};
const helpers = it => `<div class="actions">${it.hint ? `<button class="hintbtn" type="button">${T('Hint')}</button>` : ''}<button class="show" type="button">${T('Show correct answer')}</button></div>`
  + (it.hint ? `<div class="hint">${fmt(it.hint)}</div>` : '') + `<div class="answer"><b>${T('Correct answer:')}</b> ${esc(it.answers[0])}</div><div class="feedback"></div>`;

sections.forEach(s => {
  const id = 's' + (++sid);
  const sec = document.createElement('section'); sec.id = id; if (s.type === 'article') sec.className = 'article';
  let h = `<h2>${fmt(s.title)}</h2>`;
  if (s.items.length && s.type !== 'lotto' && s.type !== 'chain') h += `<p class="count">${countLabel(s.items.length)}</p>`;
  h += textBlock(s.text, s.image);
  if (s.vocab && theme === 'magazine') h += `<div class="vocab"><h3>${T('New vocabulary')}</h3><dl>${s.vocab.map(v => `<div><dt>${fmt(v.w)}</dt><dd>${fmt(v.d)}</dd></div>`).join('')}</dl></div>`;
  else if (s.vocab) h += `<details class="vocab vocab-fold"><summary>${T('New vocabulary')} · ${s.vocab.length} ${T('words')}</summary><dl>${s.vocab.map(v => `<div><dt>${fmt(v.w)}</dt><dd>${fmt(v.d)}${v.ru ? `<span class="ru">${fmt(v.ru)}</span>` : ''}</dd></div>`).join('')}</dl></details>`;
  const ytId = s.video && s.video.embed ? ((s.video.url.match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/) || [])[1]) : null;
  if (ytId) h += `<div class="media video embed"><div class="frame"><iframe src="https://www.youtube-nocookie.com/embed/${ytId}?rel=0&playsinline=1" title="${esc(s.video.label)}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div><p class="sub">If the video does not play, turn on your VPN or <a href="${esc(s.video.url)}" target="_blank" rel="noopener">open it on YouTube</a>.</p></div>`;
  else if (s.video) h += `<div class="media video"><a class="videobtn" href="${esc(s.video.url)}" target="_blank" rel="noopener">▶ ${esc(s.video.label)}</a><p class="sub">The video opens on YouTube in a new tab. Then come back to this page. If YouTube does not open, turn on your VPN.</p></div>`;
  if (s.audio) h += `<div class="media"><audio controls preload="metadata" src="${esc(s.audio)}"></audio><button class="back5" type="button">${T('↶ Back 5 seconds')}</button></div>`;
  if (s.script) h += `<details class="script"><summary>${T('Script · open after listening')}</summary>${s.script.map(l => `<p>${fmt(l)}</p>`).join('')}</details>`;
  if (s.bank) h += `<div class="sticky"><b>${T('Word bank')}</b> <span class="sub">${T('· tap a word after you use it')}</span><div class="bank">${s.bank.map(w => `<button class="chip" type="button">${esc(w)}</button>`).join('')}</div></div>`;
  const itemHtml = it => {
    const data = esc(it.answers.join('|'));
    // "___ (b…)" → the first letter is shown inside the gap as grey placeholder text
    let sent = it.sentence, ph = '';
    const pm = sent.match(/___\s*\(([^()]{1,4}…)\)/);
    if (pm && s.type !== 'choose') { ph = pm[1]; sent = sent.replace(pm[0], '___'); }
    // TYPE order: the student taps the events in the order they happen; the cards line up in that order
    if (s.type === 'order') return `<div class="q order" data-answer="${data}"><button type="button" class="ordcard"><span class="ordn" aria-hidden="true"></span><span class="ordtext">${fmt(it.sentence.replace(/^_{3,}\s*/, ''))}</span></button><input type="hidden" class="ordval">${helpers(it)}</div>`;
    // TYPE lotto: a lottery ticket 1–49; the student crosses out numbers (as many as the answer has)
    if (s.type === 'lotto') { const max = it.answers[0].split(',').length; let g = ''; for (let n = 1; n <= 49; n++) g += `<button type="button" class="tkn" data-n="${n}">${n}</button>`;
      return `<div class="q lotto" data-answer="${data}" data-max="${max}"><div class="ticket"><div class="tkhead"><span>${fmt(it.sentence.replace(/_{3,}/, '').trim() || 'Lotto 6 aus 49')}</span><span class="tkcount">0 / ${max}</span></div><div class="tkgrid">${g}</div></div><input type="hidden" class="lotval">${helpers(it)}</div>`; }
    // TYPE chain: a word chain; the student taps letters to mark the words. [word] = example, already marked
    if (s.type === 'chain') { let k = 0; const letters = it.sentence.replace(/\s+/g, '').replace(/\[([^\]]+)\]|([^\[\]|])/g, (m0, ex, ch) => ex ? [...ex].map(c => `<span class="cl ex">${esc(c)}</span>`).join('') : `<button type="button" class="cl" data-i="${k++}">${esc(ch)}</button>`).replace(/\|/g, '');
      return `<div class="q chain" data-answer="${data}"><p class="sub chaintip">${T('Tap letters to mark each word. Tap again to remove.')}</p><div class="chainrow">${letters}</div><p class="sub chaincount"></p><input type="hidden" class="chainval">${helpers(it)}</div>`; }
    if (s.type === 'fix') return `<div class="q fix" data-answer="${data}"><div class="sentence"><b>${it.n}.</b> <span class="fixbox" contenteditable="true" spellcheck="false" role="textbox" aria-label="Correct sentence ${it.n}" data-orig="${esc(it.sentence)}">${esc(it.sentence)}</span><input type="hidden" class="fixval"></div>${helpers(it)}</div>`;
    const field = s.type === 'choose'
      ? `<select class="inline" aria-label="Answer ${it.n}"><option value="">${T('choose…')}</option>${it.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`
      : `<input class="inline${sent.trim() === '___' ? ' wide' : ''}" autocomplete="off" spellcheck="false" aria-label="Answer ${it.n}"${ph ? ` placeholder="${esc(ph)}"` : ''}>`;
    const gap = sent.indexOf('___');
    const sentence = gap >= 0 ? fmt(sent.slice(0, gap)) + field + fmt(sent.slice(gap + 3)) : `${fmt(sent)} ${field}`;
    return `<div class="q" data-answer="${data}"><div class="sentence"><b>${it.n}.</b> ${s.grouped ? sentence.replace(/^([A-Z]{1,2}):/, '<b>$1:</b>') : sentence}</div>${helpers(it)}</div>`;
  };
  if (s.grouped) {
    let open = false;
    s.flow.forEach(f => {
      if (f.group) { h += (open ? '</div>' : '') + `<div class="group"><h3>${fmt(f.group)}</h3>`; open = true; }
      else if (f.line) h += `<p class="gline">${fmt(f.line).replace(/^([A-Z]{1,2}):/, '<b>$1:</b>')}</p>`;
      else h += itemHtml(f.item);
    });
    if (open) h += '</div>';
  } else if (s.type === 'order') h += `<p class="sub ordtip">${T('Tap the events in order: first, second, third… Tap a numbered event again to remove its number.')}</p><div class="orderlist">${s.items.map(itemHtml).join('')}</div>`;
  else if (s.columns === 2) h += `<div class="cols2">${s.items.map(itemHtml).join('')}</div>`;
  else s.items.forEach(it => { h += itemHtml(it); });
  if (['gap', 'choose', 'fix', 'order', 'lotto', 'chain'].includes(s.type)) h += `<button class="check" type="button" data-section="${id}">${T('Check this section')}</button><div class="score"></div>`;
  if (s.type === 'open') {
    if (s.support) h += `<button class="supportbtn" type="button">${T('Useful language')}</button><div class="support">${fmt(s.support)}</div>`;
    const p = s.prompt || s.title.replace(/^\d+[.·)]?\s*/, '');
    // the question must be visible: if no TEXT line asks it, show PROMPT above the box
    if (s.prompt && !s.text.some(l => l.includes('?'))) h += `<p class="openq"><b>${fmt(s.prompt)}</b></p>`;
    h += `<textarea class="openanswer" data-prompt="${esc(p)}" aria-label="${esc(p)}" placeholder="${T('Write your answer here.')}"></textarea>`;
  }
  sec.innerHTML = h; main.appendChild(sec);
});
// SEND: no → lesson page: no sending box, nothing goes to the results table
const noSend = /^no$/i.test(meta.SEND || '');
if (!noSend) main.insertAdjacentHTML('beforeend', `<div class="submitbox"><b>${T('Send your work to Irina')}</b><p>${T('When you have finished, send your answers. Wait for')} <b>${L === 'ru' ? UI.ruStatus['✓ Received by Irina'] : '✓ Received by Irina'}</b>.</p>`
  + (askName ? `<label class="namebox">Your name <input id="studentName" class="student-name" autocomplete="name" placeholder="First name and surname"></label>` : '')
  + `<button class="send" id="send" type="button">${T('Send answers')}</button> <button class="reset" id="reset" type="button">${T('Clear saved answers')}</button><div id="status" aria-live="polite"></div></div>`);
src.after(header, main);
// LAYOUT: slides → lesson look: tabs at the top, one section at a time, "Next" at the bottom of each section
if (/^slides$/i.test(meta.LAYOUT || '')) {
  document.body.classList.add('layout-slides');
  const secs = [...main.querySelectorAll(':scope > section')];
  const nav = document.createElement('nav'); nav.className = 'slidetabs';
  nav.innerHTML = secs.map((sec, i) => { const t = sec.querySelector('h2').textContent.replace(/^\s*\d+\s*[.·)]\s*/, ''); return `<button type="button" class="stab" data-i="${i}"><span class="n">${i + 1}</span>${esc(t)}</button>`; }).join('');
  main.before(nav);
  secs.forEach((sec, i) => { if (i < secs.length - 1) sec.insertAdjacentHTML('beforeend', `<button type="button" class="nextslide" data-i="${i + 1}">${T('Next:')} ${esc(secs[i + 1].querySelector('h2').textContent)} →</button>`); });
  const show = i => { secs.forEach((x, j) => x.hidden = j !== i); nav.querySelectorAll('.stab').forEach((b, j) => b.classList.toggle('active', j === i)); const sb = main.querySelector('.submitbox'); if (sb) sb.hidden = i !== secs.length - 1; };
  nav.addEventListener('click', e => { const b = e.target.closest('.stab'); if (b) { show(+b.dataset.i); window.scrollTo(0, 0); } });
  main.addEventListener('click', e => { const b = e.target.closest('.nextslide'); if (b) { show(+b.dataset.i); window.scrollTo(0, 0); } });
  show(0);
}
// TYPE article: every word can be tapped to highlight it (like a marker); tap again to remove
document.querySelectorAll('section.article .text').forEach(box => {
  box.insertAdjacentHTML('beforebegin', `<p class="sub hltip">${T('Tap a word in the text to highlight it, like with a marker. Tap again to remove.')}</p>`);
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => {
    if (!/[A-Za-z]/.test(n.nodeValue)) return;
    const span = document.createElement('span');
    span.innerHTML = esc(n.nodeValue).replace(/(?<![&\p{L}])\p{L}[\p{L}'’-]*/gu, w => `<span class="hl">${w}</span>`);
    n.replaceWith(...span.childNodes);
  });
});

// ---------- behaviour ----------
const nameKey = 'hw-name:' + (meta.HOMEWORK || '');
const valueOf = q => q.querySelector('input,select')?.value || '';
// TYPE fix: the student edits the sentence itself; the hidden field keeps the edited sentence (empty while unchanged)
const fixText = b => b.textContent.replace(/\s+/g, ' ').trim();
document.addEventListener('input', e => { const b = e.target.closest && e.target.closest('.fixbox'); if (!b) return; const t = fixText(b); b.nextElementSibling.value = norm(t) === norm(b.dataset.orig) ? '' : t; b.classList.toggle('edited', !!b.nextElementSibling.value); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest && e.target.closest('.fixbox')) e.preventDefault(); });
document.addEventListener('paste', e => { const b = e.target.closest && e.target.closest('.fixbox'); if (!b) return; e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s+/g, ' ')); });
// TYPE lotto / chain: the hidden field keeps the answer text; the ticket / letters are redrawn from it
const syncLotto = () => document.querySelectorAll('.q.lotto').forEach(q => {
  const set = new Set((q.querySelector('.lotval').value || '').split(',').map(x => +x.trim()).filter(Boolean));
  q.querySelectorAll('.tkn').forEach(b => b.classList.toggle('x', set.has(+b.dataset.n)));
  q.querySelector('.tkcount').textContent = `✗ ${set.size} / ${q.dataset.max}`;
});
const chainWords = q => { const out = []; let w = ''; q.querySelectorAll('.cl').forEach(c => { if (c.classList.contains('on')) w += c.textContent; else { if (w) out.push(w); w = ''; } }); if (w) out.push(w); return out; };
const syncChain = () => document.querySelectorAll('.q.chain').forEach(q => {
  const saved = q.querySelector('.chainval').value;
  if (q.dataset.restored !== '1' && saved) {  // restore marks from the saved words (in chain order)
    const btns = [...q.querySelectorAll('button.cl')], txt = btns.map(b => b.textContent).join('').toLowerCase(); let from = 0;
    saved.split(',').map(x => x.trim().toLowerCase()).filter(Boolean).forEach(w => { const at = txt.indexOf(w, from); if (at >= 0) { for (let i = at; i < at + w.length; i++) btns[i].classList.add('on'); from = at + w.length; } });
  }
  if (!saved) q.querySelectorAll('.cl.on').forEach(c => c.classList.remove('on'));
  q.dataset.restored = '1';
  // every marked word gets its own colour (c0…c7, in chain order)
  let run = -1, prev = false; q.querySelectorAll('.cl').forEach(c => { for (let i = 0; i < 8; i++) c.classList.remove('c' + i); const on = c.classList.contains('on'); if (on && !prev) run++; if (on) c.classList.add('c' + (run % 8)); prev = on; });
  const n = chainWords(q).length; q.querySelector('.chaincount').textContent = n ? `${n} ${T('words marked')}` : '';
});
// TYPE order: the hidden field keeps the number; cards are reordered only visually (CSS order),
// so the order of the answers sent to the table never changes
const syncOrder = () => document.querySelectorAll('.orderlist').forEach(list => {
  const qs = [...list.querySelectorAll('.q.order')];
  qs.forEach((q, i) => { const v = +q.querySelector('.ordval').value || 0; q.style.order = v ? v : 100 + i; q.querySelector('.ordn').textContent = v || ''; q.classList.toggle('picked', !!v); });
});
const syncFix = () => document.querySelectorAll('.fixbox').forEach(b => { const v = b.nextElementSibling.value; b.textContent = v || b.dataset.orig; b.classList.toggle('edited', !!v); });
document.addEventListener('click', e => {
  const t = e.target;
  const card = t.closest && t.closest('.ordcard');
  if (card) {
    const q = card.closest('.q'), inp = q.querySelector('.ordval'), others = [...q.parentElement.querySelectorAll('.ordval')];
    const v = +inp.value || 0;
    if (v) { inp.value = ''; others.forEach(o => { if (+o.value > v) o.value = +o.value - 1; }); }
    else inp.value = Math.max(0, ...others.map(o => +o.value || 0)) + 1;
    q.parentElement.querySelectorAll('.q').forEach(x => { x.classList.remove('good', 'bad'); x.querySelector('.feedback').textContent = ''; });
    syncOrder(); inp.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  if (t.classList.contains('tkn')) {
    const q = t.closest('.q'), inp = q.querySelector('.lotval'), set = new Set((inp.value || '').split(',').map(x => +x.trim()).filter(Boolean)), n = +t.dataset.n;
    if (set.has(n)) set.delete(n); else if (set.size < +q.dataset.max) set.add(n); else return;
    inp.value = [...set].sort((a, b) => a - b).join(', ');
    q.classList.remove('good', 'bad'); q.querySelectorAll('.tkn').forEach(b => b.classList.remove('hit', 'miss')); q.querySelector('.feedback').textContent = '';
    syncLotto(); inp.dispatchEvent(new Event('input', { bubbles: true })); return;
  }
  if (t.matches('button.cl')) {
    const q = t.closest('.q'), inp = q.querySelector('.chainval');
    t.classList.toggle('on'); inp.value = chainWords(q).join(', ');
    q.classList.remove('good', 'bad'); q.querySelector('.feedback').textContent = '';
    syncChain(); inp.dispatchEvent(new Event('input', { bubbles: true })); return;
  }
  if (t.classList.contains('hl')) t.classList.toggle('on');
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
      q.querySelector('.feedback').textContent = T(ok ? '✓ Correct' : v ? 'Not quite. Open the hint, try again, or show the correct answer.' : 'Complete this item first.');
      q.querySelector('.show').classList.toggle('available', !!v && !ok);
      if (ok) q.querySelector('.answer').classList.remove('open');
      if (q.classList.contains('lotto')) { const right = new Set(q.dataset.answer.split('|')[0].split(',').map(x => +x)); q.querySelectorAll('.tkn.x').forEach(b => { b.classList.toggle('hit', right.has(+b.dataset.n)); b.classList.toggle('miss', !right.has(+b.dataset.n)); }); }
    });
    t.nextElementSibling.textContent = `${good} / ${qs.length} ${T('correct')}`;
    // one ticket / one chain: count the numbers / words instead of "1 / 1"
    if (qs.length === 1 && (qs[0].classList.contains('lotto') || qs[0].classList.contains('chain'))) {
      const q = qs[0], right = q.dataset.answer.split('|')[0].split(',').map(x => norm(x)), got = valueOf(q).split(',').map(x => norm(x)).filter(Boolean);
      t.nextElementSibling.textContent = `${got.filter(x => right.includes(x)).length} / ${right.length} ${T('correct')}`;
    }
  }
});
if (document.getElementById('reset')) document.getElementById('reset').onclick = () => {
  if (!confirm(T('Clear all saved answers and start again?'))) return;
  document.querySelectorAll('main input,main textarea').forEach(x => x.value = '');
  document.querySelectorAll('main select').forEach(x => x.selectedIndex = 0);
  syncFix(); syncOrder(); syncLotto(); syncChain();
  document.querySelectorAll('.tkn').forEach(b => b.classList.remove('hit', 'miss'));
  document.querySelectorAll('.chip').forEach(x => x.classList.remove('used'));
  document.querySelectorAll('.q').forEach(x => x.classList.remove('good', 'bad'));
  document.querySelectorAll('.feedback,.score').forEach(x => x.textContent = '');
  document.querySelectorAll('.hint,.answer,.support').forEach(x => x.classList.remove('open'));
  document.querySelectorAll('.show').forEach(x => x.classList.remove('available'));
  try { localStorage.removeItem(nameKey); } catch (e) {}
  window.scrollTo(0, 0);
};
syncOrder(); syncLotto(); syncChain();
if (noSend) return;  // lesson page: no sending
if (errors.length) { document.getElementById('send').disabled = true; return; }  // never send a broken page

// ---------- confirmed sending (shared, unchanged) ----------
window.HOMEWORK_SUBMISSION_CONFIG = {
  student: meta.STUDENT, homework: meta.HOMEWORK,
  submitButtonSelector: '#send', statusSelector: '#status', resetButtonSelector: '#reset',
  closedSelector: '.q[data-answer]', openSelector: '.openanswer', allAnswersSelector: 'main input,main select,main textarea',
  normalizeAnswer: norm
};
if (askName) {
  const cfg = window.HOMEWORK_SUBMISSION_CONFIG, nameEl = document.getElementById('studentName'), statusEl = document.getElementById('status');
  cfg.allAnswersSelector = 'main input:not(.student-name),main select,main textarea';
  cfg.storageKey = 'hw-submit-open-' + meta.HOMEWORK;
  try { nameEl.value = localStorage.getItem(nameKey) || ''; } catch (e) {}
  const setName = () => { cfg.student = nameEl.value.trim().replace(/\s+/g, ' '); try { localStorage.setItem(nameKey, nameEl.value); } catch (e) {} };
  setName(); cfg.student = cfg.student || '';
  nameEl.addEventListener('input', setName);
  // capture phase: runs before the shared sender, so nothing is sent without a name
  document.addEventListener('click', e => {
    if (!e.target.closest('#send') || cfg.student.length >= 2) return;
    e.preventDefault(); e.stopImmediatePropagation();
    statusEl.textContent = 'Please write your name first.'; nameEl.focus();
  }, true);
}
if (L === 'ru') {  // shown text only: the shared sender keeps working in English internally
  const tr = el => { if (!el) return; const t = UI.ruStatus[el.textContent.trim()]; if (t) el.textContent = t; };
  ['status', 'send'].forEach(id => { const el = document.getElementById(id); if (el) new MutationObserver(() => tr(el)).observe(el, { childList: true, characterData: true, subtree: true }); });
}
const shared = document.createElement('script'); shared.src = '/assets/homework-submission.js';
shared.onload = () => setTimeout(() => { syncFix(); syncOrder(); document.querySelectorAll('.q.chain').forEach(q => q.dataset.restored = ''); syncLotto(); syncChain(); }, 0);  // saved answers are restored by the shared script
document.body.appendChild(shared);
})();
