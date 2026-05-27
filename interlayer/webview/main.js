const vscode = acquireVsCodeApi();
const g = id => document.getElementById(id);
const pi=g('promptInput'),chC=g('chC'),lnC=g('lnC');
const aBtn=g('aBtn'),aTxt=g('aTxt'),aErr=g('aErr');
const s1=g('s1'),s2=g('s2'),s3=g('s3'),cTi=g('cTi'),iTgs=g('iTgs');
const bBtn=g('bBtn'),bTxt=g('bTxt'),bErr=g('bErr');
const stIdle=g('stIdle'),stLoad=g('stLoad'),stRes=g('stRes');
const rTxt=g('rTxt'),tSt=g('tSt');
const copyBtn=g('copyBtn'),sendBtn=g('sendBtn'),rstBtn=g('rstBtn');
const latV=g('latV'),fSt=g('fSt'),scr=g('scr'),spot=g('spot');
let t0=0;
let currentSelections = {};
let typingInterval = null;

window.addEventListener('mousemove',e=>{
  spot.style.setProperty('--mx',e.clientX+'px');
  spot.style.setProperty('--my',e.clientY+'px');
});

setTimeout(()=>{
  document.querySelectorAll('.rv').forEach((el,i)=>{
    if(el.style.display!=='none') setTimeout(()=>el.classList.add('on'),i*110);
  });
},50);

function show(el){
  el.style.display='';
  setTimeout(()=>el.classList.add('on'),30);
  setTimeout(()=>scr.scrollTo({top:0,behavior:'smooth'}),90);
}
function hide(el){
  el.classList.remove('on');
  setTimeout(()=>el.style.display='none', 400);
}

pi.addEventListener('input',()=>{
  chC.textContent='ch '+pi.value.length;
  lnC.textContent='ln '+pi.value.split('\\n').length;
});

function dots(n){
  [g('d0'),g('d1'),g('d2')].forEach((d,i)=>d.style.background=i<n?'#f06260':'#e4e4e7');
}
function status(txt,ok){fSt.textContent=txt;fSt.style.color=ok?'#22c55e':'#f06260';}
function term(s){
  stIdle.style.display=s==='idle'?'flex':'none';
  stLoad.style.display=s==='load'?'flex':'none';
  stRes.style.display =s==='res' ?'flex':'none';
}
function type(el,txt,spd=11,cb=null){
  el.textContent='';let i=0;
  const t=setInterval(()=>{
    if(i<txt.length){el.textContent+=txt[i];i++;}
    else { clearInterval(t); if(cb) cb(); }
  },spd);
}

function startTypingAnim(el, baseTxt) {
  if(typingInterval) clearInterval(typingInterval);
  let dots = 0;
  el.textContent = baseTxt;
  typingInterval = setInterval(() => {
    dots = (dots + 1) % 4;
    el.textContent = baseTxt + '.'.repeat(dots);
  }, 400);
}
function stopTypingAnim() {
  if(typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
}

const termLines = [
  "[BOOTING AI ENGINE...]",
  "[ANALYZING USER INTENT...]",
  "[PARAMETER DETECTION ACTIVE]",
  "[REFINING PROMPT...]",
  "[GENERATING FINAL OUTPUT...]"
];

function runTerminalLoad() {
  stLoad.innerHTML = '';
  let tOffset = 0;
  termLines.forEach((line, i) => {
    setTimeout(() => {
      if (stLoad.style.display === 'none') return;
      const div = document.createElement('div');
      div.style.color = 'var(--z400)';
      stLoad.appendChild(div);
      type(div, line, 15);
    }, tOffset);
    tOffset += 500 + Math.random() * 300;
  });
}

aBtn.addEventListener('click',()=>{
  const p=pi.value.trim();
  if(!p){aErr.textContent='Please enter a prompt first.';aErr.style.display='block';return;}
  aErr.style.display='none';
  aBtn.disabled=true;
  startTypingAnim(aTxt, 'AI is typing');
  t0=Date.now();status('Analyzing...',true);
  currentSelections = {};
  const selectedModel = document.getElementById('selModel').value;
  vscode.postMessage({command:'nextStage',prompt:p,model:selectedModel, selections:{}});
});

bBtn.addEventListener('click',()=>{
  bErr.style.display='none';
  bBtn.disabled=true;
  startTypingAnim(bTxt, 'AI is typing');
  t0=Date.now();status('Processing...',true);
  
  const dynSels = document.querySelectorAll('#dynamicQuestions select');
  dynSels.forEach(s => {
    currentSelections[s.dataset.q] = s.value;
  });

  const selectedModel = document.getElementById('selModel').value;
  vscode.postMessage({command:'nextStage',prompt:pi.value.trim(),
    model:selectedModel,
    selections: currentSelections});
});

const bBtnBack = g('bBtnBack'), cBtnBack = g('cBtnBack');
if(bBtnBack) {
  bBtnBack.addEventListener('click', () => {
    hide(s2);
    setTimeout(() => show(s1), 400);
  });
}
if(cBtnBack) {
  cBtnBack.addEventListener('click', () => {
    hide(s3);
    setTimeout(() => show(s2), 400);
  });
}

copyBtn.addEventListener('click',()=>{
  vscode.postMessage({command:'copyPrompt'});
  copyBtn.textContent='Copied!';
  setTimeout(()=>{copyBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';},2000);
});

sendBtn.addEventListener('click',()=>{
  vscode.postMessage({command:'sendToAI'});status('Sent to editor',true);
});

rstBtn.addEventListener('click',()=>{
  pi.value='';chC.textContent='ch 0';lnC.textContent='ln 1';
  aBtn.disabled=false;aTxt.textContent='Analyze Intent';
  aErr.style.display='none';bErr.style.display='none';
  currentSelections = {};
  s2.style.display='none';s2.classList.remove('on');
  s3.style.display='none';s3.classList.remove('on');
  show(s1);
  term('idle');tSt.textContent='STDOUT: IDLE';
  dots(1);status('Nominal',true);
  scr.scrollTo({top:0,behavior:'smooth'});
});

window.addEventListener('message',e=>{
  const m=e.data;
  switch(m.command){
    case 'stageStart': break;
    case 'stageResult':{
      stopTypingAnim();
      latV.textContent=(Date.now()-t0)+'ms';
      aBtn.disabled=false;aTxt.textContent='Analyze Intent';
      bBtn.disabled=false;bTxt.textContent='Next';
      
      const state=m.data;
      const tagsObj=state.tags || {};
      const intentObj = tagsObj.intent || {};
      const intentStr = intentObj.primary_intent || 'General';
      const complexityStr = state.estimated_complexity || 'Medium';
      const conf = state.confidence || 0.5;
      
      const tags = [];
      tags.push({l:intentStr,c:'r'});
      tags.push({l:complexityStr,c:'dk'});
      tags.push({l:Math.round(conf * 100) + '% Conf',c:'ok'});
      
      const questions = state.questions || [];

      iTgs.innerHTML=tags.map(t=>'<span class="tg '+(t.c||'')+'">'+t.l+'</span>').join('')
        ||'<span class="tg">General prompt</span>';
      
      cTi.textContent='CONFIGURING: ' + intentStr.toUpperCase().substring(0,22);
      
      
      
      // Render dynamic questions
      const dynQ = g('dynamicQuestions');
      dynQ.innerHTML = '';
      if (questions.length > 0) {
        questions.forEach((q, i) => {
          const fi = document.createElement('div');
          fi.className = 'fi';
          
          const label = document.createElement('label');
          label.className = 'lb';
          label.innerHTML = '<div class="ld"></div> ' + q.title;
          fi.appendChild(label);
          
          if (q.why_it_matters) {
            const why = document.createElement('div');
            why.className = 'why-txt';
            why.textContent = q.why_it_matters;
            fi.appendChild(why);
          }
          
          const sw = document.createElement('div');
          sw.className = 'sw';
          sw.innerHTML = '<div class="fi-i"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg></div>';
          
          const sel = document.createElement('select');
          sel.id = 'selDyn_' + i;
          sel.dataset.q = q.title;
          (q.options || []).forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          sw.appendChild(sel);
          
          const chv = document.createElement('div');
          chv.className = 'chv';
          chv.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
          sw.appendChild(chv);
          
          fi.appendChild(sw);
          dynQ.appendChild(fi);
        });
      }

      dots(2);status('Questions Generated',true);
      if(s1.style.display !== 'none') {
          hide(s1);
          setTimeout(()=>{show(s2);}, 400);
      }
      break;
    }
    case 'stageError':
      stopTypingAnim();
      latV.textContent=(Date.now()-t0)+'ms';
      aBtn.disabled=false;aTxt.textContent='Analyze Intent';
      bBtn.disabled=false;bTxt.textContent='Next';
      aErr.textContent='Error: '+m.message;aErr.style.display='block';
      bErr.textContent='Error: '+m.message;bErr.style.display='block';
      status('Error',false);break;
    case 'stageFinal':{
      stopTypingAnim();
      latV.textContent=(Date.now()-t0)+'ms';
      aBtn.disabled=false;aTxt.textContent='Analyze Intent';
      bBtn.disabled=false;bTxt.textContent='Next';
      term('res');tSt.textContent='STDOUT: READY';
      dots(3);status('Build complete',true);
      
      hide(s1); hide(s2);
      setTimeout(()=>{
        if(s3.style.display==='none') show(s3);
        const rOk = g('rOk');
        type(rOk, '[SUCCESS] COMPILATION COMPLETE', 10, () => {
          type(rTxt, m.data.final_prompt || '', 5);
        });
      }, 400);
      
      break;
    }
    case 'setPrompt':
      pi.value=m.prompt||'';
      chC.textContent='ch '+(m.prompt||'').length;
      lnC.textContent='ln '+(m.prompt||'').split('\\n').length;break;
    case 'reset': stopTypingAnim(); rstBtn.click();break;
  }
});

dots(1);
