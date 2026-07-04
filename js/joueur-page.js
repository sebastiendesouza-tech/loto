Loto.pageHeader();
const grid=document.getElementById('grid'),last=document.getElementById('last');
let previous=null;
function renderToast(s){
  let el=document.getElementById('playerToast');
  if(!el){el=document.createElement('div');el.id='playerToast';el.className='loto-toast player-toast';document.body.appendChild(el);}
  const t=s.toast;
  const active=t && (Date.now()-Number(t.at||0)<Number(t.duration||5000));
  if(active){el.textContent=t.message||'VOUS POUVEZ DÉMARQUER !';el.classList.add('show');window.clearTimeout(window.__playerToastTimer);window.__playerToastTimer=window.setTimeout(()=>el.classList.remove('show'),Math.max(200,Number(t.duration||5000)-(Date.now()-Number(t.at||0))));}
  else el.classList.remove('show');
}
Loto.onChange(s=>{Loto.pageHeader();const l=Loto.lastNumber();last.textContent=l;if(previous&&previous!==l&&navigator.vibrate) navigator.vibrate(80);previous=l;Loto.renderNumbers(grid);renderToast(s);});
Loto.ensureSession();
