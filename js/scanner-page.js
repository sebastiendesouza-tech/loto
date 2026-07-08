let scannerStream=null, scannerTimer=null, scannerLastValue='', scannerLastAt=0, scannerReadCount=0, scannerProcessing=false;
const params=new URLSearchParams(location.search);
let scannerUsageMode=(params.get('mode')||'commissaire').replace('-','_');
if(scannerUsageMode!=='saisie_cartons') scannerUsageMode='commissaire';
let saisieStep='grid';
let currentDraft=null;
let barcodeDetector=null;
const IMPORT_INBOX_CODE='IMPORT_CARTONS_INBOX';
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
function resetForNextCard(message='Carton envoyé. Place un autre carton dans le cadre.'){currentDraft=null; saisieStep='grid'; scannerProcessing=false; setSkipVisible(false); setFrame('warn'); setStatus(message,'ok'); markImportScannerPresence(true);}
function cleanAssociationId(v){const raw=String(v||'1').replace(/\D/g,''); return String(raw||'1').slice(-2).padStart(2,'0');}
function cardInternalNumero(a,o){return Number(cleanAssociationId(a))*10000+Number(o||0);}
function codeToNumero(code){const s=String(code||'').trim(); const m=s.match(/SDS-(\d{1,2})-(\d{1,4})$/i); if(m) return cardInternalNumero(m[1],Number(m[2])); const tail=s.match(/(\d{1,6})\s*$/); return tail?Number(tail[1]):Number(s||0);}
function numbersSignatureFromGrid(grid){const nums=(grid||[]).flat().filter(n=>Number.isInteger(Number(n))).map(Number).sort((a,b)=>a-b); return nums.map(n=>String(n).padStart(2,'0')).join('-');}
function gridToLignes3x9(grid){return grid.map(r=>r.filter(n=>n!==null));}
function emptyGrid3x9(){return Array.from({length:3},()=>Array(9).fill(null));}
function buildGridFromNumbers(nums){const g=emptyGrid3x9(); nums.slice(0,15).forEach((n,i)=>{const r=Math.floor(i/5); const c=(i%5)*2; g[r][c]=n;}); return g;}
function parseOcrNumbers(text){const found=(String(text||'').match(/\b\d{1,2}\b/g)||[]).map(Number).filter(n=>n>=1&&n<=90); const uniq=[]; for(const n of found){ if(!uniq.includes(n)) uniq.push(n); } return uniq.slice(0,15);}
function parseIdentifierText(text){const candidates=(String(text||'').match(/\b\d{3,12}\b/g)||[]).map(x=>x.trim()); return candidates.sort((a,b)=>b.length-a.length)[0]||'';}

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
  const client=Loto.supabaseClient; if(!client) throw new Error('Supabase non configuré.');
  const code=await nextImportCode(); const numero=codeToNumero(code); const m=code.match(/SDS-(\d{1,2})-(\d{1,4})$/i);
  const row={numero,carton_code:code,association_id:cleanAssociationId(m[1]),card_order:Number(m[2]),external_code:null,external_code_type:null,external_ocr_quality:null,numbers_signature:numbersSignatureFromGrid(grid),serie:'IMPORT',lignes:gridToLignes3x9(grid),grille:grid,qr_payload:code,status:'a_enregistrer',origine:'Scan OCR saisie cartons',ocr_quality:quality,ocr_text:String(rawText||'').slice(0,1000),actif:true,updated_at:new Date().toISOString()};
  try{localStorage.setItem('loto_last_scanned_card_code',code);}catch(e){}
  await publishImportDraft(row,'grid_ok');
  try{
    const {error}=await client.from('loto_cartons').upsert(row,{onConflict:'numero'});
    if(error) throw error;
    await publishImportDraft({...row,sync_ok:true},'grid_ok');
  }catch(e){
    await publishImportDraft({...row,sync_error:'table loto_cartons non écrite: '+(e.message||e)},'grid_ok');
    console.warn('Brouillon publié en session mais table loto_cartons non écrite',e);
  }
  return row;
}
async function updateDraftIdentifier(identifier, type='ocr', quality=null){
  if(!currentDraft?.numero) throw new Error('Brouillon absent.');
  const client=Loto.supabaseClient; if(!client) throw new Error('Supabase non configuré.');
  const ext=String(identifier||'').trim(); if(!ext) throw new Error('Identifiant vide.');
  const {data:existing,error:checkErr}=await client.from('loto_cartons').select('numero,carton_code,external_code').eq('external_code',ext).neq('numero',currentDraft.numero).limit(1);
  if(checkErr) throw checkErr;
  if(existing&&existing.length) throw new Error('Identifiant déjà utilisé : '+ext);
  const patch={external_code:ext,external_code_type:type,external_ocr_quality:quality,qr_payload:ext,updated_at:new Date().toISOString()};
  currentDraft={...currentDraft,...patch};
  await publishImportDraft(currentDraft,'identifier_ok');
  try{
    const {error}=await client.from('loto_cartons').update(patch).eq('numero',currentDraft.numero);
    if(error) throw error;
    await publishImportDraft({...currentDraft,sync_ok:true},'identifier_ok');
  }catch(e){
    await publishImportDraft({...currentDraft,sync_error:'identifiant non écrit en table: '+(e.message||e)},'identifier_ok');
    console.warn('Identifiant publié en session mais table loto_cartons non mise à jour',e);
  }
  try{localStorage.setItem('loto_last_scanned_card_code',currentDraft.carton_code);}catch(e){}
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
async function readIdentifierFromFrame(video, canvas, ctx){
  const {w,h}=drawRoi(video,canvas,ctx,true); const t0=performance.now();
  try{ if(window.jsQR){const img=ctx.getImageData(0,0,w,h); const qr=window.jsQR(img.data,w,h,{inversionAttempts:'attemptBoth'}); if(qr?.data) return {value:qr.data,type:'qr',quality:100,ms:performance.now()-t0};} }catch(e){}
  try{ if('BarcodeDetector' in window){ if(!barcodeDetector) barcodeDetector=new BarcodeDetector({formats:['qr_code','code_128','ean_13','ean_8','code_39','code_93','itf','upc_a','upc_e']}); const codes=await barcodeDetector.detect(canvas); if(codes?.[0]?.rawValue) return {value:codes[0].rawValue,type:codes[0].format==='qr_code'?'qr':'barcode',quality:100,ms:performance.now()-t0};} }catch(e){}
  if(window.Tesseract){const result=await Tesseract.recognize(canvas,'eng',{logger:()=>{}, tessedit_char_whitelist:'0123456789'}); const value=parseIdentifierText(result?.data?.text||''); if(value) return {value,type:'ocr',quality:Math.round(result?.data?.confidence||80),ms:performance.now()-t0};}
  return null;
}

let v20SnapshotCanvas=null;
let v20ResultCanvas=null;
let v20SnapshotCtx=null;
let v20ResultCtx=null;
let v20Corners=[];
let v20Dragging=-1;

function initSaisieCartonV20UI(){
  if(scannerUsageMode!=='saisie_cartons') return;
  const bar=document.querySelector('.scan-startbar');
  if(bar && !document.getElementById('captureCartonBtn')){
    const capture=document.createElement('button');
    capture.id='captureCartonBtn';
    capture.type='button';
    capture.className='green';
    capture.textContent='Photographier le carton';
    capture.addEventListener('click',captureCartonV20);
    const rectify=document.createElement('button');
    rectify.id='redresserCartonBtn';
    rectify.type='button';
    rectify.className='secondary';
    rectify.textContent='Redresser';
    rectify.disabled=true;
    rectify.addEventListener('click',redresserCartonV20);
    const reset=document.createElement('button');
    reset.id='resetCartonBtn';
    reset.type='button';
    reset.className='light';
    reset.textContent='Refaire';
    reset.addEventListener('click',resetCartonV20);
    bar.appendChild(capture);
    bar.appendChild(rectify);
    bar.appendChild(reset);
  }
  const card=document.querySelector('.scan-main-card');
  if(card && !document.getElementById('v20CartonZone')){
    const zone=document.createElement('div');
    zone.id='v20CartonZone';
    zone.className='v20-carton-zone';
    zone.innerHTML=`
      <div class="v20-help"><b>V20 scan carton</b><br>1. Cadre le carton entier en paysage. 2. Clique sur Photographier. 3. Ajuste les 4 points si besoin. 4. Clique sur Redresser.</div>
      <div class="v20-canvas-wrap" style="display:none"><p><b>Image capturée - ajuste les 4 coins</b></p><canvas id="v20SnapshotCanvas"></canvas></div>
      <div class="v20-result-wrap" style="display:none"><p><b>Résultat redressé 900 × 300</b></p><canvas id="v20ResultCanvas" width="900" height="300"></canvas></div>`;
    card.appendChild(zone);
    v20SnapshotCanvas=document.getElementById('v20SnapshotCanvas');
    v20ResultCanvas=document.getElementById('v20ResultCanvas');
    v20SnapshotCtx=v20SnapshotCanvas?.getContext('2d',{willReadFrequently:true});
    v20ResultCtx=v20ResultCanvas?.getContext('2d',{willReadFrequently:true});
    installV20CornerEvents();
  }
}
function resetCartonV20(){
  const sw=document.querySelector('.v20-canvas-wrap'); if(sw) sw.style.display='none';
  const rw=document.querySelector('.v20-result-wrap'); if(rw) rw.style.display='none';
  const b=document.getElementById('redresserCartonBtn'); if(b) b.disabled=true;
  v20Corners=[]; setStatus('Prêt. Cadre le carton puis photographie.','muted'); setFrame('warn');
}
function captureCartonV20(){
  const video=document.getElementById('qrScannerVideo');
  if(!video || video.readyState<2){setStatus('Caméra non prête. Démarre la caméra.','red'); return;}
  initSaisieCartonV20UI();
  const vw=video.videoWidth||1280, vh=video.videoHeight||720;
  const maxW=1100;
  const scale=Math.min(1,maxW/vw);
  const w=Math.round(vw*scale), h=Math.round(vh*scale);
  v20SnapshotCanvas.width=w; v20SnapshotCanvas.height=h;
  v20SnapshotCtx.drawImage(video,0,0,w,h);
  v20SnapshotCanvas._baseImage=v20SnapshotCtx.getImageData(0,0,w,h);
  const mX=w*.08, mY=h*.14;
  v20Corners=[{x:mX,y:mY},{x:w-mX,y:mY},{x:w-mX,y:h-mY},{x:mX,y:h-mY}];
  document.querySelector('.v20-canvas-wrap').style.display='block';
  document.querySelector('.v20-result-wrap').style.display='none';
  const b=document.getElementById('redresserCartonBtn'); if(b) b.disabled=false;
  drawV20Corners();
  setStatus('Image capturée. Ajuste les 4 coins du carton puis clique sur Redresser.','ok');
}
function drawV20Corners(){
  if(!v20SnapshotCanvas || !v20SnapshotCtx || v20Corners.length!==4) return;
  const img=v20SnapshotCtx.getImageData(0,0,v20SnapshotCanvas.width,v20SnapshotCanvas.height);
  v20SnapshotCtx.putImageData(img,0,0);
  // Re-dessine depuis une copie sauvegardée si disponible
  if(v20SnapshotCanvas._baseImage) v20SnapshotCtx.putImageData(v20SnapshotCanvas._baseImage,0,0);
  else v20SnapshotCanvas._baseImage=img;
  v20SnapshotCtx.lineWidth=4;
  v20SnapshotCtx.strokeStyle='#f2a900';
  v20SnapshotCtx.fillStyle='rgba(242,169,0,.18)';
  v20SnapshotCtx.beginPath();
  v20SnapshotCtx.moveTo(v20Corners[0].x,v20Corners[0].y);
  for(let i=1;i<4;i++) v20SnapshotCtx.lineTo(v20Corners[i].x,v20Corners[i].y);
  v20SnapshotCtx.closePath();
  v20SnapshotCtx.fill();
  v20SnapshotCtx.stroke();
  v20SnapshotCtx.fillStyle='#ffffff';
  v20SnapshotCtx.strokeStyle='#061326';
  v20Corners.forEach((p,i)=>{v20SnapshotCtx.beginPath(); v20SnapshotCtx.arc(p.x,p.y,13,0,Math.PI*2); v20SnapshotCtx.fill(); v20SnapshotCtx.stroke(); v20SnapshotCtx.fillStyle='#061326'; v20SnapshotCtx.font='bold 14px Arial'; v20SnapshotCtx.textAlign='center'; v20SnapshotCtx.textBaseline='middle'; v20SnapshotCtx.fillText(String(i+1),p.x,p.y); v20SnapshotCtx.fillStyle='#ffffff';});
}
function canvasPoint(evt,canvas){
  const r=canvas.getBoundingClientRect();
  const t=evt.touches?.[0] || evt;
  return {x:(t.clientX-r.left)*canvas.width/r.width, y:(t.clientY-r.top)*canvas.height/r.height};
}
function installV20CornerEvents(){
  if(!v20SnapshotCanvas) return;
  function down(e){if(v20Corners.length!==4) return; const p=canvasPoint(e,v20SnapshotCanvas); let best=-1, bd=999999; v20Corners.forEach((c,i)=>{const d=(c.x-p.x)**2+(c.y-p.y)**2; if(d<bd){bd=d;best=i;}}); if(Math.sqrt(bd)<45){v20Dragging=best; e.preventDefault();}}
  function move(e){if(v20Dragging<0) return; const p=canvasPoint(e,v20SnapshotCanvas); v20Corners[v20Dragging]={x:Math.max(0,Math.min(v20SnapshotCanvas.width,p.x)),y:Math.max(0,Math.min(v20SnapshotCanvas.height,p.y))}; drawV20Corners(); e.preventDefault();}
  function up(){v20Dragging=-1;}
  v20SnapshotCanvas.addEventListener('mousedown',down); window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  v20SnapshotCanvas.addEventListener('touchstart',down,{passive:false}); window.addEventListener('touchmove',move,{passive:false}); window.addEventListener('touchend',up);
}
function solveHomography(src,dst){
  const A=[], b=[];
  for(let i=0;i<4;i++){
    const x=src[i].x, y=src[i].y, u=dst[i].x, v=dst[i].y;
    A.push([x,y,1,0,0,0,-u*x,-u*y]); b.push(u);
    A.push([0,0,0,x,y,1,-v*x,-v*y]); b.push(v);
  }
  for(let i=0;i<8;i++){
    let max=i; for(let r=i+1;r<8;r++) if(Math.abs(A[r][i])>Math.abs(A[max][i])) max=r;
    [A[i],A[max]]=[A[max],A[i]]; [b[i],b[max]]=[b[max],b[i]];
    const div=A[i][i]||1e-12; for(let c=i;c<8;c++) A[i][c]/=div; b[i]/=div;
    for(let r=0;r<8;r++) if(r!==i){const f=A[r][i]; for(let c=i;c<8;c++) A[r][c]-=f*A[i][c]; b[r]-=f*b[i];}
  }
  return [b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7],1];
}
function redresserCartonV20(){
  if(!v20SnapshotCanvas || v20Corners.length!==4){setStatus('Photographie d’abord le carton.','red'); return;}
  const outW=900, outH=300;
  v20ResultCanvas.width=outW; v20ResultCanvas.height=outH;
  const src=v20SnapshotCtx.getImageData(0,0,v20SnapshotCanvas.width,v20SnapshotCanvas.height);
  const out=v20ResultCtx.createImageData(outW,outH);
  const dstCorners=[{x:0,y:0},{x:outW-1,y:0},{x:outW-1,y:outH-1},{x:0,y:outH-1}];
  const H=solveHomography(dstCorners,v20Corners);
  for(let y=0;y<outH;y++){
    for(let x=0;x<outW;x++){
      const den=H[6]*x+H[7]*y+1;
      const sx=(H[0]*x+H[1]*y+H[2])/den;
      const sy=(H[3]*x+H[4]*y+H[5])/den;
      const ix=Math.max(0,Math.min(src.width-1,Math.round(sx)));
      const iy=Math.max(0,Math.min(src.height-1,Math.round(sy)));
      const si=(iy*src.width+ix)*4;
      const di=(y*outW+x)*4;
      out.data[di]=src.data[si]; out.data[di+1]=src.data[si+1]; out.data[di+2]=src.data[si+2]; out.data[di+3]=255;
    }
  }
  v20ResultCtx.putImageData(out,0,0);
  document.querySelector('.v20-result-wrap').style.display='block';
  setFrame('ok'); setStatus('Carton redressé. Vérifie seulement la géométrie : pas d’OCR dans cette version.','ok');
}
async function startSaisieCartonsLoop(){
  initSaisieCartonV20UI();
  saisieStep='capture';
  scannerProcessing=false;
  setSkipVisible(false);
  setFrame('warn');
  setStatus('V20 : caméra active. Cadre tout le carton en paysage, puis clique sur Photographier le carton.','muted');
  scannerTimer=null;
}
async function startQrScanner(){
  stopQrScanner(false); scannerProcessing=false; scannerLastValue=''; scannerLastAt=0; scannerReadCount=0; currentDraft=null; saisieStep='grid'; setReadTime(NaN); setSkipVisible(false); setFrame('');
  const isHttps=location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'; if(!isHttps){setStatus('Caméra bloquée : ouvrir en HTTPS.','red'); return;} if(!navigator.mediaDevices?.getUserMedia){setStatus('Caméra non disponible.','red'); return;}
  try{const tmp=await navigator.mediaDevices.getUserMedia({video:true,audio:false}); tmp.getTracks().forEach(t=>t.stop());}catch(e){setStatus('Erreur autorisation caméra : '+readableCameraError(e),'red'); return;}
  try{await startCamera(); if(scannerUsageMode==='saisie_cartons'){startImportScannerPresence(); await startSaisieCartonsLoop();} else await startCommissaireLoop();}catch(e){setStatus('Erreur caméra : '+readableCameraError(e),'red'); beep(false);}
}
function stopQrScanner(showMessage=true){if(scannerTimer) clearInterval(scannerTimer); scannerTimer=null; if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop()); scannerStream=null;} const video=document.getElementById('qrScannerVideo'); if(video){video.pause?.(); video.srcObject=null;} if(showMessage) setStatus('Caméra arrêtée.','muted'); scannerProcessing=false; setSkipVisible(false); setFrame('');}
function initPage(){const title=document.getElementById('scanPageTitle'); const help=document.getElementById('scanPageHelp'); const back=document.getElementById('scanBackLink'); if(scannerUsageMode==='saisie_cartons'){if(title) title.textContent='V20 - scan carton'; if(help) help.textContent='Capture du carton, ajustement des coins puis redressement. Aucun OCR dans cette version.'; initSaisieCartonV20UI(); if(back) back.href='administration.html#cartons'; document.body.classList.add('scan-saisie-mode');} else {if(title) title.textContent='Scanner commissaire'; if(help) help.textContent='Scanne le QR du carton. Après lecture, retour automatique vers la page commissaire.'; if(back) back.href='commissaire.html';}}
async function skipIdentifier(){
  if(scannerUsageMode!=='saisie_cartons' || saisieStep!=='identifier' || !currentDraft) return;
  setSkipVisible(false); setFrame('ok'); beep(true);
  await publishImportDraft(currentDraft,'identifier_skipped');
  setStatus('Brouillon envoyé sans identifiant. Complète le numéro sur le PC avant validation.','ok');
  setTimeout(()=>resetForNextCard('Brouillon envoyé. Place un autre carton dans le cadre.'),1100);
}
document.getElementById('skipIdentifierBtn')?.addEventListener('click',skipIdentifier);
document.getElementById('startQrScanner')?.addEventListener('click',startQrScanner);
document.getElementById('stopQrScanner')?.addEventListener('click',()=>stopQrScanner(true));
window.addEventListener('pagehide',()=>{stopQrScanner(false); stopImportScannerPresence();});
initPage(); Loto.pageHeader(); Loto.protectPage();
Loto.ensureSession().then(()=>{Loto.pageHeader(); if(scannerUsageMode==='saisie_cartons') startImportScannerPresence();}).catch(()=>{});
