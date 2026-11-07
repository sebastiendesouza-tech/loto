Loto.pageHeader();
const grid=document.getElementById('grid'),last=document.getElementById('last');
const lotsBtn=document.getElementById('playerLotsBtn'),lotsPanel=document.getElementById('playerLotsPanel'),lotsContent=document.getElementById('playerLotsContent'),lotsTitle=document.getElementById('playerLotsTitle');
const cardsLink=document.getElementById('playerCardsLink');
let previous=null;
function partRule(mode,index){
  if(Loto.isLoserMode(mode)) return 'Aucun numéro tiré sur le carton';
  if(mode==='carton'||Loto.isMysteryMode(mode)) return 'Carton plein';
  return index===0?'1 ligne':index===1?'2 lignes':'Carton plein';
}
function renderLots(s){
  const showCards=!!s.options?.showPlayerCards;
  cardsLink.hidden=!showCards;
  cardsLink.href='jeu-automatique.html?s='+encodeURIComponent(Loto.code());
  document.getElementById('playerHeading').classList.toggle('has-cards-link',showCards);
  const parties=s.program?.parties||[],partIndex=Number(s.currentPartieIndex||0),partie=parties[partIndex];
  document.getElementById('playerPartLabel').textContent=s.miniBingoActive?'Mini-bingo':partie?`Partie ${partIndex+1} / ${parties.length}`:'Partie —';
  const prizes=(partie?.prizes||[]).filter(p=>p&&p.enabled!==false);
  lotsTitle.textContent=partie?`Lots · Partie ${partIndex+1}/${parties.length}`:'Lots de la partie';
  lotsBtn.disabled=!partie||!prizes.length;
  if(!partie||!prizes.length){lotsContent.innerHTML='<p>Aucun lot renseigné pour cette partie.</p>';return;}
  if(Loto.isMysteryMode(partie.gameMode)&&!s.miniBingoActive&&!s.miniBingoReady){
    LotoMysteryBoard.render(lotsContent,{state:s});return;
  }
  lotsContent.innerHTML=`<div class="player-lots-list">${prizes.map((prize,i)=>{
    const state=i<(s.currentPrizeIndex||0)?'won':i===(s.currentPrizeIndex||0)?'active':'upcoming';
    const label=Loto.isMysteryMode(partie.gameMode)?'LOT':`${i+1}${i===0?'er':'e'} LOT`;
    return `<article class="player-lot-row ${state}"><strong>${label}</strong><span>${String(prize.label||'Lot non renseigné').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}</span><small>${partRule(partie.gameMode||'ligne',i)}</small></article>`;
  }).join('')}</div>`;
}
function renderToast(s){
  let el=document.getElementById('playerToast');
  if(!el){el=document.createElement('div');el.id='playerToast';el.className='loto-toast player-toast';document.body.appendChild(el);}
  const t=s.toast;
  const active=t && (Date.now()-Number(t.at||0)<Number(t.duration||5000));
  if(active){el.textContent=t.message||'VOUS POUVEZ DÉMARQUER !';el.classList.add('show');window.clearTimeout(window.__playerToastTimer);window.__playerToastTimer=window.setTimeout(()=>el.classList.remove('show'),Math.max(200,Number(t.duration||5000)-(Date.now()-Number(t.at||0))));}
  else el.classList.remove('show');
}
Loto.onChange(s=>{Loto.pageHeader();const l=Loto.lastNumber();last.textContent=l;if(previous&&previous!==l&&navigator.vibrate) navigator.vibrate(80);previous=l;Loto.renderNumbers(grid);renderLots(s);renderToast(s);});
Loto.ensureSession();
lotsBtn.onclick=()=>{lotsPanel.hidden=false;lotsBtn.setAttribute('aria-expanded','true');};
document.getElementById('playerLotsClose').onclick=()=>{lotsPanel.hidden=true;lotsBtn.setAttribute('aria-expanded','false');};
lotsPanel.onclick=e=>{if(e.target===lotsPanel){lotsPanel.hidden=true;lotsBtn.setAttribute('aria-expanded','false');}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!lotsPanel.hidden){lotsPanel.hidden=true;lotsBtn.setAttribute('aria-expanded','false');}});
