Loto.pageHeader();Loto.protectPage();
const grid=document.getElementById('grid'),last=document.getElementById('last'),history=document.getElementById('history'),currentLot=document.getElementById('currentLot'),animCardNumber=document.getElementById('animCardNumber'),animCardResult=document.getElementById('animCardResult');
const launchModal=document.getElementById('launchModal'),launchList=document.getElementById('launchList'),launchGuard=document.getElementById('launchGuard');
const voiceControlMode=document.getElementById('voiceControlMode'),voiceMode=document.getElementById('voiceMode'),voicePauseBanner=document.getElementById('voicePauseBanner'),miniBingoWon=document.getElementById('miniBingoWon');

let lastCardClosedAt = 0;
function programTitle(program){return (program?.title||'').trim() || 'Loto sans nom';}
function esc(v){return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function startProgram(program){
  if(!program) return;
  if(!Loto.canStartGame()){ alert('Une partie est déjà en cours. Termine-la ou utilise « Stopper le loto / la partie » dans Administration > Lotos enregistrés.'); return; }
  Loto.save({lotoName:program.title||'Loto by SdS',program,options:{...Loto.state().options,bingoEnabled:!!program.bingo_enabled,showBingo:!!program.show_bingo,miniBingoSource:program.mini_bingo_source||'first'},...Loto.freshGamePatch(program),history:[{t:new Date().toISOString(),type:'start_program',label:'Lancement : '+programTitle(program),data:{programId:program.id}}]});
  launchModal.style.display='none';
}
function drawLaunchList(){
  const blocked=!Loto.canStartGame();
  if(launchGuard){launchGuard.style.display=blocked?'block':'none';launchGuard.textContent=blocked?'Une partie est déjà en cours. Termine-la ou arrête-la depuis Administration > Lotos enregistrés.':'';}
  const list=Loto.state().savedPrograms||[];
  if(!list.length){ launchList.innerHTML='<p>Aucun loto enregistré. Utilise “Partie simple” ou prépare un loto dans Administration.</p>'; return; }
  launchList.innerHTML=list.map((p,i)=>`<div class="saved-row"><div><b>${esc(programTitle(p))}</b><br><span class="muted">${esc(p.date||'Sans date')} · ${(p.parties||[]).length} partie(s)</span></div><button data-start="${i}" class="green" ${blocked?'disabled':''}>Lancer</button></div>`).join('');
  launchList.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>startProgram(list[Number(b.dataset.start)]));
}
document.getElementById('launchLoto').onclick=()=>{drawLaunchList();launchModal.style.display='flex';};
document.getElementById('closeLaunch').onclick=()=>launchModal.style.display='none';
document.getElementById('modalBlankGame').onclick=async()=>{ if(!Loto.canStartGame()){alert('Une partie est déjà en cours.');return;} if(confirm('Créer une nouvelle partie simple ?')){ await Loto.newGame(); launchModal.style.display='none'; } };
document.getElementById('newGame').onclick=async()=>{ if(!Loto.canStartGame()){alert('Une partie est déjà en cours. Termine-la ou arrête-la depuis Administration.');return;} if(confirm('Créer une nouvelle partie simple ?')) await Loto.newGame(); };
const cancelPendingBtn=document.getElementById('cancelPending'); if(cancelPendingBtn) cancelPendingBtn.onclick=()=>Loto.cancelPending();
document.getElementById('animHidePublic').onclick=()=>Loto.hidePublicCard();
function pad(n){return String(n).padStart(2,'0');}
function drawnSet(){return new Set([...(Loto.state().drawnNumbers||[]),...(Loto.state().pendingNumber?[Loto.state().pendingNumber]:[])].map(Number));}
function cardMiniHtml(r){const drawn=drawnSet(); const lastNum=Number(r.lastNumber||0); return `<div class="mini-card compact-mini">${(r.lignes||[]).map((line,i)=>`<div class="mini-card-line ${r.lineResults?.[i]?.ok?'complete':''}">${line.map(n=>`<span class="mini-card-num ${drawn.has(Number(n))?'hit':'miss'}${Number(n)===lastNum?' last-hit':''}">${pad(n)}</span>`).join('')}</div>`).join('')}</div>`;}
function diagnosticHtml(r){const label=Loto.cardFailureLabel(r);return label?`<ul class="diagnostic-list"><li>${esc(label)}</li></ul>`:'';}
function renderAnimCard(payload){if(!animCardResult)return; if(!payload){animCardResult.innerHTML='';return;} if(!payload.found){animCardResult.innerHTML=`<p class="bad">${esc(payload.message||Loto.knownMissingCardMessage(payload.numero)||("Carton "+payload.numero+" non enregistré dans la base."))}</p>`;return;} const r=payload.result; const loser=r.loserMode; const unsold=r.salesTrackingEnabled&&!r.soldForCurrentLoto; const status=loser?(unsold?'<span class="bad">CARTON NON VENDU</span>':r.winnerEligible?'<span class="ok">GAGNANT · DERNIER CARTON</span>':r.stillInGame?'<span class="ok">ENCORE EN JEU</span>':'<span class="bad">ÉLIMINÉ</span>'):(r.valid?'<span class="ok">GAIN VALIDE</span>':'<span class="bad">NON VALIDE</span>'); animCardResult.innerHTML=`<div class="control-card-result ${r.valid||r.stillInGame&&!unsold?'valid':'invalid'}"><b>Carton ${esc(r.numero)}</b> · ${status}${cardMiniHtml(r)}${diagnosticHtml(r)}</div>`;}
document.getElementById('animCheckBtn').onclick=async()=>{if(!animCardNumber.value)return; const payload=await Loto.controlCard(animCardNumber.value); renderAnimCard(payload); if(payload?.found) await Loto.showPublicCard(payload.result);};
animCardNumber.onkeydown=e=>{if(e.key==='Enter')document.getElementById('animCheckBtn').click();};
document.getElementById('winner').onclick=()=>Loto.winner();
const startMiniBingoBtn=document.getElementById('startMiniBingo');
if(startMiniBingoBtn) startMiniBingoBtn.onclick=()=>Loto.startMiniBingo();
const pcMicrophone = LotoPcMicrophone.connect('controller', status => {
  const connected = status.connected && status.online;
  if(voiceControlMode){ voiceControlMode.disabled = !connected || status.pending; voiceControlMode.value = status.sourceMode; }
  if(voiceMode){ voiceMode.disabled = !connected || !status.ready || status.pending; voiceMode.value = status.mode; }
  if(voicePauseBanner){
    const waitingForMic = status.sourceMode === 'micro' && !status.ready && !status.error;
    voicePauseBanner.style.display = connected && !status.error && !status.pending && !waitingForMic ? 'none' : 'block';
    voicePauseBanner.textContent = status.error ? 'Micro PC : ' + status.error :
      !status.connected ? 'Commande du PC déconnectée. Vérifiez Internet sur la tablette.' :
      !status.online ? 'PC non joignable. Ouvrez l’affichage public sur le PC avec la même session.' :
      waitingForMic ? 'Cliquez une fois sur Micro PC sur le PC pour autoriser le microphone.' :
      status.pending ? 'Commande envoyée : attente de confirmation du PC.' :
      '';
  }
});
if(voiceControlMode) voiceControlMode.onchange = () => pcMicrophone.setSourceMode(voiceControlMode.value);
if(voiceMode) voiceMode.onchange = () => pcMicrophone.setMode(voiceMode.value);
if(miniBingoWon) miniBingoWon.onclick=async()=>{ if(confirm('Confirmer que le Mini-bingo a été gagné ?')) await Loto.markMiniBingoWon(); };
function renderLot(s){if(miniBingoWon) miniBingoWon.style.display=(s.options?.bingoEnabled&&!s.miniBingoWon&&!s.miniBingoActive&&s.gameActive)?'inline-flex':'none'; if(startMiniBingoBtn) startMiniBingoBtn.style.display=s.miniBingoReady?'inline-flex':'none'; if(s.miniBingoReady){currentLot.innerHTML='<b>LOTO PRINCIPAL TERMINÉ</b> · Mini-bingo non gagné : utilise le bouton « Lancer Mini-bingo ».';return;} if(s.gameEnded&&!s.gameActive){currentLot.innerHTML='<b>FIN DU LOTO</b>';return;} if(s.miniBingoActive){currentLot.innerHTML='<b>MINI-BINGO</b> · tirage de départage en cours';return;}const p=Loto.currentPartie();const prize=Loto.currentPrize();if(!p||!prize){currentLot.innerHTML='<b>Lot en cours :</b> partie simple sans programme';return;}const req=Loto.currentRequirement();currentLot.innerHTML=`<b>${p.name||'Partie'}</b> · <span>${Loto.gameModeLabel(p)}</span> · <strong>${req.label}</strong> · <b>LOT : ${prize.label||'Lot non renseigné'}</b>`;}
Loto.onChange(s=>{
  Loto.pageHeader();
  Loto.renderNumbers(grid,{button:true});
  last.textContent=Loto.lastNumber();
  history.innerHTML=(s.drawnNumbers||[]).slice().reverse().map(n=>`<span class="pill">${String(n).padStart(2,'0')}</span>`).join('');
  renderLot(s);
  if(s.publicCard){
    renderAnimCard({found:true,result:s.publicCard});
  } else if(Number(s.cardClosedAt||0) && Number(s.cardClosedAt||0)!==lastCardClosedAt){
    lastCardClosedAt=Number(s.cardClosedAt||0);
    renderAnimCard(null);
  }
  drawLaunchList();
});
Loto.ensureSession();
