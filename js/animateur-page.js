Loto.pageHeader();Loto.protectPage();
const grid=document.getElementById('grid'),last=document.getElementById('last'),history=document.getElementById('history'),currentLot=document.getElementById('currentLot'),animCardNumber=document.getElementById('animCardNumber'),animCardResult=document.getElementById('animCardResult');
const animateurPartTitle=document.getElementById('animateurPartTitle');
const launchModal=document.getElementById('launchModal'),launchList=document.getElementById('launchList'),launchGuard=document.getElementById('launchGuard');
const voiceControlMode=document.getElementById('voiceControlMode'),voiceMode=document.getElementById('voiceMode'),voicePauseBanner=document.getElementById('voicePauseBanner'),miniBingoWon=document.getElementById('miniBingoWon');

const launchLotoButton=document.getElementById('launchLoto');
const simpleGameButton=document.getElementById('newGame');
const voiceListeningButton=document.getElementById('toggleVoiceListening');
const animateurMenuLink=document.getElementById('animateurMenuLink');
if(animateurMenuLink)animateurMenuLink.href='index.html?s='+encodeURIComponent(Loto.code());
let animateurSessionReady=false;
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
  launchLotoButton.disabled=!animateurSessionReady||blocked;
  simpleGameButton.disabled=!animateurSessionReady||blocked;
  simpleGameButton.title=!animateurSessionReady?'Chargement du loto…':blocked?'Un loto est déjà en cours.':'Créer une partie simple';
  launchLotoButton.title=!animateurSessionReady?'Chargement du loto…':blocked?'Un loto est déjà en cours.':'Lancer un loto enregistré';
  document.getElementById('modalBlankGame').disabled=!animateurSessionReady||blocked;
  if(launchGuard){launchGuard.style.display=blocked?'block':'none';launchGuard.textContent=blocked?'Une partie est déjà en cours. Termine-la ou arrête-la depuis Administration > Lotos enregistrés.':'';}
  const list=Loto.state().savedPrograms||[];
  if(!list.length){ launchList.innerHTML='<p>Aucun loto enregistré. Utilise “Partie simple” ou prépare un loto dans Administration.</p>'; return; }
  launchList.innerHTML=list.map((p,i)=>`<div class="saved-row"><div><b>${esc(programTitle(p))}</b><br><span class="muted">${esc(p.date||'Sans date')} · ${(p.parties||[]).length} partie(s)</span></div><button data-start="${i}" class="green" ${blocked?'disabled':''}>Lancer</button></div>`).join('');
  launchList.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>startProgram(list[Number(b.dataset.start)]));
}
launchLotoButton.onclick=()=>{if(launchLotoButton.disabled||!Loto.canStartGame())return;drawLaunchList();launchModal.style.display='flex';};
document.getElementById('closeLaunch').onclick=()=>launchModal.style.display='none';
document.getElementById('modalBlankGame').onclick=async()=>{ if(document.getElementById('modalBlankGame').disabled)return; if(!Loto.canStartGame()){alert('Une partie est déjà en cours.');return;} if(confirm('Créer une nouvelle partie simple ?')){ await Loto.newGame(); launchModal.style.display='none'; } };
simpleGameButton.onclick=async()=>{ if(simpleGameButton.disabled)return; if(!Loto.canStartGame()){alert('Une partie est déjà en cours. Termine-la ou arrête-la depuis Administration.');return;} if(confirm('Créer une nouvelle partie simple ?')) await Loto.newGame(); };
const cancelPendingBtn=document.getElementById('cancelPending'); if(cancelPendingBtn) cancelPendingBtn.onclick=()=>Loto.cancelPending();
document.getElementById('animHidePublic').onclick=()=>Loto.hidePublicCard();
function pad(n){return String(n).padStart(2,'0');}
function drawnSet(){return new Set([...(Loto.state().drawnNumbers||[]),...(Loto.state().pendingNumber?[Loto.state().pendingNumber]:[])].map(Number));}
function cardMiniHtml(r){const drawn=drawnSet(); const lastNum=Number(r.lastNumber||0); return `<div class="mini-card compact-mini">${Loto.cardGridRows(r).map((line,i)=>`<div class="mini-card-line card-nine-columns ${r.lineResults?.[i]?.ok?'complete':''}">${line.map(n=>n===null?'<span class="mini-card-num empty" aria-hidden="true"></span>':`<span class="mini-card-num ${drawn.has(Number(n))?'hit':'miss'}${Number(n)===lastNum?' last-hit':''}">${pad(n)}</span>`).join('')}</div>`).join('')}</div>`;}
function diagnosticHtml(r){const reasons=Loto.cardFailureReasons(r);return reasons.length?`<ul class="card-control-reasons">${reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul>`:'';}
function renderAnimCard(payload){if(!animCardResult)return; if(!payload){animCardResult.innerHTML='';return;} if(!payload.found){animCardResult.innerHTML=`<div class="card-control-summary"><span class="bad control-card-status">NON VALIDE</span><p class="card-control-reasons">${esc(payload.message||Loto.knownMissingCardMessage(payload.numero)||("Carton "+payload.numero+" non enregistré dans la base."))}</p></div>`;return;} const r=payload.result; const loser=r.loserMode; const unsold=r.salesTrackingEnabled&&!r.soldForCurrentLoto; const status=loser?(unsold?'<span class="bad">CARTON NON VENDU</span>':r.winnerEligible?'<span class="ok">GAGNANT · DERNIER CARTON</span>':r.stillInGame?'<span class="ok">ENCORE EN JEU</span>':'<span class="bad">ÉLIMINÉ</span>'):(r.valid?'<span class="ok">GAIN VALIDE</span>':'<span class="bad">NON VALIDE</span>'); animCardResult.innerHTML=`<div class="control-card-result ${r.valid||r.stillInGame&&!unsold?'valid':'invalid'}"><div class="controlled-card-heading"><b>Carton ${esc(r.numero)}</b><p class="controlled-card-mode">${esc(Loto.cardControlMode(r))}</p></div><div class="card-control-summary"><div class="control-card-status">${status}</div>${diagnosticHtml(r)}</div>${cardMiniHtml(r)}</div>`;}
const cartonNumberInput=LotoCardNumberInput.bind(animCardNumber,document.getElementById('animateurCardPrefix'));
document.getElementById('animCheckBtn').onclick=async()=>{
  const code=cartonNumberInput.read();if(!code)return;
  const payload=await Loto.controlCard(code);renderAnimCard(payload);if(payload?.found)await Loto.showPublicCard(payload.result);
};
animCardNumber.onkeydown=e=>{if(e.key==='Enter')document.getElementById('animCheckBtn').click();};
const nextPartieButton=document.getElementById('winner');
let animateurProgressBusy=false;
function renderAnimateurProgress(s){
  nextPartieButton.textContent=s.miniBingoReady?'Fin du loto':Loto.progressLabel(s);
  nextPartieButton.disabled=animateurProgressBusy||!s.gameActive||!!s.gameEnded||!!s.miniBingoReady||Loto.mysteryState(s).awaitingChoice;
}
nextPartieButton.onclick=async()=>{
  if(nextPartieButton.disabled)return;
  const s=Loto.state(),parties=s.program?.parties||[],pi=Number(s.currentPartieIndex||0),li=Number(s.currentPrizeIndex||0);
  const prizes=(parties[pi]?.prizes||[]).filter(prize=>prize&&prize.enabled!==false);
  let question;
  if(s.miniBingoActive)question='Terminer le mini-bingo et le loto ?\nLes numéros du tirage seront effacés.';
  else if(s.miniBingoReady){alert('Le mini-bingo est en attente. Utilisez « Lancer Mini-bingo ».');return;}
  else if(li<prizes.length-1)question=`Passer au lot suivant de la partie n°${pi+1} ?\nLes numéros déjà tirés seront conservés.`;
  else if(pi<parties.length-1)question=`Passer à la partie n°${pi+2} ?\nLes numéros du tirage actuel seront remis à zéro.`;
  else if(s.options?.bingoEnabled&&!s.miniBingoWon)question='Terminer la dernière partie et préparer le mini-bingo ?\nLes numéros du tirage actuel seront remis à zéro.';
  else question='Terminer cette partie et le loto ?\nLes numéros du tirage actuel seront remis à zéro.';
  if(!confirm(question))return;
  animateurProgressBusy=true;renderAnimateurProgress(s);
  try{await Loto.winner();}finally{animateurProgressBusy=false;renderAnimateurProgress(Loto.state());}
};
const startMiniBingoBtn=document.getElementById('startMiniBingo');
if(startMiniBingoBtn) startMiniBingoBtn.onclick=()=>{if(confirm('Lancer le Mini-bingo ?\nLes numéros de la partie précédente seront remis à zéro.'))return Loto.startMiniBingo();};
let legacyModeUpdateScheduled=false;
const pcMicrophone = LotoPcMicrophone.connect('controller', status => {
  const connected = status.connected && status.online;
  if(voiceListeningButton){
    voiceListeningButton.disabled=!connected||!status.ready||status.pending||status.sourceMode==='manual';
    voiceListeningButton.textContent=status.pending?'Commande en cours…':status.active?'Couper le micro':'Reprendre le micro';
    voiceListeningButton.className=(status.active?'red':'green')+' voice-listening-button animateur-micro-button';
    voiceListeningButton.setAttribute('aria-pressed',String(!!status.active));
    voiceListeningButton.title=!connected?'Le PC n’est pas joignable.':!status.ready?'Activez Micro PC sur l’affichage public du PC.':status.sourceMode==='manual'?'Choisissez Vocal pour reprendre l’écoute.':status.active?'Suspendre la reconnaissance des numéros sur le PC':'Reprendre la reconnaissance des numéros sur le PC';
  }
  if(voiceControlMode){ voiceControlMode.disabled = !connected || status.pending; voiceControlMode.value = status.sourceMode; }
  if(voiceMode){ voiceMode.disabled = !connected || !status.ready || status.pending; voiceMode.value = status.mode==='numero'?'numero':'le'; }
  if(status.mode==='free'&&connected&&status.ready&&!status.pending&&!status.error&&!legacyModeUpdateScheduled){
    legacyModeUpdateScheduled=true;
    Promise.resolve().then(()=>pcMicrophone.setMode('le')).catch(error=>console.warn('Mise à jour du mot-clé impossible.',error)).finally(()=>{legacyModeUpdateScheduled=false;});
  }
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
if(voiceListeningButton)voiceListeningButton.onclick=()=>{if(!voiceListeningButton.disabled)void pcMicrophone.toggle();};
if(voiceControlMode) voiceControlMode.onchange = () => pcMicrophone.setSourceMode(voiceControlMode.value);
if(voiceMode) voiceMode.onchange = () => pcMicrophone.setMode(voiceMode.value);
if(miniBingoWon) miniBingoWon.onclick=async()=>{ if(confirm('Confirmer que le Mini-bingo a été gagné ?')) await Loto.markMiniBingoWon(); };
function renderLot(s){
  if(miniBingoWon)miniBingoWon.style.display=(s.options?.bingoEnabled&&!s.miniBingoWon&&!s.miniBingoActive&&s.gameActive)?'inline-flex':'none';
  if(startMiniBingoBtn)startMiniBingoBtn.style.display=s.miniBingoReady?'inline-flex':'none';
  if(s.miniBingoActive){animateurPartTitle.textContent='MINI-BINGO';currentLot.innerHTML='<div class="commissaire-lot-mode">Tirage de départage en cours</div>';return;}
  const p=Loto.currentPartie();
  const parties=s.program?.parties||[];
  const lastPartie=!parties.length||Number(s.currentPartieIndex||0)>=parties.length-1;
  const prizeCount=(p?.prizes||[]).filter(prize=>prize&&prize.enabled!==false).length;
  const lastPrize=!prizeCount||Number(s.currentPrizeIndex||0)>=prizeCount-1;
  const lotoEnded=!!s.gameEnded&&!s.gameActive&&lastPartie&&lastPrize;
  const notice=s.miniBingoReady?'Loto principal terminé · Mini-bingo à lancer':lotoEnded?'Fin du loto':'';
  if(!p){animateurPartTitle.textContent='Partie simple';currentLot.innerHTML=`${notice?`<div class="animateur-lot-notice">${notice}</div>`:''}<div class="commissaire-lot-mode">Aucun lot programmé</div>`;return;}
  if(Loto.isMysteryMode(p.gameMode)){
    animateurPartTitle.textContent=Loto.partieLabel(s);
    LotoMysteryBoard.render(currentLot,{state:s,interactive:true});return;
  }
  const mode=p.gameMode||'ligne',prizes=(p.prizes||[]).filter(prize=>prize&&prize.enabled!==false);
  const prizeIndex=Number(s.currentPrizeIndex||0);
  const rule=Loto.isLoserMode(mode)?'Aucun numéro tiré sur le carton':mode==='carton'||Loto.isMysteryMode(mode)?'Carton plein':Loto.currentRequirement().label;
  animateurPartTitle.textContent=Loto.partieLabel(s);
  currentLot.innerHTML=`${notice?`<div class="animateur-lot-notice">${notice}</div>`:''}<div class="commissaire-lot-mode">Jeu : ${esc(rule)}</div><div class="commissaire-prize-list">${prizes.map((prize,i)=>{
    const cls=i<prizeIndex?'won':i===prizeIndex&&!lotoEnded&&!s.miniBingoReady?'active':'upcoming';
    const label=Loto.isMysteryMode(mode)?'LOT':`${i+1}${i===0?'er':'e'} LOT`;
    const condition=mode==='ligne'?(i===0?'1 LIGNE':i===1?'2 LIGNES':'CARTON PLEIN'):Loto.isLoserMode(mode)?'AUCUN NUMÉRO':'CARTON PLEIN';
    return `<div class="commissaire-prize-row ${cls}"><div><strong>${label} :</strong> <span>${esc(prize.label||'Lot non renseigné')}</span></div><small>${condition}</small></div>`;
  }).join('')||'<p>Aucun lot renseigné.</p>'}</div>`;
}
Loto.onChange(s=>{
  Loto.pageHeader();
  Loto.renderNumbers(grid,{button:true});
  last.textContent=Loto.lastNumber();
  history.innerHTML=(s.drawnNumbers||[]).slice().reverse().map(n=>`<span class="pill">${String(n).padStart(2,'0')}</span>`).join('');
  renderLot(s);
  renderAnimateurProgress(s);
  if(s.publicCard){
    renderAnimCard({found:true,result:s.publicCard});
  } else if(Number(s.cardClosedAt||0) && Number(s.cardClosedAt||0)!==lastCardClosedAt){
    lastCardClosedAt=Number(s.cardClosedAt||0);
    renderAnimCard(null);
  }
  drawLaunchList();
});
Loto.ensureSession().then(()=>{animateurSessionReady=true;drawLaunchList();}).catch(()=>{launchLotoButton.disabled=true;launchLotoButton.title='Impossible de charger le loto.';});
