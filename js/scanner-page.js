let scannerStream=null, scannerTimer=null, scannerLastValue='', scannerLastAt=0, scannerReadCount=0, scannerProcessing=false;
const params=new URLSearchParams(location.search);
let scannerUsageMode=(params.get('mode')||'commissaire').replace('-','_');
if(scannerUsageMode!=='saisie_cartons') scannerUsageMode='commissaire';
let saisieStep='grid';
let currentDraft=null;
let barcodeDetector=null;
let lastPartialGridSignature='';
let lastPartialGridSentAt=0;
let partialGridSent=false;
let importDraftLocked=false;
let gridCandidateSince=0;
let gridReadAllowed=false;
let lastFramePresence=false;
let stableOcrCounts={};
let stableOcrAccepted=[];
let stableOcrLastSeenAt=0;
let lastGridRowsSignature='';
let lastGridRowsCount=0;
let lockedGridRows=[null,null,null];
let rowLockSignatures=['','',''];
let rowLockCounts=[0,0,0];
const IMPORT_INBOX_CODE='IMPORT_CARTONS_INBOX';

function queueSessionCode(){return Loto?.state?.()?.sessionCode || new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || window.LOTO_CONFIG?.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';}
function queueDeviceId(){let id=localStorage.getItem('loto_scan_device_id'); if(!id){id='phone_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6); localStorage.setItem('loto_scan_device_id',id);} return id;}
async function insertScanQueue(type,payload){
  const client=Loto.supabaseClient;
  if(!client) throw new Error('Supabase non configuré');
  const {error}=await client.from('scan_queue').insert({
    session_code:queueSessionCode(),
    device_id:queueDeviceId(),
    mode:'saisie_cartons',
    type,
    payload,
    status:'new'
  });
  if(error) throw error;
}
async function readImportInbox(){
  const client=Loto.supabaseClient; if(!client) return {};
  try{
    const {data,error}=await client.from('loto_app_sessions').select('state').eq('code',IMPORT_INBOX_CODE).maybeSingle();
    if(error) throw error;
    return data?.state || {};
  }catch(e){ console.warn('Lecture inbox import impossible',e); return {}; }
}
async function saveImportInbox(patch){
  const client=Loto.supabaseClient; if(!client) return;
  try{
    const previous=await readImportInbox();
    const next={...previous,...(patch||{}),updatedAt:new Date().toISOString(),appVersion:(window.LOTO_CONFIG?.APP_VERSION||'')};
    const {error}=await client.from('loto_app_sessions').upsert({code:IMPORT_INBOX_CODE,state:next,updated_at:new Date().toISOString()});
    if(error) throw error;
  }catch(e){ console.warn('Ecriture inbox import impossible',e); }
}

let scannerPresenceTimer=null;
async function markImportScannerPresence(connected=true){
  if(scannerUsageMode!=='saisie_cartons') return;
  const presence={connected:!!connected,mode:'saisie_cartons',lastSeen:Date.now(),status:connected?'waiting':'closed'};
  try{ await Loto.save({importScanner:presence}); }catch(e){console.warn('Presence scanner session non envoyee',e);}
  await saveImportInbox({importScanner:presence});
}
function startImportScannerPresence(){
  if(scannerUsageMode!=='saisie_cartons') return;
  markImportScannerPresence(true);
  if(scannerPresenceTimer) clearInterval(scannerPresenceTimer);
  scannerPresenceTimer=setInterval(()=>markImportScannerPresence(true),10000);
}
function stopImportScannerPresence(){
  if(scannerPresenceTimer) clearInterval(scannerPresenceTimer);
  scannerPresenceTimer=null;
  markImportScannerPresence(false);
}

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function setStatus(msg,type='muted'){const el=document.getElementById('scannerStatus'); if(el){el.className=type+' scan-minimal-status'; el.textContent=msg;}}
function setReadTime(ms){const el=document.getElementById('scannerReadTime'); if(el) el.textContent=Number.isFinite(ms)?Math.round(ms)+' ms':'-';}
function beep(ok=true){try{const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.frequency.value=ok?880:220; g.gain.value=.08; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{o.stop();ctx.close();},ok?90:180);}catch(e){}}
function setFrame(state){const el=document.getElementById('scanFrameOverlay'); if(!el) return; el.classList.remove('scan-frame-ok','scan-frame-warn','scan-frame-small'); if(saisieStep==='identifier') el.classList.add('scan-frame-small'); if(state==='ok') el.classList.add('scan-frame-ok'); if(state==='warn') el.classList.add('scan-frame-warn');}
function setSkipVisible(show){const b=document.getElementById('skipIdentifierBtn'); if(b) b.style.display=show?'inline-block':'none';}
function setNewCardButtonVisible(show){const b=document.getElementById('newImportCardBtn'); if(b) b.style.display=show?'inline-block':'none';}
function resetStableOcr(){stableOcrCounts={}; stableOcrAccepted=[]; stableOcrLastSeenAt=0; lastGridRowsSignature=''; lastGridRowsCount=0; lockedGridRows=[null,null,null]; rowLockSignatures=['','','']; rowLockCounts=[0,0,0];}
function normalizeOcrNumbers(nums){return (nums||[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90);}
function updateStableOcrNumbers(nums){
  const clean=normalizeOcrNumbers(nums);
  const now=Date.now();
  if(stableOcrLastSeenAt && now-stableOcrLastSeenAt>5000){ stableOcrCounts={}; }
  stableOcrLastSeenAt=now;
  const seenThisPass=new Set();
  for(const n of clean){
    if(seenThisPass.has(n)) continue;
    seenThisPass.add(n);
    stableOcrCounts[n]=(stableOcrCounts[n]||0)+1;
    if(stableOcrCounts[n]>=2 && !stableOcrAccepted.includes(n)){ stableOcrAccepted.push(n); }
  }
  return stableOcrAccepted.slice(0,15);
}
function resetForNextCard(message='Place un carton dans le cadre puis démarre la caméra.'){currentDraft=null; lastPartialGridSignature=''; lastPartialGridSentAt=0; partialGridSent=false; importDraftLocked=false; gridCandidateSince=0; gridReadAllowed=false; lastFramePresence=false; resetStableOcr(); saisieStep='grid'; scannerProcessing=false; setSkipVisible(false); setNewCardButtonVisible(false); setFrame('warn'); setStatus(message,'ok'); markImportScannerPresence(true);}
function completeCurrentCard(message='✓ Carton terminé. Contrôle et valide sur le PC.'){importDraftLocked=true; scannerProcessing=false; setSkipVisible(false); setFrame('ok'); stopQrScanner(false); setStatus(message,'ok'); setNewCardButtonVisible(true); markImportScannerPresence(true);}
function cleanAssociationId(v){const raw=String(v||'1').replace(/\D/g,''); return String(raw||'1').slice(-2).padStart(2,'0');}
function cardInternalNumero(a,o){return Number(cleanAssociationId(a))*10000+Number(o||0);}
function codeToNumero(code){const s=String(code||'').trim(); const m=s.match(/SDS-(\d{1,2})-(\d{1,4})$/i); if(m) return cardInternalNumero(m[1],Number(m[2])); const tail=s.match(/(\d{1,6})\s*$/); return tail?Number(tail[1]):Number(s||0);}
function numbersSignatureFromGrid(grid){const nums=(grid||[]).flat().filter(n=>Number.isInteger(Number(n))).map(Number).sort((a,b)=>a-b); return nums.map(n=>String(n).padStart(2,'0')).join('-');}
function gridToLignes3x9(grid){return grid.map(r=>r.filter(n=>n!==null));}
function emptyGrid3x9(){return Array.from({length:3},()=>Array(9).fill(null));}
function buildGridFromNumbers(nums){const g=emptyGrid3x9(); nums.slice(0,15).forEach((n,i)=>{const r=Math.floor(i/5); const c=(i%5)*2; g[r][c]=n;}); return g;}
function parseOcrNumbers(text){const found=(String(text||'').match(/\b\d{1,2}\b/g)||[]).map(Number).filter(n=>n>=1&&n<=90); const uniq=[]; for(const n of found){ if(!uniq.includes(n)) uniq.push(n); } return uniq.slice(0,15);}

function wordBox(word){
  const b=word?.bbox || word || {};
  const x0=Number(b.x0 ?? b.left ?? b.x ?? 0);
  const y0=Number(b.y0 ?? b.top ?? b.y ?? 0);
  const x1=Number(b.x1 ?? (x0 + Number(b.width ?? 0)));
  const y1=Number(b.y1 ?? (y0 + Number(b.height ?? 0)));
  return {x0,y0,x1,y1,cx:(x0+x1)/2,cy:(y0+y1)/2,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0)};
}
function ocrWordsToNumberItems(result){
  const words=Array.isArray(result?.data?.words) ? result.data.words : [];
  const items=[];
  for(const word of words){
    const raw=String(word?.text||'').replace(/[^0-9]/g,'');
    if(!raw) continue;
    const box=wordBox(word);
    // Un mot de 1 ou 2 chiffres est idéal. S'il est plus long, on le découpe prudemment en paires.
    const chunks=raw.length<=2 ? [raw] : (raw.match(/\d{1,2}/g)||[]);
    if(chunks.length===1){
      const n=Number(chunks[0]);
      if(Number.isInteger(n)&&n>=1&&n<=90) items.push({...box,text:chunks[0],n});
    }else{
      const partW=box.w/chunks.length;
      chunks.forEach((c,i)=>{
        const n=Number(c);
        if(Number.isInteger(n)&&n>=1&&n<=90){
          const x0=box.x0+i*partW, x1=box.x0+(i+1)*partW;
          items.push({...box,x0,x1,cx:(x0+x1)/2,text:c,n});
        }
      });
    }
  }
  return items;
}
function clusterItemsIntoRows(items){
  if(!items.length) return [];
  const sorted=items.slice().sort((a,b)=>a.cy-b.cy);
  const rows=[];
  const avgH=sorted.reduce((s,it)=>s+it.h,0)/sorted.length;
  for(const it of sorted){
    let row=rows.find(r=>Math.abs(r.cy-it.cy)<Math.max(avgH*1.2,22));
    if(!row){row={cy:it.cy,items:[]}; rows.push(row);} 
    row.items.push(it);
    row.cy=row.items.reduce((s,x)=>s+x.cy,0)/row.items.length;
  }
  rows.sort((a,b)=>a.cy-b.cy);
  // Si Tesseract crée plus de 3 petites lignes, on les regroupe dans 3 bandes horizontales.
  if(rows.length>3){
    const minY=Math.min(...items.map(i=>i.cy));
    const maxY=Math.max(...items.map(i=>i.cy));
    const span=Math.max(1,maxY-minY+1);
    const bands=[{cy:0,items:[]},{cy:0,items:[]},{cy:0,items:[]}];
    for(const it of items){
      const idx=Math.max(0,Math.min(2,Math.floor(((it.cy-minY)/span)*3)));
      bands[idx].items.push(it);
    }
    return bands.filter(r=>r.items.length).map(r=>{r.cy=r.items.reduce((s,x)=>s+x.cy,0)/r.items.length; return r;}).sort((a,b)=>a.cy-b.cy);
  }
  return rows;
}
function numbersFromRowItems(rowItems){
  const row=rowItems.slice().sort((a,b)=>a.cx-b.cx);
  const out=[];
  const used=new Set();
  const avgH=row.length ? row.reduce((s,it)=>s+it.h,0)/row.length : 18;
  for(let i=0;i<row.length;i++){
    if(used.has(i)) continue;
    const cur=row[i];
    let val=cur.n;
    // Recompose 2 chiffres coupés en 2 mots seulement s'ils sont très proches.
    if(String(cur.text).length===1 && i+1<row.length && !used.has(i+1)){
      const next=row[i+1];
      const gap=next.x0-cur.x1;
      const combined=Number(String(cur.text)+String(next.text));
      if(String(next.text).length===1 && gap>=-2 && gap<Math.max(12,avgH*0.75) && combined>=10 && combined<=90){
        val=combined;
        used.add(i+1);
      }
    }
    if(Number.isInteger(val)&&val>=1&&val<=90&&!out.includes(val)) out.push(val);
    used.add(i);
  }
  return out.slice(0,5);
}
function parseOcrNumbersByRows(result){
  const items=ocrWordsToNumberItems(result);
  if(!items.length){
    const nums=parseOcrNumbers(result?.data?.text||'');
    return {rows:[nums.slice(0,5),nums.slice(5,10),nums.slice(10,15)], nums};
  }
  const rows=clusterItemsIntoRows(items).slice(0,3).map(r=>numbersFromRowItems(r.items));
  while(rows.length<3) rows.push([]);
  const nums=rows.flat().slice(0,15);
  return {rows, nums};
}
function buildGridFromRows(rows){
  const g=emptyGrid3x9();
  (rows||[]).slice(0,3).forEach((row,r)=>{
    (row||[]).slice(0,5).forEach((n,i)=>{ g[r][(i%5)*2]=n; });
  });
  return g;
}

function normalizeRowNumbers(row){
  const out=[];
  for(const n of (row||[]).map(Number)){
    if(Number.isInteger(n)&&n>=1&&n<=90&&!out.includes(n)) out.push(n);
  }
  return out.slice(0,5);
}
function updateLockedRows(rows){
  for(let i=0;i<3;i++){
    if(lockedGridRows[i]) continue;
    const row=normalizeRowNumbers((rows||[])[i]);
    if(row.length<5){
      // On ne remet pas tout le moteur a zero : on attend simplement
      // une nouvelle lecture complete. Cela evite les validations folles
      // quand un nombre est coupe en deux ou lu trop vite.
      continue;
    }
    const sig=row.join(',');
    if(sig===rowLockSignatures[i]) rowLockCounts[i]++;
    else { rowLockSignatures[i]=sig; rowLockCounts[i]=1; }

    // Compromis retenu : une ligne doit etre lue deux fois identique.
    // C'est plus fiable que le verrouillage immediat, mais beaucoup plus
    // rapide que l'ancien verrouillage trop strict.
    if(row.length===5 && rowLockCounts[i]>=2){
      lockedGridRows[i]=row.slice(0,5);
      rowLockSignatures[i]=sig;
      beep(true);
    }
  }
  return lockedGridRows.map((r,i)=>r || normalizeRowNumbers((rows||[])[i]));
}
function lockedRowsCount(){return lockedGridRows.reduce((s,r)=>s+(r?1:0),0);}
function lockedNumbersCount(){return lockedGridRows.reduce((s,r)=>s+(r?r.length:0),0);}
function allRowsLocked(){return lockedGridRows.every(r=>Array.isArray(r)&&r.length===5);}
function lineStatusText(rows){
  return [0,1,2].map(i=>{
    const locked=lockedGridRows[i];
    const count=locked ? 5 : normalizeRowNumbers((rows||[])[i]).length;
    return 'L'+(i+1)+' '+count+'/5'+(locked?' ✓':'');
  }).join(' · ');
}

function stableRowsAccepted(rows){
  const signature=(rows||[]).map(r=>(r||[]).join(',')).join('|');
  if(signature && signature===lastGridRowsSignature) lastGridRowsCount++;
  else {lastGridRowsSignature=signature; lastGridRowsCount=1;}
  return signature && lastGridRowsCount>=2;
}
function parseIdentifierText(text){
  const raw=String(text||'')
    .toUpperCase()
    .replace(/[\s_]+/g,'')
    .replace(/[^A-Z0-9\/-]/g,' ');
  const candidates=(raw.match(/[A-Z0-9][A-Z0-9\/-]{2,19}/g)||[])
    .map(x=>x.replace(/-{2,}/g,'-').replace(/\/{2,}/g,'/').trim())
    .filter(x=>/[0-9]/.test(x));
  return candidates.sort((a,b)=>b.length-a.length)[0]||'';
}

async function nextImportCode(){
  const client=Loto.supabaseClient; const aid='99';
  if(!client) return 'SDS-99-'+String(Date.now()%10000).padStart(4,'0');
  let maxOrder=0;
  try{const {data}=await client.from('loto_cartons').select('card_order,carton_code,numero').eq('association_id',aid).order('card_order',{ascending:false}).limit(1); if(data&&data[0]) maxOrder=Number(data[0].card_order||String(data[0].carton_code||'').match(/(\d{1,4})$/)?.[1]||0);}catch(e){}
  return 'SDS-99-'+String(maxOrder+1).padStart(4,'0');
}

async function publishImportDraft(row, stage='grid'){
  const draft={...row, import_stage:stage, scan_updated_at:new Date().toISOString()};
  const presence={connected:true,mode:'saisie_cartons',lastSeen:Date.now(),status:stage};
  try{
    const existing=Array.isArray(Loto.state()?.importDrafts) ? Loto.state().importDrafts : [];
    const without=existing.filter(x=>String(x.numero)!==String(draft.numero));
    await Loto.save({lastImportDraft:draft, importDrafts:[draft,...without].slice(0,20), importScanner:presence});
  }catch(e){console.warn('Publication brouillon import session impossible',e);}
  try{
    const inbox=await readImportInbox();
    const existing=Array.isArray(inbox.importDrafts) ? inbox.importDrafts : [];
    const without=existing.filter(x=>String(x.numero)!==String(draft.numero));
    await saveImportInbox({lastImportDraft:draft, importDrafts:[draft,...without].slice(0,50), importScanner:presence});
  }catch(e){console.warn('Publication brouillon import inbox impossible',e);}
}


async function saveOcrDraft(grid, quality, rawText){
  const payload={
    source:'ocr_camera_v347',
    confidence:quality,
    grid:grid,
    rawText:String(rawText||'').slice(0,1000),
    at:new Date().toISOString()
  };
  await insertScanQueue('draft_grid', payload);
  currentDraft={grid, quality, rawText:String(rawText||''), sentAt:new Date().toISOString()};
  return currentDraft;
}

async function savePartialOcrDraft(grid, quality, rawText, count){
  if(importDraftLocked) return currentDraft;
  const payload={
    source:'ocr_camera_partial_v346',
    confidence:quality,
    grid:grid,
    detected_count:count,
    rawText:String(rawText||'').slice(0,1000),
    at:new Date().toISOString()
  };
  await insertScanQueue('draft_grid_partial', payload);
  currentDraft={...(currentDraft||{}), grid, quality, rawText:String(rawText||''), partial:true, sentAt:new Date().toISOString()};
  return currentDraft;
}
async function updateDraftIdentifier(identifier, type='ocr', quality=null){
  const ext=String(identifier||'').trim();
  if(!ext) throw new Error('Identifiant vide.');
  const payload={
    identifier:ext,
    external_code:ext,
    external_code_type:type,
    quality:quality,
    at:new Date().toISOString()
  };
  await insertScanQueue('draft_identifier', payload);
  currentDraft={...(currentDraft||{}), identifier:ext, external_code_type:type, identifier_quality:quality};
  return currentDraft;
}

async function handleCommissaireCode(value, measured){
  if(scannerProcessing) return; scannerProcessing=true;
  try{stopQrScanner(false); const payload=await Loto.controlCard(value); payload.scannedCode=value; payload.readMs=measured; payload.scannedAt=new Date().toISOString(); try{localStorage.setItem('loto_last_commissaire_scan_result',JSON.stringify(payload));}catch(e){} if(payload?.found){await Loto.showPublicCard(payload.result); beep(payload.result?.valid!==false);} else beep(false); const numero=payload?.result?.numero||codeToNumero(value)||value; setTimeout(()=>{location.href='commissaire.html?scan=1&numero='+encodeURIComponent(numero);},250);}catch(e){scannerProcessing=false; setStatus('Erreur contrôle : '+(e.message||e),'red'); beep(false);}
}
async function handleCode(value, readMs=null){
  value=String(value||'').trim(); if(!value||scannerProcessing) return; const now=performance.now(); if(value===scannerLastValue&&now-scannerLastAt<900) return; scannerLastValue=value; scannerLastAt=now; scannerReadCount++; setReadTime(readMs);
  if(scannerUsageMode==='commissaire'){setFrame('ok'); await handleCommissaireCode(value,readMs); return;}
}
async function getBackCameraId(){try{const devices=await navigator.mediaDevices.enumerateDevices(); const cams=devices.filter(d=>d.kind==='videoinput'); const back=cams.find(d=>/back|rear|environment|arriere|arrière/i.test(d.label||'')); return (back||cams[cams.length-1])?.deviceId||null;}catch(e){return null;}}
function readableCameraError(e){const name=e?.name||''; if(name==='NotAllowedError') return 'autorisation caméra refusée.'; if(name==='NotFoundError') return 'aucune caméra trouvée.'; return (name?name+' - ':'')+(e?.message||e);}
async function startCamera(){const video=document.getElementById('qrScannerVideo'); const deviceId=await getBackCameraId(); const landscape=scannerUsageMode==='saisie_cartons'; const videoConstraint=deviceId?{deviceId:{exact:deviceId},width:{ideal:landscape?1280:640},height:{ideal:landscape?720:480}}:{facingMode:{ideal:'environment'},width:{ideal:landscape?1280:640},height:{ideal:landscape?720:480}}; scannerStream=await navigator.mediaDevices.getUserMedia({video:videoConstraint,audio:false}); video.setAttribute('playsinline',''); video.setAttribute('webkit-playsinline',''); video.muted=true; video.srcObject=scannerStream; await video.play();}

async function startCommissaireLoop(){
  const video=document.getElementById('qrScannerVideo'); const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d',{willReadFrequently:true}); let frame=0; setStatus('Scan QR en cours.','muted');
  scannerTimer=setInterval(()=>{ if(!video||video.readyState<2||!window.jsQR) return; const vw=video.videoWidth||640, vh=video.videoHeight||480; frame++; try{const roi=Math.floor(Math.min(vw,vh)*.56); const sx=Math.max(0,Math.floor((vw-roi)/2)); const sy=Math.max(0,Math.floor((vh-roi)/2)); canvas.width=roi; canvas.height=roi; ctx.drawImage(video,sx,sy,roi,roi,0,0,roi,roi); let img=ctx.getImageData(0,0,roi,roi); let t0=performance.now(); let code=window.jsQR(img.data,roi,roi,{inversionAttempts:'dontInvert'}); let ms=performance.now()-t0; if(!code&&frame%6===0){const sw=Math.min(vw,720), sh=Math.round(sw*vh/vw); canvas.width=sw; canvas.height=sh; ctx.drawImage(video,0,0,sw,sh); img=ctx.getImageData(0,0,sw,sh); t0=performance.now(); code=window.jsQR(img.data,sw,sh,{inversionAttempts:'dontInvert'}); ms=performance.now()-t0;} if(code?.data) handleCode(code.data,ms);}catch(e){} },60);
}
function drawRoi(video, canvas, ctx, small=false){
  const vw=video.videoWidth||1280, vh=video.videoHeight||720; let sx=0, sy=0, sw=vw, sh=vh;
  if(small){sw=Math.floor(vw*.52); sh=Math.floor(vh*.42); sx=Math.floor((vw-sw)/2); sy=Math.floor((vh-sh)/2);}
  const outW=small?640:Math.min(vw,1100); const outH=Math.round(outW*sh/sw); canvas.width=outW; canvas.height=outH; ctx.drawImage(video,sx,sy,sw,sh,0,0,outW,outH); return {w:outW,h:outH};
}

function frameHasCard(canvas, ctx){
  try{
    const w=canvas.width, h=canvas.height;
    if(!w||!h) return false;
    const sx=Math.floor(w*0.12), sy=Math.floor(h*0.12), sw=Math.floor(w*0.76), sh=Math.floor(h*0.76);
    const img=ctx.getImageData(sx,sy,sw,sh).data;
    let count=0, dark=0, light=0, sum=0, sum2=0;
    const step=16;
    for(let i=0;i<img.length;i+=4*step){
      const y=0.299*img[i]+0.587*img[i+1]+0.114*img[i+2];
      sum+=y; sum2+=y*y; count++;
      if(y<95) dark++;
      if(y>185) light++;
    }
    if(!count) return false;
    const mean=sum/count;
    const variance=Math.max(0,sum2/count-mean*mean);
    const contrast=Math.sqrt(variance);
    const darkRatio=dark/count;
    const lightRatio=light/count;
    // Un carton dans le cadre donne normalement du blanc + des traits/chiffres foncés.
    return lightRatio>0.18 && darkRatio>0.008 && contrast>24;
  }catch(e){ return true; }
}
async function readIdentifierFromFrame(video, canvas, ctx){
  const {w,h}=drawRoi(video,canvas,ctx,true); const t0=performance.now();
  try{ if(window.jsQR){const img=ctx.getImageData(0,0,w,h); const qr=window.jsQR(img.data,w,h,{inversionAttempts:'attemptBoth'}); if(qr?.data) return {value:qr.data,type:'qr',quality:100,ms:performance.now()-t0};} }catch(e){}
  try{ if('BarcodeDetector' in window){ if(!barcodeDetector) barcodeDetector=new BarcodeDetector({formats:['qr_code','code_128','ean_13','ean_8','code_39','code_93','itf','upc_a','upc_e']}); const codes=await barcodeDetector.detect(canvas); if(codes?.[0]?.rawValue) return {value:codes[0].rawValue,type:codes[0].format==='qr_code'?'qr':'barcode',quality:100,ms:performance.now()-t0};} }catch(e){}
  if(window.Tesseract){const result=await Tesseract.recognize(canvas,'eng',{logger:()=>{}, tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-'}); const value=parseIdentifierText(result?.data?.text||''); if(value) return {value,type:'ocr',quality:Math.round(result?.data?.confidence||80),ms:performance.now()-t0};}
  return null;
}
async function startSaisieCartonsLoop(){
  const video=document.getElementById('qrScannerVideo'); const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d',{willReadFrequently:true}); saisieStep='grid'; gridCandidateSince=0; gridReadAllowed=false; lastFramePresence=false; setStatus('Étape 1/2 : place le carton dans le grand cadre. Lecture OCR seulement quand il est bien cadré.','muted'); setFrame('warn');
  scannerTimer=setInterval(async()=>{
    if(importDraftLocked || scannerProcessing||!video||video.readyState<2||!window.Tesseract) return; scannerProcessing=true;
    try{
      if(saisieStep==='grid'){
        drawRoi(video,canvas,ctx,false);
        const cardPresent=frameHasCard(canvas,ctx);
        const nowPresence=Date.now();
        if(cardPresent){
          if(!lastFramePresence) gridCandidateSince=nowPresence;
          lastFramePresence=true;
        }else{
          gridCandidateSince=0;
          gridReadAllowed=false;
          lastFramePresence=false;
        }
        if(!cardPresent || nowPresence-gridCandidateSince<850){
          setReadTime(NaN);
          setFrame('warn');
          setStatus(cardPresent ? 'Carton détecté. Stabilisation du cadrage...' : 'Place tout le carton dans le grand cadre.','muted');
          scannerProcessing=false;
          return;
        }
        gridReadAllowed=true;
        setStatus('Carton bien cadré — lecture OCR en cours.','muted');
        const t0=performance.now();
        const result=await Tesseract.recognize(canvas,'eng',{logger:()=>{}});
        const ms=performance.now()-t0;
        setReadTime(ms);
        const parsed=parseOcrNumbersByRows(result);
        const rows=parsed.rows;
        const nums=parsed.nums;
        const quality=Math.round(Math.min(100,Math.max(45,result?.data?.confidence||75)));
        if(nums.length>0){
          const displayRows=updateLockedRows(rows);
          const grid=buildGridFromRows(displayRows);
          const lockedCount=lockedNumbersCount();
          const currentCount=Math.max(lockedCount, normalizeOcrNumbers(displayRows.flat()).length);
          const confirmed=allRowsLocked();
          setFrame(confirmed?'ok':'warn');
          setStatus('Étape 1/2 : lecture par lignes. '+lineStatusText(rows)+'. Total '+currentCount+'/15. Une ligne est verrouillée après 2 lectures identiques.','muted');
          if(confirmed){
            currentDraft=await saveOcrDraft(grid,quality,result?.data?.text||'');
            partialGridSent=true;
            importDraftLocked=false;
            setFrame('ok');
            beep(true);
            setStatus('✓ 3 lignes verrouillees. Grille envoyée au PC. Étape 2/2 : scanne le QR code, le code-barres ou le numéro imprimé. Sinon appuie sur Ignorer / saisir plus tard.','ok');
            saisieStep='identifier';
            setSkipVisible(true);
            setTimeout(()=>{scannerProcessing=false; setFrame('warn');},900);
          }else{
            scannerProcessing=false;
          }
        }else{
          setFrame('warn');
          setStatus('Étape 1/2 : 0/15 numéro détecté. Continue à cadrer.','muted');
          scannerProcessing=false;
        }
      }else{
        setStatus('Étape 2/2 : scanne le QR code, le code-barres ou le numéro d’identification imprimé.','muted'); const found=await readIdentifierFromFrame(video,canvas,ctx);
        if(found?.value){setReadTime(found.ms); await updateDraftIdentifier(found.value,found.type,found.quality); setFrame('ok'); beep(true); setSkipVisible(false); completeCurrentCard('✓ Identifiant envoyé : '+found.value+'. Carton terminé. Contrôle et valide sur le PC.');}
        else{setFrame('warn'); setStatus('Étape 2/2 : identifiant non lu. Approche le QR, le code-barres ou le numéro imprimé. Tu pourras aussi le saisir côté PC.','muted'); scannerProcessing=false;}
      }
    }catch(e){setFrame('warn'); setStatus('Analyse impossible : '+(e.message||e),'red'); scannerProcessing=false;}
  }, saisieStep==='grid'?1800:1100);
}
async function startQrScanner(){
  stopQrScanner(false); scannerProcessing=false; scannerLastValue=''; scannerLastAt=0; scannerReadCount=0; currentDraft=null; lastPartialGridSignature=''; lastPartialGridSentAt=0; partialGridSent=false; importDraftLocked=false; gridCandidateSince=0; gridReadAllowed=false; lastFramePresence=false; resetStableOcr(); setNewCardButtonVisible(false); saisieStep='grid'; setReadTime(NaN); setSkipVisible(false); setFrame('');
  const isHttps=location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'; if(!isHttps){setStatus('Caméra bloquée : ouvrir en HTTPS.','red'); return;} if(!navigator.mediaDevices?.getUserMedia){setStatus('Caméra non disponible.','red'); return;}
  try{const tmp=await navigator.mediaDevices.getUserMedia({video:true,audio:false}); tmp.getTracks().forEach(t=>t.stop());}catch(e){setStatus('Erreur autorisation caméra : '+readableCameraError(e),'red'); return;}
  try{await startCamera(); if(scannerUsageMode==='saisie_cartons'){startImportScannerPresence(); await startSaisieCartonsLoop();} else await startCommissaireLoop();}catch(e){setStatus('Erreur caméra : '+readableCameraError(e),'red'); beep(false);}
}
function stopQrScanner(showMessage=true){if(scannerTimer) clearInterval(scannerTimer); scannerTimer=null; if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop()); scannerStream=null;} const video=document.getElementById('qrScannerVideo'); if(video){video.pause?.(); video.srcObject=null;} if(showMessage) setStatus('Caméra arrêtée.','muted'); scannerProcessing=false; setSkipVisible(false); setFrame('');}
function initPage(){const title=document.getElementById('scanPageTitle'); const help=document.getElementById('scanPageHelp'); const back=document.getElementById('scanBackLink'); if(scannerUsageMode==='saisie_cartons'){if(title) title.textContent='Scanner saisie cartons'; if(help) help.textContent='Étape 1 : lecture par lignes, de gauche à droite et de haut en bas. Étape 2 : petit cadre pour QR, code-barres ou identifiant.'; if(back) back.href='administration.html#cartons'; document.body.classList.add('scan-saisie-mode'); const bar=document.querySelector('.scan-startbar'); if(bar && !document.getElementById('finishGridManualBtn')){const btn=document.createElement('button'); btn.id='finishGridManualBtn'; btn.type='button'; btn.className='secondary'; btn.textContent='Passer à l’identifiant'; btn.addEventListener('click',finishGridManually); bar.appendChild(btn); const next=document.createElement('button'); next.id='newImportCardBtn'; next.type='button'; next.className='green'; next.textContent='Scanner un autre carton'; next.style.display='none'; next.addEventListener('click',startQrScanner); bar.appendChild(next);}} else {if(title) title.textContent='Scanner commissaire'; if(help) help.textContent='Scanne le QR du carton. Après lecture, retour automatique vers la page commissaire.'; if(back) back.href='commissaire.html';}}
async function skipIdentifier(){
  if(scannerUsageMode!=='saisie_cartons' || saisieStep!=='identifier' || !currentDraft) return;
  setSkipVisible(false); setFrame('ok'); beep(true);
  try{ await insertScanQueue('draft_identifier_skipped',{message:'identifiant à saisir sur PC',at:new Date().toISOString()}); }catch(e){console.warn('Message skip non envoyé',e);}
  completeCurrentCard('✓ Brouillon envoyé sans identifiant. Complète le numéro sur le PC avant validation.');
}
async function finishGridManually(){
  if(scannerUsageMode!=='saisie_cartons' || saisieStep!=='grid' || !partialGridSent) return;
  saisieStep='identifier';
  scannerProcessing=false;
  setSkipVisible(true);
  setFrame('warn');
  beep(true);
  setStatus('Grille partielle conservée sur le PC. Étape 2/2 : scanne l’identifiant ou clique sur Ignorer / saisir plus tard.','ok');
}
document.getElementById('skipIdentifierBtn')?.addEventListener('click',skipIdentifier);
document.getElementById('startQrScanner')?.addEventListener('click',startQrScanner);
document.getElementById('stopQrScanner')?.addEventListener('click',()=>stopQrScanner(true));
window.addEventListener('pagehide',()=>{stopQrScanner(false); stopImportScannerPresence();});
initPage(); Loto.pageHeader(); Loto.protectPage();
Loto.ensureSession().then(()=>{Loto.pageHeader(); if(scannerUsageMode==='saisie_cartons') startImportScannerPresence();}).catch(()=>{});
