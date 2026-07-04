Loto.pageHeader();Loto.protectPage();
const grid=document.getElementById('grid'),last=document.getElementById('last'),count=document.getElementById('count'),history=document.getElementById('history'),currentLot=document.getElementById('currentLot');
let simulationTimer=null;
document.getElementById('newGame').onclick=()=>{ if(confirm('Créer une nouvelle partie ?')) Loto.newGame(); };
document.getElementById('undo').onclick=()=>Loto.undoLast();
document.getElementById('commit').onclick=()=>Loto.commitPending();
document.getElementById('cancelPending').onclick=()=>Loto.cancelPending();
document.getElementById('nextPrize').onclick=()=>Loto.nextPrize();
document.getElementById('winner').onclick=()=>Loto.winner();
function renderLot(s){const p=Loto.currentPartie();const prize=Loto.currentPrize();if(!p||!prize){currentLot.innerHTML='<b>Lot en cours :</b> aucun programme saisi';return;}const req=Loto.currentRequirement();currentLot.innerHTML=`<b>${p.name||'Partie'}</b> · <span>${Loto.gameModeLabel(p)}</span> · <strong>${req.label}</strong> · <b>${prize.label||'Lot non renseigné'}</b>`;}
function runSimulation(s){clearInterval(simulationTimer);if(!s.simulation?.enabled)return;simulationTimer=setInterval(()=>{const drawn=new Set([...(Loto.state().drawnNumbers||[]),Loto.state().pendingNumber].filter(Boolean));const available=[];for(let i=1;i<=90;i++)if(!drawn.has(i))available.push(i);if(available.length)Loto.drawNumber(available[Math.floor(Math.random()*available.length)],'simulation');},Math.max(2,Number(s.simulation?.seconds||10))*1000);}
let lastSimulationKey='';
Loto.onChange(s=>{Loto.pageHeader();Loto.renderNumbers(grid,{button:true});last.textContent=Loto.lastNumber();count.textContent=(s.drawnNumbers||[]).length;history.innerHTML=(s.drawnNumbers||[]).slice().reverse().map(n=>`<span class="pill">${String(n).padStart(2,'0')}</span>`).join('');renderLot(s);const simKey=JSON.stringify(s.simulation||{});if(simKey!==lastSimulationKey){lastSimulationKey=simKey;runSimulation(s);}});
Loto.ensureSession();
