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

// V2.2.12 / V3 - création de cartons en planches de 6
let generatedCards = [];
function genStatus(text, good=true){ const el=document.getElementById('generatedCardsStatus'); if(!el) return; el.textContent=text; el.className='notice '+(good?'ok-note':'bad-note'); el.style.display='block'; }
function rangeForColumn(col){ if(col===0) return [1,9]; if(col===8) return [80,90]; return [col*10, col*10+9]; }
function pickRandom(arr){ return arr.splice(Math.floor(Math.random()*arr.length),1)[0]; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function buildCardGrid(){
  const grid=Array.from({length:3},()=>Array(9).fill(null));
  const rowCounts=[0,0,0]; const colCounts=Array(9).fill(0);
  const cells=[];
  for(let col=0;col<9;col++){
    const possible=shuffle([0,1,2].filter(r=>rowCounts[r]<5));
    const row=possible[0]; grid[row][col]=0; rowCounts[row]++; colCounts[col]++;
  }
  while(rowCounts.some(c=>c<5)){
    const rows=shuffle([0,1,2].filter(r=>rowCounts[r]<5));
    const r=rows[0];
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
function renderPrintableCard(card){
  const qrId='qr_'+String(card.numero).replace(/\W/g,'_')+'_'+Math.random().toString(36).slice(2,6);
  return `<div class="loto-card-print"><div class="loto-card-head"><div><div class="loto-card-title">Loto by SdS</div><div class="loto-card-meta">Planche ${card.sheetNumber} · Position ${card.sheetPosition}</div></div><div><div id="${qrId}" class="qr-box" data-qr="${esc(card.qrPayload)}"><span class="qr-fallback">${esc(card.qrPayload)}</span></div><div class="carton-number-line">N° ${card.numero}</div></div></div><table class="carton-grid"><tbody>${card.grid.map(row=>`<tr>${row.map(n=>n?`<td>${String(n).padStart(2,'0')}</td>`:'<td class="empty"></td>').join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderGeneratedCards(){
  const out=document.getElementById('generatedCardsPreview'); if(!out) return;
  if(!generatedCards.length){ out.innerHTML=''; return; }
  const sheets=[];
  for(let i=0;i<generatedCards.length;i+=6){ sheets.push(generatedCards.slice(i,i+6)); }
  out.innerHTML=sheets.map(sheet=>`<div class="sheet-a4">${sheet.map(renderPrintableCard).join('')}</div>`).join('');
  out.querySelectorAll('[data-qr]').forEach(el=>{
    const payload=el.dataset.qr;
    el.innerHTML='';
    if(window.QRCode){ new QRCode(el,{text:payload,width:54,height:54,correctLevel:QRCode.CorrectLevel.M}); }
    else el.innerHTML='<span class="qr-fallback">'+esc(payload)+'</span>';
  });
}
function generateCards(){
  const start=Number(document.getElementById('genStartNumber')?.value||200001);
  const sheetCount=Math.max(1,Number(document.getElementById('genSheetCount')?.value||1));
  const serie=(document.getElementById('genSerie')?.value||'CREATION').trim()||'CREATION';
  generatedCards=[];
  for(let sheet=1;sheet<=sheetCount;sheet++){
    for(let pos=1;pos<=6;pos++){
      const numero=start+generatedCards.length;
      const grid=buildCardGrid();
      generatedCards.push({numero,serie,grid,lignes:gridToLignes(grid),sheetNumber:sheet,sheetPosition:pos,qrPayload:'LBS:'+numero});
    }
  }
  renderGeneratedCards();
  genStatus(`${generatedCards.length} carton(s) généré(s).`,true);
}
async function saveGeneratedCards(){
  if(!generatedCards.length){ genStatus('Aucun carton généré.',false); return; }
  const client=Loto.supabaseClient; if(!client){ genStatus('Supabase non configuré.',false); return; }
  const rows=generatedCards.map(c=>({numero:c.numero,serie:c.serie,lignes:c.lignes,actif:true}));
  try{
    for(let i=0;i<rows.length;i+=100){ const {error}=await client.from('loto_cartons').upsert(rows.slice(i,i+100),{onConflict:'numero'}); if(error) throw error; }
    genStatus(`${rows.length} carton(s) enregistré(s) dans Supabase.`,true); refreshCartonCount();
  }catch(e){ genStatus('Erreur enregistrement : '+(e.message||e),false); }
}
document.getElementById('generateCards')?.addEventListener('click',generateCards);
document.getElementById('saveGeneratedCards')?.addEventListener('click',saveGeneratedCards);
document.getElementById('printGeneratedCards')?.addEventListener('click',()=>{ if(!generatedCards.length) generateCards(); setTimeout(()=>window.print(),300); });
