Loto.pageHeader();
Loto.protectPage();

document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.getElementById(b.dataset.tab).classList.add('active');});
const lotoName=document.getElementById('lotoName'),lotoDate=document.getElementById('lotoDate'),partieCount=document.getElementById('partieCount'),partiesList=document.getElementById('partiesList'),showLots=document.getElementById('showLots'),bingoEnabled=document.getElementById('bingoEnabled'),showBingo=document.getElementById('showBingo'),prevalidate=document.getElementById('prevalidate'),lastNumberRequired=document.getElementById('lastNumberRequired'),saveMsg=document.getElementById('saveMsg'),savedProgramsList=document.getElementById('savedProgramsList'),salesTrackingEnabled=document.getElementById('salesTrackingEnabled');

const prizeTypes=['Lot 1','Lot 2','Lot 3'];
function defaultPrize(i,label=''){return {type:prizeTypes[i] || 'Lot',label,enabled:true};}
function normalizePartiePrizes(partie){
  partie.gameMode ||= 'ligne';
  if(partie.gameMode === 'bingoMystere'){
    partie.prizes = [partie.prizes?.[0] || {type:'Bingo mystère',label:'',enabled:true}];
    partie.prizes[0].type = 'Bingo mystère';
    partie.prizes[0].enabled = true;
  } else {
    partie.prizes ||= [];
    for(let pi=0;pi<3;pi++){partie.prizes[pi] ||= defaultPrize(pi); partie.prizes[pi].type=prizeTypes[pi]; partie.prizes[pi].enabled=true;}
    partie.prizes = partie.prizes.slice(0,3);
  }
  return partie;
}
function defaultPartie(i){return normalizePartiePrizes({name:'Partie '+(i+1),gameMode:'ligne',prizes:[defaultPrize(0),defaultPrize(1),defaultPrize(2)]});}
function esc(v){return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function programTitle(program){return (program?.title||'').trim() || 'Loto sans nom';}
function showSavedMessage(text, good=true){saveMsg.textContent=text;saveMsg.className='notice '+(good?'ok-note':'bad-note');saveMsg.style.display='block';window.clearTimeout(window.__saveMsgTimer);window.__saveMsgTimer=window.setTimeout(()=>saveMsg.style.display='none',3500);}
function cartonStatus(text, good=true){const el=document.getElementById('cartonStatus'); if(!el) return; el.textContent=text; el.className='notice '+(good?'ok-note':'bad-note'); el.style.display='block';}

function drawParties(){
  const s=Loto.state(); const parties=s.program?.parties||[]; partieCount.value=parties.length||Number(partieCount.value||6);
  partiesList.innerHTML=parties.map((p,i)=>{
    const mode=p.gameMode||'ligne';
    const prizeInputs = mode === 'bingoMystere'
      ? `<div class="one-col"><div><label>Lot bingo mystère</label><input data-p="${i}" data-prize="0" placeholder="Nom du lot" value="${esc(p.prizes?.[0]?.label||'')}"></div></div>`
      : `<div class="three-cols">${prizeTypes.map((t,pi)=>`<div><label>${t}</label><input data-p="${i}" data-prize="${pi}" placeholder="Nom du ${t.toLowerCase()}" value="${esc(p.prizes?.[pi]?.label||'')}"></div>`).join('')}</div>`;
    return `<div class="card partie-edit"><h3>Partie ${i+1}</h3><div class="two-cols"><label>Nom<input data-p="${i}" data-f="name" value="${esc(p.name||('Partie '+(i+1)))}"></label><label>Mode de jeu<select data-p="${i}" data-f="gameMode"><option value="ligne" ${mode==='ligne'?'selected':''}>À la ligne : lot 1 = 1 ligne, lot 2 = 2 lignes, lot 3 = carton plein</option><option value="carton" ${mode==='carton'?'selected':''}>Carton plein : chaque lot se joue au carton plein</option><option value="bingoMystere" ${mode==='bingoMystere'?'selected':''}>Bingo mystère : 1 lot, carton mystère</option></select></label></div>${prizeInputs}</div>`;
  }).join('')||'<p>Aucune partie.</p>';
  partiesList.querySelectorAll('select[data-f="gameMode"]').forEach(sel=>sel.onchange=()=>{const program=readProgram(); Loto.save({program});});
}
function readProgram(){
  const s=Loto.state(); const parties=JSON.parse(JSON.stringify(s.program?.parties||[]));
  partiesList.querySelectorAll('[data-p]').forEach(inp=>{
    const p=Number(inp.dataset.p); parties[p] ||= defaultPartie(p); parties[p].prizes ||= [];
    if(inp.dataset.f==='name') parties[p].name=inp.value;
    if(inp.dataset.f==='gameMode') parties[p].gameMode=inp.value;
    if(inp.dataset.prize){const pi=Number(inp.dataset.prize); parties[p].prizes[pi] ||= defaultPrize(pi); parties[p].prizes[pi].enabled=true; parties[p].prizes[pi].label=inp.value;}
  });
  parties.forEach((partie,i)=>{partie.name ||= 'Partie '+(i+1); normalizePartiePrizes(partie);});
  return {id:Loto.makeId('loto'),title:lotoName.value||'',date:lotoDate.value||'',parties,sales_tracking_enabled:!!salesTrackingEnabled?.checked,createdAt:new Date().toISOString()};
}
function normalizedProgramForSave(){const p=readProgram(); const current=Loto.state().program || {}; p.id=current.id || p.id; p.createdAt=current.createdAt || p.createdAt; p.updatedAt=new Date().toISOString(); return p;}
async function saveProgramToList({start=false}={}){const s=Loto.state(); const program=normalizedProgramForSave(); program.sales_tracking_enabled=!!salesTrackingEnabled?.checked; const options={...s.options,showLots:showLots.checked,prevalidateSeconds:Number(prevalidate.value||6),lastNumberRequired:lastNumberRequired.checked}; const saved=[...(s.savedPrograms||[])]; const idx=saved.findIndex(x=>x.id===program.id); if(idx>=0) saved[idx]=program; else saved.unshift(program); const emptyProgram={id:'',title:'',date:'',parties:[]}; const patch={savedPrograms:saved.slice(0,80),options,program:emptyProgram}; if(start){Object.assign(patch,Loto.freshGamePatch(program)); patch.lotoName=program.title||'Loto by SdS'; patch.history=[{t:new Date().toISOString(),type:'start_program',label:'Lancement : '+programTitle(program),data:{programId:program.id}}];} await Loto.save(patch); showSavedMessage(start ? 'Loto enregistré et lancé.' : 'Loto enregistré. Les champs sont prêts pour une nouvelle saisie.');}
function drawSavedPrograms(){const list=Loto.state().savedPrograms||[]; if(!list.length){ savedProgramsList.innerHTML='<p>Aucun loto enregistré.</p>'; return; } savedProgramsList.innerHTML=list.map((p,i)=>`<div class="saved-row"><div><b>${esc(programTitle(p))}</b><br><span class="muted">${esc(p.date||'Sans date')} · ${(p.parties||[]).length} partie(s) · ${p.sales_tracking_enabled ? 'suivi ventes actif' : 'suivi ventes inactif'}</span></div><div class="toolbar"><button data-load="${i}">Modifier</button></div></div>`).join(''); savedProgramsList.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>loadProgram(Number(b.dataset.load)));}
async function loadProgram(i){const p=(Loto.state().savedPrograms||[])[i]; if(!p) return; await Loto.save({program:p,lotoName:p.title||'Loto by SdS'}); document.querySelector('[data-tab="loto"]').click(); showSavedMessage('Loto chargé pour modification.');}

document.getElementById('generateParties').onclick=()=>{let program=readProgram(); const target=Math.max(1,Number(partieCount.value||1)); while(program.parties.length<target) program.parties.push(defaultPartie(program.parties.length)); program.parties=program.parties.slice(0,target); Loto.save({program});};
document.getElementById('saveProgram').onclick=()=>saveProgramToList({start:false});
document.getElementById('saveBingo').onclick=async()=>{const src=document.querySelector('input[name=\"miniBingoSource\"]:checked')?.value||'first';await Loto.save({options:{...Loto.state().options,bingoEnabled:bingoEnabled.checked,showBingo:showBingo.checked,miniBingoSource:src}}); showSavedMessage('Paramètres Mini-bingo enregistrés.');};

async function refreshCartonCount(){
  const client=Loto.supabaseClient; const el=document.getElementById('cartonCount'); if(!el) return;
  if(!client){el.textContent='Supabase non configuré.'; return;}
  const {count,error}=await client.from('loto_cartons').select('numero',{count:'exact',head:true}).eq('serie','STANDARD').eq('actif',true);
  el.textContent=error?'Impossible de compter les cartons.':`${count||0} carton(s) dans la série STANDARD.`;
}
function validateCarton(c){
  if(!c || !Number.isInteger(c.numero)) return 'numéro invalide';
  if(!Array.isArray(c.lignes) || c.lignes.length!==3) return '3 lignes attendues';
  const all=c.lignes.flat();
  if(c.lignes.some(l=>!Array.isArray(l)||l.length!==5)) return 'chaque ligne doit contenir 5 numéros';
  if(all.some(n=>!Number.isInteger(n)||n<1||n>90)) return 'numéros hors plage 1-90';
  if(new Set(all).size!==15) return 'doublon sur le carton';
  return null;
}
async function importDefaultCartons(){
  const client=Loto.supabaseClient; if(!client){cartonStatus('Supabase non configuré.',false); return;}
  const btn=document.getElementById('importDefaultCartons'); btn.disabled=true;
  try{
    cartonStatus('Lecture du fichier cartons...',true);
    const res=await fetch('data/cartons-standard.json',{cache:'no-store'});
    if(!res.ok) throw new Error('Fichier data/cartons-standard.json introuvable');
    const cartons=await res.json();
    const errors=[]; const seen=new Set();
    cartons.forEach((c,i)=>{const err=validateCarton(c); if(err) errors.push(`ligne ${i+1} / carton ${c?.numero||'?'} : ${err}`); if(seen.has(c.numero)) errors.push(`doublon carton ${c.numero}`); seen.add(c.numero);});
    if(errors.length){cartonStatus('Import annulé : '+errors.slice(0,3).join(' | '),false); return;}
    cartonStatus(`Import en cours : ${cartons.length} cartons...`,true);
    let done=0;
    for(let i=0;i<cartons.length;i+=200){
      const chunk=cartons.slice(i,i+200).map(c=>({numero:c.numero,serie:c.serie||'STANDARD',lignes:c.lignes,actif:c.actif!==false}));
      const {error}=await client.from('loto_cartons').upsert(chunk,{onConflict:'numero'});
      if(error) throw error;
      done+=chunk.length; cartonStatus(`Import en cours : ${done}/${cartons.length} cartons...`,true);
    }
    cartonStatus(`Import terminé : ${cartons.length} cartons importés en série STANDARD.`,true);
    refreshCartonCount();
  }catch(e){console.error(e); cartonStatus('Erreur import : '+(e.message||e),false);} finally{btn.disabled=false;}
}
async function deleteStandardCartons(){
  if(!confirm('Supprimer les cartons STANDARD de Supabase ?')) return;
  const client=Loto.supabaseClient; if(!client) return;
  const {error}=await client.from('loto_cartons').delete().eq('serie','STANDARD');
  cartonStatus(error?'Erreur suppression : '+error.message:'Cartons STANDARD supprimés.',!error); refreshCartonCount();
}
async function testCard(){
  const n=document.getElementById('testCard').value; const out=document.getElementById('testCardResult');
  if(!n) return;
  const c=await Loto.fetchCard?.(n);
  if(!c){out.innerHTML='<span class="bad">Carton introuvable.</span>'; return;}
  out.innerHTML=`<b>Carton ${c.numero}</b> · ${esc(c.serie||'STANDARD')}<br>` + c.lignes.map((l,i)=>`Ligne ${i+1} : ${l.join(' - ')}`).join('<br>');
}
document.getElementById('importDefaultCartons')?.addEventListener('click',importDefaultCartons);
document.getElementById('deleteStandardCartons')?.addEventListener('click',deleteStandardCartons);
document.getElementById('refreshCartons')?.addEventListener('click',refreshCartonCount);
document.getElementById('testCardBtn').onclick=testCard;

Loto.onChange(s=>{Loto.pageHeader(); lotoName.value=s.program?.title||''; lotoDate.value=s.program?.date||''; prevalidate.value=s.options?.prevalidateSeconds||6; lastNumberRequired.checked=s.options?.lastNumberRequired!==false; showLots.checked=!!s.options?.showLots; if(salesTrackingEnabled) salesTrackingEnabled.checked=!!s.program?.sales_tracking_enabled; bingoEnabled.checked=!!s.options?.bingoEnabled; showBingo.checked=!!s.options?.showBingo; const mb=document.querySelector(`input[name=\"miniBingoSource\"][value=\"${s.options?.miniBingoSource||'first'}\"]`); if(mb) mb.checked=true; drawParties(); drawSavedPrograms();});
Loto.ensureSession().then(refreshCartonCount);


// V3.0.0 - création de cartons, planches A3 et test scanner QR
let generatedCards = [];
let generatedMode = 'individual';
let generatedModel = 'classic';
let generatedPerPage = 4;
let generatedKey = '';
let scannerStream = null;
let scannerTimer = null;
let scannerDetector = null;
let scannerLastValue = '';
let scannerLastAt = 0;
let scannerStartedAt = 0;
let scannerReadCount = 0;

function genStatus(text, good=true){ const el=document.getElementById('generatedCardsStatus'); if(!el) return; el.textContent=text; el.className='notice '+(good?'ok-note':'bad-note'); el.style.display='block'; }
function rangeForColumn(col){ if(col===0) return [1,9]; if(col===8) return [80,90]; return [col*10, col*10+9]; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function buildCardGrid(){
  const grid=Array.from({length:3},()=>Array(9).fill(null));
  const rowCounts=[0,0,0]; const colCounts=Array(9).fill(0);
  for(let col=0;col<9;col++){
    const possible=shuffle([0,1,2].filter(r=>rowCounts[r]<5));
    const row=possible[0]; grid[row][col]=0; rowCounts[row]++; colCounts[col]++;
  }
  while(rowCounts.some(c=>c<5)){
    const r=shuffle([0,1,2].filter(r=>rowCounts[r]<5))[0];
    const cols=shuffle([...Array(9).keys()].filter(c=>grid[r][c]===null && colCounts[c]<3));
    const c=cols[0]; if(c===undefined) break;
    grid[r][c]=0; rowCounts[r]++; colCounts[c]++;
  }
  for(let col=0;col<9;col++){
    const [min,max]=rangeForColumn(col);
    const pool=[]; for(let n=min;n<=max;n++) pool.push(n);
    shuffle(pool);
    const rows=[0,1,2].filter(r=>grid[r][col]===0).sort((a,b)=>a-b);
    const nums=pool.slice(0,rows.length).sort((a,b)=>a-b);
    rows.forEach((r,i)=>grid[r][col]=nums[i]);
  }
  return grid;
}
function gridToLignes(grid){ return grid.map(row=>row.filter(n=>Number.isInteger(n))); }
function cleanAssociationId(value){
  const raw=String(value||'1').replace(/\D/g,'');
  return String(raw || '1').slice(-2).padStart(2,'0');
}
function cardInternalNumero(associationId, order){ return Number(cleanAssociationId(associationId)) * 10000 + Number(order || 0); }
function cartonOrderFromNumero(numero, associationId){ const n=Number(numero||0); const a=Number(cleanAssociationId(associationId))*10000; return n>=a ? n-a : n; }
function cartonCodeFromOrder(order, associationId){ return 'SDS-'+cleanAssociationId(associationId)+'-'+String(Math.max(0, Number(order||1))).padStart(4,'0').slice(-4); }
function cartonCode(numeroOrOrder, associationId){ return cartonCodeFromOrder(numeroOrOrder, associationId); }
function sheetCode(sheetNumber, associationId){ return 'SDSP-'+cleanAssociationId(associationId)+'-'+String(String(Math.max(0, Number(sheetNumber||1))).slice(-4)).padStart(4,'0'); }
function numbersSignatureFromGrid(grid){
  const nums=(grid||[]).flat().filter(n=>Number.isInteger(Number(n))).map(n=>Number(n)).sort((a,b)=>a-b);
  return nums.map(n=>String(n).padStart(2,'0')).join('-');
}
async function nextOrderForAssociation(associationId){
  const client=Loto.supabaseClient;
  if(!client) return 1;
  const aid=cleanAssociationId(associationId);
  let maxOrder=0;
  try{
    const {data,error}=await client.from('loto_cartons').select('card_order,carton_code,numero').eq('association_id',aid).order('card_order',{ascending:false}).limit(1);
    if(!error && data && data.length){
      const c=data[0];
      maxOrder=Number(c.card_order || String(c.carton_code||'').match(/(\d{1,4})$/)?.[1] || cartonOrderFromNumero(c.numero, aid) || 0);
    }
  }catch(e){}
  if(!maxOrder){
    try{
      const {data}=await client.from('loto_cartons').select('carton_code,numero').ilike('carton_code','SDS-'+aid+'-%').limit(1000);
      (data||[]).forEach(c=>{ const o=Number(String(c.carton_code||'').match(/(\d{1,4})$/)?.[1] || cartonOrderFromNumero(c.numero, aid) || 0); if(o>maxOrder) maxOrder=o; });
    }catch(e){}
  }
  return maxOrder+1;
}
function renderPremiumPrintableCard(card){
  const qrId='qr_'+String(card.numero).replace(/\W/g,'_')+'_'+Math.random().toString(36).slice(2,6);
  const rows=card.grid.map(row=>`<tr>${row.map(n=>n?`<td><span class="big-num">${String(n)}</span><span class="mini-num">${String(n)}</span></td>`:'<td class="empty"><span></span></td>').join('')}</tr>`).join('');
  return `<div class="loto-card-print premium-card"><div class="loto-card-inner"><div class="loto-card-head"><div><div class="carton-number-line">${esc(card.code)}</div><div class="loto-card-meta">${card.sheetCode ? esc(card.sheetCode)+' · carton '+card.sheetPosition : 'Carton individuel'}</div></div><div><div id="${qrId}" class="qr-box" data-qr="${esc(card.qrPayload)}"><span class="qr-fallback">${esc(card.qrPayload)}</span></div></div></div><table class="carton-grid"><tbody>${rows}</tbody></table><div class="loto-card-foot">Loto by SdS</div></div></div>`;
}
function renderClassicPrintableCard(card){
  const qrId='qr_'+String(card.numero).replace(/\W/g,'_')+'_'+Math.random().toString(36).slice(2,6);
  const rows=card.grid.map(row=>`<tr>${row.map(n=>n?`<td><span class="big-num">${String(n)}</span><span class="mini-num">${String(n)}</span></td>`:'<td class="empty"><span></span></td>').join('')}</tr>`).join('');
  return `<div class="loto-card-print classic-card"><div class="classic-head"><div id="${qrId}" class="qr-box" data-qr="${esc(card.qrPayload)}"><span class="qr-fallback">${esc(card.qrPayload)}</span></div><div class="classic-title-block"><div class="classic-title">Loto by SdS</div><div class="classic-code-head">${esc(card.code)}</div></div></div><table class="carton-grid classic-grid"><tbody>${rows}</tbody></table><div class="classic-foot"></div></div>`;
}
function renderPrintableCard(card){
  return generatedModel==='classic' ? renderClassicPrintableCard(card) : renderPremiumPrintableCard(card);
}
function renderGeneratedCards(){
  const out=document.getElementById('generatedCardsPreview'); if(!out) return;
  out.style.display='none';
  if(!generatedCards.length){ out.innerHTML=''; return; }
  out.innerHTML=generatedCards.map(card=>`<div class="qr-cache" data-qr="${esc(card.qrPayload)}" style="position:absolute;left:-9999px;top:-9999px;width:60px;height:60px"></div>`).join('');
  out.querySelectorAll('[data-qr]').forEach(el=>{
    const payload=el.dataset.qr;
    el.innerHTML='';
    if(window.QRCode){ new QRCode(el,{text:payload,width:60,height:60,correctLevel:QRCode.CorrectLevel.L}); }
    else el.textContent=payload;
  });
}
function buildGeneratedCards({startOrder,count,serie,mode,perPage=4,associationId='01',model='classic'}){
  generatedCards=[]; generatedMode=mode; generatedModel=model; generatedPerPage=perPage;
  const aid=cleanAssociationId(associationId);
  const seenSignatures=new Set();
  for(let i=0;i<count;i++){
    const order=startOrder+i;
    let grid=buildCardGrid();
    let sig=numbersSignatureFromGrid(grid);
    let tries=0;
    while(seenSignatures.has(sig) && tries<40){ grid=buildCardGrid(); sig=numbersSignatureFromGrid(grid); tries++; }
    seenSignatures.add(sig);
    const numero=cardInternalNumero(aid, order);
    const groupSize = (model==='classic' && mode==='sheets') ? 8 : 6;
    const sheetIndex=mode==='sheets' ? Math.floor(i/groupSize)+1 : null;
    const pos=mode==='sheets' ? (i%groupSize)+1 : null;
    const code=cartonCodeFromOrder(order, aid);
    const sc=sheetIndex ? sheetCode(sheetIndex, aid) : null;
    generatedCards.push({numero,cardOrder:order,code,associationId:aid,serie,grid,lignes:gridToLignes(grid),numbersSignature:sig,sheetNumber:sheetIndex,sheetCode:sc,sheetPosition:pos,qrPayload:code,status:'disponible',origin:'Loto by SdS'});
  }
  renderGeneratedCards();
  genStatus(`${generatedCards.length} carton(s) préparé(s), à partir de ${generatedCards[0]?.code || ''}.`,true);
}

async function prepareGeneratedCards(){
  const requested=Math.max(1,Number(document.getElementById('genCardCount')?.value||1));
  const type=document.getElementById('genCardType')?.value||'individual';
  const model=document.getElementById('genCardModel')?.value||'classic';
  const serie=(document.getElementById('genSerie')?.value||'STANDARD').trim()||'STANDARD';
  const associationId=cleanAssociationId(document.getElementById('genAssociationId')?.value||'1');
  const key=[associationId,requested,type,model,serie].join('|');
  if(generatedCards.length && generatedKey===key) return generatedCards;
  const perPage = model==='classic' ? (type==='sheets' ? 8 : 4) : (type==='sheets' ? 6 : 3);
  const startOrder=await nextOrderForAssociation(associationId);
  if(startOrder>9999) throw new Error('Limite atteinte pour cette association : 9999 cartons.');
  let count=requested;
  if(type==='sheets'){
    const plancheSize = model==='classic' ? 8 : 6;
    count=Math.ceil(requested/plancheSize)*plancheSize;
  }
  if(startOrder+count-1>9999) throw new Error('Création impossible : le numéro de carton dépasserait 9999 pour cette association.');
  buildGeneratedCards({startOrder,count,serie,mode:type==='sheets'?'sheets':'individual',perPage,associationId,model});
  generatedKey=key;
  if(count!==requested) genStatus(`${requested} carton(s) demandé(s). ${count} carton(s) préparé(s) pour compléter les feuilles. Premier code : ${generatedCards[0]?.code}.`,true);
  return generatedCards;
}
async function generateCardsUnified(){
  try{ await prepareGeneratedCards(); }
  catch(e){ genStatus('Erreur préparation : '+(e.message||e),false); generatedCards=[]; }
}

function generateIndividualCards(){
  const start=Number(document.getElementById('genIndStartNumber')?.value||1);
  const count=Math.max(1,Number(document.getElementById('genIndCount')?.value||1));
  const perPage=Math.max(1,Math.min(3,Number(document.getElementById('genIndPerPage')?.value||2)));
  const serie=(document.getElementById('genIndSerie')?.value||'INDIVIDUEL').trim()||'INDIVIDUEL';
  buildGeneratedCards({start,count,serie,mode:'individual',perPage,associationId:'01'});
}
function generateSheetCards(){
  const start=Number(document.getElementById('genSheetStartNumber')?.value||1);
  const sheetCount=Math.max(1,Number(document.getElementById('genSheetCount')?.value||1));
  const serie=(document.getElementById('genSheetSerie')?.value||'PLANCHE_A3').trim()||'PLANCHE_A3';
  buildGeneratedCards({start,count:sheetCount*6,serie,mode:'sheets',perPage:6,associationId:'01'});
}
async function checkGeneratedDuplicates(){
  const client=Loto.supabaseClient; if(!client) throw new Error('Supabase non configuré.');
  const nums=generatedCards.map(c=>c.numero);
  const sigs=generatedCards.map(c=>c.numbersSignature).filter(Boolean);
  for(let i=0;i<nums.length;i+=100){
    const {data,error}=await client.from('loto_cartons').select('numero,carton_code').in('numero', nums.slice(i,i+100));
    if(error) throw error;
    if(data?.length) throw new Error('Identifiant déjà existant : '+(data[0].carton_code||data[0].numero));
  }
  for(let i=0;i<sigs.length;i+=80){
    const {data,error}=await client.from('loto_cartons').select('numero,carton_code,numbers_signature').in('numbers_signature', sigs.slice(i,i+80));
    if(error) throw error;
    if(data?.length) throw new Error('Grille déjà existante avec les mêmes 15 numéros : '+(data[0].carton_code||data[0].numero));
  }
}
async function saveGeneratedCards(){
  const client=Loto.supabaseClient; if(!client){ genStatus('Supabase non configuré.',false); return; }
  try{
    await prepareGeneratedCards();
    if(!generatedCards.length) throw new Error('Aucun carton préparé.');
    await checkGeneratedDuplicates();
    const fullRows=generatedCards.map(c=>({numero:c.numero,carton_code:c.code,association_id:c.associationId,card_order:c.cardOrder,numbers_signature:c.numbersSignature,serie:c.serie,lignes:c.lignes,grille:c.grid,sheet_code:c.sheetCode,sheet_position:c.sheetPosition,qr_payload:c.qrPayload,status:c.status,origine:c.origin,actif:true,updated_at:new Date().toISOString()}));
    for(let i=0;i<fullRows.length;i+=100){ const {error}=await client.from('loto_cartons').insert(fullRows.slice(i,i+100)); if(error) throw error; }
    genStatus(`${fullRows.length} carton(s) enregistrés. Aucun doublon d'identifiant ou de grille. Création du PDF...`,true);
    refreshCartonCount();
    openGeneratedCardsPrintWindow(false);
    generatedCards=[]; generatedKey='';
  }catch(e){ genStatus('Erreur enregistrement : '+(e.message||e),false); }
}
function beep(ok=true){
  try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.frequency.value=ok?880:220; g.gain.value=.08; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{o.stop(); ctx.close();}, ok?90:180); }catch(e){}
}
async function startQrScanner(){
  const status=document.getElementById('scannerStatus'); const video=document.getElementById('qrScannerVideo');
  if(!('BarcodeDetector' in window)){ if(status) status.textContent='BarcodeDetector non disponible sur ce navigateur. Tester sur Chrome/Android ou Safari récent.'; return; }
  try{
    scannerDetector = new BarcodeDetector({formats:['qr_code','code_128','ean_13','ean_8','code_39']});
    scannerStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
    video.srcObject=scannerStream; await video.play();
    scannerReadCount=0; scannerStartedAt=performance.now(); scannerLastValue=''; scannerLastAt=0;
    document.getElementById('scannerReadCount').textContent='0';
    if(status) status.textContent='Scan en cours.';
    scannerTimer=setInterval(scanQrFrame,120);
  }catch(e){ if(status) status.textContent='Erreur caméra : '+(e.message||e); }
}
function stopQrScanner(){
  if(scannerTimer) clearInterval(scannerTimer); scannerTimer=null;
  if(scannerStream){ scannerStream.getTracks().forEach(t=>t.stop()); scannerStream=null; }
  const video=document.getElementById('qrScannerVideo'); if(video) video.srcObject=null;
  const status=document.getElementById('scannerStatus'); if(status) status.textContent='Caméra arrêtée.';
}
async function scanQrFrame(){
  const video=document.getElementById('qrScannerVideo'); if(!scannerDetector || !video || video.readyState<2) return;
  try{
    const codes=await scannerDetector.detect(video); if(!codes.length) return;
    const value=(codes[0].rawValue||'').trim(); if(!value) return;
    const now=performance.now();
    const continuous=document.getElementById('scannerContinuous')?.checked!==false;
    if(value===scannerLastValue && now-scannerLastAt<1200) return;
    scannerLastValue=value; scannerLastAt=now; scannerReadCount++;
    document.getElementById('scannerLastCode').textContent=value;
    document.getElementById('scannerReadTime').textContent=Math.round(now-scannerStartedAt)+' ms';
    document.getElementById('scannerReadCount').textContent=String(scannerReadCount);
    const hist=document.getElementById('scannerHistory'); if(hist) hist.innerHTML=`<div>${new Date().toLocaleTimeString()} · ${esc(value)}</div>`+hist.innerHTML;
    beep(true);
    scannerStartedAt=performance.now();
    if(!continuous) stopQrScanner();
  }catch(e){}
}

document.getElementById('genCardType')?.addEventListener('change',updateCardGeneratorUi);
document.getElementById('genCardModel')?.addEventListener('change',updateCardGeneratorUi);

document.getElementById('saveGeneratedCards')?.addEventListener('click',saveGeneratedCards);
function getQrImageForCard(card){
  const box=[...document.querySelectorAll('[data-qr]')].find(el=>el.dataset.qr===card.qrPayload);
  if(!box) return null;
  const canvas=box.querySelector('canvas');
  if(canvas){ try{return canvas.toDataURL('image/png');}catch(e){} }
  const img=box.querySelector('img');
  if(img && img.src) return img.src;
  return null;
}
function drawPdfCard(doc, card, x, y){
  const cardW=207, cardH=97, cellW=22, cellH=23;
  doc.setDrawColor(0); doc.setTextColor(0); doc.setFillColor(255,255,255);
  doc.setLineWidth(1.2); doc.roundedRect(x,y,cardW,cardH,4,4,'S');
  doc.setLineWidth(0.35); doc.roundedRect(x+1.1,y+1.1,cardW-2.2,cardH-2.2,2.8,2.8,'S');
  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text(card.code, x+4, y+8);
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(70);
  doc.text(card.sheetCode ? (card.sheetCode+' - carton '+card.sheetPosition) : 'Carton individuel', x+4, y+13);
  const qr=getQrImageForCard(card);
  if(qr){ try{ doc.addImage(qr,'PNG',x+188,y+4,14,14); }catch(e){ doc.setFontSize(5); doc.text(card.qrPayload,x+172,y+12); } }
  else { doc.setFontSize(5); doc.text(card.qrPayload,x+172,y+12); }
  const gx=x+4.5, gy=y+21;
  doc.setDrawColor(0); doc.setTextColor(0); doc.setLineWidth(0.25);
  doc.rect(gx,gy,198,69,'S');
  for(let c=1;c<9;c++) doc.line(gx+c*cellW, gy, gx+c*cellW, gy+69);
  for(let r=1;r<3;r++) doc.line(gx, gy+r*cellH, gx+198, gy+r*cellH);
  for(let r=0;r<3;r++){
    for(let c=0;c<9;c++){
      const n=card.grid[r][c];
      const cx=gx+c*cellW, cy=gy+r*cellH;
      if(n){
        doc.setFont('helvetica','bold'); doc.setFontSize(36); doc.setTextColor(0);
        doc.text(String(n), cx+cellW/2, cy+15.4, {align:'center'});
        doc.setFontSize(8.5); doc.setTextColor(85);
        doc.text(String(n), cx+cellW/2, cy+21.1, {align:'center'});
      }else{
        doc.setFillColor(215,215,215); doc.roundedRect(cx+5, cy+8.4, 12, 6.5, .9, .9, 'F');
      }
    }
  }
  doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(50);
  doc.text('Loto by SdS', x+cardW/2, y+94, {align:'center'});
}
function drawPdfClassicCard(doc, card, x, y){
  const cardW=148.5, cardH=105;
  const marginX=6.75, headH=18, gridOffsetY=3, gridW=135, gridH=75, cellW=15, cellH=25;
  const gridX=x+marginX, gridY=y+headH+gridOffsetY;
  doc.setDrawColor(0); doc.setTextColor(0); doc.setLineWidth(0.25);
  doc.setFillColor(255,255,255);
  // fond blanc, sans cadre extérieur pour que la découpe reste invisible
  doc.rect(x,y,cardW,cardH,'F');
  // en-tete blanc : QR 13 x 13 mm, descendu de 1 mm, titre centre et code SDS agrandi
  const qr=getQrImageForCard(card);
  if(qr){ try{ doc.addImage(qr,'PNG',x+marginX,y+4,13,13); }catch(e){} }
  else { doc.setTextColor(0); doc.setFontSize(4); doc.text(card.qrPayload,x+marginX,y+10); }
  doc.setTextColor(0); doc.setFont('helvetica','bold'); doc.setFontSize(7.2);
  doc.text('Loto by SdS', x+cardW/2, y+10.2, {align:'center'});
  doc.setFont('helvetica','bold'); doc.setFontSize(8.9);
  doc.text(card.code, x+cardW-marginX, y+11.2, {align:'right'});
  // grille : 9 colonnes x 3 lignes, cases 15 x 25 mm
  doc.setDrawColor(55); doc.setFillColor(255,255,255); doc.setLineWidth(0.22);
  doc.rect(gridX,gridY,gridW,gridH,'S');
  for(let c=1;c<9;c++) doc.line(gridX+c*cellW,gridY,gridX+c*cellW,gridY+gridH);
  for(let r=1;r<3;r++) doc.line(gridX,gridY+r*cellH,gridX+gridW,gridY+r*cellH);
  for(let r=0;r<3;r++){
    for(let c=0;c<9;c++){
      const n=card.grid[r][c];
      const cx=gridX+c*cellW, cy=gridY+r*cellH;
      if(n){
        // V3.1.7 final : le PDF doit reprendre les numéros agrandis de l'aperçu HTML.
        doc.setFont('helvetica','bold'); doc.setFontSize(24); doc.setTextColor(0);
        doc.text(String(n), cx+cellW/2, cy+15.2, {align:'center'});
        doc.setFont('helvetica','normal'); doc.setFontSize(6.6); doc.setTextColor(20);
        doc.text(String(n), cx+cellW/2, cy+22.45, {align:'center'});
      }else{
        doc.setFillColor(190,190,185);
        doc.rect(cx+1.2, cy+2, cellW-2.4, cellH-4, 'F');
      }
    }
  }
}
function downloadCalibrationPdf(){
  const jspdf = window.jspdf || window.jsPDF;
  if(!jspdf || !jspdf.jsPDF){ genStatus('Générateur PDF non chargé. Vérifie la connexion Internet puis recharge la page.', false); return; }
  const doc = new jspdf.jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text('Loto by SdS - Calibration impression', 12, 14);
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  doc.text('Imprimer ce PDF, puis mesurer les regles et carres au reglet.', 12, 22);
  doc.text('Objectif : verifier la taille reelle avant de figer les cartons.', 12, 28);
  doc.setLineWidth(0.35); doc.setDrawColor(0); doc.setTextColor(0);
  const x0=20, y0=45;
  doc.line(x0,y0,x0+100,y0); doc.line(x0,y0-3,x0,y0+3); doc.line(x0+100,y0-3,x0+100,y0+3);
  for(let i=0;i<=100;i+=10){ doc.line(x0+i,y0-1.8,x0+i,y0+1.8); doc.setFontSize(7); doc.text(String(i), x0+i, y0+7, {align:'center'}); }
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('Regle horizontale 100 mm', x0, y0-7);
  const vx=175, vy=45;
  doc.line(vx,vy,vx,vy+100); doc.line(vx-3,vy,vx+3,vy); doc.line(vx-3,vy+100,vx+3,vy+100);
  for(let i=0;i<=100;i+=10){ doc.line(vx-1.8,vy+i,vx+1.8,vy+i); doc.setFontSize(7); doc.text(String(i), vx+7, vy+i+1.5); }
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('Regle verticale 100 mm', 135, 39);
  const sizes=[20,21,22,23]; let y=165;
  doc.setFontSize(11); doc.text('Carres de controle', 20, y-8);
  sizes.forEach((sz,idx)=>{ const x=20+idx*42; doc.setLineWidth(0.3); doc.rect(x,y,sz,sz); doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(sz+' x '+sz+' mm', x+sz/2, y+sz+7, {align:'center'}); });
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text('Note les mesures obtenues sur papier. Exemple : la regle 100 mm mesure 96 mm = reduction 96%.', 20, 230, {maxWidth:170});
  doc.save('loto_by_sds_calibration_v3_1_0.pdf');
  genStatus('PDF calibration téléchargé.', true);
}

function openGeneratedCardsPrintWindow(autoPrepare=true){
  if(!generatedCards.length && autoPrepare){ genStatus('Clique sur Créer PDF à nouveau si le PDF ne se lance pas.', false); return; }
  if(!generatedCards.length){ genStatus('Aucun carton à télécharger.', false); return; }
  const jspdf = window.jspdf || window.jsPDF;
  if(!jspdf || !jspdf.jsPDF){ genStatus('Générateur PDF non chargé. Vérifie la connexion Internet puis recharge la page.', false); return; }
  const isSheets = generatedMode === 'sheets';
  const Doc = jspdf.jsPDF;
  const isClassic = generatedModel === 'classic';
  const doc = new Doc({orientation:isClassic ? (isSheets?'portrait':'landscape') : (isSheets?'landscape':'portrait'), unit:'mm', format:isSheets?'a3':'a4'});
  let per, positions, drawFn;
  if(isClassic){
    per = isSheets ? 8 : 4;
    drawFn = drawPdfClassicCard;
    positions = isSheets
      ? [[0,0],[148.5,0],[0,105],[148.5,105],[0,210],[148.5,210],[0,315],[148.5,315]]
      : [[0,0],[148.5,0],[0,105],[148.5,105]];
  }else{
    per = isSheets ? 6 : 3;
    drawFn = drawPdfCard;
    positions = isSheets
      ? [[0,0],[213,0],[0,100],[213,100],[0,200],[213,200]]
      : [[1.5,0],[1.5,100],[1.5,200]];
  }
  generatedCards.forEach((card,i)=>{
    if(i>0 && i%per===0) doc.addPage(isSheets?'a3':'a4', isClassic ? (isSheets?'portrait':'landscape') : (isSheets?'landscape':'portrait'));
    const [x,y]=positions[i%per];
    drawFn(doc, card, x, y);
  });
  const first=generatedCards[0]?.code || 'cartons';
  const prefix = isClassic ? (isSheets?'planches_a3_portrait_classique_':'cartons_a4_paysage_a6_') : (isSheets?'planches_a3_premium_':'cartons_a4_premium_');
  const name=prefix+first.replaceAll('-','_')+'.pdf';
  doc.save(name);
  genStatus('PDF téléchargé : '+name, true);
}

document.getElementById('printGeneratedCards')?.addEventListener('click', async()=>{ try{ await prepareGeneratedCards(); openGeneratedCardsPrintWindow(false); }catch(e){ genStatus('Erreur PDF : '+(e.message||e),false); } });
document.getElementById('downloadCalibrationPdf')?.addEventListener('click', downloadCalibrationPdf);
window.addEventListener('afterprint',()=>{ document.body.classList.remove('printing-cartons','print-mode-sheets'); });
updateCardGeneratorUi();

/* Compatibilité avec l'ancien écran si présent */
document.getElementById('generateIndividualCards')?.addEventListener('click',generateIndividualCards);
document.getElementById('generateSheetCards')?.addEventListener('click',generateSheetCards);
document.getElementById('saveGeneratedIndividualCards')?.addEventListener('click',saveGeneratedCards);
document.getElementById('saveGeneratedSheetCards')?.addEventListener('click',saveGeneratedCards);
document.getElementById('printGeneratedIndividualCards')?.addEventListener('click',()=>{ if(!generatedCards.length || generatedMode!=='individual') generateIndividualCards(); document.body.classList.add('printing-cartons'); document.body.classList.remove('print-mode-sheets'); setTimeout(()=>window.print(),300); });
document.getElementById('printGeneratedSheetCards')?.addEventListener('click',()=>{ if(!generatedCards.length || generatedMode!=='sheets') generateSheetCards(); document.body.classList.add('printing-cartons'); document.body.classList.add('print-mode-sheets'); setTimeout(()=>window.print(),300); });


// V3.2.0 - gestion simple des cartons enregistrés et suivi des ventes optionnel
function parseManualLines(value){
  const lines=String(value||'').trim().split(/\n+/).map(line=>line.match(/\d+/g)?.map(Number)||[]).filter(Boolean);
  if(lines.length!==3 || lines.some(l=>l.length!==5)) throw new Error('Il faut 3 lignes de 5 numéros.');
  const all=lines.flat();
  if(all.some(n=>n<1||n>90)) throw new Error('Les numéros doivent être entre 1 et 90.');
  if(new Set(all).size!==15) throw new Error('Doublon détecté dans le carton.');
  return lines;
}
function codeToNumero(code){
  const s=String(code||'').trim();
  const m=s.match(/SDS-(\d{1,2})-(\d{1,4})$/i);
  if(m) return cardInternalNumero(m[1], Number(m[2]));
  const tail=s.match(/(\d{1,6})\s*$/);
  return tail ? Number(tail[1]) : Number(s||0);
}
function statusText(elId, text, good=true){
  const el=document.getElementById(elId); if(!el) return;
  el.textContent=text; el.className='notice '+(good?'ok-note':'bad-note'); el.style.display='block';
}
function emptyGrid3x9(){ return Array.from({length:3},()=>Array(9).fill(null)); }
function normalizeGrid3x9(grid, lignes){
  if(Array.isArray(grid) && grid.length===3 && grid.every(r=>Array.isArray(r) && r.length===9)) return grid.map(r=>r.map(n=>Number.isInteger(Number(n)) ? Number(n) : null));
  const g=emptyGrid3x9();
  if(Array.isArray(lignes) && lignes.length===3){
    lignes.forEach((line,r)=>{ (line||[]).slice(0,5).forEach((n,i)=>{ g[r][i*2]=Number(n)||null; }); });
  }
  return g;
}
function renderGridEditor(elId, grid){
  const el=document.getElementById(elId); if(!el) return;
  const g=normalizeGrid3x9(grid);
  el.innerHTML=g.map((row,r)=>row.map((n,c)=>`<input inputmode="numeric" min="1" max="90" maxlength="2" data-grid="${elId}" data-r="${r}" data-c="${c}" value="${n||''}">`).join('')).join('');
}
function readGridEditor(elId){
  const grid=emptyGrid3x9();
  document.querySelectorAll(`[data-grid="${elId}"]`).forEach(inp=>{
    const r=Number(inp.dataset.r), c=Number(inp.dataset.c); const raw=String(inp.value||'').trim();
    grid[r][c]=raw?Number(raw):null;
  });
  const all=grid.flat().filter(n=>n!==null);
  if(all.length!==15) throw new Error('La grille doit contenir exactement 15 numéros.');
  if(all.some(n=>!Number.isInteger(n)||n<1||n>90)) throw new Error('Les numéros doivent être entre 1 et 90.');
  if(new Set(all).size!==15) throw new Error('Doublon détecté dans le carton.');
  if(grid.some(row=>row.filter(n=>n!==null).length!==5)) throw new Error('Chaque ligne doit contenir 5 numéros.');
  return grid;
}
function gridToLignes(grid){ return grid.map(row=>row.filter(n=>n!==null)); }
let editingCardNumero=null;
async function listManagedCards(){
  const client=Loto.supabaseClient; const out=document.getElementById('managedCardsList'); if(!out) return;
  if(!client){ out.innerHTML='<p class="bad">Supabase non configuré.</p>'; return; }
  const q=String(document.getElementById('cardSearchText')?.value||'').trim();
  const status=document.getElementById('cardStatusFilter')?.value||'all';
  let req=client.from('loto_cartons').select('*').eq('actif',true).order('updated_at',{ascending:false}).limit(100);
  if(status!=='all') req=req.eq('status',status);
  if(q){ const n=codeToNumero(q); req = n ? req.eq('numero',n) : req.ilike('carton_code','%'+q+'%'); }
  const {data,error}=await req;
  if(error){ out.innerHTML='<p class="bad">Erreur : '+esc(error.message)+'</p>'; return; }
  if(!data?.length){ out.innerHTML='<p>Aucun carton trouvé.</p>'; return; }
  out.innerHTML=data.map(c=>{
    const st=c.status||'disponible';
    const badge=st==='a_enregistrer'?'🟡 À enregistrer':(st==='disponible'?'🟢 Validé / disponible':(st==='vendu'?'🔵 Vendu':esc(st)));
    const q=Number.isFinite(Number(c.ocr_quality)) ? ' · grille '+Number(c.ocr_quality)+' %' : '';
    const ext=c.external_code ? ` · identifiant : ${esc(c.external_code)} (${esc(c.external_code_type||'')})` : ' · identifiant à saisir';
    return `<div class="saved-row"><div><b>${esc(c.external_code||c.carton_code||('Carton '+c.numero))}</b><br><span class="muted">Interne : ${esc(c.carton_code||c.numero)} · ${esc(c.serie||'STANDARD')} · ${badge}${q}${ext} · origine : ${esc(c.origine||'')}</span></div><div class="toolbar"><button data-edit-card="${esc(c.numero)}">Modifier</button>${st==='a_enregistrer'?`<button class="green" data-validate-card="${esc(c.numero)}">Valider</button>`:''}<button data-sold-card="${esc(c.external_code||c.carton_code||c.numero)}">Vendu</button><button data-free-card="${esc(c.external_code||c.carton_code||c.numero)}">Disponible</button></div></div>`;
  }).join('');
  out.querySelectorAll('[data-edit-card]').forEach(b=>b.onclick=()=>openEditCard(Number(b.dataset.editCard)));
  out.querySelectorAll('[data-validate-card]').forEach(b=>b.onclick=()=>quickValidateCard(Number(b.dataset.validateCard)));
  out.querySelectorAll('[data-sold-card]').forEach(b=>b.onclick=()=>markCardSold(b.dataset.soldCard));
  out.querySelectorAll('[data-free-card]').forEach(b=>b.onclick=()=>markCardAvailable(b.dataset.freeCard));
}
async function openEditCard(numero){
  const client=Loto.supabaseClient; if(!client) return;
  const {data,error}=await client.from('loto_cartons').select('*').eq('numero',numero).single();
  if(error){ cartonStatus('Erreur lecture carton : '+error.message,false); return; }
  editingCardNumero=numero;
  document.getElementById('editCardCode').value=data.carton_code||'';
  document.getElementById('editCardSerie').value=data.serie||'IMPORT';
  document.getElementById('editCardQuality').value=data.ocr_quality??'';
  document.getElementById('editCardStatus').value=data.status||'a_enregistrer';
  renderGridEditor('editGridEditor', normalizeGrid3x9(data.grille,data.lignes));
  document.getElementById('cardEditPanel').style.display='block';
  document.getElementById('cardEditPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveEditedCard(statusOverride=null){
  const client=Loto.supabaseClient; if(!client){ statusText('editCardStatusBox','Supabase non configuré.',false); return; }
  try{
    const code=document.getElementById('editCardCode')?.value.trim(); const numero=codeToNumero(code)||editingCardNumero;
    if(!numero) throw new Error('Code interne ou numéro obligatoire.');
    const externalCode=document.getElementById('editExternalCode')?.value.trim();
    const externalType=document.getElementById('editExternalType')?.value.trim() || (externalCode ? 'manuel' : null);
    const finalStatus=statusOverride||document.getElementById('editCardStatus')?.value||'a_enregistrer';
    if(finalStatus==='disponible' && !externalCode) throw new Error('Identifiant du carton obligatoire avant validation.');
    if(externalCode){ const {data:dup,error:dupErr}=await client.from('loto_cartons').select('numero,carton_code,external_code').eq('external_code',externalCode).neq('numero',numero).limit(1); if(dupErr) throw dupErr; if(dup&&dup.length) throw new Error('Identifiant déjà utilisé : '+externalCode); }
    const grille=readGridEditor('editGridEditor');
    const m=String(code||'').match(/SDS-(\d{1,2})-(\d{1,4})$/i); const row={numero,carton_code:code||('SDS-00-'+String(numero).padStart(4,'0')),association_id:m?cleanAssociationId(m[1]):null,card_order:m?Number(m[2]):null,external_code:externalCode||null,external_code_type:externalType,numbers_signature:numbersSignatureFromGrid(grille),serie:document.getElementById('editCardSerie')?.value||'IMPORT',lignes:gridToLignes(grille),grille,qr_payload:externalCode||code||String(numero),status:finalStatus,ocr_quality:Number(document.getElementById('editCardQuality')?.value||100),origine:'Scan saisie cartons',actif:true,updated_at:new Date().toISOString()};
    const {error}=await client.from('loto_cartons').upsert(row,{onConflict:'numero'}); if(error) throw error;
    statusText('editCardStatusBox', statusOverride==='disponible' ? 'Carton validé.' : 'Modifications enregistrées.', true);
    cartonStatus(statusOverride==='disponible' ? 'Carton validé : '+row.carton_code : 'Carton mis à jour : '+row.carton_code, true);
    listManagedCards(); refreshCartonCount();
  }catch(e){ statusText('editCardStatusBox','Erreur : '+(e.message||e),false); }
}
async function quickValidateCard(numero){
  const client=Loto.supabaseClient; if(!client){ cartonStatus('Supabase non configuré.',false); return; }
  const {data:card,error:readErr}=await client.from('loto_cartons').select('external_code,serie').eq('numero',numero).maybeSingle();
  if(readErr){cartonStatus('Erreur validation : '+readErr.message,false); return;}
  if((card?.serie||'').toUpperCase()==='IMPORT' && !card?.external_code){cartonStatus('Identifiant du carton obligatoire avant validation.',false); openEditCard(numero); return;}
  const {error}=await client.from('loto_cartons').update({status:'disponible',updated_at:new Date().toISOString()}).eq('numero',numero);
  if(error) cartonStatus('Erreur validation : '+error.message,false); else cartonStatus('Carton validé.',true);
  listManagedCards();
}
async function saveManualCard(){
  const client=Loto.supabaseClient; if(!client){ statusText('generatedCardsStatus','Supabase non configuré.',false); return; }
  try{
    const externalCode=document.getElementById('manualCardExternalCode')?.value.trim();
    const code=document.getElementById('manualCardCode')?.value.trim() || ('SDS-99-'+String(Date.now()%10000).padStart(4,'0'));
    const numero=codeToNumero(code); if(!numero) throw new Error('Code interne ou numéro obligatoire.');
    const targetStatus=document.getElementById('manualCardStatus')?.value||'a_enregistrer';
    if(targetStatus==='disponible' && !externalCode) throw new Error('Identifiant du carton obligatoire avant validation.');
    if(externalCode){ const {data:dup,error:dupErr}=await client.from('loto_cartons').select('numero').eq('external_code',externalCode).neq('numero',numero).limit(1); if(dupErr) throw dupErr; if(dup&&dup.length) throw new Error('Identifiant déjà utilisé : '+externalCode); }
    const grille=readGridEditor('manualGridEditor');
    const m=String(code||'').match(/SDS-(\d{1,2})-(\d{1,4})$/i); const row={numero,carton_code:code||('SDS-00-'+String(numero).padStart(4,'0')),association_id:m?cleanAssociationId(m[1]):null,card_order:m?Number(m[2]):null,external_code:externalCode||null,external_code_type:externalCode?'manuel':null,numbers_signature:numbersSignatureFromGrid(grille),serie:document.getElementById('manualCardSerie')?.value||'IMPORT',lignes:gridToLignes(grille),grille,qr_payload:externalCode||code||String(numero),status:targetStatus,ocr_quality:100,origine:'Saisie manuelle',actif:true,updated_at:new Date().toISOString()};
    const {error}=await client.from('loto_cartons').upsert(row,{onConflict:'numero'}); if(error) throw error;
    cartonStatus('Carton enregistré : '+row.carton_code,true); refreshCartonCount(); listManagedCards();
  }catch(e){ cartonStatus('Erreur : '+(e.message||e),false); }
}

async function resolveCardNumero(value){
  const v=String(value||'').trim(); const n=codeToNumero(v); if(n) return n;
  const client=Loto.supabaseClient; if(!client||!v) return null;
  const {data}=await client.from('loto_cartons').select('numero').or('external_code.eq.'+v+',carton_code.eq.'+v+',qr_payload.eq.'+v).limit(1);
  return data?.[0]?.numero || null;
}

async function markCardSold(value){
  const client=Loto.supabaseClient; if(!client){ statusText('salesTrackingStatus','Supabase non configuré.',false); return; }
  const v=value || document.getElementById('saleCardCode')?.value;
  const numero=await resolveCardNumero(v); if(!numero){ statusText('salesTrackingStatus','Identifiant carton obligatoire ou introuvable.',false); return; }
  const s=Loto.state();
  const sale={loto_id:s.program?.id||s.sessionCode, loto_title:s.program?.title||s.lotoName||'', numero, carton_code:String(v||''), seller:document.getElementById('saleSeller')?.value||'', status:'vendu', sold_at:new Date().toISOString()};
  const {error}=await client.from('loto_cartons').update({status:'vendu',updated_at:new Date().toISOString()}).eq('numero',numero);
  if(error){ statusText('salesTrackingStatus','Erreur vente : '+error.message,false); return; }
  try{ await client.from('loto_carton_sales').upsert(sale,{onConflict:'loto_id,numero'}); }catch(e){}
  statusText('salesTrackingStatus','Carton marqué vendu pour le loto actif.',true);
  listManagedCards();
}
async function markCardAvailable(value){
  const client=Loto.supabaseClient; if(!client){ statusText('salesTrackingStatus','Supabase non configuré.',false); return; }
  const v=value || document.getElementById('saleCardCode')?.value;
  const numero=await resolveCardNumero(v); if(!numero){ statusText('salesTrackingStatus','Identifiant carton obligatoire ou introuvable.',false); return; }
  const {error}=await client.from('loto_cartons').update({status:'disponible',updated_at:new Date().toISOString()}).eq('numero',numero);
  if(error){ statusText('salesTrackingStatus','Erreur : '+error.message,false); return; }
  const s=Loto.state(); try{ await client.from('loto_carton_sales').delete().eq('loto_id',s.program?.id||s.sessionCode).eq('numero',numero); }catch(e){}
  statusText('salesTrackingStatus','Carton remis disponible.',true);
  listManagedCards();
}
document.getElementById('listManagedCards')?.addEventListener('click',listManagedCards);
document.getElementById('saveManualCard')?.addEventListener('click',saveManualCard);
document.getElementById('markCardSold')?.addEventListener('click',()=>markCardSold());
document.getElementById('markCardAvailable')?.addEventListener('click',()=>markCardAvailable());

renderGridEditor('manualGridEditor', emptyGrid3x9());
document.getElementById('clearManualGrid')?.addEventListener('click',()=>renderGridEditor('manualGridEditor', emptyGrid3x9()));
document.getElementById('saveEditedCard')?.addEventListener('click',()=>saveEditedCard());
document.getElementById('validateEditedCard')?.addEventListener('click',()=>saveEditedCard('disponible'));
document.getElementById('cancelEditCard')?.addEventListener('click',()=>{ const p=document.getElementById('cardEditPanel'); if(p) p.style.display='none'; });

// v3.2.6 - QR d'ouverture du scan saisie cartons + pseudo carton retour scan
function adminScanUrl(){
  return new URL('scan.html?mode=saisie-cartons', location.href).href;
}
function renderAdminScanQr(){
  const a=document.getElementById('openScanSaisie'); if(a) a.href=adminScanUrl();
  const urlText=document.getElementById('scanSaisieUrlText'); if(urlText) urlText.textContent=adminScanUrl();
  const qr=document.getElementById('scanSaisieQr');
  if(qr){ qr.innerHTML=''; if(window.QRCode) new QRCode(qr,{text:adminScanUrl(),width:170,height:170,correctLevel:QRCode.CorrectLevel.M}); else qr.textContent=adminScanUrl(); }
}
async function renderLastScannedPseudoCard(){
  const gridBox=document.getElementById('adminScanPseudoGrid'); const status=document.getElementById('adminScanLastStatus');
  if(!gridBox) return;
  let code=''; try{code=localStorage.getItem('loto_last_scanned_card_code')||'';}catch(e){}
  if(!code){ renderGridEditor('adminScanPseudoGrid', emptyGrid3x9()); if(status) status.textContent='Aucun carton scanné sur ce poste.'; return; }
  const client=Loto.supabaseClient;
  if(!client){ renderGridEditor('adminScanPseudoGrid', emptyGrid3x9()); if(status) status.textContent='Dernier scan : '+code+' (Supabase non configuré).'; return; }
  try{
    const numero=codeToNumero(code);
    const {data,error}=await client.from('loto_cartons').select('*').eq('numero',numero).maybeSingle();
    if(error||!data) throw error||new Error('carton introuvable');
    renderGridEditor('adminScanPseudoGrid', normalizeGrid3x9(data.grille,data.lignes));
    if(status) status.textContent='Dernier scan : '+(data.external_code||data.carton_code||code)+' · '+(data.status||'a_enregistrer')+' · grille '+(data.ocr_quality??'-')+' % · identifiant '+(data.external_code_type||'à saisir');
    document.getElementById('cardStatusFilter').value='a_enregistrer';
    listManagedCards();
  }catch(e){ renderGridEditor('adminScanPseudoGrid', emptyGrid3x9()); if(status) status.textContent='Dernier scan : '+code+' non relu dans Supabase.'; }
}
function openCartonsTabFromHash(){
  if(location.hash==='#cartons'){
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('cartons')?.classList.add('active');
    renderLastScannedPseudoCard();
  }
}
setTimeout(()=>{renderAdminScanQr(); renderLastScannedPseudoCard(); openCartonsTabFromHash();},300);
window.addEventListener('hashchange',openCartonsTabFromHash);
