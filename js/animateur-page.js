Loto.pageHeader();Loto.protectPage();
const grid=document.getElementById('grid'),last=document.getElementById('last'),count=document.getElementById('count'),history=document.getElementById('history');
document.getElementById('newGame').onclick=()=>{ if(confirm('Créer une nouvelle partie ?')) Loto.newGame(); };
document.getElementById('undo').onclick=()=>Loto.undoLast();
document.getElementById('commit').onclick=()=>Loto.commitPending();
document.getElementById('cancelPending').onclick=()=>Loto.cancelPending();
Loto.onChange(s=>{Loto.pageHeader();Loto.renderNumbers(grid,{button:true});last.textContent=Loto.lastNumber();count.textContent=(s.drawnNumbers||[]).length;history.innerHTML=(s.drawnNumbers||[]).slice().reverse().map(n=>`<span class="pill">${String(n).padStart(2,'0')}</span>`).join('');});
Loto.ensureSession();
