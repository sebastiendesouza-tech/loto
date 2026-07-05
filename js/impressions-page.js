Loto.pageHeader();
Loto.protectPage();
Loto.ensureSession();

const playerUrl = () => (Loto.C.PLAYER_URL || (location.origin + location.pathname.replace('impressions.html','joueur.html'))) + '?s=' + encodeURIComponent(Loto.code());
const qrUrl = (size=800) => 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&margin=20&data=' + encodeURIComponent(playerUrl());
const linkEl = document.getElementById('link');
if(linkEl) linkEl.textContent = 'QR Code vers la page joueur';

function openPrintPage(kind){
  const qr = qrUrl(900);
  const title = 'LOTO SDS';
  const version = Loto.C.APP_VERSION || '';
  const css = `
    *{box-sizing:border-box} body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#111;background:white} .no-print{margin:16px;text-align:center} .btn{font-size:18px;padding:12px 18px;border:0;border-radius:10px;background:#0b5ed7;color:#fff;cursor:pointer} .hint{font-size:13px;color:#555;margin-top:8px}
    @media print{.no-print{display:none!important} body{margin:0} @page{size:A4 portrait;margin:0}}
    .page{width:210mm;height:297mm;padding:18mm;display:flex;align-items:center;justify-content:center;background:#fff;page-break-after:always}
    .poster{width:100%;height:100%;border:2px solid #111;border-radius:8mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:12mm}
    .poster h1{font-size:34pt;margin:0 0 8mm}.poster h2{font-size:18pt;margin:0 0 12mm;font-weight:500}.poster img{width:125mm;height:125mm;object-fit:contain}.poster p{font-size:16pt;margin:10mm 0 0}.poster .small{font-size:10pt;margin-top:auto;color:#555}
    .sheet{width:210mm;height:297mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;background:#fff}
    .card-a5{border:1px dashed #333;margin:5mm;padding:7mm;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}.card-a5 h1{font-size:20pt;margin:0 0 4mm}.card-a5 p{font-size:11pt;margin:2mm 0}.card-a5 img{width:72mm;height:72mm;object-fit:contain}.card-a5 .small{font-size:8pt;margin-top:4mm;color:#555}
    .qr-only{width:210mm;height:297mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.qr-only img{width:150mm;height:150mm}.qr-only h1{font-size:24pt}
  `;
  let body='';
  if(kind==='a4'){
    body = `<section class="page"><div class="poster"><h1>${title}</h1><h2>Suivez le tirage en direct sur votre téléphone</h2><img src="${qr}"><p>Scannez ce QR Code</p><p style="font-size:13pt">Aucune application à installer</p><div class="small">${version}</div></div></section>`;
  } else if(kind==='a5'){
    const card = `<div class="card-a5"><h1>${title}</h1><p>Suivez le tirage en direct</p><img src="${qr}"><p><b>Scannez le QR Code</b></p><p>Aucune application à installer</p><div class="small">${version}</div></div>`;
    body = `<section class="sheet">${card}${card}${card}${card}</section>`;
  } else {
    body = `<section class="qr-only"><img src="${qr}"><h1>LOTO SDS</h1><p>Suivre le tirage en direct</p><p style="font-size:10pt;color:#555">${version}</p></section>`;
  }
  const w = window.open('', '_blank');
  if(!w){ alert('La fenêtre d’impression a été bloquée. Autorise les fenêtres pop-up pour ce site.'); return; }
  w.document.open();
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Impression QR Code</title><style>${css}</style></head><body><div class="no-print"><button class="btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button><div class="hint">Dans la fenêtre d’impression, choisir “Enregistrer au format PDF” si besoin.</div></div>${body}<script>window.onload=()=>setTimeout(()=>window.print(),700);<\/script></body></html>`);
  w.document.close();
}

function downloadPng(){
  const a=document.createElement('a');
  a.href=qrUrl(1000);
  a.target='_blank';
  a.download='loto-sds-qr-code.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

document.getElementById('pdfA4').onclick=()=>openPrintPage('a4');
document.getElementById('pdfA5').onclick=()=>openPrintPage('a5');
document.getElementById('pdfQr').onclick=()=>openPrintPage('qr');
const pngBtn=document.getElementById('pngQr'); if(pngBtn) pngBtn.onclick=downloadPng;
