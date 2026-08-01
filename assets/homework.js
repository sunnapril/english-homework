const answers = [...document.querySelectorAll('.answer')];
const total = answers.length;
const studentName = document.getElementById('studentName');
const homeworkId = 'Roadmap B2 · Unit 3A Memory';
const storageKey = 'homework:' + homeworkId;
let saveTimer;
let sendPending = false;
let sendTimeout;

function normalise(s){
  return s.toLowerCase().trim()
    .replace(/[’‘´`]/g,"'")
    .replace(/[‐‑‒–—]/g,"-")
    .replace(/[?.!,;:]/g,"")
    .replace(/\s+/g," ");
}

function isCorrect(el){
  const accepted = el.dataset.answer.split('|').map(normalise);
  return accepted.includes(normalise(el.value));
}

function updateProgress(){
  const done = answers.filter(a => a.value.trim() !== '').length;
  document.getElementById('progressBar').style.width = `${done/total*100}%`;
  document.getElementById('progressText').textContent = `${done} of ${total} answers completed`;
}

function saveDraft(){
  const draft = {
    student: studentName.value,
    answers: answers.map(a => a.value),
    savedAt: new Date().toISOString()
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

answers.forEach(a => {
  a.addEventListener('input', () => { updateProgress(); scheduleSave(); });
  a.addEventListener('change', () => { updateProgress(); scheduleSave(); });
});
studentName.addEventListener('input', scheduleSave);

const resultFrame = document.getElementById('resultFrame');
resultFrame.addEventListener('load', () => {
  if (!sendPending) return;
  sendPending = false;
  clearTimeout(sendTimeout);
  const sendStatus = document.getElementById('sendStatus');
  sendStatus.textContent = 'Your result has been sent successfully. You can close this page.';
  saveDraft();
});

document.getElementById('checkBtn').addEventListener('click', () => {
  let correct = 0;
  const wrong = [];
  const detailedAnswers = [];

  answers.forEach((el, index) => {
    const q = el.closest('.q');
    q.classList.remove('correct','incorrect');
    const feedback = q.querySelector('.feedback');
    const ok = isCorrect(el);

    detailedAnswers.push({
      number: index + 1,
      answer: el.value,
      correct: ok
    });

    if (ok){
      correct++;
      q.classList.add('correct');
      feedback.textContent = 'Looks good.';
    } else {
      q.classList.add('incorrect');
      feedback.textContent = el.value.trim() ? 'Have another look at this one.' : 'This one is still empty.';
      wrong.push(index + 1);
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

  sendStatus.textContent = 'Sending your result… Please keep this page open.';

  document.getElementById('formStudent').value = name;
  document.getElementById('formHomework').value = homeworkId;
  document.getElementById('formScore').value = `${correct}/${total}`;
  document.getElementById('formPercent').value = pct;
  document.getElementById('formMistakes').value = wrong.join(', ');
  document.getElementById('formAnswers').value = detailedAnswers
    .filter(item => item.answer.trim() !== '')
    .map(item => {
      const el = answers[item.number - 1];
      const expected = el.dataset.answer.split('|')[0].trim();

      if (item.correct) {
        return `${item.number} ✅ ${item.answer.trim()}`;
      }

      return `${item.number} ❌ ${item.answer.trim()}\nExpected: ${expected}`;
    })
    .join('\n\n') || 'No answers entered';

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

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all answers and start again?')) return;
  document.getElementById('hwForm').reset();
  localStorage.removeItem(storageKey);
  answers.forEach(el => {
    const q = el.closest('.q');
    q.classList.remove('correct','incorrect');
    q.querySelector('.feedback').textContent='';
  });
  document.getElementById('result').classList.remove('show');
  document.getElementById('draftStatus').textContent = 'Answers are saved automatically on this device.';
  updateProgress();
  window.scrollTo({top:0,behavior:'smooth'});
});

restoreDraft();
updateProgress();