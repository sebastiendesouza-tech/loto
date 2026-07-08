(function(){
  const MODE='saisie_cartons';
  const STATIC_GITHUB_SCAN_URL='https://sebastiendesouza-tech.github.io/loto/scan.html?mode=saisie-cartons';
  const STATIC_QR_DATA_URI='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcIAAAHCAQAAAABUY/ToAAADuklEQVR4nO2cW4qrShSGv3WqII8KPYAMRWewh3ToIfUMdCgZwAbrsUH590NVGU13c2CTkMtZ66E7Jn5owc+6lpr4Oxv/+UsQnHTSSSeddNJJJx+PtGIRs3YxSGZm7ZL/MJqZ9ame1d/5bp18LDLmf90AkN4QLBjNHEWKiHQQNBOQwgyA3e9unXxkMq3+JR9GGI8S4/HT7N+TZeGYWbzeNZ18TdLMDqKbguhOEbopSO8tWH+zazr5amQzw9gC43Hmi4O6zTWdfAWykTQAdCczDYD1LGZ2lDQ0yq1ISfP1runka5AlvRlzvhMAwmzd9Abdx0HWfcTZulOcgcWuc00nX4vMGtoNPBaD5tMEM4zHTxNpMWj2Y5HnWqeTtyatB6xPZkAQox1kPYtBOsh6QO9mZtau2fUzrtPJW5BIkjQ0MzUpCrkuk6aaAHUqv26J51qnk7cjsyKgmZGmoHPWrAEo4sqftDXXkJPVqibm7HOqVObtOZ0kaQqim9wPOfkDmQ6yPkWgJkVZTQNBwGKMLWy7jc+5TievT5ZY1k1kd1Na1JpLizo7qPVX1oDmfsjJYrW2TwCpJdfxY/s796l3HaElQrLaCHiudTp5a9J6guqYI0g6RTSkyKZF/d6SfZP1d75bJx+L3OTUOWEemlLM5yQaKDn1QK3VPJY5ubOSD60doCIkrUnRWVflO9eQk3urPcaSTmto5lVXpXF0ruhLle8acnJrZz9UK7SQe0FZTUVSc+1YTx7LnLywzdzeuo+W7HhgMZEitp5hAFo3xD7bOp28HbmddeSmYk2KgNofGqAMzTyWOfnVzhGMLJqJGrzqcKNO06Cc4hpy8gey04xZG8TYBkHzmSccdKeDrM/Z9boR7d536+SjkF/n9lP9pcthLOiiP1QOn2udTt6O3MzLavmlzbg1h7YBPB9y8kfb9anXsh62bmnbd3QNOXlpRRJTKEP5ddZRqvxGG12d5/uuISer5e6PQUAkg25CjBbE+CvISHHO2XUx7w85+S2ZY1neMZ0iWTTdKSJpLc5y7v3pdZmTF1bqsmw1oOVMehPazpvTPB9y8nsya2MC6RQxO0rlMel0WH3TDKNFrL/33Tr5UORuL+wUaqdot39o56p85urkf5AaUsR6gsyOZW7PaOUZfEnyfYxO7i1eftFN7ebIIGI0v6Plkiy9zb6f2slvyaZMM8iPBQEaUnlzlXQ65GzJenxe5uT35HjxMH1+cUMZpOVxKyzrS2Wuck0nX4Q0f8e5k0466aSTTjr5Pyf/AGWJJbLs72IeAAAAAElFTkSuQmCC';
  let renderedQrUrl='';
  function el(id){return document.getElementById(id);}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function sessionCode(){return Loto?.state?.()?.sessionCode || new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || window.LOTO_CONFIG?.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';}
  function scanUrl(){
    if(location.hostname.includes('github.io')) return STATIC_GITHUB_SCAN_URL;
    const url=new URL('scan.html', window.location.href);
    url.searchParams.set('mode','saisie-cartons');
    url.searchParams.set('s', sessionCode());
    return url.href;
  }
  function emptyGrid(){return Array.from({length:3},()=>Array(9).fill(''));}
  function flatInputs(grid){
    const g=Array.isArray(grid)&&grid.length?grid:emptyGrid();
    return Array.from({length:3},(_,r)=>Array.from({length:9},(_,c)=>'<input value="'+esc(g?.[r]?.[c]??'')+'" inputmode="numeric" maxlength="2" style="width:48px!important;height:42px!important;box-sizing:border-box!important;text-align:center!important;" data-row="'+r+'" data-col="'+c+'">').join('')).join('');
  }
  function renderGrid(grid){
    const box=el('adminScanPseudoGrid'); if(!box) return;
    box.style.setProperty('display','grid','important');
    box.style.setProperty('grid-template-columns','repeat(9,48px)','important');
    box.style.setProperty('grid-auto-rows','42px','important');
    box.style.setProperty('gap','6px','important');
    box.style.setProperty('max-width','520px','important');
    box.style.setProperty('width','max-content','important');
    box.innerHTML=flatInputs(grid);
  }
  function setStatus(text,ok=true){const s=el('adminScanLastStatus'); if(s){s.textContent=text; s.className=ok?'ok-note':'bad-note';}}
  function renderQr(){
    const url=scanUrl();
    const urlText=el('scanSaisieUrlText'); if(urlText) urlText.textContent=url;
    const qrBox=el('scanSaisieQr'); if(!qrBox) return;
    qrBox.style.display='flex';
    qrBox.style.setProperty('width','190px','important');
    qrBox.style.setProperty('height','190px','important');
    // QR prioritaire : image embarquée, donc aucun chemin GitHub/cache/CDN ne peut casser l'affichage.
    if(!qrBox.querySelector('img.admin-scan-qr-img')){
      qrBox.innerHTML='<img class="admin-scan-qr-img" src="'+STATIC_QR_DATA_URI+'" alt="QR code scan saisie cartons">';
    }
    const img=qrBox.querySelector('img.admin-scan-qr-img');
    if(img){
      img.src=STATIC_QR_DATA_URI;
      img.style.setProperty('width','170px','important');
      img.style.setProperty('height','170px','important');
      img.style.setProperty('display','block','important');
      img.style.setProperty('image-rendering','pixelated','important');
    }
    qrBox.dataset.qrReady='1';
    qrBox.dataset.currentUrl=url;
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
    const messages=(data||[]).filter(x=>x.type!=='presence');
    const latestGrid=messages.find(x=>x.type==='draft_grid' || x.type==='draft_full');
    const latestIdentifier=messages.find(x=>x.type==='draft_identifier');
    const latestTest=messages.find(x=>x.type==='test' || x.type==='pc_test');
    if(latestGrid) applyPayload(latestGrid);
    if(latestIdentifier) applyPayload(latestIdentifier);
    const lastUseful=messages[0];
    if(lastUseful){
      if(!latestGrid && !latestIdentifier) applyPayload(lastUseful);
      setStatus('Dernier message reçu : '+lastUseful.type+' à '+new Date(lastUseful.created_at).toLocaleTimeString('fr-FR'),true);
    } else {
      setStatus((presence&&presence.length)?'Téléphone connecté. En attente d’un message TEST ou OCR.':'En attente de connexion téléphone.',!!(presence&&presence.length));
    }
    if(log){log.innerHTML='<b>Derniers messages scan_queue</b><br>'+(data||[]).map(x=>'<div><b>'+esc(x.type)+'</b> · '+esc(x.device_id||'')+' · '+new Date(x.created_at).toLocaleTimeString('fr-FR')+'<br><small>'+esc(JSON.stringify(x.payload||{})).slice(0,220)+'</small></div>').join('<hr>');}
  }
  function startRealtime(){
    const client=Loto.supabaseClient; if(!client) return;
    try{
      const ch=client.channel('scan_queue_admin_v342_'+sessionCode()).on('postgres_changes',{event:'INSERT',schema:'public',table:'scan_queue',filter:'session_code=eq.'+sessionCode()},()=>refreshQueue()).subscribe();
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
