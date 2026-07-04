Loto.pageHeader();Loto.protectPage();
const grid=document.getElementById('grid'),last=document.getElementById('last'),input=document.getElementById('cardNumber'),result=document.getElementById('result'),showBtn=document.getElementById('showPublic'),hideBtn=document.getElementById('hidePublic');let lastResult=null;
function renderResult(r){
  if(!r){result.innerHTML='';showBtn.style.display='none';return;}
  if(!r.found){result.innerHTML=`<p class="bad">Carton ${r.numero} introuvable.</p>`;showBtn.style.display='none';return;}
  lastResult=r.result;
  const req=r.result.requirement||Loto.currentRequirement();
  const lines=r.result.lineResults.map((l,i)=>`<p><b>Ligne ${i+1}</b> : ${l.ok?'<span class="ok">OK</span>':'<span class="bad">Manque '+l.missing.join(' - ')+'</span>'}${l.hasLast?' <span class="pill">dernier n°</span>':''}</p>`).join('');
  result.innerHTML=`<h2>Carton ${r.result.numero}</h2>
    <p><b>Contrôle demandé :</b> ${req.label}</p>
    <p><b>Dernier numéro :</b> ${r.result.lastNumber||'--'} ${req.lastNumberRequired?'(obligatoire)':'(non obligatoire)'}</p>
    <p>${r.result.valid?'<span class="ok">GAIN VALIDE</span>':'<span class="bad">NON VALIDE</span>'}</p>
    <p>${r.result.reason||''}</p>
    <p><b>Lignes complètes :</b> ${r.result.okLines}/3</p>${lines}`;
  showBtn.style.display='inline-flex';
}
document.getElementById('checkBtn').onclick=async()=>{ if(!input.value) return; renderResult(await Loto.controlCard(input.value)); };
input.onkeydown=e=>{if(e.key==='Enter')document.getElementById('checkBtn').click();};
showBtn.onclick=()=>lastResult&&Loto.showPublicCard(lastResult);hideBtn.onclick=()=>Loto.hidePublicCard();
Loto.onChange(s=>{Loto.pageHeader();Loto.renderNumbers(grid);last.textContent=Loto.lastNumber();});Loto.ensureSession();
