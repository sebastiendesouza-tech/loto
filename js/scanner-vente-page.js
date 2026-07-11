const $=id=>document.getElementById(id);let mode='vente',stream=null,timer=null,busy=false,lastCode='',lastAt=0;
function context(){const s=Loto.state();return{id:s.program?.id||s.sessionCode||Loto.code(),title:s.program?.title||s.lotoName||'Loto actif',enabled:!!s.program?.sales_tracking_enabled};}
function setMode(next){mode=next;$('modeSale').classList.toggle('active',mode==='vente');$('modeReturn').classList.toggle('active',mode==='retour');$('scannerStatus').textContent=mode==='vente'?'Mode vente actif.':'Mode retour actif.';clearResult();}
function clearResult(){$('saleScannerScreen').classList.remove('result-ok','result-error');}
function feedback(ok,text){const screen=$('saleScannerScreen');screen.classList.remove('result-ok','result-error');void screen.offsetWidth;screen.classList.add(ok?'result-ok':'result-error');$('scannerStatus').textContent=text;try{navigator.vibrate?.(ok?80:[120,80,120]);const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=ok?920:210;g.gain.value=.12;o.connect(g);g.connect(ctx.destination);o.start();setTimeout(()=>{o.stop();ctx.close();},ok?100:280);}catch(e){}setTimeout(()=>{clearResult();$('scannerStatus').textContent=mode==='vente'?'Prêt pour une vente.':'Prêt pour un retour.';},1500);}
function isGeneratedByApp(card){
  const origin=String(card?.origine||'').trim().toLowerCase();
  const importedOrigins=['saisie manuelle','saisie planche 6 cartons','scan saisie cartons','scan ocr saisie cartons','import'];
  if(importedOrigins.some(label=>origin.includes(label))) return false;
  if(origin==='loto by sds') return true;
  // Compatibilite avec les cartons generes par d'anciennes versions,
  // pour lesquels le champ origine peut etre vide ou avoir une ancienne valeur.
  return /^SDS-\d{1,2}-\d{4,5}$/i.test(String(card?.carton_code||'')) && !card?.external_code;
}
async function findCards(raw){
  const client=Loto.supabaseClient,value=String(raw||'').trim().toUpperCase();
  if(!client)throw new Error('Connexion à la base indisponible.');
  let req;
  if(/^SDSP-\d{2}-\d{4,5}$/i.test(value)){
    req=client.from('loto_cartons').select('numero,carton_code,sheet_code,origine,external_code,actif').eq('sheet_code',value).eq('actif',true).order('sheet_position');
  }else{
    if(!/^SDS-\d{1,2}-\d{4,5}$/i.test(value))throw new Error('ANOMALIE : QR code non reconnu.');
    // Recherche par le code imprime dans le QR. Cela reste compatible avec
    // les anciennes numerotations internes de la base.
    req=client.from('loto_cartons').select('numero,carton_code,sheet_code,origine,external_code,actif').eq('carton_code',value).eq('actif',true);
  }
  const {data,error}=await req;
  if(error)throw error;
  if(!data?.length)throw new Error('ANOMALIE : carton introuvable dans la base.');
  if(data.some(card=>!isGeneratedByApp(card)))throw new Error('ANOMALIE : carton importé, suivi des ventes indisponible.');
  return data;
}
async function processCode(raw){if(busy)return;busy=true;try{const c=context();if(!c.enabled)throw new Error('ANOMALIE : suivi des ventes désactivé.');const cards=await findCards(raw),client=Loto.supabaseClient,now=new Date().toISOString(),nums=cards.map(x=>x.numero);const {data:sales,error:readError}=await client.from('loto_carton_sales').select('numero,status').eq('loto_id',c.id).in('numero',nums);if(readError)throw readError;const sold=new Set((sales||[]).filter(x=>x.status==='vendu').map(x=>x.numero));if(mode==='vente'){if(nums.some(n=>sold.has(n)))throw new Error('ANOMALIE : carton ou planche déjà vendu.');const rows=cards.map(card=>({loto_id:c.id,loto_title:c.title,numero:card.numero,carton_code:card.carton_code,status:'vendu',sold_at:now,updated_at:now}));const {error}=await client.from('loto_carton_sales').upsert(rows,{onConflict:'loto_id,numero'});if(error)throw error;await client.from('loto_cartons').update({status:'vendu',sale_loto_id:c.id,sold_at:now,updated_at:now}).in('numero',nums);await client.from('loto_carton_movements').insert(cards.map(card=>({loto_id:c.id,loto_title:c.title,numero:card.numero,carton_code:card.carton_code,action:'vente',source:'scanner',created_at:now})));feedback(true,(cards.length>1?'VENTE PLANCHE EFFECTUÉE · '+cards.length+' cartons':'VENTE EFFECTUÉE · '+cards[0].carton_code));}else{if(nums.some(n=>!sold.has(n)))throw new Error('ANOMALIE : carton ou planche déjà disponible.');const {error}=await client.from('loto_carton_sales').update({status:'disponible',updated_at:now}).eq('loto_id',c.id).in('numero',nums);if(error)throw error;await client.from('loto_cartons').update({status:'disponible',sale_loto_id:null,sold_at:null,sold_by:null,updated_at:now}).in('numero',nums);await client.from('loto_carton_movements').insert(cards.map(card=>({loto_id:c.id,loto_title:c.title,numero:card.numero,carton_code:card.carton_code,action:'retour',source:'scanner',created_at:now})));feedback(true,(cards.length>1?'RETOUR PLANCHE EFFECTUÉ · '+cards.length+' cartons':'RETOUR EFFECTUÉ · '+cards[0].carton_code));}}catch(e){feedback(false,e.message||'ANOMALIE : opération impossible.');}finally{setTimeout(()=>{busy=false;},900);}}
async function start(){if(!navigator.mediaDevices?.getUserMedia){feedback(false,'ANOMALIE : caméra indisponible.');return;}try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});const video=$('saleVideo');video.srcObject=stream;await video.play();$('startSaleCamera').style.display='none';$('scannerStatus').textContent=mode==='vente'?'Prêt pour une vente.':'Prêt pour un retour.';const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});timer=setInterval(()=>{if(busy||video.readyState<2||!window.jsQR)return;const side=Math.floor(Math.min(video.videoWidth,video.videoHeight)*.7),sx=Math.floor((video.videoWidth-side)/2),sy=Math.floor((video.videoHeight-side)/2);canvas.width=side;canvas.height=side;ctx.drawImage(video,sx,sy,side,side,0,0,side,side);const img=ctx.getImageData(0,0,side,side),qr=jsQR(img.data,side,side,{inversionAttempts:'attemptBoth'});if(qr?.data){const now=Date.now();if(qr.data===lastCode&&now-lastAt<2200)return;lastCode=qr.data;lastAt=now;processCode(qr.data);}},90);}catch(e){feedback(false,'ANOMALIE : ouverture de la caméra impossible.');}}
function stop(){if(timer)clearInterval(timer);timer=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;}
$('modeSale').onclick=()=>setMode('vente');$('modeReturn').onclick=()=>setMode('retour');$('startSaleCamera').onclick=start;window.addEventListener('pagehide',stop);Loto.onChange(s=>{$('scannerLotoName').textContent=s.program?.title||s.lotoName||'Loto actif';});Loto.ensureSession().then(()=>{$('scannerLotoName').textContent=context().title;if(!context().enabled)feedback(false,'ANOMALIE : suivi des ventes désactivé.');});
