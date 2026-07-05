Loto.pageHeader();
Loto.protectPage();

const grid = document.getElementById('grid');
const last = document.getElementById('last');
const input = document.getElementById('cardNumber');
const result = document.getElementById('result');
const showBtn = document.getElementById('showPublic');
const hideBtn = document.getElementById('hidePublic');
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
  const details = r.messages && r.messages.length ? r.messages : [r.reason].filter(Boolean);
  if(!details.length) return '';
  return `<ul class="diagnostic-list">${details.map(m => `<li>${esc(m)}</li>`).join('')}</ul>`;
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
  if(!payload){ result.innerHTML = ''; showBtn.style.display = 'none'; lastResult = null; return; }
  if(!payload.found){
    result.innerHTML = `<p class="bad">Carton ${esc(payload.numero)} non enregistré dans la base.</p><p>Vérifiez le numéro saisi.</p>`;
    showBtn.style.display = 'none';
    return;
  }

  const r = payload.result;
  lastResult = r;
  const req = r.requirement || Loto.currentRequirement();
  const status = r.valid ? '<span class="control-status ok">GAIN VALIDE</span>' : '<span class="control-status bad">NON VALIDE</span>';

  result.innerHTML = `
    <div class="control-card-result ${r.valid ? 'valid' : 'invalid'}">
      <div class="control-head">
        <div>
          <h2>Carton ${esc(r.numero)}</h2>
          <p><b>Contrôle :</b> ${esc(req.label || '')}</p>
          <p><b>Dernier numéro :</b> ${r.lastNumber ? pad(r.lastNumber) : '--'} ${req.lastNumberRequired ? '(obligatoire)' : '(non obligatoire)'}</p>
        </div>
        ${status}
      </div>
      ${cardGridHtml(r)}
      <div class="control-summary">
        <p><b>Lignes complètes :</b> ${r.okLines}/3</p>
        ${diagnosticHtml(r)}
      </div>
    </div>`;
  showBtn.style.display = 'inline-flex';
}

document.getElementById('checkBtn').onclick = async () => {
  if(!input.value) return;
  const payload = await Loto.controlCard(input.value);
  renderResult(payload);
  if(payload?.found) await Loto.showPublicCard(payload.result);
};
input.onkeydown = e => { if(e.key === 'Enter') document.getElementById('checkBtn').click(); };
showBtn.onclick = () => lastResult && Loto.showPublicCard(lastResult);
hideBtn.onclick = () => Loto.hidePublicCard();

Loto.onChange((s) => {
  Loto.pageHeader();
  Loto.renderNumbers(grid);
  last.textContent = Loto.lastNumber();
  renderLot(s);
  if(s.publicCard){
    renderResult({found:true,result:s.publicCard});
  } else if(Number(s.cardClosedAt || 0) && Number(s.cardClosedAt || 0) !== lastCardClosedAt){
    lastCardClosedAt = Number(s.cardClosedAt || 0);
    renderResult(null);
  }
});
Loto.ensureSession();
