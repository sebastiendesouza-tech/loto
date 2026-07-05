Loto.pageHeader();Loto.protectPage();
const playerUrl = () => (Loto.C.PLAYER_URL || (location.origin + location.pathname.replace('impressions.html','joueur.html'))) + '?s=' + encodeURIComponent(Loto.code());
const linkEl = document.getElementById('link');
if(linkEl) linkEl.textContent = 'QR Code vers la page joueur';
function libsOk(){
  if(!window.QRCode){ alert('Générateur QR Code non chargé. Vérifiez la connexion Internet.'); return false; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('Générateur PDF non chargé. Vérifiez la connexion Internet.'); return false; }
  return true;
}
async function qrDataUrl(size=1000){
  const c=document.createElement('canvas');
  await QRCode.toCanvas(c, playerUrl(), {width:size,margin:1,errorCorrectionLevel:'M'});
  return c.toDataURL('image/png');
}
function textBlock(doc,x,y,w){
  doc.setFont('helvetica','bold');doc.setFontSize(30);doc.text('LOTO SDS',x+w/2,y,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(15);doc.text('Suivez le tirage en direct sur votre téléphone.',x+w/2,y+14,{align:'center'});
  doc.text('Aucune application à installer.',x+w/2,y+23,{align:'center'});
}
async function a4(){
  if(!libsOk()) return;
  const { jsPDF } = window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'}),qr=await qrDataUrl();
  textBlock(doc,15,25,180);doc.addImage(qr,'PNG',45,65,120,120);
  doc.setFontSize(12);doc.text('Scannez le QR Code',105,198,{align:'center'});
  doc.setFontSize(9);doc.text((Loto.C.APP_VERSION||''),105,286,{align:'center'});
  doc.save('loto-sds-qr-a4.pdf');
}
async function a5sheet(){
  if(!libsOk()) return;
  const { jsPDF } = window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'}),qr=await qrDataUrl();
  const cells=[[0,0],[105,0],[0,148.5],[105,148.5]];
  cells.forEach(([x,y])=>{doc.rect(x+3,y+3,99,142.5);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('LOTO SDS',x+52.5,y+18,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text('Suivez le tirage en direct',x+52.5,y+28,{align:'center'});doc.addImage(qr,'PNG',x+22.5,y+37,60,60);doc.setFontSize(9);doc.text('Scannez le QR Code',x+52.5,y+107,{align:'center'});doc.text('Aucune application à installer',x+52.5,y+124,{align:'center'});});
  doc.save('loto-sds-4-a5.pdf');
}
async function qrOnly(){
  if(!libsOk()) return;
  const { jsPDF } = window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'}),qr=await qrDataUrl();
  doc.addImage(qr,'PNG',35,35,140,140);doc.setFontSize(14);doc.text('LOTO SDS - Suivre le tirage',105,190,{align:'center'});doc.save('loto-sds-qr-seul.pdf');
}
async function downloadPng(){
  if(!window.QRCode){ alert('Générateur QR Code non chargé. Vérifiez la connexion Internet.'); return; }
  const url=await qrDataUrl(1000);
  const a=document.createElement('a');a.href=url;a.download='loto-sds-qr-code.png';document.body.appendChild(a);a.click();a.remove();
}
document.getElementById('pdfA4').onclick=a4;
document.getElementById('pdfA5').onclick=a5sheet;
document.getElementById('pdfQr').onclick=qrOnly;
// Si un bouton PNG existe dans une version future, il fonctionnera aussi.
const pngBtn=document.getElementById('pngQr'); if(pngBtn) pngBtn.onclick=downloadPng;
Loto.ensureSession();
