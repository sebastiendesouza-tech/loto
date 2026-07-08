(function(){
  const params=new URLSearchParams(location.search);
  const mode=(params.get('mode')||'').replace('-','_');
  if(mode!=='saisie_cartons') return;
  function sessionCode(){return Loto?.state?.()?.sessionCode || new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || window.LOTO_CONFIG?.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';}
  const deviceId=localStorage.getItem('loto_scan_device_id') || ('phone_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6));
  localStorage.setItem('loto_scan_device_id',deviceId);
  async function insertQueue(type,payload){
    const client=Loto.supabaseClient;
    if(!client) return;
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
  async function sendPresence(){
    try{await insertQueue('presence',{status:'connected',version:'v20_scan_carton',url:location.href,at:new Date().toISOString()});}
    catch(e){console.warn('Presence scan_queue impossible',e);}
  }
  Loto.ensureSession().then(()=>{sendPresence(); setInterval(sendPresence,10000);}).catch(()=>{});
})();
