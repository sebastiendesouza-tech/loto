Loto.pageHeader();
Loto.protectPage();

const grid = document.getElementById('grid');
const last = document.getElementById('last');
const micBtn = document.getElementById('micBtn');
const publicNextPartie = document.getElementById('publicNextPartie');
let publicProgressBusy=false;
const overlay = document.getElementById('cardOverlay');
const bingoBox = document.getElementById('bingoBox');
const publicPartHeader = document.getElementById('publicPartHeader');
const publicGameTitle = document.getElementById('publicGameTitle');
const publicGameMode = document.getElementById('publicGameMode');
const publicStep = document.getElementById('publicStep');
const publicLot = document.getElementById('publicLot');

function pad(n){ return String(n).padStart(2,'0'); }
function esc(s){ return String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])); }
function renderPublicCardGrid(card){
  const drawn = new Set([...(Loto.state().drawnNumbers || []), ...(Loto.state().pendingNumber ? [Loto.state().pendingNumber] : [])].map(Number));
  const lastNum = Number(card.lastNumber || 0);
  return `<div class="public-card-grid">${Loto.cardGridRows(card).map((line, i) =>
    `<div class="public-card-line card-nine-columns ${card.lineResults?.[i]?.ok ? 'complete' : ''}">${line.map(n => {
      if(n===null)return '<span class="public-card-num empty" aria-hidden="true"></span>';
      const cls = drawn.has(Number(n)) ? 'hit' : 'miss';
      const lastCls = Number(n) === lastNum ? ' last-hit' : '';
      return `<span class="public-card-num ${cls}${lastCls}">${pad(n)}</span>`;
    }).join('')}</div>`
  ).join('')}</div>`;
}
function renderCard(card){
  if(!card){ overlay.style.display='none'; return; }
  overlay.style.display='block';
  const reasons = Loto.cardFailureReasons(card);
  const unsold = card.salesTrackingEnabled && !card.soldForCurrentLoto;
  const status = card.loserMode
    ? (unsold ? 'CARTON NON VENDU' : card.winnerEligible ? 'GAGNANT · DERNIER CARTON' : card.stillInGame ? 'ENCORE EN JEU' : 'ÉLIMINÉ')
    : (card.valid ? 'GAIN VALIDE' : 'NON VALIDE');
  overlay.innerHTML = `
    <div class="public-card-overlay-inner">
      <h1>Carton ${esc(card.numero)}</h1>
      <p class="public-card-req">${esc(Loto.cardControlMode(card))}</p>
      <div class="card-control-summary">
        <p class="${card.valid || (card.stillInGame && !unsold) ? 'ok' : 'bad'} public-card-status">${status}</p>
        ${reasons.length ? `<ul class="card-control-reasons">${reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul>` : ''}
      </div>
      ${renderPublicCardGrid(card)}
    </div>`;
}

function ordinalLabel(i){
  return i === 0 ? '1er LOT' : (i + 1) + 'e LOT';
}

function stepLabelFor(partie, index){
  if((partie?.gameMode || 'ligne') === 'bingoMystere') return 'BINGO MYSTÈRE';
  if((partie?.gameMode || 'ligne') === 'carton') return 'CARTON PLEIN';
  if(index === 0) return '1 LIGNE';
  if(index === 1) return '2 LIGNES';
  return 'CARTON PLEIN';
}

function renderLots(s){
  const opts = s.options || {};
  const partie = Loto.currentPartie();
  const total = (s.program?.parties || []).length;
  const index = (s.currentPartieIndex || 0) + 1;
  const currentPrizeIndex = s.currentPrizeIndex || 0;

  publicPartHeader.textContent = s.miniBingoActive ? 'MINI-BINGO' : (total ? `Partie ${index}/${total}` : 'Partie simple');
  publicGameTitle.textContent = s.miniBingoActive ? 'Mini-bingo' : (total ? `Partie n°${index}` : 'Partie simple');
  const mode = partie?.gameMode || 'ligne';
  const requirement = Loto.currentRequirement();
  const rule = mode === 'perdant' ? 'Aucun numéro tiré sur le carton'
    : mode === 'carton' || mode === 'bingoMystere' ? 'Carton plein'
    : requirement.label;
  publicGameMode.textContent = s.miniBingoActive ? 'Jeu : Mini-bingo' : (partie ? `Jeu : ${rule}` : 'Jeu : tirage simple');

  if(!opts.showLots || !partie){
    publicStep.textContent = '';
    publicLot.innerHTML = '';
    return;
  }

  const prizes = (partie.prizes || []).filter(x => x && x.enabled !== false).slice(0,3);
  publicStep.textContent = '';
  publicLot.innerHTML = `<div class="public-prize-list">${prizes.map((p,i)=>{
    const cls = i < currentPrizeIndex ? 'won' : (i === currentPrizeIndex ? 'active' : 'upcoming');
    const lot = (p.label || 'Lot non renseigné').trim();
    const lotLabel = mode === 'bingoMystere' ? 'LOT' : ordinalLabel(i);
    const step = mode === 'ligne' ? `<span class="public-prize-condition">${stepLabelFor(partie,i)}</span>` : mode === 'bingoMystere' ? '<span class="public-prize-condition">CARTON PLEIN</span>' : '';
    return `<div class="public-prize-row ${cls}"><div class="public-prize-line"><span class="public-prize-label">${lotLabel} :</span> <span class="public-prize-value">${esc(lot)}</span>${step}</div></div>`;
  }).join('')}</div>`;
}

function renderBingo(s){
  if(!s.options?.showBingo || !s.options?.bingoEnabled){ bingoBox.style.display='none'; return; }
  bingoBox.style.display='block';
  bingoBox.innerHTML=`<h3>Mini-bingo</h3><div class="history">${(s.bingoNumbers||[]).slice(-20).reverse().map(n=>`<span class="pill bingo-pill">${String(n).padStart(2,'0')}</span>`).join('')}</div>`;
}

function renderToast(s){
  let el = document.getElementById('publicToast');
  if(!el){ el = document.createElement('div'); el.id='publicToast'; el.className='loto-toast public-toast'; document.body.appendChild(el); }
  const t = s.toast;
  const active = t && (Date.now() - Number(t.at || 0) < Number(t.duration || 5000));
  if(active){ el.textContent = t.message || 'VOUS POUVEZ DÉMARQUER !'; el.classList.add('show'); window.clearTimeout(window.__publicToastTimer); window.__publicToastTimer = window.setTimeout(()=>el.classList.remove('show'), Math.max(200, Number(t.duration||5000) - (Date.now() - Number(t.at||0)))); }
  else el.classList.remove('show');
}

Loto.onChange(s=>{
  Loto.pageHeader();
  last.textContent = Loto.lastNumber();
  Loto.renderNumbers(grid,{button:true,source:'public_backup'});
  const currentNumber = Number(Loto.lastNumber());
  Array.from(grid.children).forEach((cell, index) => cell.classList.toggle('current', index + 1 === currentNumber));
  renderCard(s.publicCard);
  renderLots(s);
  renderBingo(s);
  renderPublicProgress(s);
  renderToast(s);
});

Loto.ensureSession();

const pcMicrophone = LotoPcMicrophone.connect('host', status => {
  micBtn.style.display = status.sourceMode === 'manual' ? 'none' : 'inline-flex';
  micBtn.textContent = status.error ? 'Micro PC : vérifier' :
    status.active ? 'Micro PC : actif' : 'Micro PC : activer';
  micBtn.className = 'public-mic ' + (status.active ? 'red' : 'green');
  micBtn.setAttribute('aria-pressed', String(status.active));
  micBtn.title = status.error ? 'Micro : ' + status.error :
    (status.connected ? 'Reconnaissance des numéros. Commande depuis la tablette disponible.' :
      'Reconnaissance locale. Connexion à la tablette indisponible.');
});
micBtn.onclick = () => pcMicrophone.toggle();

function renderPublicProgress(s){
  publicNextPartie.disabled=publicProgressBusy||!s.gameActive||!!s.gameEnded;
  publicNextPartie.textContent=Loto.progressLabel(s);
}
publicNextPartie.onclick=async()=>{
  if(publicNextPartie.disabled||publicProgressBusy)return;
  const s=Loto.state(),parties=s.program?.parties||[],pi=Number(s.currentPartieIndex||0),li=Number(s.currentPrizeIndex||0);
  const prizes=(parties[pi]?.prizes||[]).filter(prize=>prize&&prize.enabled!==false);
  let question;
  if(s.miniBingoReady)question='Lancer le Mini-bingo ?\nLes numéros de la partie précédente seront remis à zéro.';
  else if(s.miniBingoActive)question='Terminer le Mini-bingo et le loto ?\nLes numéros du tirage seront effacés.';
  else if(li<prizes.length-1)question=`Passer au lot suivant de la partie n°${pi+1} ?\nLes numéros déjà tirés seront conservés.`;
  else if(pi<parties.length-1)question=`Passer à la partie n°${pi+2} ?\nLes numéros du tirage actuel seront remis à zéro.`;
  else if(s.options?.bingoEnabled&&!s.miniBingoWon)question='Terminer la dernière partie et préparer le Mini-bingo ?\nLes numéros du tirage actuel seront remis à zéro.';
  else question='Terminer cette partie et le loto ?\nLes numéros du tirage actuel seront remis à zéro.';
  if(!confirm(question))return;
  publicProgressBusy=true;renderPublicProgress(s);
  try{
    if(s.miniBingoReady)await Loto.startMiniBingo();
    else await Loto.winner();
  }catch(error){alert('Impossible de passer à la suite : '+(error.message||error));}
  finally{publicProgressBusy=false;renderPublicProgress(Loto.state());}
};
