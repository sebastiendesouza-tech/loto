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
function resetForNextCard(message='Place un carton dans le cadre puis démarre la caméra.'){currentDraft=null; lastPartialGridSignature=''; lastPartialGridSentAt=0; partialGridSent=false; importDraftLocked=false; saisieStep='grid'; scannerProcessing=false; setSkipVisible(false); setNewCardButtonVisible(false); setFrame('warn'); setStatus(message,'ok'); markImportScannerPresence(true);}
function completeCurrentCard(message='✓ Carton terminé. Contrôle et valide sur le PC.'){importDraftLocked=true; scannerProcessing=false; setSkipVisible(false); setFrame('ok'); stopQrScanner(false); setStatus(message,'ok'); setNewCardButtonVisible(true); markImportScannerPresence(true);}
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
  const payload={
    source:'ocr_camera_v344',
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
    if(importDraftLocked || scannerProcessing||!video||video.readyState<2||!window.Tesseract) return; scannerProcessing=true;
    try{
      if(saisieStep==='grid'){
        drawRoi(video,canvas,ctx,false);
        const t0=performance.now();
        const result=await Tesseract.recognize(canvas,'eng',{logger:()=>{}});
        const ms=performance.now()-t0;
        setReadTime(ms);
        const nums=parseOcrNumbers(result?.data?.text||'');
        const quality=Math.round(Math.min(100,Math.max(45,result?.data?.confidence||75)));
        if(nums.length>0){
          const grid=buildGridFromNumbers(nums);
          const sig=nums.join('-');
          const now=Date.now();
          if(sig!==lastPartialGridSignature || now-lastPartialGridSentAt>3500){
            await savePartialOcrDraft(grid,quality,result?.data?.text||'',nums.length);
            lastPartialGridSignature=sig;
            lastPartialGridSentAt=now;
            partialGridSent=true;
          }
          setFrame(nums.length>=15?'ok':'warn');
          setStatus('Étape 1/2 : '+nums.length+'/15 numéros envoyés au PC. Les cases manquantes pourront être saisies à la main.','muted');
          if(nums.length>=15){
            currentDraft=await saveOcrDraft(grid,quality,result?.data?.text||'');
            setFrame('ok');
            beep(true);
            setStatus('✓ 15 numéros envoyés au PC. Étape 2/2 : scanne le QR code, le code-barres ou le numéro imprimé. Sinon appuie sur Ignorer / saisir plus tard.','ok');
            saisieStep='identifier';
            setSkipVisible(true);
            setTimeout(()=>{scannerProcessing=false; setFrame('warn');},650);
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
  stopQrScanner(false); scannerProcessing=false; scannerLastValue=''; scannerLastAt=0; scannerReadCount=0; currentDraft=null; lastPartialGridSignature=''; lastPartialGridSentAt=0; partialGridSent=false; importDraftLocked=false; setNewCardButtonVisible(false); saisieStep='grid'; setReadTime(NaN); setSkipVisible(false); setFrame('');
  const isHttps=location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'; if(!isHttps){setStatus('Caméra bloquée : ouvrir en HTTPS.','red'); return;} if(!navigator.mediaDevices?.getUserMedia){setStatus('Caméra non disponible.','red'); return;}
  try{const tmp=await navigator.mediaDevices.getUserMedia({video:true,audio:false}); tmp.getTracks().forEach(t=>t.stop());}catch(e){setStatus('Erreur autorisation caméra : '+readableCameraError(e),'red'); return;}
  try{await startCamera(); if(scannerUsageMode==='saisie_cartons'){startImportScannerPresence(); await startSaisieCartonsLoop();} else await startCommissaireLoop();}catch(e){setStatus('Erreur caméra : '+readableCameraError(e),'red'); beep(false);}
}
function stopQrScanner(showMessage=true){if(scannerTimer) clearInterval(scannerTimer); scannerTimer=null; if(scannerStream){scannerStream.getTracks().forEach(t=>t.stop()); scannerStream=null;} const video=document.getElementById('qrScannerVideo'); if(video){video.pause?.(); video.srcObject=null;} if(showMessage) setStatus('Caméra arrêtée.','muted'); scannerProcessing=false; setSkipVisible(false); setFrame('');}
function initPage(){const title=document.getElementById('scanPageTitle'); const help=document.getElementById('scanPageHelp'); const back=document.getElementById('scanBackLink'); if(scannerUsageMode==='saisie_cartons'){if(title) title.textContent='Scanner saisie cartons'; if(help) help.textContent='Étape 1 : grille complète. Étape 2 : QR, code-barres ou numéro imprimé du carton.'; if(back) back.href='administration.html#cartons'; document.body.classList.add('scan-saisie-mode'); const bar=document.querySelector('.scan-startbar'); if(bar && !document.getElementById('finishGridManualBtn')){const btn=document.createElement('button'); btn.id='finishGridManualBtn'; btn.type='button'; btn.className='secondary'; btn.textContent='Passer à l’identifiant'; btn.addEventListener('click',finishGridManually); bar.appendChild(btn); const next=document.createElement('button'); next.id='newImportCardBtn'; next.type='button'; next.className='green'; next.textContent='Scanner un autre carton'; next.style.display='none'; next.addEventListener('click',startQrScanner); bar.appendChild(next);}} else {if(title) title.textContent='Scanner commissaire'; if(help) help.textContent='Scanne le QR du carton. Après lecture, retour automatique vers la page commissaire.'; if(back) back.href='commissaire.html';}}
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
