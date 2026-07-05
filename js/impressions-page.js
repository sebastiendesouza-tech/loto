
Loto.pageHeader();Loto.protectPage();
const playerUrl = () => (Loto.C.PLAYER_URL || (location.origin + location.pathname.replace('impressions.html','joueur.html'))) + '?s=' + encodeURIComponent(Loto.code());
const linkEl = document.getElementById('link');
if(linkEl) linkEl.textContent = 'QR Code vers la page joueur';
function qrReady(){
  if(!window.QRCode){ alert('Générateur QR Code non chargé. Vérifie la connexion puis recharge la page.'); return false; }
  return true;
}
async function qrDataUrl(size=1000){
  const c=document.createElement('canvas');
  await QRCode.toCanvas(c, playerUrl(), {width:size,margin:1,errorCorrectionLevel:'M'});
  return c.toDataURL('image/png');
}
async function qrJpegUrl(size=1200){
  const c=document.createElement('canvas');
  await QRCode.toCanvas(c, playerUrl(), {width:size,margin:1,errorCorrectionLevel:'M'});
  const out=document.createElement('canvas'); out.width=c.width; out.height=c.height;
  const ctx=out.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,out.width,out.height); ctx.drawImage(c,0,0);
  return out.toDataURL('image/jpeg',0.95);
}
function pdfEscape(s){return String(s||'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function makePdf(actions, fileName){
  const pageW=595.28,pageH=841.89;
  let objects=[];
  function add(obj){objects.push(obj); return objects.length;}
  const fontId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const images=[];
  let stream='';
  function text(txt,x,y,size=14,align='left',bold=false){
    const safe=pdfEscape(String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g,''));
    const approx=safe.length*size*0.45;
    if(align==='center') x-=approx/2;
    stream += `BT /F1 ${size} Tf ${x.toFixed(2)} ${(pageH-y).toFixed(2)} Td (${safe}) Tj ET\n`;
  }
  function rect(x,y,w,h){stream += `${x.toFixed(2)} ${(pageH-y-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`;}
  async function image(dataUrl,x,y,w,h){
    const bin=atob(dataUrl.split(',')[1]);
    const idName='Im'+(images.length+1);
    const imgId=add(`<< /Type /XObject /Subtype /Image /Width 1200 /Height 1200 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bin.length} >>\nstream\n${bin}\nendstream`);
    images.push([idName,imgId]);
    stream += `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(pageH-y-h).toFixed(2)} cm /${idName} Do Q\n`;
  }
  return (async()=>{
    await actions({text,rect,image,pageW,pageH});
    const xobjects=images.map(([n,id])=>`/${n} ${id} 0 R`).join(' ');
    const contentId=add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    const pageId=add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontId} 0 R >> /XObject << ${xobjects} >> >> /Contents ${contentId} 0 R >>`);
    const pagesId=add(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
    objects[pageId-1]=objects[pageId-1].replace('/Parent 0 0 R',`/Parent ${pagesId} 0 R`);
    const catalogId=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    let pdf='%PDF-1.4\n'; const offsets=[0];
    objects.forEach((obj,i)=>{offsets.push(pdf.length); pdf += `${i+1} 0 obj\n${obj}\nendobj\n`;});
    const xref=pdf.length; pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<offsets.length;i++) pdf += String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    pdf += `trailer << /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes=new Uint8Array(pdf.length); for(let i=0;i<pdf.length;i++) bytes[i]=pdf.charCodeAt(i)&255;
    const blob=new Blob([bytes],{type:'application/pdf'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fileName; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
  })();
}
async function a4(){
  if(!qrReady()) return; const qr=await qrJpegUrl();
  await makePdf(async({text,image})=>{text('LOTO SDS',297,90,34,'center');text('Suivez le tirage en direct sur votre telephone',297,125,16,'center');text('Aucune application a installer',297,148,14,'center');await image(qr,130,210,335,335);text('Scannez le QR Code',297,585,16,'center');text(Loto.C.APP_VERSION||'',297,810,9,'center');},'loto-sds-qr-a4.pdf');
}
async function a5sheet(){
  if(!qrReady()) return; const qr=await qrJpegUrl();
  await makePdf(async({text,rect,image})=>{
    const cells=[[0,0],[297.64,0],[0,420.95],[297.64,420.95]];
    for(const [x,y] of cells){rect(x+9,y+9,279,402);text('LOTO SDS',x+148.8,y+50,22,'center');text('Suivez le tirage en direct',x+148.8,y+78,12,'center');await image(qr,x+79,y+110,140,140);text('Scannez le QR Code',x+148.8,y+275,11,'center');text('Aucune application a installer',x+148.8,y+310,10,'center');}
  },'loto-sds-4-a5.pdf');
}
async function qrOnly(){
  if(!qrReady()) return; const qr=await qrJpegUrl();
  await makePdf(async({text,image})=>{await image(qr,100,110,395,395);text('LOTO SDS - Suivre le tirage',297,560,18,'center');},'loto-sds-qr-seul.pdf');
}
async function downloadPng(){
  if(!qrReady()) return;
  const url=await qrDataUrl(1000);
  const a=document.createElement('a');a.href=url;a.download='loto-sds-qr-code.png';document.body.appendChild(a);a.click();a.remove();
}
document.getElementById('pdfA4').onclick=a4;
document.getElementById('pdfA5').onclick=a5sheet;
document.getElementById('pdfQr').onclick=qrOnly;
const pngBtn=document.getElementById('pngQr'); if(pngBtn) pngBtn.onclick=downloadPng;
Loto.ensureSession();
