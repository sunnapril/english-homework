/* P0 revised candidate: release blocked until browser + real backend QA passes. */
(() => {
'use strict';
const cfg=window.HOMEWORK_SUBMISSION_CONFIG;
if(!cfg)return;
const button=document.querySelector(cfg.submitButtonSelector), status=document.querySelector(cfg.statusSelector);
if(!button||!status)return;
const ENDPOINT=cfg.endpoint||'https://script.google.com/macros/s/AKfycbx0FbfDQdzYU_O856vmG7XoW4zkjCJHZ3Yo_Ys0qwrCN6PSjVOYWNFQ-i5KrFjevy64/exec';
const key=cfg.storageKey||('hw-submit-'+cfg.student+'-'+cfg.homework);
const draftKey=key+':draft',pendingKey=key+':pendingPayload',attemptKey=key+':attemptId',startedKey=key+':startedAt',receiptKey=key+':receipt';
const read=(k)=>{try{return localStorage.getItem(k)}catch(e){return null}};
const write=(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}};
const remove=(k)=>{try{localStorage.removeItem(k)}catch(e){}};
const uuid=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():'a-'+Date.now()+'-'+Math.random().toString(36).slice(2);
if(!read(attemptKey))write(attemptKey,uuid());
if(!read(startedKey))write(startedKey,new Date().toISOString());
const inputs=()=>[...document.querySelectorAll(cfg.allAnswersSelector||'input,select,textarea')].filter(el=>!el.closest('[data-hw-transport]'));
let storageHealthy=true;
let attemptId=read(attemptKey)||uuid(), startedAt=read(startedKey)||new Date().toISOString();
if(!write(attemptKey,attemptId)||!write(startedKey,startedAt))storageHealthy=false;
const choiceGroups=()=>cfg.choiceGroupSelector?[...document.querySelectorAll(cfg.choiceGroupSelector)]:[];
const choiceButtons=group=>[...group.querySelectorAll(cfg.choiceButtonSelector||'.choice')];
const selectedChoice=group=>choiceButtons(group).find(b=>b.matches(cfg.selectedChoiceSelector||'.selected,.sel,.right,.wrong,[aria-pressed="true"],[data-selected="true"]'));
const choiceSignature=group=>JSON.stringify(choiceButtons(group).map(b=>b.dataset.v||b.dataset.value||b.textContent.trim()));
function snapshot(){return inputs().map((el,i)=>({i,tag:el.tagName,type:el.type||'',name:el.name||'',value:el.value,checked:!!el.checked})).concat(choiceGroups().map((group,i)=>({kind:'choice',i,signature:choiceSignature(group),selected:choiceButtons(group).indexOf(selectedChoice(group))})));}
function restore(){let data;try{data=JSON.parse(read(draftKey)||'null')}catch(e){}if(!Array.isArray(data))return;
 const els=inputs();for(const d of data){if(d.kind==='choice'){const group=choiceGroups()[d.i];if(!group||choiceSignature(group)!==d.signature)continue;const buttons=choiceButtons(group);buttons.forEach(b=>b.classList.remove('selected','sel','right','wrong'));if(buttons[d.selected])buttons[d.selected].click();continue;}const el=els[d.i];if(!el||el.tagName!==d.tag||el.type!==d.type||el.name!==d.name)continue;
 if(el.type==='radio'||el.type==='checkbox')el.checked=!!d.checked;else el.value=d.value??'';
 el.dispatchEvent(new Event('input',{bubbles:true}));
 el.dispatchEvent(new Event('change',{bubbles:true}));}
}
let saveTimer;
function saveDraft(){clearTimeout(saveTimer);if(!write(draftKey,JSON.stringify(snapshot())))setStatus('Autosave unavailable — keep this page open.','failed');}
function setStatus(message,kind){status.textContent=message;status.dataset.submissionState=kind||'';// Some pages hide the status box with CSS; always show a non-empty message.
if(message){status.hidden=false;status.style.display='block';}}
restore();
document.addEventListener('input',()=>{clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,150)},true);
document.addEventListener('change',saveDraft,true);
document.addEventListener('click',e=>{if(cfg.choiceGroupSelector&&e.target.closest(cfg.choiceGroupSelector))saveDraft();});
window.addEventListener('pagehide',saveDraft);
function norm(v){return String(v??'').trim().toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ')}
function valueOf(el){
 if(el.matches('input,select,textarea'))return /^(radio|checkbox)$/.test(el.type)?(el.checked?el.value:''):el.value;
 const selected=el.querySelector('input[type=radio]:checked,input[type=checkbox]:checked');if(selected)return selected.value;
 const choice=el.querySelector('.choice.selected,.choice.sel,[aria-pressed="true"],[data-selected="true"]');if(choice)return choice.dataset.v||choice.dataset.value||choice.textContent.trim();
 return el.querySelector('input,select,textarea')?.value||'';
}
function collectScore(){const rows=[];
 const normalize=cfg.normalizeAnswer||norm;
 for(const el of document.querySelectorAll(cfg.closedSelector||'input[data-a]')){const custom=cfg.scoreAnswer?.(el);const expected=(el.dataset.answers||el.dataset.answer||el.dataset.a||'').split('|').map(normalize);rows.push(typeof custom==='boolean'?custom:expected.includes(normalize(valueOf(el))))}
 if(cfg.choiceScoreSelector)for(const group of document.querySelectorAll(cfg.choiceScoreSelector))rows.push(cfg.scoreChoice?!!cfg.scoreChoice(group,selectedChoice(group)):false);
 // Configured additional radio groups: count each group once.
 if(cfg.radioSelector)for(const box of document.querySelectorAll(cfg.radioSelector)){const chosen=box.querySelector('input[type="radio"]:checked');rows.push(!!chosen&&chosen.value===(box.dataset.tf||box.dataset.mcq))}
 return {correct:rows.filter(Boolean).length,total:rows.length,mistakes:rows.map((x,i)=>!x?i+1:null).filter(x=>x!==null)};
}
function collectAll(){const answers=inputs().map((el,i)=>({number:i+1,type:el.type||el.tagName.toLowerCase(),name:el.name||el.id||'',value:el.type==='radio'||el.type==='checkbox'?(el.checked?el.value:''):el.value}));for(const group of choiceGroups()){const selected=selectedChoice(group);answers.push({number:answers.length+1,type:'button-choice',name:group.id||'',value:selected?(selected.dataset.v||selected.dataset.value||selected.textContent.trim()):'',label:selected?.textContent.trim()||''})}return answers}
function collectOpen(){return [...document.querySelectorAll(cfg.openSelector||'textarea')].map((el,i)=>({number:i+1,prompt:el.dataset.prompt||el.getAttribute('aria-label')||el.closest('.item')?.textContent.trim()||el.placeholder||'',answer:el.value||''}))}
function payloadNow(){const s=collectScore(),finishedAt=new Date().toISOString(),startedAt=read(startedKey)||finishedAt;return {student:cfg.student,homework:cfg.homework,score:s.correct+'/'+s.total,percent:s.total?Math.round(100*s.correct/s.total):0,mistakes:s.mistakes.join(', '),answers:JSON.stringify(collectAll()),openAnswers:JSON.stringify(collectOpen()),attemptId,startedAt,finishedAt,durationSeconds:Math.max(0,Math.round((Date.parse(finishedAt)-Date.parse(startedAt))/1000))}}
async function digestPayload(p){
 const clean=v=>String(v??'').trim();
 const date=v=>{const t=clean(v);if(!t)return '';const d=new Date(t);return Number.isNaN(d.getTime())?t:d.toISOString()};
 const canonical=[p.student,p.homework,p.score,p.percent,p.mistakes,p.answers,p.openAnswers].map(clean)
   .concat([date(p.startedAt),date(p.finishedAt),clean(p.durationSeconds),clean(p.attemptId)]);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical)));
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function post(p){
 const frame=document.createElement('iframe');frame.name='hw-submit-'+uuid();frame.hidden=true;frame.dataset.hwTransport='true';
 const form=document.createElement('form');form.method='POST';form.action=ENDPOINT;form.target=frame.name;form.hidden=true;form.dataset.hwTransport='true';
 const fields={apiVersion:'v2-test',...p};for(const [k,v] of Object.entries(fields)){const input=document.createElement('input');input.name=k;input.value=String(v??'');form.appendChild(input)}
 document.body.append(frame,form);
 const cleanup=()=>{form.remove();frame.remove()};
 try{form.submit()}catch(e){cleanup();throw e}
 // Keep the iframe alive until confirmation/failure; a fixed 900ms can abort a slow POST.
 return cleanup;
}
function check(id,digest){return new Promise((resolve,reject)=>{let n=0;
 // Slow Google redirects must have time to confirm; keep the whole check bounded.
 const deadline=performance.now()+60000;
 const run=()=>{const callback='hwSubmissionCheck_'+Date.now()+'_'+Math.random().toString(36).slice(2);const script=document.createElement('script');let finished=false;
 const cleanup=()=>{finished=true;clearTimeout(timer);delete window[callback];script.remove()};
 const retry=()=>{if(finished)return;cleanup();if(++n<10&&performance.now()+1000<deadline)setTimeout(run,1000);else reject(Error('not-confirmed'))};
 const timer=setTimeout(retry,Math.min(15000,Math.max(1,deadline-performance.now())));
 window[callback]=data=>{if(finished)return;if(data&&data.error==='attempt-conflict'){cleanup();reject(Error('attempt-conflict'));return}if(data&&data.ok===true&&data.received===true&&data.attemptId===id&&data.payloadDigest===digest){cleanup();resolve(data)}else retry()};
 script.onerror=retry;script.dataset.hwTransport='true';script.src=ENDPOINT+'?apiVersion=v2-check&attemptId='+encodeURIComponent(id)+'&payloadDigest='+encodeURIComponent(digest)+'&callback='+encodeURIComponent(callback)+'&_='+Date.now();document.body.appendChild(script)
 };run()
})}
let sending=false,confirmed=!!read(receiptKey);
async function send(){if(sending)return;
if(confirmed){setStatus('✓ Received by Irina. Start again for a new attempt.','received');return}
if(!storageHealthy){setStatus('Cannot save submission locally. Do not close this page.','failed');return}
sending=true;button.disabled=true;saveDraft();let pending;try{pending=JSON.parse(read(pendingKey)||'null')}catch(e){}
if(pending&&(!pending.attemptId||pending.attemptId!==attemptId||pending.student!==cfg.student||pending.homework!==cfg.homework)){setStatus('Saved submission is invalid. Keep this page open and contact Irina.','failed');button.disabled=false;sending=false;return}
// If the student changed answers after an unconfirmed send, send the CURRENT answers as a new attempt
// (new attemptId, so the server never sees two different payloads under one id).
if(pending){const now=payloadNow();if(!['score','mistakes','answers','openAnswers'].every(k=>String(pending[k]??'')===String(now[k]??''))){attemptId=uuid();if(!write(attemptKey,attemptId)){setStatus('Cannot save submission locally. Do not close this page.','failed');button.disabled=false;sending=false;return}remove(pendingKey);pending=null}}
if(!pending){pending=payloadNow();if(!write(pendingKey,JSON.stringify(pending))){setStatus('Cannot save submission locally. Do not close this page.','failed');button.disabled=false;sending=false;return}}
try{const calculated=await digestPayload(pending);if(pending.payloadDigest&&pending.payloadDigest!==calculated)throw Error('Saved payload digest mismatch');pending.payloadDigest=calculated;if(!write(pendingKey,JSON.stringify(pending)))throw Error('Cannot save payload digest')}catch(e){setStatus('Cannot prepare the saved submission. Keep this page open and contact Irina.','failed');button.disabled=false;sending=false;return}
if(navigator.onLine===false){setStatus('You are offline. Your answers are saved. Click Retry when online.','failed');button.textContent='Retry';button.disabled=false;sending=false;return}
let cleanupPost=()=>{};
setStatus('Sending…','sending');try{cleanupPost=post(pending);const confirmation=await check(pending.attemptId,pending.payloadDigest);confirmed=true;const receiptSaved=write(receiptKey,JSON.stringify({attemptId:pending.attemptId,confirmedAt:new Date().toISOString(),row:confirmation.row}));if(receiptSaved)remove(pendingKey);setStatus('✓ Received by Irina','received');button.textContent='Received'}
catch(e){setStatus(e.message==='attempt-conflict'?'An earlier submission has different answers. Your draft is saved. Contact Irina.':'Not confirmed. Your answers are stored on this device. Click Retry.','failed');button.textContent='Retry'}
finally{cleanupPost();button.disabled=confirmed;sending=false}}
button.addEventListener('click',e=>{e.preventDefault();send()});
if(read(pendingKey))setStatus('An earlier submission is pending. Click Send answers to retry it.','failed');
else if(confirmed){setStatus('A submission was previously confirmed.','received');button.disabled=true;button.textContent='Received'}
if(!storageHealthy)setStatus('Autosave unavailable — keep this page open.','failed');
// Clear P0 state at the accepted confirmation, before an existing reset can reload.
function resetAttempt(){clearTimeout(saveTimer);for(const el of inputs()){if(/^(radio|checkbox)$/.test(el.type))el.checked=false;else el.value=''}for(const group of choiceGroups())choiceButtons(group).forEach(b=>b.classList.remove('selected','sel','right','wrong'));confirmed=false;attemptId=uuid();startedAt=new Date().toISOString();remove(receiptKey);remove(pendingKey);storageHealthy=write(attemptKey,attemptId)&&write(startedKey,startedAt);saveDraft();button.disabled=false;button.textContent='Send answers';setStatus('','');}
function wrapReset(originalRestart){return function(){
 if(sending||read(pendingKey)){setStatus('Retry the pending submission before starting again.','failed');return}
 const originalConfirm=window.confirm;let accepted=false;
 window.confirm=function(message){accepted=originalConfirm.call(window,message);if(accepted)resetAttempt();return accepted};
 try{originalRestart.apply(this,arguments)}finally{window.confirm=originalConfirm}
 if(accepted)saveDraft();
};}
if(cfg.resetFunction&&typeof window[cfg.resetFunction]==='function')window[cfg.resetFunction]=wrapReset(window[cfg.resetFunction]);
if(cfg.resetButtonSelector){const resetButton=document.querySelector(cfg.resetButtonSelector);if(resetButton&&typeof resetButton.onclick==='function')resetButton.onclick=wrapReset(resetButton.onclick);}
})();
