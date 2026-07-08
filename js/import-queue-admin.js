(function(){
  const MODE='saisie_cartons';
  let renderedQrUrl='';
  function el(id){return document.getElementById(id);}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function sessionCode(){return Loto?.state?.()?.sessionCode || new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || window.LOTO_CONFIG?.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';}
  function scanUrl(){
    const url=new URL('scan.html', window.location.href);
    url.searchParams.set('mode','saisie-cartons');
    url.searchParams.set('s', sessionCode());
    return url.href;
  }
  function emptyGrid(){return Array.from({length:3},()=>Array(9).fill(''));}
  function flatInputs(grid){
    const g=Array.isArray(grid)&&grid.length?grid:emptyGrid();
    return Array.from({length:3},(_,r)=>Array.from({length:9},(_,c)=>'<input value="'+esc(g?.[r]?.[c]??'')+'" inputmode="numeric" maxlength="2">').join('')).join('');
  }
  function renderGrid(grid){
    const box=el('adminScanPseudoGrid'); if(!box) return;
    box.innerHTML=flatInputs(grid);
  }
  function setStatus(text,ok=true){const s=el('adminScanLastStatus'); if(s){s.textContent=text; s.className=ok?'ok-note':'bad-note';}}
  function renderQr(){
    const url=scanUrl();
    const urlText=el('scanSaisieUrlText'); if(urlText) urlText.textContent=url;
    const qrBox=el('scanSaisieQr'); if(!qrBox) return;
    qrBox.style.display='flex';
    if(renderedQrUrl===url && qrBox.dataset.qrReady==='1') return;
    renderedQrUrl=url;
    qrBox.dataset.qrReady='0';
    qrBox.dataset.currentUrl=url;
    qrBox.innerHTML='';
    try{
      if(window.QRCode){
        new QRCode(qrBox,{text:url,width:170,height:170,correctLevel:QRCode.CorrectLevel.M});
        qrBox.dataset.qrReady='1';
        return;
      }
    }catch(e){console.warn('Generation QR JS impossible',e);}
    if(location.hostname.includes('github.io')){
      qrBox.innerHTML='<img class="admin-scan-qr-img" src="assets/qr-saisie-cartons-github.png?v=341" alt="QR code scan saisie cartons">';
      qrBox.dataset.qrReady='1';
    }else{
      qrBox.innerHTML='<a class="btn secondary" href="'+esc(url)+'" target="_blank" rel="noopener">Ouvrir le scanner</a>';
      qrBox.dataset.qrReady='1';
    }
  }
  function showPhone(connected,last){
    const box=el('scanSaisiePhoneStatus'); if(!box) return;
    box.style.display='block';
    if(connected){
      box.innerHTML='<b>📱 Téléphone connecté</b><br><span>Dernier signal : '+esc(new Date(last.created_at).toLocaleTimeString('fr-FR'))+'</span>';
    }else{
      box.innerHTML='<b>🔴 Téléphone déconnecté</b><br><span>Scanne le QR code avec le téléphone.</span>';
    }
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
  function applyPayload(row){
    if(!row) return false;
    const p=row.payload||{};
    if(row.type==='test' || row.type==='pc_test'){
      const input=el('adminScanExternalCode'); if(input) input.value=p.message||'';
      return true;
    }
    if(row.type==='draft_grid' && Array.isArray(p.grid)){
      renderGrid(p.grid);
      return true;
    }
    if(row.type==='draft_identifier'){
      const input=el('adminScanExternalCode'); if(input) input.value=p.external_code||p.identifier||'';
      return true;
    }
    if(row.type==='draft_full'){
      if(Array.isArray(p.grid)) renderGrid(p.grid);
      const input=el('adminScanExternalCode'); if(input) input.value=p.external_code||p.identifier||'';
      return true;
    }
    return false;
  }
  async function refreshQueue(){
    renderQr();
    const client=Loto.supabaseClient; const log=el('scanQueueLog'); if(!client){setStatus('Supabase non configuré.',false); return;}
    const since=new Date(Date.now()-30000).toISOString();
    const {data:presence,error:perr}=await client.from('scan_queue').select('*').eq('session_code',sessionCode()).eq('mode',MODE).eq('type','presence').gte('created_at',since).order('created_at',{ascending:false}).limit(1);
    if(perr){setStatus('Erreur lecture présence : '+perr.message,false); return;}
    showPhone(!!(presence&&presence.length),presence?.[0]);
    const {data,error}=await client.from('scan_queue').select('*').eq('session_code',sessionCode()).eq('mode',MODE).order('created_at',{ascending:false}).limit(12);
    if(error){setStatus('Erreur lecture scan_queue : '+error.message,false); return;}
    const lastUseful=(data||[]).find(x=>x.type!=='presence');
    if(lastUseful){
      applyPayload(lastUseful);
      setStatus('Dernier message reçu : '+lastUseful.type+' à '+new Date(lastUseful.created_at).toLocaleTimeString('fr-FR'),true);
    } else {
      setStatus((presence&&presence.length)?'Téléphone connecté. En attente d’un message TEST.':'En attente de connexion téléphone.',!!(presence&&presence.length));
    }
    if(log){log.innerHTML='<b>Derniers messages scan_queue</b><br>'+(data||[]).map(x=>'<div><b>'+esc(x.type)+'</b> · '+esc(x.device_id||'')+' · '+new Date(x.created_at).toLocaleTimeString('fr-FR')+'<br><small>'+esc(JSON.stringify(x.payload||{})).slice(0,220)+'</small></div>').join('<hr>');}
  }
  function startRealtime(){
    const client=Loto.supabaseClient; if(!client) return;
    try{
      const ch=client.channel('scan_queue_admin_v341_'+sessionCode()).on('postgres_changes',{event:'INSERT',schema:'public',table:'scan_queue',filter:'session_code=eq.'+sessionCode()},()=>refreshQueue()).subscribe();
      window.__scanQueueAdminChannel=ch;
    }catch(e){console.warn('Realtime scan_queue indisponible',e);}
  }
  function init(){
    if(!el('cartons')) return;
    renderGrid(emptyGrid());
    renderQr();
    el('queueRefresh')?.addEventListener('click',refreshQueue);
    el('queueSendTestPc')?.addEventListener('click',sendPcTest);
    document.querySelector('[data-tab="cartons"]')?.addEventListener('click',()=>setTimeout(refreshQueue,100));
    startRealtime();
    refreshQueue();
    setInterval(()=>{if(el('cartons')?.classList.contains('active')) refreshQueue();},2000);
  }
  Loto.ensureSession().then(init).catch(init);
})();
