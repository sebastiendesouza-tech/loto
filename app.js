const role = document.body.dataset.role;
const isPublic = role === 'public';
const isAnimateur = role === 'animateur';
const isCommissaire = role === 'commissaire';
const sessionId = new URLSearchParams(location.search).get('s') || localStorage.getItem('lotoSessionCode') || 'DEMO';
localStorage.setItem('lotoSessionCode', sessionId);

let db = null;
let state = null;
let channel = null;
let recognition = null;
let microRunning = false;
let pcMicAuthorized = false;
let restarting = false;
let pendingVoiceNumber = null;
let pendingVoiceAt = 0;
let saveTimer = null;
let pendingTimer = null;
const PENDING_VOICE_DELAY = 8000;
const PREVALIDATION_DELAY = 7000;

boot();

async function boot(){
  if(!window.LOTO_SUPABASE_URL || !window.LOTO_SUPABASE_ANON_KEY || window.LOTO_SUPABASE_URL.includes('xxxxxxxx')){
    alert('Configurer public/config.js avec Supabase URL et anon key.');
    return;
  }
  db = window.supabase.createClient(window.LOTO_SUPABASE_URL, window.LOTO_SUPABASE_ANON_KEY);
  initUi();
  await loadOrCreateSession();
  subscribeRealtime();
  renderAll();
}

function initUi(){
  if(isPublic){
    const board = byId('board');
    for(let n=1;n<=90;n++) board.appendChild(makeCell('public-'+n,'cell',n));
    byId('pcMicBtn').addEventListener('click', authorizePcMicro);
  }
  if(isAnimateur){
    const board = byId('remoteBoard');
    for(let n=1;n<=90;n++){
      const btn = makeCell('remote-'+n,'remote-cell',n,'button');
      btn.addEventListener('click',()=>toggleNumber(n));
      board.appendChild(btn);
    }
    byId('microBtn').addEventListener('click',()=>setMicroWanted(!state.microWanted));
    byId('undoBtn').addEventListener('click',undoLast);
    byId('cancelPendingBtn').addEventListener('click',()=>{resetVoicePending();cancelPendingDraw();});
    byId('newGameBtn').addEventListener('click',()=>{if(confirm('Nouvelle partie ?')) newGame();});
    byId('resumeLastBtn').addEventListener('click',resumeLastGame);
    bindCardControls();
  }
  if(isCommissaire) bindCardControls();
}

function bindCardControls(){
  byId('checkBtn').addEventListener('click',checkCardFromInput);
  byId('closeCardsBtn').addEventListener('click',closeCards);
  byId('cardInput').addEventListener('keydown',e=>{if(e.key==='Enter')checkCardFromInput();});
}

function makeDefaultState(){
  const now = new Date().toISOString();
  return { sessionId, title:'Loto Comité des Fêtes', createdAt:now, updatedAt:now, microWanted:false, currentGameId:'g-'+Date.now(), games:[{id:'g-'+Date.now(), label:'Partie 1', createdAt:now, history:[], pendingNumber:null, pendingAt:null, controlledCards:[], checkedCardsLog:[]}] };
}

async function loadOrCreateSession(){
  const {data,error}=await db.from('loto_sessions').select('*').eq('id',sessionId).maybeSingle();
  if(error){ alert('Erreur Supabase : '+error.message); return; }
  if(data){ state=data.state; return; }
  state=makeDefaultState();
  await db.from('loto_sessions').insert({id:sessionId,title:state.title,state});
}

function subscribeRealtime(){
  channel = db.channel('loto-'+sessionId)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'loto_sessions',filter:'id=eq.'+sessionId},payload=>{
      state=payload.new.state;
      renderAll();
      syncPcMicro();
    })
    .subscribe();
}

function scheduleSave(){
  if(!state)return;
  state.updatedAt = new Date().toISOString();
  clearTimeout(saveTimer);
  saveTimer=setTimeout(saveNow,120);
  renderAll();
}
async function saveNow(){
  await db.from('loto_sessions').update({state,title:state.title,updated_at:new Date().toISOString()}).eq('id',sessionId);
}

function game(){ return state.games.find(g=>g.id===state.currentGameId) || state.games[0]; }
function byId(id){return document.getElementById(id)}

function renderAll(){
  if(!state)return;
  const g=game();
  const history=g.history||[];
  const pending=g.pendingNumber||null;
  const last=pending || history[history.length-1] || null;
  if(byId('sessionTitle')) byId('sessionTitle').textContent = state.title + ' - ' + sessionId;
  if(byId('gameInfo')) byId('gameInfo').textContent = (g.label||'Partie') + ' - ' + history.length + ' numéro(s) validé(s)';
  if(byId('lastNumber')) byId('lastNumber').textContent = last || '--';
  if(byId('pendingInfo')) byId('pendingInfo').textContent = pending ? 'Prévalidé - dire erreur pour annuler' : '';
  if(byId('remoteInfo')) byId('remoteInfo').textContent = sessionId + ' - ' + (g.label||'Partie') + ' - ' + history.length + ' numéro(s)' + (pending?' - Prévalidé : '+pending:'');
  for(let n=1;n<=90;n++){
    updateCell(byId('public-'+n),'cell',history.includes(n),last===n,pending===n);
    updateCell(byId('remote-'+n),'remote-cell',history.includes(n),last===n,pending===n);
  }
  renderHistory(byId('historyList'),history,true);
  renderHistory(byId('remoteHistory'),history,false);
  renderGames(byId('gamesList'));
  renderCards();
  renderCheckedCardsLog();
  updateMicroButton();
  updatePcMicButton();
  schedulePendingAutoCommit();
}

function updateCell(el,base,drawn,last,pending){ if(el) el.className=base+(drawn?' drawn':'')+(pending?' pending':'')+(last?' last':''); }
function renderHistory(container,history,pills){
  if(!container)return; container.innerHTML='';
  if(!history.length){container.textContent='Aucun numéro sorti.';return;}
  history.forEach((n,i)=>{const s=document.createElement('span');s.className=pills?'history-pill':'';s.textContent=(i+1)+'. '+n;container.appendChild(s); if(!pills)container.appendChild(document.createTextNode('  '));});
}
function renderGames(container){
  if(!container)return; container.innerHTML='';
  state.games.slice().reverse().forEach(g=>{const div=document.createElement('div');div.className='game-row';const label=document.createElement('div');label.textContent=(g.label||'Partie')+' - '+new Date(g.createdAt).toLocaleString('fr-FR')+' - '+(g.history||[]).length+' n°';const btn=document.createElement('button');btn.textContent='Reprendre';btn.onclick=()=>{state.currentGameId=g.id;scheduleSave();};div.append(label,btn);container.appendChild(div);});
}

function commitPending(){
  const g=game(); if(!g.pendingNumber)return;
  const n=g.pendingNumber;
  g.pendingNumber=null; g.pendingAt=null;
  if(!g.history.includes(n)) g.history.push(n);
  scheduleSave();
}
function preDraw(n){
  n=Number(n); if(!Number.isInteger(n)||n<1||n>90)return;
  const g=game();
  if(g.pendingNumber) commitPending();
  if(g.history.includes(n)) return;
  g.pendingNumber=n; g.pendingAt=new Date().toISOString();
  scheduleSave();
}
function schedulePendingAutoCommit(){
  clearTimeout(pendingTimer);
  const g=state&&game(); if(!g||!g.pendingNumber||!g.pendingAt)return;
  const remaining = PREVALIDATION_DELAY - (Date.now() - new Date(g.pendingAt).getTime());
  pendingTimer=setTimeout(()=>{ if(state && game().pendingNumber) commitPending(); }, Math.max(200,remaining));
}
function cancelPendingDraw(){ const g=game(); g.pendingNumber=null; g.pendingAt=null; scheduleSave(); }
function toggleNumber(n){ const g=game(); if(g.pendingNumber===n){cancelPendingDraw();return;} if(g.history.includes(n)){g.history=g.history.filter(x=>x!==n);} else preDraw(n); scheduleSave(); }
function undoLast(){ const g=game(); if(g.pendingNumber){cancelPendingDraw();return;} g.history.pop(); scheduleSave(); }
function setMicroWanted(active){ state.microWanted=!!active; scheduleSave(); }
function newGame(){ commitPending(); const now=new Date().toISOString(); const num=state.games.length+1; const g={id:'g-'+Date.now(),label:'Partie '+num,createdAt:now,history:[],pendingNumber:null,pendingAt:null,controlledCards:[],checkedCardsLog:[]}; state.games.push(g); state.currentGameId=g.id; scheduleSave(); }
function resumeLastGame(){ if(state.games.length){state.currentGameId=state.games[state.games.length-1].id;scheduleSave();} }
function closeCards(){ game().controlledCards=[]; scheduleSave(); }

function checkCardFromInput(){
  const input=byId('cardInput'); const n=Number(String(input.value||'').trim()); const card=buildCardControl(n);
  if(!card){alert('Carton introuvable.');return;}
  const g=game(); g.controlledCards=[card]; g.checkedCardsLog.push({...card,at:new Date().toISOString()}); input.value=''; scheduleSave();
}
function buildCardControl(numeroCarton){
  if(!Number.isInteger(numeroCarton))return null;
  const index=numeroCarton-101000;
  if(!Array.isArray(CARTONS)||!CARTONS[index])return null;
  const row=CARTONS[index]; const nums=row.slice(1,16).map(Number).filter(Number.isInteger);
  const g=game(); const history=g.history||[]; const last=history[history.length-1]||null;
  const drawnCount=nums.filter(n=>history.includes(n)).length; const dernierPresent=nums.includes(Number(last));
  const gagnant=drawnCount===nums.length && dernierPresent;
  let message=drawnCount+' / '+nums.length+' numéros sortis';
  if(gagnant)message='CARTON GAGNANT'; else if(drawnCount===nums.length&&!dernierPresent)message='Carton complet, mais dernier numéro absent'; else if(drawnCount>=nums.length-1)message='Carton presque complet';
  return {numero:numeroCarton,numeros:nums,drawnCount,dernierPresent,gagnant,message};
}
function renderCards(){
  const cards=(game().controlledCards||[]);
  const modal=byId('cardModal'), content=byId('cardContent'), preview=byId('localCardPreview');
  if(modal&&content){ if(cards.length){modal.classList.add('visible');content.innerHTML='';cards.forEach(c=>content.appendChild(buildCardElement(c,true)));}else{modal.classList.remove('visible');content.innerHTML='';}}
  if(preview){preview.innerHTML='';cards.forEach(c=>preview.appendChild(buildCardElement(c,false)));}
}
function buildCardElement(card,withClose){
  const wrap=document.createElement('div'); const title=document.createElement('div'); title.className='card-title'; title.textContent='CARTON '+card.numero;
  const grid=document.createElement('div'); grid.className='card-grid'; const history=game().history||[]; const last=game().pendingNumber||history[history.length-1]||null;
  (card.numeros||[]).forEach(n=>{const c=document.createElement('div'); c.className='card-num'+(history.includes(Number(n))?' ok':'')+(Number(n)===Number(last)?' last':''); c.textContent=n; grid.appendChild(c);});
  const msg=document.createElement('div'); msg.className='card-message'+(card.gagnant?' win':''); msg.textContent=card.message||''; wrap.append(title,grid,msg);
  if(withClose){const b=document.createElement('button'); b.className='close-card'; b.textContent='FERMER'; b.onclick=closeCards; wrap.appendChild(b);} return wrap;
}
function renderCheckedCardsLog(){
  const c=byId('checkedCardsLog'); if(!c)return; c.innerHTML=''; const rows=(game().checkedCardsLog||[]).slice().reverse(); if(!rows.length){c.textContent='Aucun carton contrôlé.';return;}
  rows.forEach(item=>{const div=document.createElement('div'); div.className='checked-item'; const t=item.at?new Date(item.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''; div.textContent=t+' - Carton '+item.numero+' - '+(item.message||''); c.appendChild(div);});
}

function updateMicroButton(){ const b=byId('microBtn'); if(!b||!state)return; b.className='micro-btn '+(state.microWanted?'micro-on':'micro-off'); b.textContent=state.microWanted?'MICRO ACTIF':'MICRO INACTIF'; }
function updatePcMicButton(){ const b=byId('pcMicBtn'); if(!b||!state)return; b.className='pc-mic'+(microRunning?' on':pcMicAuthorized?' ready':''); b.textContent=microRunning?'Micro PC en écoute':pcMicAuthorized?'Micro PC autorisé':'Autoriser micro PC'; }
function authorizePcMicro(){ pcMicAuthorized=true; ensureRecognition(); try{recognition.start();}catch(_){} setTimeout(()=>{if(!state.microWanted)stopPcMicro();},300); updatePcMicButton(); }
function syncPcMicro(){ if(!isPublic||!state)return; if(state.microWanted&&pcMicAuthorized)startPcMicro(); if(!state.microWanted)stopPcMicro(); }
function startPcMicro(){ ensureRecognition(); try{recognition.start();}catch(_){} }
function stopPcMicro(){ try{if(recognition)recognition.stop();}catch(_){} microRunning=false; updatePcMicButton(); }
function ensureRecognition(){
  if(recognition)return; const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){alert('Reconnaissance vocale non disponible. Utiliser Chrome ou Edge.');return;}
  recognition=new SR(); recognition.lang='fr-FR'; recognition.continuous=true; recognition.interimResults=false;
  recognition.onstart=()=>{microRunning=true;pcMicAuthorized=true;updatePcMicButton();};
  recognition.onresult=e=>handleVoice(e.results[e.results.length-1][0].transcript);
  recognition.onerror=()=>{}; recognition.onend=()=>{microRunning=false;updatePcMicButton(); if(state&&state.microWanted&&pcMicAuthorized&&!restarting){restarting=true;setTimeout(()=>{restarting=false;startPcMicro();},300);}};
}

function normalizeText(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
const numberWords={un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10,onze:11,douze:12,treize:13,quatorze:14,quinze:15,seize:16,vingt:20,trente:30,quarante:40,cinquante:50,soixante:60};
function numbersFromText(text){const words=normalizeText(text).split(' ').filter(Boolean),nums=[];for(let i=0;i<words.length;i++){if(/^\d+$/.test(words[i])){nums.push(Number(words[i]));continue;}const r=numberAt(words,i);if(r){nums.push(r.value);i+=r.skip;}}return nums.filter(n=>Number.isInteger(n)&&n>=1&&n<=999999);}
function numberAt(words,i){const w=words[i];if(numberWords[w]){let value=numberWords[w],skip=0;if([20,30,40,50,60].includes(value)){const next=words[i+1];if(next==='et'&&numberWords[words[i+2]]){value+=numberWords[words[i+2]];skip=2;}else if(numberWords[next]&&numberWords[next]<10){value+=numberWords[next];skip=1;}else if(value===60&&numberWords[next]&&numberWords[next]>=10){value+=numberWords[next];skip=1;}}return{value,skip};}if(w==='quatre'&&words[i+1]==='vingt'){let value=80,skip=1;const next=words[i+2];if(numberWords[next]){value+=numberWords[next];skip=2;}return{value,skip};}return null;}
function repeatedLotoNumber(text){const nums=numbersFromText(text).filter(n=>n>=1&&n<=90);for(let i=0;i<nums.length-1;i++)if(nums[i]===nums[i+1])return nums[i];return null;}
function resetVoicePending(){pendingVoiceNumber=null;pendingVoiceAt=0;}
function handleLotoVoiceNumber(text){const now=Date.now();const nums=numbersFromText(text).filter(n=>n>=1&&n<=90);if(!nums.length)return;const rep=repeatedLotoNumber(text);if(rep){resetVoicePending();preDraw(rep);return;}const n=nums[0];if(pendingVoiceNumber===n&&now-pendingVoiceAt<=PENDING_VOICE_DELAY){resetVoicePending();preDraw(n);return;}pendingVoiceNumber=n;pendingVoiceAt=now;}
function handleVoice(text){const t=normalizeText(text);if(!t)return;if(t.includes('erreur')||t.includes('je me suis trompe')){resetVoicePending();cancelPendingDraw();return;}if(t.includes('fermer affichage carton')||t.includes('ferme affichage carton')||t.includes('fermer carton')||t.includes('ferme carton')){closeCards();return;}if(t.includes('nouvelle partie')){resetVoicePending();newGame();return;}if(t.includes('reprendre derniere partie')){resetVoicePending();resumeLastGame();return;}if(t.includes('annuler dernier')){resetVoicePending();undoLast();return;}if(t.includes('annuler')||t.includes('effacer')){const n=numbersFromText(t).find(x=>x>=1&&x<=90);if(n){resetVoicePending();const g=game();g.history=g.history.filter(x=>x!==n);if(g.pendingNumber===n)g.pendingNumber=null;scheduleSave();}return;}if(t.includes('control')||t.includes('carton')){const n=numbersFromText(t).find(x=>x>=101000);if(n){const card=buildCardControl(n);if(card){game().controlledCards=[card];game().checkedCardsLog.push({...card,at:new Date().toISOString()});scheduleSave();}}return;}handleLotoVoiceNumber(t);}
