Loto.pageHeader();
Loto.protectPage();

const grid = document.getElementById('grid');
const last = document.getElementById('last');
const input = document.getElementById('cardNumber');
const result = document.getElementById('result');
const showBtn = document.getElementById('showPublic');
const hideBtn = document.getElementById('hidePublic');
const publicCardActions = document.getElementById('publicCardActions');
const currentLot = document.getElementById('currentLot');
let lastResult = null;
let lastCardClosedAt = 0;

function pad(n){ return String(n).padStart(2,'0'); }
function drawnSet(){ return new Set([...(Loto.state().drawnNumbers || []), ...(Loto.state().pendingNumber ? [Loto.state().pendingNumber] : [])].map(Number)); }
function esc(s){ return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function cardGridHtml(r){
  const drawn = drawnSet();
  const lastNum = Number(r.lastNumber || 0);
  return `<div class="mini-card">${(r.lignes || []).map((line, i) =>
    `<div class="mini-card-line ${r.lineResults?.[i]?.ok ? 'complete' : ''}">${line.map(n => {
      const cls = drawn.has(Number(n)) ? 'hit' : 'miss';
      const lastCls = Number(n) === lastNum ? ' last-hit' : '';
      return `<span class="mini-card-num ${cls}${lastCls}">${pad(n)}</span>`;
    }).join('')}</div>`
  ).join('')}</div>`;
}

function diagnosticHtml(r){
  const label = Loto.cardFailureLabel(r);
  return label ? `<ul class="diagnostic-list"><li>${esc(label)}</li></ul>` : '';
}



function renderLot(s){
  if(!currentLot) return;
  if(s.miniBingoActive){ currentLot.innerHTML = '<b>MINI-BINGO</b> · tirage de départage en cours'; return; }
  const p = Loto.currentPartie();
  const prize = Loto.currentPrize();
  if(!p || !prize){ currentLot.innerHTML = '<b>Lot en cours :</b> partie simple sans programme'; return; }
  const req = Loto.currentRequirement();
  currentLot.innerHTML = `<b>${esc(p.name || 'Partie')}</b><br><span>${esc(Loto.gameModeLabel(p))}</span><br><strong>${esc(req.label || '')}</strong><br><b>LOT : ${esc(prize.label || 'Lot non renseigné')}</b>`;
}

function renderResult(payload){
  if(!payload){ result.innerHTML = ''; showBtn.style.display = 'none'; if(publicCardActions) publicCardActions.style.display = 'none'; lastResult = null; return; }

  if(!payload.found){
    lastResult = null;
    result.innerHTML = '<div class="simple-control-result invalid"><div class="simple-control-status bad">NON VALIDE</div></div>';
    showBtn.style.display = 'none';
    if(publicCardActions) publicCardActions.style.display = 'none';
    return;
  }

  const r = payload.result;
  lastResult = r;
  const unsold = r.salesTrackingEnabled && !r.soldForCurrentLoto;
  const status = r.loserMode
    ? (unsold ? 'CARTON NON VENDU' : r.winnerEligible ? 'GAGNANT · DERNIER CARTON' : r.stillInGame ? 'ENCORE EN JEU' : 'ÉLIMINÉ')
    : (r.valid ? 'GAIN VALIDE' : 'NON VALIDE');
  const good = r.valid || (r.stillInGame && !unsold);
  result.innerHTML = `
    <div class="simple-control-result ${good ? 'valid' : 'invalid'}">
      <div class="simple-control-status ${good ? 'ok' : 'bad'}">${status}</div>
      ${cardGridHtml(r)}
      ${diagnosticHtml(r)}
    </div>`;
  showBtn.style.display = 'inline-flex';
  if(publicCardActions) publicCardActions.style.display = 'flex';
}

document.getElementById('checkBtn').onclick = async () => {
  if(!input.value) return;
  const payload = await Loto.controlCard(input.value);
  renderResult(payload);
  if(payload?.found) await Loto.showPublicCard(payload.result);
};
input.onkeydown = e => { if(e.key === 'Enter') document.getElementById('checkBtn').click(); };
showBtn.onclick = () => lastResult && Loto.showPublicCard(lastResult);
hideBtn.onclick = async () => { await Loto.hidePublicCard(); if(publicCardActions) publicCardActions.style.display = 'none'; };

Loto.onChange((s) => {
  Loto.pageHeader();
  Loto.renderNumbers(grid);
  last.textContent = Loto.lastNumber();
  renderLot(s);
  if(s.publicCard){
    renderResult({found:true,result:s.publicCard});
    if(publicCardActions) publicCardActions.style.display = 'flex';
  } else if(Number(s.cardClosedAt || 0) && Number(s.cardClosedAt || 0) !== lastCardClosedAt){
    lastCardClosedAt = Number(s.cardClosedAt || 0);
    renderResult(null);
  }
});

function renderLastScanFromStorage(){
  try{
    const raw = localStorage.getItem('loto_last_commissaire_scan_result');
    if(!raw) return;
    localStorage.removeItem('loto_last_commissaire_scan_result');
    const payload = JSON.parse(raw);
    if(payload?.found){
      renderResult(payload);
      if(input) input.value = payload.result?.numero || payload.numero || '';
    }else{
      renderResult({ found:false, numero: payload?.numero || payload?.scannedCode || '' });
    }
  }catch(e){}
}

Loto.ensureSession();
renderLastScanFromStorage();
