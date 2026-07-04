Loto.pageHeader();Loto.protectPage();
const grid=document.getElementById('grid'),last=document.getElementById('last'),count=document.getElementById('count'),history=document.getElementById('history'),currentLot=document.getElementById('currentLot');
const launchModal=document.getElementById('launchModal'),launchList=document.getElementById('launchList');
let simulationTimer=null;
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
document.getElementById('commit').onclick=()=>Loto.commitPending();
document.getElementById('cancelPending').onclick=()=>Loto.cancelPending();
document.getElementById('winner').onclick=()=>Loto.winner();
function renderLot(s){const p=Loto.currentPartie();const prize=Loto.currentPrize();if(!p||!prize){currentLot.innerHTML='<b>Lot en cours :</b> partie simple sans programme';return;}const req=Loto.currentRequirement();currentLot.innerHTML=`<b>${p.name||'Partie'}</b> · <span>${Loto.gameModeLabel(p)}</span> · <strong>${req.label}</strong> · <b>${prize.label||'Lot non renseigné'}</b>`;}
function runSimulation(s){clearInterval(simulationTimer);if(!s.simulation?.enabled)return;simulationTimer=setInterval(()=>{const drawn=new Set([...(Loto.state().drawnNumbers||[]),Loto.state().pendingNumber].filter(Boolean));const available=[];for(let i=1;i<=90;i++)if(!drawn.has(i))available.push(i);if(available.length)Loto.drawNumber(available[Math.floor(Math.random()*available.length)],'simulation');},Math.max(2,Number(s.simulation?.seconds||10))*1000);}
let lastSimulationKey='';
Loto.onChange(s=>{Loto.pageHeader();Loto.renderNumbers(grid,{button:true});last.textContent=Loto.lastNumber();count.textContent=(s.drawnNumbers||[]).length;history.innerHTML=(s.drawnNumbers||[]).slice().reverse().map(n=>`<span class="pill">${String(n).padStart(2,'0')}</span>`).join('');renderLot(s);drawLaunchList();const simKey=JSON.stringify(s.simulation||{});if(simKey!==lastSimulationKey){lastSimulationKey=simKey;runSimulation(s);}});
Loto.ensureSession();
