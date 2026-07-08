let scannerStream=null, scannerTimer=null, scannerLastValue='', scannerLastAt=0, scannerReadCount=0, scannerProcessing=false;
const params=new URLSearchParams(location.search);
let scannerUsageMode=(params.get('mode')||'commissaire').replace('-','_');
if(scannerUsageMode!=='saisie_cartons') scannerUsageMode='commissaire';
let saisieStep='grid';
let currentDraft=null;
let barcodeDetector=null;

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function setStatus(msg,type='muted'){const el=document.getElementById('scannerStatus'); if(el){el.className=type+' scan-minimal-status'; el.textContent=msg;}}
function setReadTime(ms){const el=document.getElementById('scannerReadTime'); if(el) el.textContent=Number.isFinite(ms)?Math.round(ms)+' ms':'-';}
function beep(ok=true){try{const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.frequency.value=ok?880:220; g.gain.value=.08; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{o.stop();ctx.close();},ok?90:180);}catch(e){}}
function setFrame(state){const el=document.getElementById('scanFrameOverlay'); if(!el) return; el.classList.remove('scan-frame-ok','scan-frame-warn','scan-frame-small'); if(saisieStep==='identifier') el.classList.add('scan-frame-small'); if(state==='ok') el.classList.add('scan-frame-ok'); if(state==='warn') el.classList.add('scan-frame-warn');}
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
async function saveOcrDraft(grid, quality, rawText){
  const client=Loto.supabaseClient; if(!client) throw new Error('Supabase non configuré.');
  const code=await nextImportCode(); const numero=codeToNumero(code); const m=code.match(/SDS-(\d{1,2})-(\d{1,4})$/i);
  const row={numero,carton_code:code,association_id:cleanAssociationId(m[1]),card_order:Number(m[2]),external_code:null,external_code_type:null,external_ocr_quality:null,numbers_signature:numbersSignatureFromGrid(grid),serie:'IMPORT',lignes:gridToLignes3x9(grid),grille:grid,qr_payload:code,status:'a_enregistrer',origine:'Scan OCR saisie cartons',ocr_quality:quality,ocr_text:String(rawText||'').slice(0,1000),actif:true,updated_at:new Date().toISOString()};
  const {error}=await client.from('loto_cartons').upsert(row,{onConflict:'numero'}); if(error) throw error;
  try{localStorage.setItem('loto_last_scanned_card_code',code);}catch(e){}
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
  const {error}=await client.from('loto_cartons').update(patch).eq('numero',currentDraft.numero); if(error) throw error;
  currentDraft={...currentDraft,...patch};
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
async function startSaisieCartonsLoop(){
  const video=document.getElementById('qrScannerVideo'); const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d',{willReadFrequently:true}); saisieStep='grid'; setStatus('Étape 1/2 : téléphone en paysage, cadre tout le carton. Scan continu.','muted'); setFrame('warn');
  scannerTimer=setInterval(async()=>{
    if(scannerProcessing||!video||video.readyState<2||!window.Tesseract) return; scannerProcessing=true;
    try{
      if(saisieStep==='grid'){
        drawRoi(video,canvas,ctx,false); const t0=performance.now(); const result=await Tesseract.recognize(canvas,'eng',{logger:()=>{}}); const ms=performance.now()-t0; setReadTime(ms); const nums=parseOcrNumbers(result?.data?.text||'');
        if(nums.length>=15){const grid=buildGridFromNumbers(nums); const quality=Math.round(Math.min(100,Math.max(60,result?.data?.confidence||90))); currentDraft=await saveOcrDraft(grid,quality,result?.data?.text||''); setFrame('ok'); beep(true); setStatus('Grille envoyée au PC. Étape 2/2 : scanne le QR code, le code-barres ou le numéro imprimé du carton.','ok'); saisieStep='identifier'; setTimeout(()=>{scannerProcessing=false; setFrame('warn');},650);}
        else{setFrame('warn'); setStatus('Étape 1/2 : '+nums.length+'/15 numéros détectés. Continue à cadrer.','muted'); scannerProcessing=false;}
      }else{
        setStatus('Étape 2/2 : scanne le QR code, le code-barres ou le numéro d’identification imprimé.','muted'); const found=await readIdentifierFromFrame(video,canvas,ctx);
        if(found?.value){setReadTime(found.ms); await updateDraftIdentifier(found.value,found.type,found.quality); setFrame('ok'); beep(true); stopQrScanner(false); setStatus('Identifiant envoyé : '+found.value+'. Retour administration.','ok'); setTimeout(()=>{location.href='administration.html#cartons';},700);}
        else{setFrame('warn'); setStatus('Étape 2/2 : identifiant non lu. Approche le QR, le code-barres ou le numéro imprimé. Tu pourras aussi le saisir côté PC.','muted'); scannerProcessing=false;}
      }
    }catch(e){setFrame('warn'); setStatus('Analyse impossible : '+(e.message||e),'red'); scannerProcessing=false;}
  }, saisieStep==='grid'?1800:1100);
}
async function startQrScanner(){
  stopQrScanner(false); scannerProcessing=false; scannerLastValue=''; scannerLastAt=0; scannerReadCount=0; currentDraft=null; saisieStep='grid'; setReadTime(NaN); setFrame('');
  const isHttps=location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'; if(!isHttps){setStatus('Caméra bloquée : ouvrir en HTTPS.','red'); return;} if(!navigator.mediaDevices?.getUserMedia){setStatus('Caméra non disponible.','red'); return;}
  try{const tmp=await navigator.mediaDevices.getUserMedia({video:true,audio:false}); tmp.getTracks().forEach(t=>t.stop());}catch(e){setStatus('Erreur autorisation caméra : '+readableCameraError(e),'red'); return;}
  try{await startCamera(); if(scannerUsageMode==='saisie_cartons') await startSaisieCartonsLoop(); else await startCommissaireLoop();}catch(e){setStatus('Erreur caméra : '+readableCameraError(e),'red'); beep(false);}
}
function stopQrScanner(showMessage=true){if(scannerTimer) clearInterval(scannerTimer); scannerTimer=null; if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop()); scannerStream=null;} const video=document.getElementById('qrScannerVideo'); if(video){video.pause?.(); video.srcObject=null;} if(showMessage) setStatus('Caméra arrêtée.','muted'); scannerProcessing=false; setFrame('');}
function initPage(){const title=document.getElementById('scanPageTitle'); const help=document.getElementById('scanPageHelp'); const back=document.getElementById('scanBackLink'); if(scannerUsageMode==='saisie_cartons'){if(title) title.textContent='Scanner saisie cartons'; if(help) help.textContent='Étape 1 : grille complète. Étape 2 : QR, code-barres ou numéro imprimé du carton.'; if(back) back.href='administration.html#cartons'; document.body.classList.add('scan-saisie-mode');} else {if(title) title.textContent='Scanner commissaire'; if(help) help.textContent='Scanne le QR du carton. Après lecture, retour automatique vers la page commissaire.'; if(back) back.href='commissaire.html';}}
document.getElementById('startQrScanner')?.addEventListener('click',startQrScanner);
document.getElementById('stopQrScanner')?.addEventListener('click',()=>stopQrScanner(true));
window.addEventListener('pagehide',()=>stopQrScanner(false));
initPage(); Loto.pageHeader(); Loto.protectPage();
