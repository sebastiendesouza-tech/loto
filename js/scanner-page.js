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

function ensureV20Panel(){
  let panel=document.getElementById('scanV20Panel');
  if(panel) return panel;
  const card=document.querySelector('.scan-main-card');
  panel=document.createElement('div');
  panel.id='scanV20Panel';
  panel.className='scan-v20-panel';
  panel.innerHTML=`
    <div class="scan-v20-actions">
      <button id="captureCardBtn" class="green" type="button">Photographier le carton</button>
      <button id="retryCardBtn" class="secondary" type="button" style="display:none">Refaire</button>
    </div>
    <div class="scan-v20-preview" id="scanV20Preview" style="display:none">
      <h2>Résultat V20 : carton redressé</h2>
      <canvas id="cardWarpCanvas"></canvas>
      <p class="muted">Contrôle demandé : le carton doit être droit, complet, lisible, et les bords doivent être parallèles. On ne lit pas encore les numéros.</p>
    </div>`;
  card?.appendChild(panel);
  document.getElementById('captureCardBtn')?.addEventListener('click',captureAndRectifyCardV20);
  document.getElementById('retryCardBtn')?.addEventListener('click',resetV20Capture);
  return panel;
}
function resetV20Capture(){
  document.getElementById('scanV20Preview')?.style && (document.getElementById('scanV20Preview').style.display='none');
  document.getElementById('retryCardBtn')?.style && (document.getElementById('retryCardBtn').style.display='none');
  document.getElementById('captureCardBtn')?.style && (document.getElementById('captureCardBtn').style.display='inline-block');
  setFrame('warn');
  setStatus('Place le carton dans le cadre. Puis appuie sur Photographier le carton.','muted');
}
function getVideoFrameCanvas(video){
  const src=document.createElement('canvas');
  const w=video.videoWidth||1280, h=video.videoHeight||720;
  src.width=w; src.height=h;
  src.getContext('2d',{willReadFrequently:true}).drawImage(video,0,0,w,h);
  return src;
}
function overlayCropRect(video){
  const w=video.videoWidth||1280, h=video.videoHeight||720;
  // Correspond à .scan-frame-overlay { inset: 7%; }
  const marginX=Math.round(w*.07), marginY=Math.round(h*.07);
  return {x:marginX,y:marginY,w:w-marginX*2,h:h-marginY*2};
}
function cropCanvas(src, r){
  const c=document.createElement('canvas'); c.width=r.w; c.height=r.h;
  c.getContext('2d',{willReadFrequently:true}).drawImage(src,r.x,r.y,r.w,r.h,0,0,r.w,r.h);
  return c;
}
function detectCardCorners(canvas){
  const w=canvas.width, h=canvas.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const img=ctx.getImageData(0,0,w,h); const d=img.data;
  let minX=w,minY=h,maxX=0,maxY=0,count=0;
  let tl=null,tr=null,br=null,bl=null;
  let bestTL=1e9,bestTR=1e9,bestBR=-1e9,bestBL=1e9;
  const step=Math.max(2,Math.round(Math.min(w,h)/260));
  for(let y=0;y<h;y+=step){
    for(let x=0;x<w;x+=step){
      const i=(y*w+x)*4;
      const r=d[i],g=d[i+1],b=d[i+2];
      const lum=(r*0.299+g*0.587+b*0.114);
      const contrast=Math.max(r,g,b)-Math.min(r,g,b);
      // Garde surtout lignes foncées / chiffres / bordures, ignore les grandes zones claires.
      if(lum<150 && contrast>8){
        count++; if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y;
        const s=x+y, trScore=(w-x)+y, brScore=x+y, blScore=x+(h-y);
        if(s<bestTL){bestTL=s;tl={x,y};}
        if(trScore<bestTR){bestTR=trScore;tr={x,y};}
        if(brScore>bestBR){bestBR=brScore;br={x,y};}
        if(blScore<bestBL){bestBL=blScore;bl={x,y};}
      }
    }
  }
  const boxW=maxX-minX, boxH=maxY-minY;
  const enough=count>80 && boxW>w*.45 && boxH>h*.35;
  if(!enough){
    return [{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
  }
  // Les extrêmes basés sur les pixels foncés peuvent attraper des chiffres. On stabilise avec la boîte englobante.
  const padX=Math.round(boxW*.03), padY=Math.round(boxH*.05);
  minX=Math.max(0,minX-padX); maxX=Math.min(w,maxX+padX); minY=Math.max(0,minY-padY); maxY=Math.min(h,maxY+padY);
  return [
    {x:Math.max(0,Math.min(tl?.x??minX,minX+Math.round(boxW*.10))),y:Math.max(0,Math.min(tl?.y??minY,minY+Math.round(boxH*.10)))},
    {x:Math.min(w,Math.max(tr?.x??maxX,maxX-Math.round(boxW*.10))),y:Math.max(0,Math.min(tr?.y??minY,minY+Math.round(boxH*.10)))},
    {x:Math.min(w,Math.max(br?.x??maxX,maxX-Math.round(boxW*.10))),y:Math.min(h,Math.max(br?.y??maxY,maxY-Math.round(boxH*.10)))},
    {x:Math.max(0,Math.min(bl?.x??minX,minX+Math.round(boxW*.10))),y:Math.min(h,Math.max(bl?.y??maxY,maxY-Math.round(boxH*.10)))}
  ];
}
function solvePerspective(srcPts, dstPts){
  const A=[], b=[];
  for(let i=0;i<4;i++){
    const x=srcPts[i].x,y=srcPts[i].y,u=dstPts[i].x,v=dstPts[i].y;
    A.push([x,y,1,0,0,0,-u*x,-u*y]); b.push(u);
    A.push([0,0,0,x,y,1,-v*x,-v*y]); b.push(v);
  }
  for(let i=0;i<8;i++){
    let max=i; for(let r=i+1;r<8;r++) if(Math.abs(A[r][i])>Math.abs(A[max][i])) max=r;
    [A[i],A[max]]=[A[max],A[i]]; [b[i],b[max]]=[b[max],b[i]];
    const piv=A[i][i]||1e-9;
    for(let c=i;c<8;c++) A[i][c]/=piv; b[i]/=piv;
    for(let r=0;r<8;r++) if(r!==i){const f=A[r][i]; for(let c=i;c<8;c++) A[r][c]-=f*A[i][c]; b[r]-=f*b[i];}
  }
  return [b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7],1];
}
function invert3x3(m){
  const [a,b,c,d,e,f,g,h,i]=m;
  const A=e*i-f*h, B=c*h-b*i, C=b*f-c*e, D=f*g-d*i, E=a*i-c*g, F=c*d-a*f, G=d*h-e*g, H=b*g-a*h, I=a*e-b*d;
  const det=a*A+b*D+c*G || 1e-9;
  return [A/det,B/det,C/det,D/det,E/det,F/det,G/det,H/det,I/det];
}
function warpPerspectiveCanvas(src, corners, outW=900, outH=300){
  const dst=document.createElement('canvas'); dst.width=outW; dst.height=outH;
  const sctx=src.getContext('2d',{willReadFrequently:true});
  const srcImg=sctx.getImageData(0,0,src.width,src.height); const sd=srcImg.data;
  const out=dst.getContext('2d',{willReadFrequently:true});
  const outImg=out.createImageData(outW,outH); const od=outImg.data;
  const H=solvePerspective(corners,[{x:0,y:0},{x:outW-1,y:0},{x:outW-1,y:outH-1},{x:0,y:outH-1}]);
  const inv=invert3x3(H);
  for(let y=0;y<outH;y++){
    for(let x=0;x<outW;x++){
      const den=inv[6]*x+inv[7]*y+inv[8];
      const sx=(inv[0]*x+inv[1]*y+inv[2])/den;
      const sy=(inv[3]*x+inv[4]*y+inv[5])/den;
      const ox=(y*outW+x)*4;
      if(sx>=0&&sy>=0&&sx<src.width&&sy<src.height){
        const ix=Math.max(0,Math.min(src.width-1,Math.round(sx)));
        const iy=Math.max(0,Math.min(src.height-1,Math.round(sy)));
        const si=(iy*src.width+ix)*4;
        od[ox]=sd[si]; od[ox+1]=sd[si+1]; od[ox+2]=sd[si+2]; od[ox+3]=255;
      }else{od[ox]=255; od[ox+1]=255; od[ox+2]=255; od[ox+3]=255;}
    }
  }
  out.putImageData(outImg,0,0);
  return dst;
}
async function captureAndRectifyCardV20(){
  const video=document.getElementById('qrScannerVideo');
  if(!video||video.readyState<2){setStatus('Caméra pas encore prête.','red'); return;}
  try{
    scannerProcessing=true;
    setStatus('Capture en cours : redressement du carton...','muted');
    const t0=performance.now();
    const frame=getVideoFrameCanvas(video);
    const crop=cropCanvas(frame, overlayCropRect(video));
    const corners=detectCardCorners(crop);
    const warped=warpPerspectiveCanvas(crop,corners,900,300);
    const out=document.getElementById('cardWarpCanvas');
    out.width=warped.width; out.height=warped.height;
    out.getContext('2d').drawImage(warped,0,0);
    document.getElementById('scanV20Preview').style.display='block';
    document.getElementById('retryCardBtn').style.display='inline-block';
    document.getElementById('captureCardBtn').style.display='none';
    setReadTime(performance.now()-t0);
    setFrame('ok'); beep(true);
    try{localStorage.setItem('loto_v20_last_rectified_card',out.toDataURL('image/jpeg',.86));}catch(e){}
    setStatus('✓ V20 terminée : vérifie seulement si le carton redressé est propre. OCR désactivé.','ok');
  }catch(e){setFrame('warn'); setStatus('Redressement impossible : '+(e.message||e),'red'); beep(false);}
  finally{scannerProcessing=false;}
}
async function startSaisieCartonsLoop(){
  ensureV20Panel();
  saisieStep='v20_rectification';
  setSkipVisible(false);
  setFrame('warn');
  setStatus('V20 : place le carton entier dans le cadre, téléphone en paysage, puis photographie.','muted');
}
async function startQrScanner(){
  stopQrScanner(false); scannerProcessing=false; scannerLastValue=''; scannerLastAt=0; scannerReadCount=0; currentDraft=null; saisieStep='grid'; setReadTime(NaN); setSkipVisible(false); setFrame('');
  const isHttps=location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'; if(!isHttps){setStatus('Caméra bloquée : ouvrir en HTTPS.','red'); return;} if(!navigator.mediaDevices?.getUserMedia){setStatus('Caméra non disponible.','red'); return;}
  try{const tmp=await navigator.mediaDevices.getUserMedia({video:true,audio:false}); tmp.getTracks().forEach(t=>t.stop());}catch(e){setStatus('Erreur autorisation caméra : '+readableCameraError(e),'red'); return;}
  try{await startCamera(); if(scannerUsageMode==='saisie_cartons'){startImportScannerPresence(); await startSaisieCartonsLoop();} else await startCommissaireLoop();}catch(e){setStatus('Erreur caméra : '+readableCameraError(e),'red'); beep(false);}
}
function stopQrScanner(showMessage=true){if(scannerTimer) clearInterval(scannerTimer); scannerTimer=null; if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop()); scannerStream=null;} const video=document.getElementById('qrScannerVideo'); if(video){video.pause?.(); video.srcObject=null;} if(showMessage) setStatus('Caméra arrêtée.','muted'); scannerProcessing=false; setSkipVisible(false); setFrame('');}
function initPage(){const title=document.getElementById('scanPageTitle'); const help=document.getElementById('scanPageHelp'); const back=document.getElementById('scanBackLink'); if(scannerUsageMode==='saisie_cartons'){if(title) title.textContent='Scanner saisie cartons'; if(help) help.textContent='Étape 1 : grille complète. Étape 2 : QR, code-barres ou numéro imprimé du carton.'; if(back) back.href='administration.html#cartons'; document.body.classList.add('scan-saisie-mode');} else {if(title) title.textContent='Scanner commissaire'; if(help) help.textContent='Scanne le QR du carton. Après lecture, retour automatique vers la page commissaire.'; if(back) back.href='commissaire.html';}}
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
