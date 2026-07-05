Loto.pageHeader();
Loto.protectPage();

document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.getElementById(b.dataset.tab).classList.add('active');});
const lotoName=document.getElementById('lotoName'),lotoDate=document.getElementById('lotoDate'),partieCount=document.getElementById('partieCount'),partiesList=document.getElementById('partiesList'),showLots=document.getElementById('showLots'),bingoEnabled=document.getElementById('bingoEnabled'),showBingo=document.getElementById('showBingo'),prevalidate=document.getElementById('prevalidate'),lastNumberRequired=document.getElementById('lastNumberRequired'),saveMsg=document.getElementById('saveMsg'),savedProgramsList=document.getElementById('savedProgramsList');

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
  return {id:Loto.makeId('loto'),title:lotoName.value||'',date:lotoDate.value||'',parties,createdAt:new Date().toISOString()};
}
function normalizedProgramForSave(){const p=readProgram(); const current=Loto.state().program || {}; p.id=current.id || p.id; p.createdAt=current.createdAt || p.createdAt; p.updatedAt=new Date().toISOString(); return p;}
async function saveProgramToList({start=false}={}){const s=Loto.state(); const program=normalizedProgramForSave(); const options={...s.options,showLots:showLots.checked,prevalidateSeconds:Number(prevalidate.value||6),lastNumberRequired:lastNumberRequired.checked}; const saved=[...(s.savedPrograms||[])]; const idx=saved.findIndex(x=>x.id===program.id); if(idx>=0) saved[idx]=program; else saved.unshift(program); const emptyProgram={id:'',title:'',date:'',parties:[]}; const patch={savedPrograms:saved.slice(0,80),options,program:emptyProgram}; if(start){Object.assign(patch,Loto.freshGamePatch(program)); patch.lotoName=program.title||'Loto by SdS'; patch.history=[{t:new Date().toISOString(),type:'start_program',label:'Lancement : '+programTitle(program),data:{programId:program.id}}];} await Loto.save(patch); showSavedMessage(start ? 'Loto enregistré et lancé.' : 'Loto enregistré. Les champs sont prêts pour une nouvelle saisie.');}
function drawSavedPrograms(){const list=Loto.state().savedPrograms||[]; if(!list.length){ savedProgramsList.innerHTML='<p>Aucun loto enregistré.</p>'; return; } savedProgramsList.innerHTML=list.map((p,i)=>`<div class="saved-row"><div><b>${esc(programTitle(p))}</b><br><span class="muted">${esc(p.date||'Sans date')} · ${(p.parties||[]).length} partie(s)</span></div><div class="toolbar"><button data-load="${i}">Modifier</button></div></div>`).join(''); savedProgramsList.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>loadProgram(Number(b.dataset.load)));}
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

Loto.onChange(s=>{Loto.pageHeader(); lotoName.value=s.program?.title||''; lotoDate.value=s.program?.date||''; prevalidate.value=s.options?.prevalidateSeconds||6; lastNumberRequired.checked=s.options?.lastNumberRequired!==false; showLots.checked=!!s.options?.showLots; bingoEnabled.checked=!!s.options?.bingoEnabled; showBingo.checked=!!s.options?.showBingo; const mb=document.querySelector(`input[name=\"miniBingoSource\"][value=\"${s.options?.miniBingoSource||'first'}\"]`); if(mb) mb.checked=true; drawParties(); drawSavedPrograms();});
Loto.ensureSession().then(refreshCartonCount);


// V3.0.0 - création de cartons, planches A3 et test scanner QR
let generatedCards = [];
let generatedMode = 'individual';
let generatedPerPage = 2;
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
  return String(Number(raw||1)).padStart(5,'0');
}
function cartonCode(numero, associationId){ return 'SDS-'+cleanAssociationId(associationId)+'-'+String(numero).padStart(8,'0'); }
function sheetCode(sheetNumber, associationId){ return 'SDSP-'+cleanAssociationId(associationId)+'-'+String(sheetNumber).padStart(6,'0'); }
function renderPrintableCard(card){
  const qrId='qr_'+String(card.numero).replace(/\W/g,'_')+'_'+Math.random().toString(36).slice(2,6);
  const rows=card.grid.map(row=>`<tr>${row.map(n=>n?`<td><span class="big-num">${String(n)}</span><span class="mini-num">${String(n)}</span></td>`:'<td class="empty"><span></span></td>').join('')}</tr>`).join('');
  return `<div class="loto-card-print"><div class="loto-card-inner"><div class="loto-card-head"><div><div class="carton-number-line">${esc(card.code)}</div><div class="loto-card-meta">${card.sheetCode ? esc(card.sheetCode)+' · carton '+card.sheetPosition : 'Carton individuel'}</div></div><div><div id="${qrId}" class="qr-box" data-qr="${esc(card.qrPayload)}"><span class="qr-fallback">${esc(card.qrPayload)}</span></div></div></div><table class="carton-grid"><tbody>${rows}</tbody></table><div class="loto-card-foot">Loto by SdS</div></div></div>`;
}
function renderGeneratedCards(){
  const out=document.getElementById('generatedCardsPreview'); if(!out) return;
  if(!generatedCards.length){ out.innerHTML=''; return; }
  const pages=[];
  const per=generatedMode==='sheets' ? 6 : generatedPerPage;
  for(let i=0;i<generatedCards.length;i+=per){ pages.push(generatedCards.slice(i,i+per)); }
  const cls=generatedMode==='sheets' ? 'sheet-a3' : ('sheet-a4 individual-'+per);
  out.innerHTML=pages.map(page=>`<div class="${cls}">${page.map(renderPrintableCard).join('')}</div>`).join('');
  out.querySelectorAll('[data-qr]').forEach(el=>{
    const payload=el.dataset.qr;
    el.innerHTML='';
    if(window.QRCode){ new QRCode(el,{text:payload,width:52,height:52,correctLevel:QRCode.CorrectLevel.L}); }
    else el.innerHTML='<span class="qr-fallback">'+esc(payload)+'</span>';
  });
}
function buildGeneratedCards({start,count,serie,mode,perPage=2,associationId='00001'}){
  generatedCards=[]; generatedMode=mode; generatedPerPage=perPage;
  for(let i=0;i<count;i++){
    const numero=start+i;
    const grid=buildCardGrid();
    const sheetIndex=mode==='sheets' ? Math.floor(i/6)+1 : null;
    const pos=mode==='sheets' ? (i%6)+1 : null;
    const code=cartonCode(numero, associationId);
    const sc=sheetIndex ? sheetCode(sheetIndex, associationId) : null;
    generatedCards.push({numero,code,associationId:cleanAssociationId(associationId),serie,grid,lignes:gridToLignes(grid),sheetNumber:sheetIndex,sheetCode:sc,sheetPosition:pos,qrPayload:code,status:'disponible',origin:'Loto by SdS'});
  }
  renderGeneratedCards();
  genStatus(`${generatedCards.length} carton(s) généré(s). QR court : ${generatedCards[0]?.qrPayload || ''}`,true);
}

function updateCardGeneratorUi(){
  const type=document.getElementById('genCardType')?.value||'individual';
  const wrap=document.getElementById('genPerPageWrap');
  if(wrap) wrap.style.display = type==='individual' ? '' : 'none';
  const help=document.getElementById('genHelp');
  if(help) help.textContent = type==='individual' ? 'Individuel : PDF A4 avec 2 ou 3 cartons par feuille. Le nombre exact demandé est généré.' : 'Planche : PDF A3 avec 6 cartons par feuille. Si le nombre n’est pas multiple de 6, il est complété pour terminer la dernière planche.';
}
function generateCardsUnified(){
  const start=Number(document.getElementById('genStartNumber')?.value||200001);
  const requested=Math.max(1,Number(document.getElementById('genCardCount')?.value||1));
  const type=document.getElementById('genCardType')?.value||'individual';
  const perPage=Math.max(2,Math.min(3,Number(document.getElementById('genPerPage')?.value||3)));
  const serie=(document.getElementById('genSerie')?.value||'STANDARD').trim()||'STANDARD';
  const associationId=cleanAssociationId(document.getElementById('genAssociationId')?.value||'1');
  if(type==='sheets'){
    const count=Math.ceil(requested/6)*6;
    buildGeneratedCards({start,count,serie,mode:'sheets',perPage:6,associationId});
    if(count!==requested) genStatus(`${requested} carton(s) demandé(s). ${count} carton(s) généré(s) pour compléter ${count/6} planche(s) A3.`,true);
  }else{
    buildGeneratedCards({start,count:requested,serie,mode:'individual',perPage,associationId});
  }
}

function generateIndividualCards(){
  const start=Number(document.getElementById('genIndStartNumber')?.value||200001);
  const count=Math.max(1,Number(document.getElementById('genIndCount')?.value||1));
  const perPage=Math.max(1,Math.min(3,Number(document.getElementById('genIndPerPage')?.value||2)));
  const serie=(document.getElementById('genIndSerie')?.value||'INDIVIDUEL').trim()||'INDIVIDUEL';
  buildGeneratedCards({start,count,serie,mode:'individual',perPage,associationId:'00001'});
}
function generateSheetCards(){
  const start=Number(document.getElementById('genSheetStartNumber')?.value||300001);
  const sheetCount=Math.max(1,Number(document.getElementById('genSheetCount')?.value||1));
  const serie=(document.getElementById('genSheetSerie')?.value||'PLANCHE_A3').trim()||'PLANCHE_A3';
  buildGeneratedCards({start,count:sheetCount*6,serie,mode:'sheets',perPage:6,associationId:'00001'});
}
async function saveGeneratedCards(){
  if(!generatedCards.length){ genStatus('Aucun carton généré.',false); return; }
  const client=Loto.supabaseClient; if(!client){ genStatus('Supabase non configuré.',false); return; }
  const fullRows=generatedCards.map(c=>({numero:c.numero,carton_code:c.code,association_id:c.associationId,serie:c.serie,lignes:c.lignes,grille:c.grid,sheet_code:c.sheetCode,sheet_position:c.sheetPosition,qr_payload:c.qrPayload,status:c.status,origine:c.origin,actif:true}));
  const basicRows=generatedCards.map(c=>({numero:c.numero,serie:c.serie,lignes:c.lignes,actif:true}));
  try{
    for(let i=0;i<fullRows.length;i+=100){ const {error}=await client.from('loto_cartons').upsert(fullRows.slice(i,i+100),{onConflict:'numero'}); if(error) throw error; }
    genStatus(`${fullRows.length} carton(s) enregistré(s) dans Supabase avec métadonnées V3.`,true); refreshCartonCount();
  }catch(e){
    try{
      for(let i=0;i<basicRows.length;i+=100){ const {error}=await client.from('loto_cartons').upsert(basicRows.slice(i,i+100),{onConflict:'numero'}); if(error) throw error; }
      genStatus(`${basicRows.length} carton(s) enregistré(s). Base ancienne détectée : applique le SQL V3 pour stocker planche, QR et statut.`,true); refreshCartonCount();
    }catch(e2){ genStatus('Erreur enregistrement : '+(e2.message||e2),false); }
  }
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
document.getElementById('generateCards')?.addEventListener('click',generateCardsUnified);
document.getElementById('saveGeneratedCards')?.addEventListener('click',saveGeneratedCards);
function openGeneratedCardsPrintWindow(){
  if(!generatedCards.length) generateCardsUnified();
  const preview=document.getElementById('generatedCardsPreview');
  if(!preview || !preview.innerHTML.trim()){ genStatus('Aucun carton à imprimer.', false); return; }
  const isSheets = generatedMode === 'sheets';
  const w = window.open('', '_blank');
  if(!w){ genStatus('Fenêtre PDF bloquée par le navigateur. Autorise les pop-up pour cette page.', false); return; }
  const css = `
    @page{ size:${isSheets ? 'A3 landscape' : 'A4 portrait'}; margin:0; }
    html,body{ margin:0; padding:0; background:#fff; color:#111; font-family:Arial,Helvetica,sans-serif; }
    :root{--loto-card-w:193mm;--loto-card-h:86mm;--loto-cell:20mm;}
    .print-sheets{ display:block; margin:0; padding:0; background:#fff; }
    .sheet-a4,.sheet-a3{ background:#fff; color:#111; box-sizing:border-box; box-shadow:none; border-radius:0; page-break-after:always; break-after:page; justify-items:center; align-items:start; overflow:hidden; margin:0; }
    .sheet-a4{ width:210mm; height:297mm; padding:0 8mm; display:grid; grid-template-columns:var(--loto-card-w); justify-content:center; }
    .sheet-a4.individual-2{ grid-template-rows:repeat(2,var(--loto-card-h)); align-content:center; gap:18mm; }
    .sheet-a4.individual-3{ grid-template-rows:repeat(3,var(--loto-card-h)); align-content:start; gap:19.5mm; }
    .sheet-a3{ width:420mm; height:297mm; padding:0 12mm; display:grid; grid-template-columns:repeat(2,var(--loto-card-w)); grid-template-rows:repeat(3,var(--loto-card-h)); gap:19.5mm 10mm; align-content:start; justify-content:center; }
    .loto-card-print{ width:var(--loto-card-w); height:var(--loto-card-h); box-sizing:border-box; border:1.2mm solid #111; border-radius:4mm; padding:1.1mm; background:#fff; break-inside:avoid; overflow:hidden; }
    .loto-card-inner{ height:100%; box-sizing:border-box; border:.35mm solid #111; border-radius:2.8mm; padding:1.6mm 2mm; background:#fff; display:flex; flex-direction:column; }
    .loto-card-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:3mm; margin:0 0 1.5mm 0; min-height:16mm; }
    .carton-number-line{ text-align:left; font-size:4.2mm; line-height:5mm; font-weight:900; letter-spacing:.15mm; margin:0; color:#111; }
    .loto-card-meta{ font-size:2.7mm; line-height:3.2mm; color:#444; font-weight:600; margin-top:.5mm; }
    .qr-box,.qr-box canvas,.qr-box img{ width:14mm!important; height:14mm!important; max-width:14mm!important; max-height:14mm!important; }
    .carton-grid{ width:180mm!important; height:60mm!important; border-collapse:collapse!important; table-layout:fixed!important; border:.7mm solid #111!important; margin:0 auto!important; }
    .carton-grid td{ width:20mm!important; height:20mm!important; position:relative!important; border:.32mm solid #111!important; text-align:center!important; vertical-align:middle!important; background:#fff!important; padding:0!important; font-weight:900!important; box-sizing:border-box!important; }
    .carton-grid .big-num{ display:block!important; font-size:12mm!important; line-height:13.5mm!important; font-weight:1000!important; color:#000!important; margin-top:.2mm!important; }
    .carton-grid .mini-num{ position:absolute!important; left:0!important; right:0!important; bottom:.8mm!important; font-size:2.8mm!important; line-height:3mm!important; font-weight:700!important; color:#555!important; }
    .carton-grid td.empty{ background:#fff!important; }
    .carton-grid td.empty span{ display:block!important; width:11mm!important; height:6mm!important; margin:auto!important; border-radius:.9mm!important; background:#d7d7d7!important; }
    .loto-card-foot{ text-align:center; font-size:2.3mm; line-height:3mm; margin-top:auto; color:#333; font-weight:700; letter-spacing:.15mm; }
  `;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cartons Loto by SdS</title><style>${css}</style></head><body>${preview.outerHTML}<script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>`);
  w.document.close();
}

document.getElementById('printGeneratedCards')?.addEventListener('click', openGeneratedCardsPrintWindow);
window.addEventListener('afterprint',()=>{ document.body.classList.remove('printing-cartons','print-mode-sheets'); });
updateCardGeneratorUi();

/* Compatibilité avec l'ancien écran si présent */
document.getElementById('generateIndividualCards')?.addEventListener('click',generateIndividualCards);
document.getElementById('generateSheetCards')?.addEventListener('click',generateSheetCards);
document.getElementById('saveGeneratedIndividualCards')?.addEventListener('click',saveGeneratedCards);
document.getElementById('saveGeneratedSheetCards')?.addEventListener('click',saveGeneratedCards);
document.getElementById('printGeneratedIndividualCards')?.addEventListener('click',()=>{ if(!generatedCards.length || generatedMode!=='individual') generateIndividualCards(); document.body.classList.add('printing-cartons'); document.body.classList.remove('print-mode-sheets'); setTimeout(()=>window.print(),300); });
document.getElementById('printGeneratedSheetCards')?.addEventListener('click',()=>{ if(!generatedCards.length || generatedMode!=='sheets') generateSheetCards(); document.body.classList.add('printing-cartons'); document.body.classList.add('print-mode-sheets'); setTimeout(()=>window.print(),300); });
