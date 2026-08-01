const answers = [...document.querySelectorAll('.answer')];
const total = answers.length;
const studentName = document.getElementById('studentName');
const homeworkId = 'Roadmap B2 · Unit 3A Memory';
const storageKey = 'homework:' + homeworkId;
let saveTimer;
let sendPending = false;
let sendTimeout;

let startedAt = null;
let activeMs = 0;
let activeStartedAt = null;
let completed = false;

function normalise(s){
  return String(s || '').toLowerCase().trim()
    .replace(/[’‘´`]/g,"'")
    .replace(/[‐‑‒–—]/g,"-")
    .replace(/[?.!,;:]/g,"")
    .replace(/\s+/g," ");
}

function acceptedAnswers(el){
  return el.dataset.answer.split('|').map(item => item.trim()).filter(Boolean);
}

function isCorrect(el){
  const accepted = acceptedAnswers(el).map(normalise);
  return accepted.includes(normalise(el.value));
}

function updateProgress(){
  const done = answers.filter(a => a.value.trim() !== '').length;
  document.getElementById('progressBar').style.width = `${done/total*100}%`;
  document.getElementById('progressText').textContent = `${done} of ${total} answers completed`;
}

function beginTiming(){
  if (!startedAt) startedAt = new Date().toISOString();
  if (document.visibilityState === 'visible' && activeStartedAt === null) {
    activeStartedAt = Date.now();
  }
}

function pauseTiming(){
  if (activeStartedAt !== null) {
    activeMs += Date.now() - activeStartedAt;
    activeStartedAt = null;
  }
}

function currentActiveMs(){
  return activeMs + (activeStartedAt !== null ? Date.now() - activeStartedAt : 0);
}

function formatDuration(ms){
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes} min ${seconds} sec` : `${minutes} min`;
}

function saveDraft(){
  const draft = {
    student: studentName.value,
    answers: answers.map(a => a.value),
    savedAt: new Date().toISOString(),
    startedAt,
    activeMs: currentActiveMs(),
    completed
  };
  localStorage.setItem(storageKey, JSON.stringify(draft));
  const status = document.getElementById('draftStatus');
  status.textContent = 'Saved automatically on this device.';
}

function scheduleSave(){
  clearTimeout(saveTimer);
  const status = document.getElementById('draftStatus');
  status.textContent = 'Saving…';
  saveTimer = setTimeout(saveDraft, 350);
}

function restoreDraft(){
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const draft = JSON.parse(raw);
    studentName.value = draft.student || '';
    startedAt = draft.startedAt || null;
    activeMs = Number(draft.activeMs) || 0;
    completed = Boolean(draft.completed);
    if (Array.isArray(draft.answers)) {
      answers.forEach((a, i) => {
        if (typeof draft.answers[i] === 'string') a.value = draft.answers[i];
      });
    }
    document.getElementById('draftStatus').textContent = 'Your saved answers have been restored.';
  } catch (err) {
    console.warn('Could not restore draft:', err);
  }
}

function ensureHiddenInput(name, id){
  const form = document.getElementById('resultForm');
  let input = document.getElementById(id);
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.id = id;
    form.appendChild(input);
  }
  return input;
}

answers.forEach(a => {
  a.addEventListener('input', () => { beginTiming(); updateProgress(); scheduleSave(); });
  a.addEventListener('change', () => { beginTiming(); updateProgress(); scheduleSave(); });
});
studentName.addEventListener('input', () => { beginTiming(); scheduleSave(); });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    pauseTiming();
    saveDraft();
  } else if (startedAt) {
    activeStartedAt = Date.now();
  }
});
window.addEventListener('beforeunload', () => {
  pauseTiming();
  saveDraft();
});

const resultFrame = document.getElementById('resultFrame');
resultFrame.addEventListener('load', () => {
  if (!sendPending) return;
  sendPending = false;
  clearTimeout(sendTimeout);
  const sendStatus = document.getElementById('sendStatus');
  sendStatus.textContent = 'Your result has been sent successfully. You can close this page.';
  completed = true;
  saveDraft();
});

document.getElementById('checkBtn').addEventListener('click', () => {
  beginTiming();
  let correct = 0;
  const wrong = [];
  const filledCorrect = [];
  const filledWrong = [];

  answers.forEach((el, index) => {
    const q = el.closest('.q');
    q.classList.remove('correct','incorrect');
    const feedback = q.querySelector('.feedback');
    const ok = isCorrect(el);
    const answer = el.value.trim();
    const number = index + 1;

    if (ok){
      correct++;
      q.classList.add('correct');
      feedback.textContent = 'Looks good.';
      if (answer) filledCorrect.push(`${number}. ${answer}`);
    } else {
      q.classList.add('incorrect');
      feedback.textContent = answer ? 'Have another look at this one.' : 'This one is still empty.';
      wrong.push(number);
      if (answer) {
        const expected = acceptedAnswers(el)[0] || '—';
        filledWrong.push(`${number}. ${answer} → ${expected}`);
      }
    }
  });

  const pct = Math.round(correct/total*100);
  const name = studentName.value.trim();
  let message;

  if (pct === 100) message = `Excellent work${name ? ', '+name : ''}. Everything is accurate.`;
  else if (pct >= 85) message = `Very strong work${name ? ', '+name : ''}. Only a few details need another look.`;
  else if (pct >= 65) message = `A solid attempt${name ? ', '+name : ''}. The highlighted items will give us useful material for the lesson.`;
  else message = `Thank you for working through it${name ? ', '+name : ''}. Review the highlighted items, and we’ll untangle them together.`;

  document.getElementById('score').textContent = `${correct} / ${total} · ${pct}%`;
  document.getElementById('message').textContent = message;

  const block = document.getElementById('reviewBlock');
  if (wrong.length){
    block.innerHTML = `<p><b>Have another look:</b></p><ul class="review-list">${wrong.map(n=>`<li>Sentence ${n}</li>`).join('')}</ul>`;
  } else {
    block.innerHTML = `<p><b>Nothing to review this time.</b></p>`;
  }

  const result = document.getElementById('result');
  result.classList.add('show');
  result.scrollIntoView({behavior:'smooth', block:'start'});

  const sendStatus = document.getElementById('sendStatus');

  if (!name) {
    sendStatus.textContent = 'Please enter your name above, then press “Check my work” again so your result can be saved.';
    saveDraft();
    return;
  }

  pauseTiming();
  const finishedAt = new Date().toISOString();
  const duration = formatDuration(activeMs);

  const reportParts = [];
  if (filledWrong.length) reportParts.push(`❌ ERRORS\n${filledWrong.join('\n')}`);
  if (filledCorrect.length) reportParts.push(`✅ CORRECT\n${filledCorrect.join('\n')}`);
  const answerReport = reportParts.join('\n\n') || 'No answers entered';

  sendStatus.textContent = 'Sending your result… Please keep this page open.';

  document.getElementById('formStudent').value = name;
  document.getElementById('formHomework').value = homeworkId;
  document.getElementById('formScore').value = `${correct}/${total}`;
  document.getElementById('formPercent').value = pct;
  document.getElementById('formMistakes').value = wrong.join(', ');
  document.getElementById('formAnswers').value = answerReport;
  ensureHiddenInput('startedAt', 'formStartedAt').value = startedAt || '';
  ensureHiddenInput('finishedAt', 'formFinishedAt').value = finishedAt;
  ensureHiddenInput('duration', 'formDuration').value = duration;

  saveDraft();
  sendPending = true;
  clearTimeout(sendTimeout);
  sendTimeout = setTimeout(() => {
    if (!sendPending) return;
    sendPending = false;
    sendStatus.textContent = 'The result could not be confirmed. Check your internet connection and press “Check my work” again. Your answers are still saved on this device.';
  }, 12000);

  try {
    document.getElementById('resultForm').submit();
  } catch (err) {
    sendPending = false;
    clearTimeout(sendTimeout);
    sendStatus.textContent = 'The result could not be sent. Your answers are still saved on this device. Please try again.';
    console.error(err);
  }
});

function clearAttempt({ keepStudent }){
  const savedName = keepStudent ? studentName.value.trim() : '';

  answers.forEach(el => {
    el.value = '';
    const q = el.closest('.q');
    q.classList.remove('correct','incorrect');
    q.querySelector('.feedback').textContent = '';
  });

  studentName.value = savedName;
  localStorage.removeItem(storageKey);
  startedAt = null;
  activeMs = 0;
  activeStartedAt = null;
  completed = false;

  document.getElementById('result').classList.remove('show');
  document.getElementById('score').textContent = '';
  document.getElementById('message').textContent = '';
  document.getElementById('reviewBlock').innerHTML = '';
  document.getElementById('sendStatus').textContent = '';
  document.getElementById('draftStatus').textContent = 'Answers are saved automatically on this device.';

  updateProgress();
  saveDraft();
  window.scrollTo({top:0, behavior:'smooth'});
}

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all answers and start again with the same student name?')) return;
  clearAttempt({ keepStudent: true });
});

const newStudentBtn = document.createElement('button');
newStudentBtn.type = 'button';
newStudentBtn.id = 'newStudentBtn';
newStudentBtn.className = 'secondary';
newStudentBtn.textContent = 'New student';
document.getElementById('resetBtn').insertAdjacentElement('afterend', newStudentBtn);

newStudentBtn.addEventListener('click', () => {
  if (!confirm('Start a new student? This will clear the student name, all answers and reset the timer.')) return;
  clearAttempt({ keepStudent: false });
  studentName.focus();
});

function renderReviewOnly(){
  let correct = 0;
  const wrong = [];

  answers.forEach((el, index) => {
    const q = el.closest('.q');
    q.classList.remove('correct','incorrect');
    const feedback = q.querySelector('.feedback');
    const ok = isCorrect(el);

    if (ok) {
      correct++;
      q.classList.add('correct');
      feedback.textContent = 'Looks good.';
    } else {
      q.classList.add('incorrect');
      feedback.textContent = el.value.trim() ? 'Have another look at this one.' : 'This one is still empty.';
      wrong.push(index + 1);
    }
  });

  const pct = Math.round(correct / total * 100);
  document.getElementById('score').textContent = `${correct} / ${total} · ${pct}%`;
  document.getElementById('message').textContent = 'Your previous answers are shown below. You can review them or start again.';
  document.getElementById('reviewBlock').innerHTML = wrong.length
    ? `<p><b>Have another look:</b></p><ul class="review-list">${wrong.map(n=>`<li>Sentence ${n}</li>`).join('')}</ul>`
    : `<p><b>Nothing to review this time.</b></p>`;
  document.getElementById('result').classList.add('show');
}

function showCompletedDialog(){
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999;';

  const box = document.createElement('div');
  box.style.cssText = 'width:min(460px,100%);background:#fff;border-radius:18px;padding:26px;box-shadow:0 18px 60px rgba(0,0,0,.25);font-family:inherit;';
  box.innerHTML = `
    <h2 style="margin:0 0 10px;font-size:1.45rem;">You've already completed this homework.</h2>
    <p style="margin:0 0 22px;line-height:1.5;">Would you like to review your previous answers or start again?</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;">
      <button type="button" id="completedReviewBtn" class="secondary">Review answers</button>
      <button type="button" id="completedRestartBtn">Start again</button>
    </div>`;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  box.querySelector('#completedReviewBtn').addEventListener('click', () => {
    overlay.remove();
    renderReviewOnly();
  });

  box.querySelector('#completedRestartBtn').addEventListener('click', () => {
    overlay.remove();
    clearAttempt({ keepStudent: true });
  });
}

restoreDraft();
updateProgress();
if (completed) showCompletedDialog();
