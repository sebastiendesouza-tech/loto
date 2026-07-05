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

  // Evite les doubles lectures si le meme carton reste sous la camera.
  if(value === scannerLastValue && now - scannerLastAt < 1200) return;

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

async function startQrScanner(){
  const video = document.getElementById('qrScannerVideo');

  stopQrScanner(false);

  scannerReadCount = 0;
  scannerStartedAt = performance.now();
  scannerLastValue = '';
  scannerLastAt = 0;

  document.getElementById('scannerReadCount').textContent = '0';
  document.getElementById('scannerReadTime').textContent = '-';
  document.getElementById('scannerLastCode').textContent = 'Aucun scan';

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

  // 1) Methode native quand elle existe.
  if('BarcodeDetector' in window){
    try{
      scannerMode = 'native';
      scannerDetector = new BarcodeDetector({ formats:['qr_code','code_128','ean_13','ean_8','code_39'] });
      scannerStream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:{ ideal:'environment' }, width:{ ideal:1280 }, height:{ ideal:720 } },
        audio:false
      });
      video.srcObject = scannerStream;
      video.setAttribute('playsinline', '');
      video.muted = true;
      await video.play();
      setStatus('Scan en cours. Mode natif. ' + scannerDiagnostics(), 'muted');
      scannerTimer = setInterval(scanQrFrame, 120);
      return;
    }catch(e){
      // On tente le mode compatible iPhone juste apres.
      stopQrScanner(false);
      setStatus('Mode natif indisponible, tentative du mode compatible iPhone...', 'muted');
    }
  }

  // 2) Fallback iPhone/Safari via html5-qrcode.
  if(window.Html5Qrcode){
    try{
      scannerMode = 'html5-qrcode';
      const regionId = 'qrScannerVideo';
      html5Scanner = new Html5Qrcode(regionId, { verbose:false });
      await html5Scanner.start(
        { facingMode:'environment' },
        { fps:10, qrbox:{ width:240, height:240 }, aspectRatio:1.777 },
        decodedText => handleCode(decodedText),
        () => {}
      );
      setStatus('Scan en cours. Mode compatible iPhone. ' + scannerDiagnostics(), 'muted');
      return;
    }catch(e){
      setStatus('Erreur caméra iPhone : ' + readableCameraError(e) + ' · ' + scannerDiagnostics(), 'red');
      beep(false);
      return;
    }
  }

  setStatus('Lecteur QR non chargé. Vérifier la connexion internet, puis recharger la page. ' + scannerDiagnostics(), 'red');
  beep(false);
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
  if(video && scannerMode !== 'html5-qrcode') video.srcObject = null;

  scannerMode = '';
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
