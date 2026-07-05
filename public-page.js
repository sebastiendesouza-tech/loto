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

function pad(n){ return String(n).padStart(2,'0'); }
function esc(s){ return String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])); }
function renderPublicCardGrid(card){
  const drawn = new Set([...(Loto.state().drawnNumbers || []), ...(Loto.state().pendingNumber ? [Loto.state().pendingNumber] : [])].map(Number));
  const lastNum = Number(card.lastNumber || 0);
  return `<div class="public-card-grid">${(card.lignes || []).map((line, i) =>
    `<div class="public-card-line ${card.lineResults?.[i]?.ok ? 'complete' : ''}">${line.map(n => {
      const cls = drawn.has(Number(n)) ? 'hit' : 'miss';
      const lastCls = Number(n) === lastNum ? ' last-hit' : '';
      return `<span class="public-card-num ${cls}${lastCls}">${pad(n)}</span>`;
    }).join('')}</div>`
  ).join('')}</div>`;
}
function renderCard(card){
  if(!card){ overlay.style.display='none'; return; }
  overlay.style.display='block';
  const req = card.requirement || {};
  const messages = card.messages && card.messages.length ? card.messages : [card.reason].filter(Boolean);
  overlay.innerHTML = `
    <div class="public-card-overlay-inner">
      <h1>Carton ${esc(card.numero)}</h1>
      <p class="public-card-req">${esc(req.label || '')}</p>
      <p class="${card.valid ? 'ok' : 'bad'} public-card-status">${card.valid ? 'GAIN VALIDE' : 'NON VALIDE'}</p>
      ${renderPublicCardGrid(card)}
      ${messages.length ? `<ul class="public-diagnostic-list">${messages.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
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
  publicGameMode.textContent = s.miniBingoActive ? 'Jeu : Mini-bingo' : (partie ? `Jeu : ${Loto.gameModeLabel(partie)}` : 'Jeu : tirage simple');

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
    const lotLabel = (partie?.gameMode || 'ligne') === 'bingoMystere' ? 'LOT' : ordinalLabel(i);
    return `<div class="public-prize-row ${cls}"><span class="public-prize-step">${stepLabelFor(partie,i)}</span><span class="public-prize-lot">${lotLabel} : ${lot}</span></div>`;
  }).join('')}</div>`;
}

function renderBingo(s){
  if(!s.options?.showBingo || !s.options?.bingoEnabled){ bingoBox.style.display='none'; return; }
  bingoBox.style.display='block';
  bingoBox.innerHTML=`<h3>Mini-bingo</h3><div class="history">${(s.bingoNumbers||[]).slice(-20).reverse().map(n=>`<span class="pill bingo-pill">${String(n).padStart(2,'0')}</span>`).join('')}</div>`;
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
  img.width = 120;
  img.height = 120;
  img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=8&data=' + encodeURIComponent(url);
  qr.appendChild(img);
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
  Loto.renderNumbers(grid);
  renderCard(s.publicCard);
  renderLots(s);
  renderBingo(s);
  renderQr();
  renderToast(s);
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
