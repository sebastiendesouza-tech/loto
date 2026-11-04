Loto.pageHeader();
const $ = id => document.getElementById(id);
const setup = $('setup');
const play = $('play');
const countForm = $('countForm');
const codesForm = $('codesForm');
const codeFields = $('cardCodeFields');
const setupMessage = $('setupMessage');
const selectedCards = [];
let renderToken = 0;
let rememberedWinners = new Set();
let winnerRound = '';
let lastLoserLookupKey = '';
let lastRenderedStateKey = '';
let loserPoolKey = '';
let loserPoolPromise = null;

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function displayCode(card){return card.external_code||card.carton_code||String(card.numero);}
function cardGrid(card){
  const raw=Array.isArray(card.grille)?card.grille:null;
  if(raw?.length===3&&raw.every(row=>Array.isArray(row)&&row.length===9))return raw.map(row=>row.map(n=>Number(n)||0));
  const grid=Array.from({length:3},()=>Array(9).fill(0));
  (card.lignes||[]).slice(0,3).forEach((line,row)=>line.forEach(n=>{const col=Math.min(8,Math.floor(Number(n)/10));if(Number(n)>0)grid[row][col]=Number(n);}));
  return grid;
}
function createFields(count){
  $('codesTitle').textContent=`Saisissez les ${count} numéro${count>1?'s':''} de carton`;
  codeFields.innerHTML=Array.from({length:count},(_,i)=>`<label><span class="code-index">${i+1}</span><input name="cardCode" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" placeholder="Code du carton ${i+1}" aria-label="Code du carton ${i+1}" required></label>`).join('');
  countForm.hidden=true;codesForm.hidden=false;setupMessage.textContent='';codeFields.querySelector('input')?.focus();
}
countForm.addEventListener('submit',event=>{event.preventDefault();createFields(Number($('cardCount').value));});
$('backToCount').addEventListener('click',()=>{codesForm.hidden=true;countForm.hidden=false;setupMessage.textContent='';});
$('editCards').addEventListener('click',()=>{document.body.classList.remove('auto-playing');play.hidden=true;setup.hidden=false;codesForm.hidden=true;countForm.hidden=false;setupMessage.textContent='';$('loadCards').disabled=false;lastRenderedStateKey='';});

codesForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!$('loadCards').disabled){$('loadCards').disabled=true;setupMessage.textContent='Recherche des cartons…';}
  const inputs=[...codeFields.querySelectorAll('input')];
  const codes=inputs.map(input=>input.value.trim());
  if(codes.some(code=>!code)){setupMessage.textContent='Saisissez le code de chaque carton.';$('loadCards').disabled=false;return;}
  const unique=new Set(codes.map(code=>code.toUpperCase()));
  if(unique.size!==codes.length){setupMessage.textContent='Un même carton a été saisi plusieurs fois.';$('loadCards').disabled=false;return;}
  try{
    const rows=await Promise.all(codes.map(code=>Loto.fetchCard(code)));
    const missing=rows.findIndex(row=>!row);
    if(missing!==-1){setupMessage.textContent=`Carton « ${codes[missing]} » introuvable. Vérifiez son numéro.`;$('loadCards').disabled=false;return;}
    selectedCards.splice(0,selectedCards.length,...rows);
    rememberedWinners=new Set();winnerRound='';lastRenderedStateKey='';
    setup.hidden=true;play.hidden=false;document.body.classList.add('auto-playing');
    $('cardsCountLabel').textContent=`${rows.length} carton${rows.length>1?'s':''} suivi${rows.length>1?'s':''}`;
    setupMessage.textContent='';
    render(Loto.state());
  }catch(error){setupMessage.textContent='Impossible de lire les cartons. Vérifiez la connexion puis réessayez.';$('loadCards').disabled=false;}
});

function roundKey(state){return `${state.currentPartieIndex||0}:${state.currentPrizeIndex||0}:${state.miniBingoActive?'mini':'classique'}`;}
function paintCard(card,state,result,checkingSale=false){
  const draws=new Set([...(state.drawnNumbers||[]).map(Number),...(state.pendingNumber?[Number(state.pendingNumber)]:[])]);
  const grid=cardGrid(card);
  let status='';let cardClass='';
  if(result.requirement?.mode==='perdant'){
    if(result.stillInGame)cardClass=' card-still-in';
    else cardClass=' card-eliminated';
  }else if(result.valid&&checkingSale){status='Vérification de la vente…';cardClass=' card-candidate';}
  else if(result.valid){status='🎉 CARTON GAGNANT !';cardClass=' card-winning';}
  const rows=grid.map(row=>`<tr>${row.map(n=>{
    if(!n)return '<td class="empty"></td>';
    const hit=draws.has(Number(n));const pending=Number(state.pendingNumber)===Number(n);
    return `<td class="has-number${hit?' is-drawn':''}${pending?' is-pending':''}">${String(n).padStart(2,'0')}</td>`;
  }).join('')}</tr>`).join('');
  return `<article class="tracked-card${cardClass}" data-card-number="${esc(card.numero)}"><div class="tracked-card-head"><strong class="tracked-card-code">${esc(displayCode(card))}</strong><span class="card-state">${status}</span></div><table class="auto-bingo-grid" aria-label="Grille du carton ${esc(displayCode(card))}"><tbody>${rows}</tbody></table></article>`;
}
function showWinnerAlert(alert,winners,token){
  if(token!==renderToken)return;
  const label=winners.map(({card})=>displayCode(card)).join(', ');
  alert.hidden=false;alert.className='auto-alert';alert.textContent=`🎉 BINGO ! ${winners.length===1?'Carton gagnant':'Cartons gagnants'} : ${label}`;
  const newWinners=winners.filter(({card})=>!rememberedWinners.has(String(card.numero)));
  if(newWinners.length){newWinners.forEach(({card})=>rememberedWinners.add(String(card.numero)));if(navigator.vibrate)navigator.vibrate([180,80,180]);}
}
async function checkSaleStatus(state,winners,alert,token){
  if(!Loto.programSettings().salesTrackingEnabled||!winners.length){showWinnerAlert(alert,winners,token);return;}
  const nums=winners.map(({card})=>Number(card.numero));
  const lotoId=state.program?.id||state.sessionCode||Loto.code();
  try{
    const {data,error}=await Loto.supabaseClient.from('loto_carton_sales').select('numero').eq('loto_id',lotoId).eq('status','vendu').in('numero',nums);
    if(error)throw error;
    const confirmed=winners.filter(({card})=>(data||[]).some(row=>Number(row.numero)===Number(card.numero)));
    if(token===renderToken)winners.forEach(({card})=>{
      const node=[...$('trackedCards').querySelectorAll('[data-card-number]')].find(el=>Number(el.dataset.cardNumber)===Number(card.numero));
      if(!node)return;
      const badge=node.querySelector('.card-state');
      if(confirmed.some(item=>Number(item.card.numero)===Number(card.numero))){node.classList.remove('card-candidate');node.classList.add('card-winning');if(badge)badge.textContent='🎉 CARTON GAGNANT !';}
      else{node.classList.remove('card-candidate');node.classList.add('card-unconfirmed');if(badge)badge.textContent='Non enregistré comme vendu';}
    });
    showWinnerAlert(alert,confirmed,token);
  }catch(error){
    if(token!==renderToken)return;
    winners.forEach(({card})=>{const node=[...$('trackedCards').querySelectorAll('[data-card-number]')].find(el=>Number(el.dataset.cardNumber)===Number(card.numero));const badge=node?.querySelector('.card-state');if(node)node.classList.remove('card-candidate');if(badge)badge.textContent='Vente à confirmer';});
    alert.hidden=false;alert.className='auto-alert loser';alert.textContent='Un carton semble gagnant. Le commissaire doit confirmer sa vente.';
  }
}
function loadLoserPool(state){
  const lotoId=state.program?.id||state.sessionCode||Loto.code();
  const key=`${lotoId}:${state.program?.title||''}`;
  if(key===loserPoolKey&&loserPoolPromise)return loserPoolPromise;
  loserPoolKey=key;
  loserPoolPromise=(async()=>{
    const client=Loto.supabaseClient;
    let sales=[],from=0;
    while(true){
      const {data,error}=await client.from('loto_carton_sales').select('numero').eq('loto_id',lotoId).eq('status','vendu').range(from,from+999);
      if(error)throw error;
      sales=sales.concat(data||[]);if(!data||data.length<1000)break;from+=1000;
    }
    const soldNumbers=[...new Set(sales.map(row=>Number(row.numero)).filter(Number.isFinite))];
    let soldCards=[];
    for(let i=0;i<soldNumbers.length;i+=100){
      const {data,error}=await client.from('loto_cartons').select('numero,lignes').eq('actif',true).in('numero',soldNumbers.slice(i,i+100));
      if(error)throw error;soldCards=soldCards.concat(data||[]);
    }
    return {soldNumbers,soldCards};
  })();
  return loserPoolPromise;
}
async function checkLastLoserCard(state,stillInGame,alert,token){
  if(!Loto.programSettings().salesTrackingEnabled){
    alert.hidden=true;return;
  }
  const drawn=new Set([...(state.drawnNumbers||[]),...(state.pendingNumber?[state.pendingNumber]:[])].map(Number));
  const key=`${roundKey(state)}:${[...drawn].sort((a,b)=>a-b).join(',')}`;
  if(key===lastLoserLookupKey)return;
  lastLoserLookupKey=key;
  try{
    const {soldNumbers,soldCards}=await loadLoserPool(state);
    if(token!==renderToken)return;
    const remaining=soldCards.filter(card=>(card.lignes||[]).flat().every(n=>!drawn.has(Number(n))));
    const remainingSet=new Set(remaining.map(card=>Number(card.numero)));
    stillInGame.forEach(({card})=>{
      const node=[...$('trackedCards').querySelectorAll('[data-card-number]')].find(el=>Number(el.dataset.cardNumber)===Number(card.numero));
      if(!node)return;
      const badge=node.querySelector('.card-state');
      if(!soldNumbers.includes(Number(card.numero))){node.classList.remove('card-still-in');node.classList.add('card-unconfirmed');if(badge)badge.textContent='Non enregistré comme vendu';}
      else if(remaining.length===1&&remainingSet.has(Number(card.numero))){node.classList.remove('card-still-in');node.classList.add('card-winning');if(badge)badge.textContent='🎉 DERNIER CARTON !';}
      else{node.classList.add('card-still-in');if(badge)badge.textContent='Toujours en jeu';}
    });
    const ownWinners=remaining.length===1?stillInGame.filter(({card})=>remainingSet.has(Number(card.numero))):[];
    if(ownWinners.length)showWinnerAlert(alert,ownWinners,token);
    else{alert.hidden=true;alert.textContent='';}
  }catch(error){
    if(token!==renderToken)return;
    alert.hidden=true;alert.textContent='';
  }
}
function render(state){
  if(!state)return;
  const pi=state.currentPartieIndex||0,li=state.currentPrizeIndex||0;
  const activePart=(state.program?.parties||[])[pi];
  const viewKey=[roundKey(state),state.pendingNumber||'',(state.drawnNumbers||[]).join(','),state.gameActive,state.program?.title||'',activePart?.gameMode||'',activePart?.prizes?.[li]?.name||'',JSON.stringify(state.options||{}),selectedCards.map(card=>card.numero).join(',')].join('|');
  if(viewKey===lastRenderedStateKey)return;
  lastRenderedStateKey=viewKey;
  Loto.pageHeader();
  $('gameName').textContent=state.program?.title||state.lotoName||'Loto';
  const req=Loto.currentRequirement();
  const currentPart=(state.program?.parties||[])[state.currentPartieIndex||0];
  $('partMode').textContent=currentPart?`Partie ${(state.currentPartieIndex||0)+1} · ${req.label}`:'En attente du tirage';
  const last=state.pendingNumber||(state.drawnNumbers||[]).slice(-1)[0];
  $('lastNumber').textContent=last?String(last).padStart(2,'0'):'--';
  const status=$('connectionStatus');
  status.textContent=Loto.supabaseClient?'En direct':'Hors connexion';
  status.className='connection-status '+(Loto.supabaseClient?'online':'offline');
  const round=roundKey(state);if(round!==winnerRound){winnerRound=round;rememberedWinners=new Set();lastLoserLookupKey='';}
  const token=++renderToken;
  const results=selectedCards.map(card=>({card,result:Loto.checkCard(card)}));
  const checkSales=Loto.programSettings().salesTrackingEnabled;
  $('trackedCards').innerHTML=results.map(({card,result})=>paintCard(card,state,result,checkSales&&result.valid)).join('');
  const winners=results.filter(({result})=>result.valid);
  const alert=$('autoAlert');
  if(winners.length){checkSaleStatus(state,winners,alert,token);}
  else if(req.mode==='perdant'&&results.some(({result})=>result.stillInGame)){
    checkLastLoserCard(state,results.filter(({result})=>result.stillInGame),alert,token);
  }else{alert.hidden=true;alert.textContent='';}
}

Loto.onChange(state=>{
  render(state);
});
