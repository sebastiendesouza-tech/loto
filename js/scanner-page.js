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
let scannerMode = '';

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function setStatus(message, type='muted'){
  const status = document.getElementById('scannerStatus');
  if(!status) return;
  status.className = type;
  status.textContent = message;
}

function scannerDiagnostics(){
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const ua = navigator.userAgent || '';
  return `HTTPS: ${isHttps ? 'oui' : 'non'} · Caméra API: ${navigator.mediaDevices?.getUserMedia ? 'oui' : 'non'} · BarcodeDetector: ${'BarcodeDetector' in window ? 'oui' : 'non'} · Navigateur: ${ua}`;
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

function handleCode(value){
  value = String(value || '').trim();
  if(!value) return;

  const now = performance.now();
  const continuous = document.getElementById('scannerContinuous')?.checked !== false;

  if(value === scannerLastValue && now - scannerLastAt < 900) return;

  scannerLastValue = value;
  scannerLastAt = now;
  scannerReadCount++;

  document.getElementById('scannerLastCode').textContent = value;
  document.getElementById('scannerReadTime').textContent = Math.round(now - scannerStartedAt) + ' ms';
  document.getElementById('scannerReadCount').textContent = String(scannerReadCount);

  const hist = document.getElementById('scannerHistory');
  if(hist){
    hist.innerHTML = `<div>${new Date().toLocaleTimeString()} · ${esc(value)}</div>` + hist.innerHTML;
  }

  beep(true);
  scannerStartedAt = performance.now();

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
      const roiSize = Math.floor(Math.min(vw, vh) * 0.62);
      const sx = Math.max(0, Math.floor((vw - roiSize) / 2));
      const sy = Math.max(0, Math.floor((vh - roiSize) / 2));
      canvas.width = roiSize;
      canvas.height = roiSize;
      ctx.drawImage(video, sx, sy, roiSize, roiSize, 0, 0, roiSize, roiSize);
      let img = ctx.getImageData(0, 0, roiSize, roiSize);
      let code = window.jsQR(img.data, roiSize, roiSize, { inversionAttempts:'dontInvert' });

      // Une fois sur six, on vérifie toute l'image si le QR n'est pas parfaitement centré.
      if(!code && frame % 6 === 0){
        const scaleW = Math.min(vw, 720);
        const scaleH = Math.round(scaleW * vh / vw);
        canvas.width = scaleW;
        canvas.height = scaleH;
        ctx.drawImage(video, 0, 0, scaleW, scaleH);
        img = ctx.getImageData(0, 0, scaleW, scaleH);
        code = window.jsQR(img.data, scaleW, scaleH, { inversionAttempts:'dontInvert' });
      }
      if(code && code.data) handleCode(code.data);
    }catch(e){}
  }, 75);
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
    decodedText => handleCode(decodedText),
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
    const codes = await scannerDetector.detect(video);
    if(!codes.length) return;
    handleCode(codes[0].rawValue);
  }catch(e){}
}

document.getElementById('startQrScanner')?.addEventListener('click', startQrScanner);
document.getElementById('stopQrScanner')?.addEventListener('click', () => stopQrScanner(true));
window.addEventListener('pagehide', () => stopQrScanner(false));
