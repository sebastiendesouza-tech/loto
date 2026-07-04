Loto.pageHeader();
Loto.protectPage();

const grid = document.getElementById('grid');
const last = document.getElementById('last');
const qr = document.getElementById('qr');
const playerLink = document.getElementById('playerLink');
const micBtn = document.getElementById('micBtn');
const overlay = document.getElementById('cardOverlay');
const bingoBox = document.getElementById('bingoBox');
const publicPartHeader = document.getElementById('publicPartHeader');
const publicGameTitle = document.getElementById('publicGameTitle');
const publicGameMode = document.getElementById('publicGameMode');
const publicStep = document.getElementById('publicStep');
const publicLot = document.getElementById('publicLot');

let lastQrUrl = '';

function playerUrl(){
  const base = Loto.C.PLAYER_URL || (location.origin + location.pathname.replace('public.html','joueur.html'));
  return base + '?s=' + encodeURIComponent(Loto.code());
}

function renderCard(card){
  if(!card){ overlay.style.display='none'; return; }
  overlay.style.display='block';
  const lines=(card.lignes||[]).map((l,i)=>`<tr><th>Ligne ${i+1}</th>${l.map(n=>`<td style="padding:14px 18px;border:1px solid #ddd;font-size:34px;font-weight:900">${String(n).padStart(2,'0')}</td>`).join('')}</tr>`).join('');
  const req=card.requirement||{};
  overlay.innerHTML=`<h1 style="font-size:56px;margin:0 0 18px">Carton ${card.numero}</h1><p style="font-size:34px"><b>${req.label||''}</b></p><p style="font-size:34px" class="${card.valid?'ok':'bad'}">${card.valid?'GAIN VALIDE':'NON VALIDE'}</p><p style="font-size:24px">${card.reason||''}</p><table style="border-collapse:collapse;width:100%;text-align:center">${lines}</table>`;
}

function renderLots(s){
  const opts = s.options || {};
  const partie = Loto.currentPartie();
  const prize = Loto.currentPrize();
  const total = (s.program?.parties || []).length;
  const index = (s.currentPartieIndex || 0) + 1;

  publicPartHeader.textContent = total ? `Partie ${index}/${total}` : 'Partie simple';
  publicGameTitle.textContent = total ? `Partie n°${index}` : 'Partie simple';
  publicGameMode.textContent = partie ? `Jeu : ${Loto.gameModeLabel(partie)}` : 'Jeu : tirage simple';

  if(!opts.showLots || !partie || !prize){
    publicStep.textContent = '';
    publicLot.textContent = '';
    return;
  }

  const req = Loto.currentRequirement();
  publicStep.textContent = (req.label || '').toUpperCase();
  publicLot.textContent = `LOT : ${prize.label || 'Lot non renseigné'}`;
}

function renderBingo(s){
  if(!s.options?.showBingo || !s.options?.bingoEnabled){ bingoBox.style.display='none'; return; }
  bingoBox.style.display='block';
  bingoBox.innerHTML=`<h3>Bingo</h3><div class="history">${(s.bingoNumbers||[]).slice(-20).reverse().map(n=>`<span class="pill bingo-pill">${String(n).padStart(2,'0')}</span>`).join('')}</div>`;
}

function renderQr(){
  const url = playerUrl();
  playerLink.textContent = 'Scannez pour suivre le tirage';
  if(url === lastQrUrl && qr.childNodes.length) return;
  lastQrUrl = url;
  qr.innerHTML = '';

  // QR fiable sur GitHub Pages : image externe directe, sans afficher l'URL longue.
  const img = document.createElement('img');
  img.alt = 'QR Code joueur';
  img.width = 220;
  img.height = 220;
  img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=' + encodeURIComponent(url);
  qr.appendChild(img);
}

Loto.onChange(s=>{
  Loto.pageHeader();
  last.textContent = Loto.lastNumber();
  Loto.renderNumbers(grid);
  renderCard(s.publicCard);
  renderLots(s);
  renderBingo(s);
  renderQr();
});

Loto.ensureSession();

function updateMic(on){
  micBtn.textContent = 'Micro PC';
  micBtn.className = 'public-mic ' + (on ? 'red' : 'green');
  micBtn.title = on ? 'Micro actif' : 'Micro inactif';
}

micBtn.onclick = () => {
  if(!window.LotoVoice){ updateMic(false); return; }
  LotoVoice.toggle((on) => updateMic(on));
};
