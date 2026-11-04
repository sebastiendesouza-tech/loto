Loto.pageHeader();
const $ = id => document.getElementById(id);
$('returnToPlayer').href='joueur.html?s='+encodeURIComponent(Loto.code());
const setup = $('setup');
const play = $('play');
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
let selectionTouched = false;
const selectionStorageKey='loto_auto_cards_v1:'+encodeURIComponent(Loto.code());
function readStoredSelection(){
  try{
    const codes=JSON.parse(localStorage.getItem(selectionStorageKey));
    if(!Array.isArray(codes)||codes.length>6||!codes.every(code=>typeof code==='string')||!codes.some(code=>code.trim()))return null;
    return Array.from({length:6},(_,i)=>codes[i]||'');
  }catch(error){return null;}
}
function rememberSelection(codes){
  try{localStorage.setItem(selectionStorageKey,JSON.stringify(codes));}catch(error){console.warn('Mémorisation des cartons indisponible.',error);}
}
codeFields.addEventListener('input',()=>{selectionTouched=true;});

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function displayCode(card){return card.external_code||card.carton_code||String(card.numero);}
function cardGrid(card){
  const raw=Array.isArray(card.grille)?card.grille:null;
  if(raw?.length===3&&raw.every(row=>Array.isArray(row)&&row.length===9))return raw.map(row=>row.map(n=>Number(n)||0));
  const grid=Array.from({length:3},()=>Array(9).fill(0));
  (card.lignes||[]).slice(0,3).forEach((line,row)=>line.forEach(n=>{const col=Math.min(8,Math.floor(Number(n)/10));if(Number(n)>0)grid[row][col]=Number(n);}));
  return grid;
}
$('editCards').addEventListener('click',()=>{
  selectionTouched=true;
  closeWinnerModal();
  ++renderToken;
  document.body.classList.remove('auto-playing');
  play.hidden=true;setup.hidden=false;$('editCards').hidden=true;
  setupMessage.textContent='';$('loadCards').disabled=false;lastRenderedStateKey='';
  codeFields.querySelector('input')?.focus();
});

async function loadEnteredCards(){
  const button=$('loadCards');
  if(button.disabled)return;
  const inputs=[...codeFields.querySelectorAll('input')];
  const fieldValues=inputs.map(input=>input.value.trim());
  const entries=inputs.map((input,i)=>({input,code:fieldValues[i]})).filter(entry=>entry.code);
  if(!entries.length){setupMessage.textContent='Saisissez au moins un numéro de carton.';codeFields.querySelector('input')?.focus();return;}
  if(entries.length>6){setupMessage.textContent='Vous pouvez suivre 6 cartons maximum.';return;}
  const invalid=entries.find(({code})=>!/^\d{6}$/.test(code)||Number(code)<101000||Number(code)>102999);
  if(invalid){setupMessage.textContent='Chaque numéro de carton doit être compris entre 101000 et 102999 (6 chiffres).';invalid.input.focus();return;}
  const unavailable=entries.find(({code})=>Loto.knownMissingCardMessage(code));
  if(unavailable){setupMessage.textContent=Loto.knownMissingCardMessage(unavailable.code);unavailable.input.focus();return;}
  const codes=entries.map(entry=>entry.code);
  if(new Set(codes.map(code=>code.toUpperCase())).size!==codes.length){setupMessage.textContent='Un même carton a été saisi plusieurs fois.';return;}
  button.disabled=true;inputs.forEach(input=>{input.disabled=true;});setupMessage.textContent='Recherche des cartons…';
  try{
    const rows=await Promise.all(codes.map(code=>Loto.fetchCard(code)));
    const missing=rows.findIndex(row=>!row);
    if(missing!==-1){setupMessage.textContent=`Carton « ${codes[missing]} » introuvable. Vérifiez son numéro.`;entries[missing].input.focus();return;}
    if(new Set(rows.map(card=>String(card.numero))).size!==rows.length){setupMessage.textContent='Deux numéros correspondent au même carton. Corrigez la saisie.';return;}
    selectedCards.splice(0,selectedCards.length,...rows);
    rememberSelection(fieldValues);
    rememberedWinners=new Set();winnerRound='';lastRenderedStateKey='';lastLoserLookupKey='';
    setup.hidden=true;play.hidden=false;$('editCards').hidden=false;
    document.body.classList.add('auto-playing');
    setupMessage.textContent='';
    render(Loto.state());
  }catch(error){setupMessage.textContent='Impossible de lire les cartons. Vérifiez la connexion puis réessayez.';}
  finally{button.disabled=false;inputs.forEach(input=>{input.disabled=false;});}
}
codesForm.addEventListener('submit',event=>{
  event.preventDefault();selectionTouched=true;
  return loadEnteredCards();
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
function closeWinnerModal(){
  const wasOpen=!$('winnerModal').hidden;
  $('winnerModal').hidden=true;
  document.body.classList.remove('winner-open');
  if(wasOpen&&!$('editCards').hidden)$('editCards').focus({preventScroll:true});
}
function openWinnerModal(winners){
  $('winnerTitle').textContent=winners.length===1?'Carton gagnant !':'Cartons gagnants !';
  $('winnerCodes').textContent=winners.map(({card})=>displayCode(card)).join('\n');
  $('winnerModal').hidden=false;
  document.body.classList.add('winner-open');
  $('winnerClose').focus({preventScroll:true});
}
$('winnerClose').addEventListener('click',closeWinnerModal);
$('winnerModal').addEventListener('click',event=>{if(event.target===$('winnerModal'))closeWinnerModal();});
document.addEventListener('keydown',event=>{
  if($('winnerModal').hidden)return;
  if(event.key==='Escape'){event.preventDefault();closeWinnerModal();}
  else if(event.key==='Tab'){event.preventDefault();$('winnerClose').focus();}
});
function showWinnerAlert(alert,winners,token){
  if(token!==renderToken||play.hidden)return;
  alert.hidden=true;alert.textContent='';
  const ids=new Set(winners.map(({card})=>String(card.numero)));
  rememberedWinners=new Set([...rememberedWinners].filter(id=>ids.has(id)));
  if(!winners.length){closeWinnerModal();return;}
  const newWinners=winners.filter(({card})=>!rememberedWinners.has(String(card.numero)));
  if(newWinners.length){
    newWinners.forEach(({card})=>rememberedWinners.add(String(card.numero)));
    openWinnerModal(winners);
    if(navigator.vibrate)navigator.vibrate([180,80,180]);
  }else if(!$('winnerModal').hidden)openWinnerModal(winners);
}
async function checkSaleStatus(state,winners,alert,token){
  if(!Loto.programSettings().salesTrackingEnabled||!winners.length){showWinnerAlert(alert,winners,token);return;}
  const nums=winners.map(({card})=>Number(card.numero));
  const lotoId=state.program?.id||state.sessionCode||Loto.code();
  try{
    const {data,error}=await Loto.supabaseClient.from('loto_carton_sales').select('numero').eq('loto_id',lotoId).eq('status','vendu').in('numero',nums);
    if(error)throw error;
    const confirmed=winners.filter(({card})=>(data||[]).some(row=>Number(row.numero)===Number(card.numero)));
    if(token===renderToken&&!play.hidden)winners.forEach(({card})=>{
      const node=[...$('trackedCards').querySelectorAll('[data-card-number]')].find(el=>Number(el.dataset.cardNumber)===Number(card.numero));
      if(!node)return;
      const badge=node.querySelector('.card-state');
      if(confirmed.some(item=>Number(item.card.numero)===Number(card.numero))){node.classList.remove('card-candidate');node.classList.add('card-winning');if(badge)badge.textContent='🎉 CARTON GAGNANT !';}
      else{node.classList.remove('card-candidate');node.classList.add('card-unconfirmed');if(badge)badge.textContent='Non enregistré comme vendu';}
    });
    showWinnerAlert(alert,confirmed,token);
  }catch(error){
    if(token!==renderToken||play.hidden)return;
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
    if(token!==renderToken||play.hidden)return;
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
    else{showWinnerAlert(alert,[],token);}
  }catch(error){
    if(token!==renderToken||play.hidden)return;
    alert.hidden=true;alert.textContent='';
  }
}
function render(state){
  if(!state)return;
  const pi=state.currentPartieIndex||0,li=state.currentPrizeIndex||0;
  const activePart=(state.program?.parties||[])[pi];
  const viewKey=[roundKey(state),state.pendingNumber||'',(state.drawnNumbers||[]).join(','),state.gameActive,state.program?.title||'',state.lotoName||'',state.program?.parties?.length||0,activePart?.gameMode||'',activePart?.prizes?.[li]?.name||'',JSON.stringify(state.options||{}),selectedCards.map(card=>card.numero).join(',')].join('|');
  if(viewKey===lastRenderedStateKey)return;
  lastRenderedStateKey=viewKey;
  Loto.pageHeader();
  $('gameName').textContent=state.program?.title||state.lotoName||'Loto';
  const req=Loto.currentRequirement();
  const currentPart=(state.program?.parties||[])[state.currentPartieIndex||0];
  $('autoPartLabel').textContent=state.miniBingoActive?'Mini-bingo':currentPart?`Partie ${pi+1} / ${state.program.parties.length}`:'Partie —';
  const status=$('connectionStatus');
  status.textContent=Loto.supabaseClient?'En direct':'Hors connexion';
  status.className='connection-status '+(Loto.supabaseClient?'online':'offline');
  const round=roundKey(state);if(round!==winnerRound){winnerRound=round;rememberedWinners=new Set();lastLoserLookupKey='';}
  const token=++renderToken;
  if(play.hidden)return;
  const results=selectedCards.map(card=>({card,result:Loto.checkCard(card)}));
  const checkSales=Loto.programSettings().salesTrackingEnabled;
  $('trackedCards').innerHTML=results.map(({card,result})=>paintCard(card,state,result,checkSales&&result.valid)).join('');
  const winners=results.filter(({result})=>result.valid);
  const alert=$('autoAlert');
  if(winners.length){checkSaleStatus(state,winners,alert,token);}
  else if(req.mode==='perdant'&&results.some(({result})=>result.stillInGame)){
    checkLastLoserCard(state,results.filter(({result})=>result.stillInGame),alert,token);
  }else{rememberedWinners.clear();closeWinnerModal();alert.hidden=true;alert.textContent='';}
}

Loto.onChange(state=>{
  render(state);
});

// Retrouver les six cases et recharger les cartons avec le tirage actuel.
const storedSelection=readStoredSelection();
if(storedSelection)[...codeFields.querySelectorAll('input')].forEach((input,i)=>{input.value=storedSelection[i];});
Loto.ensureSession().then(()=>{
  if(storedSelection&&!selectionTouched)return loadEnteredCards();
}).catch(error=>{
  console.error('Connexion au tirage impossible.',error);
  const status=$('connectionStatus');
  status.textContent='Connexion indisponible';
  status.className='connection-status offline';
});
