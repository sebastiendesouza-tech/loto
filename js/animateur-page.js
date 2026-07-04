Loto.pageHeader();Loto.protectPage();
const grid=document.getElementById('grid'),last=document.getElementById('last'),count=document.getElementById('count'),history=document.getElementById('history'),currentLot=document.getElementById('currentLot'),animCardNumber=document.getElementById('animCardNumber'),animCardResult=document.getElementById('animCardResult');
const launchModal=document.getElementById('launchModal'),launchList=document.getElementById('launchList');
function programTitle(program){return (program?.title||'').trim() || 'Loto sans nom';}
function esc(v){return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function startProgram(program){
  if(!program) return;
  Loto.save({lotoName:program.title||'LOTO SDS',program,...Loto.freshGamePatch(program),history:[{t:new Date().toISOString(),type:'start_program',label:'Lancement : '+programTitle(program),data:{programId:program.id}}]});
  launchModal.style.display='none';
}
function drawLaunchList(){
  const list=Loto.state().savedPrograms||[];
  if(!list.length){ launchList.innerHTML='<p>Aucun loto enregistré. Utilise “Partie simple” ou prépare un loto dans Administration.</p>'; return; }
  launchList.innerHTML=list.map((p,i)=>`<div class="saved-row"><div><b>${esc(programTitle(p))}</b><br><span class="muted">${esc(p.date||'Sans date')} · ${(p.parties||[]).length} partie(s)</span></div><button data-start="${i}" class="green">Lancer</button></div>`).join('');
  launchList.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>startProgram(list[Number(b.dataset.start)]));
}
document.getElementById('launchLoto').onclick=()=>{drawLaunchList();launchModal.style.display='flex';};
document.getElementById('closeLaunch').onclick=()=>launchModal.style.display='none';
document.getElementById('modalBlankGame').onclick=()=>{ if(confirm('Créer une nouvelle partie simple ?')){ Loto.newGame(); launchModal.style.display='none'; } };
document.getElementById('newGame').onclick=()=>{ if(confirm('Créer une nouvelle partie simple ?')) Loto.newGame(); };
document.getElementById('undo').onclick=()=>Loto.undoLast();
document.getElementById('cancelPending').onclick=()=>Loto.cancelPending();
document.getElementById('animHidePublic').onclick=()=>Loto.hidePublicCard();
function pad(n){return String(n).padStart(2,'0');}
function drawnSet(){return new Set([...(Loto.state().drawnNumbers||[]),...(Loto.state().pendingNumber?[Loto.state().pendingNumber]:[])].map(Number));}
function cardMiniHtml(r){const drawn=drawnSet(); const lastNum=Number(r.lastNumber||0); return `<div class="mini-card compact-mini">${(r.lignes||[]).map((line,i)=>`<div class="mini-card-line ${r.lineResults?.[i]?.ok?'complete':''}">${line.map(n=>`<span class="mini-card-num ${drawn.has(Number(n))?'hit':'miss'}${Number(n)===lastNum?' last-hit':''}">${pad(n)}</span>`).join('')}</div>`).join('')}</div>`;}
function diagnosticHtml(r){const details=r.messages&&r.messages.length?r.messages:[r.reason].filter(Boolean);return details.length?`<ul class="diagnostic-list">${details.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`:'';}
function renderAnimCard(payload){if(!animCardResult)return; if(!payload){animCardResult.innerHTML='';return;} if(!payload.found){animCardResult.innerHTML=`<p class="bad">Carton ${esc(payload.numero)} non enregistré dans la base.</p><p>Vérifiez le numéro saisi.</p>`;return;} const r=payload.result; animCardResult.innerHTML=`<div class="control-card-result ${r.valid?'valid':'invalid'}"><b>Carton ${esc(r.numero)}</b> · ${r.valid?'<span class="ok">GAIN VALIDE</span>':'<span class="bad">NON VALIDE</span>'}${cardMiniHtml(r)}${diagnosticHtml(r)}</div>`;}
document.getElementById('animCheckBtn').onclick=async()=>{if(!animCardNumber.value)return; const payload=await Loto.controlCard(animCardNumber.value); renderAnimCard(payload); if(payload?.found) await Loto.showPublicCard(payload.result);};
animCardNumber.onkeydown=e=>{if(e.key==='Enter')document.getElementById('animCheckBtn').click();};
document.getElementById('winner').onclick=()=>Loto.winner();
function renderLot(s){const p=Loto.currentPartie();const prize=Loto.currentPrize();if(!p||!prize){currentLot.innerHTML='<b>Lot en cours :</b> partie simple sans programme';return;}const req=Loto.currentRequirement();currentLot.innerHTML=`<b>${p.name||'Partie'}</b> · <span>${Loto.gameModeLabel(p)}</span> · <strong>${req.label}</strong> · <b>${prize.label||'Lot non renseigné'}</b>`;}
Loto.onChange(s=>{Loto.pageHeader();Loto.renderNumbers(grid,{button:true});last.textContent=Loto.lastNumber();count.textContent=(s.drawnNumbers||[]).length;history.innerHTML=(s.drawnNumbers||[]).slice().reverse().map(n=>`<span class="pill">${String(n).padStart(2,'0')}</span>`).join('');renderLot(s);drawLaunchList();});
Loto.ensureSession();
