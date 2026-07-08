(function(){
  const MODE='saisie_cartons';
  function el(id){return document.getElementById(id);}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function sessionCode(){return Loto?.state?.()?.sessionCode || new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || window.LOTO_CONFIG?.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';}
  function emptyGrid(){return Array.from({length:3},()=>Array(9).fill(''));}
  function renderEmptyGrid(){
    const box=el('adminScanPseudoGrid'); if(!box) return;
    const g=emptyGrid();
    box.innerHTML=g.map(r=>'<div class="grid-row">'+r.map(()=>'<input value="" inputmode="numeric" maxlength="2">').join('')+'</div>').join('');
  }
  async function insertQueue(type,payload){
    const client=Loto.supabaseClient; if(!client) throw new Error('Supabase non configuré');
    const row={session_code:sessionCode(),device_id:'pc-admin',mode:MODE,type,payload,status:'new'};
    const {error}=await client.from('scan_queue').insert(row);
    if(error) throw error;
  }
  async function sendPcTest(){
    try{await insertQueue('pc_test',{message:'TEST PC '+new Date().toLocaleTimeString('fr-FR')}); await refreshQueue();}
    catch(e){setStatus('Erreur test PC : '+(e.message||e),false);}
  }
  function setStatus(text,ok=true){const s=el('adminScanLastStatus'); if(s){s.textContent=text; s.className=ok?'ok-note':'bad-note';}}
  function showPhone(connected,last){
    const box=el('scanSaisiePhoneStatus'); if(!box) return;
    if(connected){box.style.display='block'; box.innerHTML='<b>📱 Téléphone connecté</b><br><span>Dernier signal : '+esc(new Date(last.created_at).toLocaleTimeString('fr-FR'))+'</span>';}
    else{box.style.display='block'; box.innerHTML='<b>🔴 Téléphone déconnecté</b><br><span>Scanne le QR code pour connecter le téléphone.</span>';}
  }
  async function refreshQueue(){
    const client=Loto.supabaseClient; const log=el('scanQueueLog'); if(!client){setStatus('Supabase non configuré.',false); return;}
    const since=new Date(Date.now()-30000).toISOString();
    const {data:presence,error:perr}=await client.from('scan_queue').select('*').eq('session_code',sessionCode()).eq('mode',MODE).eq('type','presence').gte('created_at',since).order('created_at',{ascending:false}).limit(1);
    if(perr){setStatus('Erreur lecture présence : '+perr.message,false); return;}
    showPhone(!!(presence&&presence.length),presence?.[0]);
    const {data,error}=await client.from('scan_queue').select('*').eq('session_code',sessionCode()).eq('mode',MODE).order('created_at',{ascending:false}).limit(10);
    if(error){setStatus('Erreur lecture scan_queue : '+error.message,false); return;}
    const lastUseful=(data||[]).find(x=>x.type!=='presence');
    if(lastUseful){
      setStatus('Dernier message reçu : '+lastUseful.type+' à '+new Date(lastUseful.created_at).toLocaleTimeString('fr-FR'),true);
      if(lastUseful.type==='test') el('adminScanExternalCode').value=lastUseful.payload?.message||'';
      if(lastUseful.type==='draft_grid' && Array.isArray(lastUseful.payload?.grid)) renderGrid(lastUseful.payload.grid);
    } else setStatus((presence&&presence.length)?'Téléphone connecté. En attente d’un message TEST.':'En attente de connexion téléphone.',!!(presence&&presence.length));
    if(log){log.innerHTML='<b>Derniers messages scan_queue</b><br>'+(data||[]).map(x=>'<div><b>'+esc(x.type)+'</b> · '+esc(x.device_id||'')+' · '+new Date(x.created_at).toLocaleTimeString('fr-FR')+'<br><small>'+esc(JSON.stringify(x.payload||{})).slice(0,180)+'</small></div>').join('<hr>');}
  }
  function renderGrid(grid){
    const box=el('adminScanPseudoGrid'); if(!box) return;
    box.innerHTML=(grid||emptyGrid()).map(r=>'<div class="grid-row">'+Array.from({length:9},(_,i)=>'<input value="'+esc(r?.[i]??'')+'" inputmode="numeric" maxlength="2">').join('')+'</div>').join('');
  }
  function startRealtime(){
    const client=Loto.supabaseClient; if(!client) return;
    try{
      const ch=client.channel('scan_queue_admin_'+sessionCode()).on('postgres_changes',{event:'INSERT',schema:'public',table:'scan_queue',filter:'session_code=eq.'+sessionCode()},()=>refreshQueue()).subscribe();
      window.__scanQueueAdminChannel=ch;
    }catch(e){console.warn('Realtime scan_queue indisponible',e);}
  }
  function init(){
    if(!el('cartons')) return;
    renderEmptyGrid();
    el('queueRefresh')?.addEventListener('click',refreshQueue);
    el('queueSendTestPc')?.addEventListener('click',sendPcTest);
    document.querySelector('[data-tab="cartons"]')?.addEventListener('click',()=>setTimeout(refreshQueue,100));
    startRealtime();
    refreshQueue();
    setInterval(()=>{if(el('cartons')?.classList.contains('active')) refreshQueue();},2000);
  }
  Loto.ensureSession().then(init).catch(init);
})();
