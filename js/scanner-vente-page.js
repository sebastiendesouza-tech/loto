const $=id=>document.getElementById(id);
let mode='vente',stream=null,timer=null,busy=false,lastCode='',lastAt=0;
let voucherExpected=null;
let voucherScans=[];
let voucherKeys=new Set();

function context(){
  const s=Loto.state();
  return {
    id:s.program?.id||s.sessionCode||Loto.code(),
    title:s.program?.title||s.lotoName||'Loto actif',
    enabled:Loto.programSettings().salesTrackingEnabled,
    voucherEnabled:Loto.programSettings().validationVoucherEnabled
  };
}
function setMode(next){
  mode=next;
  $('modeSale').classList.toggle('active',mode==='vente');
  $('modeReturn').classList.toggle('active',mode==='retour');
  if(mode==='retour') resetVoucher(false);
  renderVoucherMode();
  $('scannerStatus').textContent=readyText();
  clearResult();
}
function readyText(){
  const c=context();
  if(mode==='retour') return 'Prêt pour un retour.';
  if(c.voucherEnabled && !voucherExpected) return 'Scannez le bon de validation.';
  if(c.voucherEnabled) return 'Scannez les cartons et planches du panier.';
  return 'Prêt pour une vente.';
}
function clearResult(){$('saleScannerScreen').classList.remove('result-ok','result-error');}
function feedback(ok,text,delay=1500){
  const screen=$('saleScannerScreen');
  screen.classList.remove('result-ok','result-error'); void screen.offsetWidth;
  screen.classList.add(ok?'result-ok':'result-error'); $('scannerStatus').textContent=text;
  try{navigator.vibrate?.(ok?80:[120,80,120]);const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=ok?920:210;g.gain.value=.12;o.connect(g);g.connect(ctx.destination);o.start();setTimeout(()=>{o.stop();ctx.close();},ok?100:280);}catch(e){}
  setTimeout(()=>{clearResult();$('scannerStatus').textContent=readyText();},delay);
}
function isGeneratedByApp(card){return String(card?.origine||'').trim().toLowerCase()==='loto by sds';}
function normalizeSupport(value){const v=String(value||'C').toUpperCase();return ['C','P4','P6','P8'].includes(v)?v:'C';}
function parseVoucher(raw){
  const text=String(raw||'').trim().toUpperCase().replace(/\s+/g,'');
  const parts=text.split(';').filter(Boolean);
  if(!parts.length)return null;
  const out={C:0,P4:0,P6:0,P8:0};
  let recognized=0;
  for(const part of parts){
    const m=part.match(/^(C|P4|P6|P8):(\d+)$/);
    if(!m)return null;
    out[m[1]]=Number(m[2]);recognized++;
  }
  if(!recognized||Object.values(out).every(v=>v===0))return null;
  return out;
}
function voucherTotal(v){return (v.C||0)+(v.P4||0)*4+(v.P6||0)*6+(v.P8||0)*8;}
function voucherSummary(v){
  const parts=[];
  if(v.C)parts.push(`${v.C} carton${v.C>1?'s':''}`);
  if(v.P4)parts.push(`${v.P4} planche${v.P4>1?'s':''} de 4`);
  if(v.P6)parts.push(`${v.P6} planche${v.P6>1?'s':''} de 6`);
  if(v.P8)parts.push(`${v.P8} planche${v.P8>1?'s':''} de 8`);
  return `${parts.join(' · ')} · ${voucherTotal(v)} cartons au total`;
}
function scanCounts(){const out={C:0,P4:0,P6:0,P8:0};for(const x of voucherScans)out[x.support]++;return out;}
function basketComplete(){if(!voucherExpected)return false;const got=scanCounts();return ['C','P4','P6','P8'].every(k=>got[k]===voucherExpected[k]);}
function renderBasket(){
  const expected=voucherExpected||{C:0,P4:0,P6:0,P8:0},got=scanCounts();
  for(const k of ['C','P4','P6','P8']){$('basket'+k).textContent=`${got[k]} / ${expected[k]}`;$('basket'+k).className=got[k]===expected[k]?'basket-ok':got[k]>expected[k]?'basket-error':'';}
  $('validateVoucher').disabled=!basketComplete();
}
function resetVoucher(showMessage=true){voucherExpected=null;voucherScans=[];voucherKeys=new Set();renderVoucherMode();if(showMessage)feedback(true,'Bon annulé.');}
function renderVoucherMode(){
  const c=context(),active=c.voucherEnabled&&mode==='vente';
  const modeLabel=$('scannerModeLabel');if(modeLabel)modeLabel.textContent=!c.enabled?'Suivi des ventes désactivé':(c.voucherEnabled?'Mode bon de validation':'Mode vente directe');
  $('voucherPanel').style.display=active?'block':'none';
  $('voucherPrompt').style.display=active&&!voucherExpected?'block':'none';
  $('voucherBasket').style.display=active&&voucherExpected?'block':'none';
  $('saleScanHelp').textContent=active?(voucherExpected?'Scannez maintenant les cartons ou planches remis au joueur.':'Scannez d’abord le QR code du bon de validation.'):'Présentez le QR code du carton dans le cadre.';
  if(active&&voucherExpected)renderBasket();
}
async function findCards(raw){
  const client=Loto.supabaseClient,value=String(raw||'').trim(); if(!value)throw new Error('ANOMALIE : QR code vide.');
  let req;
  if(/^SDSP-/i.test(value)) req=client.from('loto_cartons').select('numero,carton_code,sheet_code,sheet_position,support_type,origine,external_code,actif').eq('sheet_code',value).eq('actif',true).order('sheet_position');
  else req=client.from('loto_cartons').select('numero,carton_code,sheet_code,sheet_position,support_type,origine,external_code,actif').eq('carton_code',value).eq('actif',true);
  let {data,error}=await req;if(error)throw error;
  if(!data?.length){const alt=await client.from('loto_cartons').select('numero,carton_code,sheet_code,sheet_position,support_type,origine,external_code,actif').eq('external_code',value).eq('actif',true);if(alt.error)throw alt.error;data=alt.data;}
  if(!data?.length)throw new Error('ANOMALIE : carton ou planche introuvable.');
  if(data.some(card=>!isGeneratedByApp(card)))throw new Error('ANOMALIE : carton non généré par l’application.');
  return data;
}
function supportForCards(cards){
  const declared=normalizeSupport(cards[0]?.support_type);
  if(declared!=='C')return declared;
  if(cards.length===4)return 'P4';if(cards.length===6)return 'P6';if(cards.length===8)return 'P8';return 'C';
}
async function ensureNotSold(cards){
  const c=context(),nums=cards.map(x=>x.numero);
  const {data,error}=await Loto.supabaseClient.from('loto_carton_sales').select('numero,status').eq('loto_id',c.id).in('numero',nums);
  if(error)throw error;
  const sold=new Set((data||[]).filter(x=>x.status==='vendu').map(x=>x.numero));
  if(nums.some(n=>sold.has(n)))throw new Error('ANOMALIE : carton ou planche déjà vendu.');
}
async function recordSale(cards,source='scanner'){
  const c=context(),client=Loto.supabaseClient,now=new Date().toISOString(),nums=cards.map(x=>x.numero);
  await ensureNotSold(cards);
  const rows=cards.map(card=>({loto_id:c.id,loto_title:c.title,numero:card.numero,carton_code:card.carton_code,status:'vendu',sold_at:now,updated_at:now}));
  const {error}=await client.from('loto_carton_sales').upsert(rows,{onConflict:'loto_id,numero'});if(error)throw error;
  const {error:updateError}=await client.from('loto_cartons').update({status:'vendu',sale_loto_id:c.id,sold_at:now,updated_at:now}).in('numero',nums);if(updateError)throw updateError;
  await client.from('loto_carton_movements').insert(cards.map(card=>({loto_id:c.id,loto_title:c.title,numero:card.numero,carton_code:card.carton_code,action:'vente',source,created_at:now})));
}
async function recordReturn(cards){
  const c=context(),client=Loto.supabaseClient,now=new Date().toISOString(),nums=cards.map(x=>x.numero);
  const {data:sales,error:readError}=await client.from('loto_carton_sales').select('numero,status').eq('loto_id',c.id).in('numero',nums);if(readError)throw readError;
  const sold=new Set((sales||[]).filter(x=>x.status==='vendu').map(x=>x.numero));if(nums.some(n=>!sold.has(n)))throw new Error('ANOMALIE : carton ou planche déjà disponible.');
  const {error}=await client.from('loto_carton_sales').update({status:'disponible',updated_at:now}).eq('loto_id',c.id).in('numero',nums);if(error)throw error;
  await client.from('loto_cartons').update({status:'disponible',sale_loto_id:null,sold_at:null,sold_by:null,updated_at:now}).in('numero',nums);
  await client.from('loto_carton_movements').insert(cards.map(card=>({loto_id:c.id,loto_title:c.title,numero:card.numero,carton_code:card.carton_code,action:'retour',source:'scanner',created_at:now})));
}
async function processVoucherSupport(raw){
  const cards=await findCards(raw),support=supportForCards(cards),expected=voucherExpected[support]||0,got=scanCounts()[support]||0;
  if(got>=expected)throw new Error(`ANOMALIE : aucun support ${support} supplémentaire n’est prévu sur le bon.`);
  const key=cards[0]?.sheet_code||cards[0]?.carton_code;
  if(voucherKeys.has(key))throw new Error('ANOMALIE : ce carton ou cette planche a déjà été scanné dans ce panier.');
  await ensureNotSold(cards);
  voucherKeys.add(key);voucherScans.push({key,support,cards});renderBasket();
  feedback(true,basketComplete()?'PANIER COMPLET · appuyez sur Valider le panier.':`${support} AJOUTÉ AU PANIER`,1100);
}
async function validateVoucher(){
  if(!basketComplete()){feedback(false,'ANOMALIE : le panier ne correspond pas encore au bon.');return;}
  busy=true;
  try{const cards=voucherScans.flatMap(x=>x.cards);await recordSale(cards,'bon_validation');feedback(true,`BON VALIDÉ · ${cards.length} carton(s) enregistré(s).`,2200);voucherExpected=null;voucherScans=[];voucherKeys=new Set();renderVoucherMode();}
  catch(e){feedback(false,e.message||'ANOMALIE : validation impossible.');}
  finally{setTimeout(()=>busy=false,900);}
}
async function processCode(raw){
  if(busy)return;busy=true;
  try{
    const c=context();if(!c.enabled)throw new Error('ANOMALIE : suivi des ventes désactivé.');
    if(mode==='vente'&&c.voucherEnabled){
      if(!voucherExpected){const parsed=parseVoucher(raw);if(!parsed)throw new Error('ANOMALIE : scannez d’abord un bon de validation valide.');voucherExpected=parsed;voucherScans=[];voucherKeys=new Set();renderVoucherMode();feedback(true,`BON RECONNU · ${voucherSummary(parsed)}`,2200);}
      else await processVoucherSupport(raw);
    }else{
      const cards=await findCards(raw);
      if(mode==='vente'){await recordSale(cards);feedback(true,cards.length>1?`VENTE PLANCHE EFFECTUÉE · ${cards.length} cartons`:`VENTE EFFECTUÉE · ${cards[0].carton_code}`);}
      else{await recordReturn(cards);feedback(true,cards.length>1?`RETOUR PLANCHE EFFECTUÉ · ${cards.length} cartons`:`RETOUR EFFECTUÉ · ${cards[0].carton_code}`);}
    }
  }catch(e){feedback(false,e.message||'ANOMALIE : opération impossible.');}
  finally{setTimeout(()=>busy=false,900);}
}
async function start(){
  if(!navigator.mediaDevices?.getUserMedia){feedback(false,'ANOMALIE : caméra indisponible.');return;}
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});const video=$('saleVideo');video.srcObject=stream;await video.play();$('startSaleCamera').style.display='none';$('scannerStatus').textContent=readyText();const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});timer=setInterval(()=>{if(busy||video.readyState<2||!window.jsQR)return;const side=Math.floor(Math.min(video.videoWidth,video.videoHeight)*.7),sx=Math.floor((video.videoWidth-side)/2),sy=Math.floor((video.videoHeight-side)/2);canvas.width=side;canvas.height=side;ctx.drawImage(video,sx,sy,side,side,0,0,side,side);const img=ctx.getImageData(0,0,side,side),qr=jsQR(img.data,side,side,{inversionAttempts:'attemptBoth'});if(qr?.data){const now=Date.now();if(qr.data===lastCode&&now-lastAt<2200)return;lastCode=qr.data;lastAt=now;processCode(qr.data);}},90);}catch(e){feedback(false,'ANOMALIE : ouverture de la caméra impossible.');}
}
function stop(){if(timer)clearInterval(timer);timer=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;}
$('modeSale').onclick=()=>setMode('vente');$('modeReturn').onclick=()=>setMode('retour');$('startSaleCamera').onclick=start;$('validateVoucher').onclick=validateVoucher;$('cancelVoucher').onclick=()=>resetVoucher(true);
window.addEventListener('pagehide',stop);
Loto.onChange(s=>{$('scannerLotoName').textContent=s.program?.title||s.lotoName||'Loto actif';renderVoucherMode();});
Loto.ensureSession().then(()=>{$('scannerLotoName').textContent=context().title;renderVoucherMode();$('scannerStatus').textContent=readyText();if(!context().enabled)feedback(false,'ANOMALIE : suivi des ventes désactivé.');});
