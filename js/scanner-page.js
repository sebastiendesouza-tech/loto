Loto.pageHeader();
Loto.protectPage();

let scannerDetector = null;
let scannerStream = null;
let scannerTimer = null;
let html5Scanner = null;
let scannerLastValue = '';
let scannerLastAt = 0;
let scannerReadCount = 0;
let scannerStartedAt = 0;
let scannerLastAnalyzeMs = 0;
let scannerMode = '';
let scannerUsageMode = (new URLSearchParams(location.search).get('mode') || '').replace('-', '_') || localStorage.getItem('lotoScannerUsageMode') || 'commissaire';
let scannerProcessing = false;

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function setStatus(message, type='muted'){
  const status = document.getElementById('scannerStatus');
  if(!status) return;
  status.className = type;
  status.textContent = message;
}


function setScanEntryStatus(message, good=true){
  const el = document.getElementById('scanEntryStatusBox');
  if(!el) return;
  el.textContent = message;
  el.className = 'notice ' + (good ? 'ok-note' : 'bad-note');
  el.style.display = 'block';
}

function cleanAssociationId(value){
  const raw = String(value || '1').replace(/\D/g, '');
  return String(raw || '1').slice(-2).padStart(2, '0');
}
function cardInternalNumero(associationId, order){ return Number(cleanAssociationId(associationId)) * 10000 + Number(order || 0); }
function codeToNumero(code){
  const s = String(code || '').trim();
  const m = s.match(/SDS-(\d{1,2})-(\d{1,4})$/i);
  if(m) return cardInternalNumero(m[1], Number(m[2]));
  const tail = s.match(/(\d{1,6})\s*$/);
  return tail ? Number(tail[1]) : Number(s || 0);
}
function numbersSignatureFromGrid(grid){
  const nums=(grid||[]).flat().filter(n=>Number.isInteger(Number(n))).map(n=>Number(n)).sort((a,b)=>a-b);
  return nums.map(n=>String(n).padStart(2,'0')).join('-');
}

function emptyGrid3x9(){ return Array.from({length:3}, () => Array(9).fill(null)); }
function renderScanGridEditor(grid){
  const el = document.getElementById('scanGridEditor');
  if(!el) return;
  const g = grid && grid.length === 3 ? grid : emptyGrid3x9();
  el.innerHTML = g.map((row,r) => row.map((n,c) => `<input inputmode="numeric" min="1" max="90" maxlength="2" data-scan-r="${r}" data-scan-c="${c}" value="${n || ''}">`).join('')).join('');
}
function readScanGridEditor(){
  const grid = emptyGrid3x9();
  document.querySelectorAll('[data-scan-r][data-scan-c]').forEach(inp => {
    const r = Number(inp.dataset.scanR);
    const c = Number(inp.dataset.scanC);
    const raw = String(inp.value || '').trim();
    grid[r][c] = raw ? Number(raw) : null;
  });
  const all = grid.flat().filter(n => n !== null);
  if(all.length !== 15) throw new Error('La grille doit contenir exactement 15 numéros.');
  if(all.some(n => !Number.isInteger(n) || n < 1 || n > 90)) throw new Error('Les numéros doivent être entre 1 et 90.');
  if(new Set(all).size !== 15) throw new Error('Doublon détecté dans le carton.');
  const rowCounts = grid.map(row => row.filter(n => n !== null).length);
  if(rowCounts.some(c => c !== 5)) throw new Error('Chaque ligne doit contenir 5 numéros.');
  return grid;
}
function gridToLignes3x9(grid){ return grid.map(row => row.filter(n => n !== null)); }

function setScannerUsageMode(mode){
  scannerUsageMode = (mode === 'saisie_cartons' || mode === 'saisie-cartons') ? 'saisie_cartons' : 'commissaire';
  localStorage.setItem('lotoScannerUsageMode', scannerUsageMode);
  document.querySelectorAll('[data-scanner-mode]').forEach(btn => {
    const active = btn.dataset.scannerMode === scannerUsageMode;
    btn.classList.toggle('green', active);
    btn.classList.toggle('secondary', !active);
  });
  const entry = document.getElementById('scanCardEntry');
  if(entry) entry.style.display = scannerUsageMode === 'saisie_cartons' ? 'block' : 'none';
  const help = document.getElementById('scannerModeHelp');
  if(help) help.textContent = scannerUsageMode === 'saisie_cartons'
    ? 'Mode saisie cartons : le scan remplit le code, puis tu saisis la grille et tu valides le carton.'
    : 'Mode commissaire : contrôle QR / code-barres du carton pendant le loto.';
}

async function saveScannedCard(){
  const client = Loto.supabaseClient;
  if(!client){ setScanEntryStatus('Supabase non configuré.', false); return; }
  try{
    const code = String(document.getElementById('scanEntryCode')?.value || '').trim();
    const numero = codeToNumero(code);
    if(!numero) throw new Error('Code carton obligatoire. Scanne le carton ou saisis son code.');
    const grille = readScanGridEditor();
    const lignes = gridToLignes3x9(grille);
    const parsed = String(code || '').match(/SDS-(\d{1,2})-(\d{1,4})$/i);
    const row = {
      numero,
      carton_code: code || ('SDS-00-' + String(numero).padStart(4, '0')),
      association_id: parsed ? cleanAssociationId(parsed[1]) : null,
      card_order: parsed ? Number(parsed[2]) : null,
      numbers_signature: numbersSignatureFromGrid(grille),
      serie: document.getElementById('scanEntrySerie')?.value || 'IMPORT',
      lignes,
      grille,
      qr_payload: code || String(numero),
      status: 'a_enregistrer',
      origine: 'Scan saisie cartons',
      ocr_quality: Number(document.getElementById('scanEntryQuality')?.value || 100),
      actif: true,
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from('loto_cartons').upsert(row, { onConflict:'numero' });
    if(error) throw error;
    setScanEntryStatus('Carton enregistré dans À enregistrer : ' + row.carton_code, true);
    beep(true);
  }catch(e){
    setScanEntryStatus('Erreur : ' + (e.message || e), false);
    beep(false);
  }
}

function clearScannedCard(){
  const code = document.getElementById('scanEntryCode');
  const box = document.getElementById('scanEntryStatusBox');
  if(code) code.value = '';
  renderScanGridEditor(emptyGrid3x9());
  if(box) box.style.display = 'none';
}

function scannerDiagnostics(){
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const ua = navigator.userAgent || '';
  return `HTTPS: ${isHttps ? 'oui' : 'non'} · Caméra API: ${navigator.mediaDevices?.getUserMedia ? 'oui' : 'non'} · BarcodeDetector: ${'BarcodeDetector' in window ? 'oui' : 'non'} · Navigateur: ${ua}`;
}


function flashScanOk(){
  const box = document.querySelector('.scanner-camera');
  if(!box) return;
  box.classList.remove('scan-ok');
  void box.offsetWidth;
  box.classList.add('scan-ok');
  setTimeout(() => box.classList.remove('scan-ok'), 350);
}

function beep(ok=true){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220;
    g.gain.value = .08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, ok ? 90 : 180);
  }catch(e){}
}

async function handleCommissaireCode(value, measured){
  if(scannerProcessing) return;
  scannerProcessing = true;
  try{
    stopQrScanner(false);
    const numero = codeToNumero(value);
    if(!numero) throw new Error('Code carton illisible : ' + value);
    setStatus('QR lu. Contrôle du carton en cours...', 'muted');
    const payload = await Loto.controlCard(numero);
    payload.scannedCode = value;
    payload.readMs = measured;
    payload.scannedAt = new Date().toISOString();

    try{ localStorage.setItem('loto_last_commissaire_scan_result', JSON.stringify(payload)); }catch(e){}

    if(payload?.found){
      await Loto.showPublicCard(payload.result);
      beep(payload.result?.valid !== false);
    }else{
      beep(false);
    }

    const target = 'commissaire.html?scan=1&numero=' + encodeURIComponent(numero);
    setTimeout(() => { location.href = target; }, 250);
  }catch(e){
    scannerProcessing = false;
    setStatus('Erreur contrôle : ' + (e.message || e), 'red');
    beep(false);
  }
}

async function handleCode(value, readMs=null){
  value = String(value || '').trim();
  if(!value || scannerProcessing) return;

  const now = performance.now();

  if(value === scannerLastValue && now - scannerLastAt < 900) return;

  scannerLastValue = value;
  scannerLastAt = now;
  scannerReadCount++;

  const lastCodeEl = document.getElementById('scannerLastCode');
  if(lastCodeEl) lastCodeEl.textContent = value;
  const measured = Number.isFinite(readMs) ? readMs : scannerLastAnalyzeMs;
  const timeEl = document.getElementById('scannerReadTime');
  if(timeEl) timeEl.textContent = Number.isFinite(measured) && measured > 0 ? Math.round(measured) + ' ms' : '-';
  const countEl = document.getElementById('scannerReadCount');
  if(countEl) countEl.textContent = String(scannerReadCount);

  if(scannerUsageMode === 'commissaire'){
    flashScanOk();
    await handleCommissaireCode(value, measured);
    return;
  }

  if(scannerUsageMode === 'saisie_cartons'){
    const codeInput = document.getElementById('scanEntryCode');
    if(codeInput) codeInput.value = value;
    setScanEntryStatus('Code lu. Saisis la grille puis clique sur Valider et enregistrer le carton.', true);
  }

  const hist = document.getElementById('scannerHistory');
  if(hist){
    hist.innerHTML = `<div>${new Date().toLocaleTimeString()} · ${esc(value)}</div>` + hist.innerHTML;
  }

  flashScanOk();
  beep(true);
  scannerStartedAt = performance.now();

  const continuous = document.getElementById('scannerContinuous')?.checked !== false;
  if(!continuous) stopQrScanner();
}

function resetScannerUi(){
  scannerReadCount = 0;
  scannerStartedAt = performance.now();
  scannerLastValue = '';
  scannerLastAt = 0;
  document.getElementById('scannerReadCount').textContent = '0';
  document.getElementById('scannerReadTime').textContent = '-';
  document.getElementById('scannerLastCode').textContent = 'Aucun scan';
}

function readableCameraError(e){
  const name = e?.name || '';
  const msg = e?.message || String(e || 'Erreur inconnue');
  if(name === 'NotAllowedError') return 'autorisation caméra refusée. Vérifier les réglages Safari > Caméra.';
  if(name === 'NotFoundError') return 'aucune caméra trouvée.';
  if(name === 'NotReadableError') return 'caméra déjà utilisée par une autre application.';
  if(name === 'OverconstrainedError') return 'contrainte caméra non compatible.';
  return `${name ? name + ' - ' : ''}${msg}`;
}

async function getBackCameraId(){
  if(!navigator.mediaDevices?.enumerateDevices) return null;
  try{
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === 'videoinput');
    if(!cams.length) return null;
    const back = cams.find(d => /back|rear|environment|arriere|arrière/i.test(d.label || ''));
    return (back || cams[cams.length - 1]).deviceId || null;
  }catch(e){
    return null;
  }
}

async function startJsQrScanner(){
  if(!window.jsQR) throw new Error('jsQR non charge');
  scannerMode = 'jsqr';
  const video = document.getElementById('qrScannerVideo');
  const region = document.getElementById('qrScannerRegion');
  if(region){ region.style.display = 'none'; region.innerHTML = ''; }
  video.style.display = 'block';
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  video.setAttribute('autoplay','');
  video.muted = true;
  const deviceId = await getBackCameraId();
  const videoConstraint = deviceId
    ? { deviceId:{ exact:deviceId }, width:{ ideal:640 }, height:{ ideal:480 } }
    : { facingMode:{ ideal:'environment' }, width:{ ideal:640 }, height:{ ideal:480 } };
  scannerStream = await navigator.mediaDevices.getUserMedia({ video:videoConstraint, audio:false });
  video.srcObject = scannerStream;
  await video.play();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently:true });
  let frame = 0;
  setStatus('Scan rapide en cours. Place le QR Code dans le cadre blanc. ' + scannerDiagnostics(), 'muted');
  scannerTimer = setInterval(() => {
    if(!video || video.readyState < 2) return;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    if(!vw || !vh) return;
    frame++;
    try{
      // Lecture prioritaire au centre pour accélérer le scan continu.
      const roiSize = Math.floor(Math.min(vw, vh) * 0.56);
      const sx = Math.max(0, Math.floor((vw - roiSize) / 2));
      const sy = Math.max(0, Math.floor((vh - roiSize) / 2));
      canvas.width = roiSize;
      canvas.height = roiSize;
      ctx.drawImage(video, sx, sy, roiSize, roiSize, 0, 0, roiSize, roiSize);
      let img = ctx.getImageData(0, 0, roiSize, roiSize);
      let t0 = performance.now();
      let code = window.jsQR(img.data, roiSize, roiSize, { inversionAttempts:'dontInvert' });
      let readMs = performance.now() - t0;

      // Une fois sur six, on vérifie toute l'image si le QR n'est pas parfaitement centré.
      if(!code && frame % 6 === 0){
        const scaleW = Math.min(vw, 720);
        const scaleH = Math.round(scaleW * vh / vw);
        canvas.width = scaleW;
        canvas.height = scaleH;
        ctx.drawImage(video, 0, 0, scaleW, scaleH);
        img = ctx.getImageData(0, 0, scaleW, scaleH);
        t0 = performance.now();
        code = window.jsQR(img.data, scaleW, scaleH, { inversionAttempts:'dontInvert' });
        readMs = performance.now() - t0;
      }
      if(code && code.data){ scannerLastAnalyzeMs = readMs; handleCode(code.data, readMs); }
    }catch(e){}
  }, 60);
}

async function startNativePreviewAndBarcode(){
  const video = document.getElementById('qrScannerVideo');
  scannerMode = 'native';
  scannerDetector = new BarcodeDetector({ formats:['qr_code','code_128','ean_13','ean_8','code_39'] });
  const deviceId = await getBackCameraId();
  const videoConstraint = deviceId
    ? { deviceId:{ exact:deviceId }, width:{ ideal:640 }, height:{ ideal:480 } }
    : { facingMode:{ ideal:'environment' }, width:{ ideal:640 }, height:{ ideal:480 } };
  scannerStream = await navigator.mediaDevices.getUserMedia({ video:videoConstraint, audio:false });
  const region = document.getElementById('qrScannerRegion');
  if(region) region.style.display = 'none';
  video.style.display = 'block';
  video.setAttribute('playsinline','');
  video.setAttribute('autoplay','');
  video.muted = true;
  video.srcObject = scannerStream;
  await video.play();
  setStatus('Scan en cours. Mode natif. ' + scannerDiagnostics(), 'muted');
  scannerTimer = setInterval(scanQrFrame, 80);
}

async function startHtml5Scanner(){
  scannerMode = 'html5-qrcode';
  const nativeVideo = document.getElementById('qrScannerVideo');
  if(nativeVideo){ nativeVideo.pause?.(); nativeVideo.srcObject = null; nativeVideo.style.display = 'none'; }
  const regionId = 'qrScannerRegion';
  const region = document.getElementById(regionId);
  if(region){ region.style.display = 'block'; region.innerHTML = ''; }
  html5Scanner = new Html5Qrcode(regionId, { verbose:false });
  const deviceId = await getBackCameraId();
  const cameraConfig = deviceId ? { deviceId:{ exact:deviceId } } : { facingMode:'environment' };
  await html5Scanner.start(
    cameraConfig,
    { fps:18, qrbox:{ width:190, height:190 }, aspectRatio:1.333 },
    decodedText => handleCode(decodedText, null),
    () => {}
  );
  setStatus('Scan en cours. Mode compatible iPhone. ' + scannerDiagnostics(), 'muted');
}

async function startCameraPreviewOnly(){
  const video = document.getElementById('qrScannerVideo');
  const deviceId = await getBackCameraId();
  const videoConstraint = deviceId ? { deviceId:{ exact:deviceId } } : { facingMode:{ ideal:'environment' } };
  scannerStream = await navigator.mediaDevices.getUserMedia({ video:videoConstraint, audio:false });
  const region = document.getElementById('qrScannerRegion');
  if(region) region.style.display = 'none';
  video.style.display = 'block';
  video.setAttribute('playsinline','');
  video.setAttribute('autoplay','');
  video.muted = true;
  video.srcObject = scannerStream;
  await video.play();
  setStatus('Caméra ouverte, mais lecteur QR non disponible. Recharge la page avec internet actif. ' + scannerDiagnostics(), 'red');
}

async function startQrScanner(){
  stopQrScanner(false);
  resetScannerUi();

  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if(!isHttps){
    setStatus('Caméra bloquée : la page doit être ouverte en HTTPS. ' + scannerDiagnostics(), 'red');
    beep(false);
    return;
  }
  if(!navigator.mediaDevices?.getUserMedia){
    setStatus('Caméra non disponible sur ce navigateur. ' + scannerDiagnostics(), 'red');
    beep(false);
    return;
  }

  // Demande d'autorisation d'abord : cela débloque aussi les labels de caméras sur iPhone.
  try{
    const tmp = await navigator.mediaDevices.getUserMedia({video:true,audio:false});
    tmp.getTracks().forEach(t => t.stop());
  }catch(e){
    setStatus('Erreur autorisation caméra : ' + readableCameraError(e) + ' · ' + scannerDiagnostics(), 'red');
    beep(false);
    return;
  }

  if(window.jsQR){
    try{
      await startJsQrScanner();
      return;
    }catch(e){
      stopQrScanner(false);
      setStatus('Mode jsQR indisponible, tentative du mode natif...', 'muted');
    }
  }

  if('BarcodeDetector' in window){
    try{
      await startNativePreviewAndBarcode();
      return;
    }catch(e){
      stopQrScanner(false);
      setStatus('Mode natif indisponible, tentative du mode iPhone...', 'muted');
    }
  }

  if(window.Html5Qrcode){
    try{
      await startHtml5Scanner();
      return;
    }catch(e){
      stopQrScanner(false);
      setStatus('Lecteur QR iPhone indisponible, ouverture simple de la caméra...', 'muted');
    }
  }

  try{
    await startCameraPreviewOnly();
  }catch(e){
    setStatus('Erreur caméra : ' + readableCameraError(e) + ' · ' + scannerDiagnostics(), 'red');
    beep(false);
  }
}

function stopQrScanner(showMessage=true){
  if(scannerTimer) clearInterval(scannerTimer);
  scannerTimer = null;

  if(scannerStream){
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }

  if(html5Scanner){
    try{
      const s = html5Scanner;
      html5Scanner = null;
      s.stop().catch(()=>{}).finally(()=>{ try{s.clear();}catch(e){} });
    }catch(e){}
  }

  const video = document.getElementById('qrScannerVideo');
  if(video){ video.pause?.(); video.srcObject = null; video.style.display = 'block'; }
  const region = document.getElementById('qrScannerRegion');
  if(region){ region.style.display = 'none'; region.innerHTML = ''; }

  scannerMode = '';
  scannerDetector = null;
  if(showMessage) setStatus('Caméra arrêtée.', 'muted');
}

async function scanQrFrame(){
  const video = document.getElementById('qrScannerVideo');
  if(!scannerDetector || !video || video.readyState < 2) return;
  try{
    const t0 = performance.now();
    const codes = await scannerDetector.detect(video);
    const readMs = performance.now() - t0;
    if(!codes.length) return;
    scannerLastAnalyzeMs = readMs;
    handleCode(codes[0].rawValue, readMs);
  }catch(e){}
}

document.getElementById('startQrScanner')?.addEventListener('click', startQrScanner);
document.getElementById('stopQrScanner')?.addEventListener('click', () => stopQrScanner(true));
document.getElementById('modeCommissaire')?.addEventListener('click', () => setScannerUsageMode('commissaire'));
document.getElementById('modeSaisieCartons')?.addEventListener('click', () => setScannerUsageMode('saisie_cartons'));
document.getElementById('saveScannedCard')?.addEventListener('click', saveScannedCard);
document.getElementById('clearScannedCard')?.addEventListener('click', clearScannedCard);
renderScanGridEditor(emptyGrid3x9());
setScannerUsageMode(scannerUsageMode);
window.addEventListener('pagehide', () => stopQrScanner(false));
