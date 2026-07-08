(function(){
  const params=new URLSearchParams(location.search);
  const mode=(params.get('mode')||'').replace('-','_');
  if(mode!=='saisie_cartons') return;
  function el(id){return document.getElementById(id);}
  function sessionCode(){return Loto?.state?.()?.sessionCode || new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || window.LOTO_CONFIG?.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';}
  const deviceId=localStorage.getItem('loto_scan_device_id') || ('phone_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6));
  localStorage.setItem('loto_scan_device_id',deviceId);

  const TEST_GRID=[
    [4,'',17,31,'',53,69,'',85],
    [7,'',23,'',42,58,'',74,''],
    ['',12,28,'',46,'',63,79,90]
  ];

  async function insertQueue(type,payload){
    const client=Loto.supabaseClient;
    if(!client) throw new Error('Supabase non configuré');
    const {error}=await client.from('scan_queue').insert({
      session_code:sessionCode(),
      device_id:deviceId,
      mode:'saisie_cartons',
      type,
      payload,
      status:'new'
    });
    if(error) throw error;
  }

  function setStatus(text,ok=true){
    const s=el('scannerStatus');
    if(s){s.textContent=text; s.className=(ok?'ok-note':'bad-note')+' scan-minimal-status';}
  }

  async function sendPresence(){
    try{
      await insertQueue('presence',{status:'connected',url:location.href,at:new Date().toISOString()});
      setStatus('🟢 Connecté au PC.');
    }catch(e){
      setStatus('Erreur connexion Supabase : '+(e.message||e),false);
    }
  }

  async function sendTest(){
    try{
      const msg='HELLO '+new Date().toLocaleTimeString('fr-FR');
      await insertQueue('test',{message:msg});
      setStatus('✓ Message envoyé : '+msg,true);
    }catch(e){
      setStatus('Erreur envoi TEST : '+(e.message||e),false);
    }
  }

  async function sendTestGrid(){
    try{
      await insertQueue('draft_grid',{
        source:'test_grid_v343',
        confidence:100,
        grid:TEST_GRID,
        at:new Date().toISOString()
      });
      setStatus('✓ Grille de test envoyée au PC.',true);
    }catch(e){
      setStatus('Erreur envoi grille : '+(e.message||e),false);
    }
  }

  function addButton(label, className, handler){
    const btn=document.createElement('button');
    btn.textContent=label;
    btn.className=className || 'secondary';
    btn.type='button';
    btn.addEventListener('click',handler);
    return btn;
  }

  function init(){
    el('scanPageTitle').textContent='Import cartons - OCR réel';
    el('scanPageHelp').textContent='Démarre la caméra. Étape 1 : lire les 15 numéros. Étape 2 : lire le QR, le code-barres ou le numéro du carton.';
    el('scanBackLink').href='administration.html#cartons';

    const bar=document.querySelector('.scan-startbar');
    if(bar && !document.getElementById('sendScanQueueTest')){
      bar.appendChild(addButton('Envoyer TEST','secondary',sendTest)).id='sendScanQueueTest';
      bar.appendChild(addButton('Envoyer GRILLE TEST','secondary',sendTestGrid)).id='sendScanQueueGridTest';
    }

    const skip=el('skipIdentifierBtn'); if(skip) skip.style.display='none';
    sendPresence();
    setInterval(sendPresence,5000);
  }

  Loto.ensureSession().then(init).catch(init);
})();
