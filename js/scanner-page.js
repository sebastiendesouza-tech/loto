Loto.pageHeader();
Loto.protectPage();
let scannerDetector=null, scannerStream=null, scannerTimer=null, scannerLastValue='', scannerLastAt=0, scannerReadCount=0, scannerStartedAt=0;
function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
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
    document.getElementById('scannerLastCode').textContent='Aucun scan';
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
    beep(true); scannerStartedAt=performance.now();
    if(!continuous) stopQrScanner();
  }catch(e){}
}
document.getElementById('startQrScanner')?.addEventListener('click',startQrScanner);
document.getElementById('stopQrScanner')?.addEventListener('click',stopQrScanner);
