(function(){
  const params=new URLSearchParams(location.search);
  const mode=(params.get('mode')||'').replace('-','_');
  if(mode!=='saisie_cartons') return;
  function el(id){return document.getElementById(id);}
  function sessionCode(){return Loto?.state?.()?.sessionCode || new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || window.LOTO_CONFIG?.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';}
  const deviceId=localStorage.getItem('loto_scan_device_id') || ('phone_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6));
  localStorage.setItem('loto_scan_device_id',deviceId);
  async function insertQueue(type,payload){
    const client=Loto.supabaseClient; if(!client) throw new Error('Supabase non configuré');
    const {error}=await client.from('scan_queue').insert({session_code:sessionCode(),device_id:deviceId,mode:'saisie_cartons',type,payload,status:'new'});
    if(error) throw error;
  }
  async function sendPresence(){try{await insertQueue('presence',{status:'connected',url:location.href,at:new Date().toISOString()}); setStatus('🟢 Connecté au PC.');}catch(e){setStatus('Erreur connexion Supabase : '+(e.message||e),false);}}
  async function sendTest(){try{const msg='HELLO '+new Date().toLocaleTimeString('fr-FR'); await insertQueue('test',{message:msg}); setStatus('✓ Message envoyé : '+msg,true);}catch(e){setStatus('Erreur envoi TEST : '+(e.message||e),false);}}
  function setStatus(text,ok=true){const s=el('scannerStatus'); if(s){s.textContent=text; s.className=(ok?'ok-note':'bad-note')+' scan-minimal-status';}}
  function init(){
    el('scanPageTitle').textContent='Import cartons - test connexion';
    el('scanPageHelp').textContent='Étape 1 : vérifier la communication téléphone → Supabase → PC. Aucun OCR pour cette version.';
    el('scanBackLink').href='administration.html#cartons';
    el('startQrScanner').textContent='Envoyer TEST';
    el('stopQrScanner').style.display='none';
    document.querySelector('.scanner-camera')?.setAttribute('style','display:none');
    const rt=el('scannerReadTime'); if(rt) rt.textContent='non utilisé';
    const oldStart=el('startQrScanner');
    const clone=oldStart.cloneNode(true); oldStart.parentNode.replaceChild(clone,oldStart);
    clone.addEventListener('click',sendTest);
    sendPresence(); setInterval(sendPresence,5000);
  }
  Loto.ensureSession().then(init).catch(init);
})();
