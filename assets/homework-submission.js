(() => {
  'use strict';
  const cfg = window.HOMEWORK_SUBMISSION_CONFIG;
  if (!cfg) return;
  const submitButton = document.querySelector(cfg.submitButtonSelector);
  const statusElement = document.querySelector(cfg.statusSelector);
  if (!submitButton || !statusElement) return;
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbx0FbfDQdzYU_O856vmG7XoW4zkjCJHZ3Yo_Ys0qwrCN6PSjVOYWNFQ-i5KrFjevy64/exec';
  const storageKey = cfg.storageKey || ('hw-submit-' + cfg.student + '-' + cfg.homework);
  const attemptKey = storageKey + ':attemptId';
  const startedKey = storageKey + ':startedAt';
  if (!localStorage.getItem(attemptKey)) localStorage.setItem(attemptKey, (crypto.randomUUID ? crypto.randomUUID() : ('a-' + Date.now() + '-' + Math.random().toString(36).slice(2))));
  if (!localStorage.getItem(startedKey)) localStorage.setItem(startedKey, new Date().toISOString());

  function normalize(v){ return String(v ?? '').trim().toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' '); }
  function valueOf(node){
    if (node.matches('input,select,textarea')) {
      if (node.type === 'radio' || node.type === 'checkbox') return node.checked ? node.value : '';
      return node.value;
    }
    const checked = node.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked');
    if (checked) return checked.value;
    const selectedButton = node.querySelector('.choice.selected,[aria-pressed="true"],[data-selected="true"]');
    if (selectedButton) return selectedButton.dataset.v || selectedButton.dataset.value || selectedButton.textContent.trim();
    const field = node.querySelector('input,select,textarea');
    return field ? field.value : '';
  }
  function expectedOf(node){ return node.dataset.answers || node.dataset.answer || node.dataset.a || ''; }
  function collectClosed(){
    const nodes = [...document.querySelectorAll(cfg.closedSelector || '[data-answer],[data-a]')];
    const rows = nodes.map((node,i) => {
      const answer = valueOf(node), expected = expectedOf(node);
      const accepted = String(expected).split('|').map(normalize);
      return {number:i+1, answer, correct: accepted.includes(normalize(answer))};
    });
    const correct = rows.filter(r=>r.correct).length;
    return {rows, correct, total:rows.length, mistakes:rows.filter(r=>!r.correct).map(r=>r.number)};
  }
  function collectOpen(){
    return [...document.querySelectorAll(cfg.openSelector || 'textarea')].map((node,i)=>({number:i+1,prompt:node.dataset.prompt || node.getAttribute('aria-label') || '',answer:node.value || ''}));
  }
  function collectAllAnswers(){
    return [...document.querySelectorAll(cfg.allAnswersSelector || 'input,select,textarea')].map((node,i)=>({number:i+1,type:node.type || node.tagName.toLowerCase(),name:node.name || node.id || '',value:(node.type==='radio'||node.type==='checkbox')?(node.checked?node.value:''):node.value}));
  }
  function saveFailure(payload){ try{ localStorage.setItem(storageKey+':pendingPayload',JSON.stringify(payload)); }catch(e){} }
  function setStatus(text, kind){ statusElement.textContent=text; statusElement.dataset.submissionState=kind || ''; }
  function post(payload){
    return new Promise((resolve) => {
      const iframe=document.createElement('iframe'); iframe.name='hw-submit-'+Date.now(); iframe.hidden=true;
      const form=document.createElement('form'); form.method='POST'; form.action=ENDPOINT; form.target=iframe.name; form.hidden=true;
      const fields={apiVersion:'v2-test',student:payload.student,homework:payload.homework,score:payload.score,percent:payload.percent,mistakes:payload.mistakes,answers:payload.answers,openAnswers:payload.openAnswers,attemptId:payload.attemptId,startedAt:payload.startedAt,finishedAt:payload.finishedAt,durationSeconds:payload.durationSeconds};
      Object.entries(fields).forEach(([name,value])=>{const input=document.createElement('input');input.name=name;input.value=String(value ?? '');form.appendChild(input);});
      document.body.append(iframe,form); form.submit(); setTimeout(()=>{form.remove();iframe.remove();resolve();},700);
    });
  }
  function checkReceived(attemptId){
    return new Promise((resolve,reject)=>{
      let tries=0;
      const run=()=>{
        const callback='hwSubmissionCheck_'+Date.now()+'_'+Math.random().toString(36).slice(2);
        const script=document.createElement('script');
        const cleanup=()=>{delete window[callback];script.remove();};
        window[callback]=(data)=>{cleanup(); if(data && data.received===true) resolve(true); else if(++tries<8) setTimeout(run,900); else reject(new Error('not-confirmed'));};
        script.onerror=()=>{cleanup(); if(++tries<8) setTimeout(run,900); else reject(new Error('check-failed'));};
        script.src=ENDPOINT+'?apiVersion=v2-check&attemptId='+encodeURIComponent(attemptId)+'&callback='+encodeURIComponent(callback)+'&_='+Date.now();
        document.body.appendChild(script);
      }; run();
    });
  }
  submitButton.addEventListener('click', async (event)=>{
    event.preventDefault();
    const closed=collectClosed(), open=collectOpen();
    const startedAt=localStorage.getItem(startedKey) || new Date().toISOString();
    const finishedAt=new Date().toISOString();
    const payload={student:cfg.student,homework:cfg.homework,score:closed.correct+'/'+closed.total,percent:closed.total?Math.round(closed.correct/closed.total*100):0,mistakes:closed.mistakes.join(', '),answers:JSON.stringify(collectAllAnswers()),openAnswers:JSON.stringify(open),attemptId:localStorage.getItem(attemptKey),startedAt,finishedAt,durationSeconds:Math.max(0,Math.round((new Date(finishedAt)-new Date(startedAt))/1000))};
    saveFailure(payload); setStatus('Sending…','sending'); submitButton.disabled=true;
    try{ await post(payload); await checkReceived(payload.attemptId); localStorage.removeItem(storageKey+':pendingPayload'); setStatus('✓ Received by Irina','received'); }
    catch(e){ setStatus('Not confirmed. Your answers are still saved. Try again.','failed'); }
    finally{ submitButton.disabled=false; }
  });
})();
