(function(){
  const MODE='saisie_cartons';
  const STATIC_GITHUB_SCAN_URL='https://sebastiendesouza-tech.github.io/loto/scan.html?mode=saisie-cartons';
  const STATIC_QR_DATA_URI='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcIAAAHCAQAAAABUY/ToAAADuklEQVR4nO2cW4qrShSGv3WqII8KPYAMRWewh3ToIfUMdCgZwAbrsUH590NVGU13c2CTkMtZ66E7Jn5owc+6lpr4Oxv/+UsQnHTSSSeddNJJJx+PtGIRs3YxSGZm7ZL/MJqZ9ame1d/5bp18LDLmf90AkN4QLBjNHEWKiHQQNBOQwgyA3e9unXxkMq3+JR9GGI8S4/HT7N+TZeGYWbzeNZ18TdLMDqKbguhOEbopSO8tWH+zazr5amQzw9gC43Hmi4O6zTWdfAWykTQAdCczDYD1LGZ2lDQ0yq1ISfP1runka5AlvRlzvhMAwmzd9Abdx0HWfcTZulOcgcWuc00nX4vMGtoNPBaD5tMEM4zHTxNpMWj2Y5HnWqeTtyatB6xPZkAQox1kPYtBOsh6QO9mZtau2fUzrtPJW5BIkjQ0MzUpCrkuk6aaAHUqv26J51qnk7cjsyKgmZGmoHPWrAEo4sqftDXXkJPVqibm7HOqVObtOZ0kaQqim9wPOfkDmQ6yPkWgJkVZTQNBwGKMLWy7jc+5TievT5ZY1k1kd1Na1JpLizo7qPVX1oDmfsjJYrW2TwCpJdfxY/s796l3HaElQrLaCHiudTp5a9J6guqYI0g6RTSkyKZF/d6SfZP1d75bJx+L3OTUOWEemlLM5yQaKDn1QK3VPJY5ubOSD60doCIkrUnRWVflO9eQk3urPcaSTmto5lVXpXF0ruhLle8acnJrZz9UK7SQe0FZTUVSc+1YTx7LnLywzdzeuo+W7HhgMZEitp5hAFo3xD7bOp28HbmddeSmYk2KgNofGqAMzTyWOfnVzhGMLJqJGrzqcKNO06Cc4hpy8gey04xZG8TYBkHzmSccdKeDrM/Z9boR7d536+SjkF/n9lP9pcthLOiiP1QOn2udTt6O3MzLavmlzbg1h7YBPB9y8kfb9anXsh62bmnbd3QNOXlpRRJTKEP5ddZRqvxGG12d5/uuISer5e6PQUAkg25CjBbE+CvISHHO2XUx7w85+S2ZY1neMZ0iWTTdKSJpLc5y7v3pdZmTF1bqsmw1oOVMehPazpvTPB9y8nsya2MC6RQxO0rlMel0WH3TDKNFrL/33Tr5UORuL+wUaqdot39o56p85urkf5AaUsR6gsyOZW7PaOUZfEnyfYxO7i1eftFN7ebIIGI0v6Plkiy9zb6f2slvyaZMM8iPBQEaUnlzlXQ65GzJenxe5uT35HjxMH1+cUMZpOVxKyzrS2Wuck0nX4Q0f8e5k0466aSTTjr5Pyf/AGWJJbLs72IeAAAAAElFTkSuQmCC';
  let currentGrid=emptyGrid();
  let currentIdentifier='';
  let currentIdentifierType='manuel';
  let currentQuality=0;
  function el(id){return document.getElementById(id);}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function sessionCode(){return Loto?.state?.()?.sessionCode || new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || window.LOTO_CONFIG?.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';}
  function scanUrl(){ if(location.hostname.includes('github.io')) return STATIC_GITHUB_SCAN_URL; const url=new URL('scan.html', window.location.href); url.searchParams.set('mode','saisie-cartons'); url.searchParams.set('s',sessionCode()); return url.href; }
  function emptyGrid(){return Array.from({length:3},()=>Array(9).fill(''));}
  function normalizeGrid(grid){const g=Array.isArray(grid)?grid:emptyGrid(); return Array.from({length:3},(_,r)=>Array.from({length:9},(_,c)=>{const v=g?.[r]?.[c]; return v===null||v===undefined?'':String(v);}));}
  function readGrid(){const g=emptyGrid(); el('adminScanPseudoGrid')?.querySelectorAll('input').forEach(inp=>{const r=Number(inp.dataset.row), c=Number(inp.dataset.col); const v=String(inp.value||'').replace(/\D/g,''); g[r][c]=v?Number(v):'';}); return g;}
  function gridNumbers(grid){return normalizeGrid(grid).flat().filter(v=>String(v).trim()!=='').map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90);}
  function numbersSignature(grid){return gridNumbers(grid).sort((a,b)=>a-b).map(n=>String(n).padStart(2,'0')).join('-');}
  function gridToLignes(grid){return normalizeGrid(grid).map(row=>row.filter(v=>String(v).trim()!=='').map(Number));}
  function renderGrid(grid){
    currentGrid=normalizeGrid(grid);
    const box=el('adminScanPseudoGrid'); if(!box) return;
    box.style.setProperty('display','grid','important');
    box.style.setProperty('grid-template-columns','repeat(9,48px)','important');
    box.style.setProperty('grid-auto-rows','42px','important');
    box.style.setProperty('gap','6px','important');
    box.style.setProperty('max-width','520px','important');
    box.style.setProperty('width','max-content','important');
    box.innerHTML=currentGrid.map((row,r)=>row.map((v,c)=>`<input value="${esc(v)}" inputmode="numeric" maxlength="2" data-row="${r}" data-col="${c}" style="width:48px!important;height:42px!important;box-sizing:border-box!important;text-align:center!important;">`).join('')).join('');
  }
  function setStatus(text,ok=true){const s=el('adminScanLastStatus'); if(s){s.textContent=text; s.className=ok?'ok-note':'bad-note';}}
  function renderQr(){const url=scanUrl(); const t=el('scanSaisieUrlText'); if(t) t.textContent=url; const box=el('scanSaisieQr'); if(!box) return; box.style.display='flex'; box.style.setProperty('width','190px','important'); box.style.setProperty('height','190px','important'); box.innerHTML='<img class="admin-scan-qr-img" src="'+STATIC_QR_DATA_URI+'" alt="QR code scan saisie cartons" style="width:170px!important;height:170px!important;display:block!important;image-rendering:pixelated!important;">';}
  function showPhone(connected,last){const box=el('scanSaisiePhoneStatus'); if(!box) return; box.style.display='block'; box.innerHTML=connected?'<b>📱 Téléphone connecté</b><br><span>Dernier signal : '+esc(new Date(last.created_at).toLocaleTimeString('fr-FR'))+'</span>':'<b>🔴 Téléphone déconnecté</b><br><span>Scanne le QR code avec le téléphone.</span>';}
  function applyPayload(row){
    if(!row) return false;
    const p=row.payload||{};
    if((row.type==='draft_grid'||row.type==='draft_grid_partial'||row.type==='draft_full') && Array.isArray(p.grid)){renderGrid(p.grid); currentQuality=Number(p.confidence||p.quality||currentQuality||0); return true;}
    if(row.type==='draft_identifier'){currentIdentifier=String(p.external_code||p.identifier||'').trim(); currentIdentifierType=p.external_code_type||'ocr'; const input=el('adminScanExternalCode'); if(input) input.value=currentIdentifier; return true;}
    if(row.type==='draft_identifier_skipped'){setStatus('Identifiant à saisir manuellement avant enregistrement.',true); return true;}
    if(row.type==='test'||row.type==='pc_test'){setStatus('Message test reçu : '+(p.message||''),true); return true;}
    return false;
  }
  async function refreshQueue(){
    renderQr(); const client=Loto.supabaseClient; if(!client){setStatus('Supabase non configuré.',false); return;}
    const since=new Date(Date.now()-30000).toISOString();
    const {data:presence,error:perr}=await client.from('scan_queue').select('*').eq('session_code',sessionCode()).eq('mode',MODE).eq('type','presence').gte('created_at',since).order('created_at',{ascending:false}).limit(1);
    if(perr){setStatus('Erreur présence : '+perr.message,false); return;}
    showPhone(!!(presence&&presence.length),presence?.[0]);
    const {data,error}=await client.from('scan_queue').select('*').eq('session_code',sessionCode()).eq('mode',MODE).order('created_at',{ascending:false}).limit(20);
    if(error){setStatus('Erreur lecture import : '+error.message,false); return;}
    const messages=(data||[]).filter(x=>x.type!=='presence');
    const latestIdentifier=messages.find(x=>x.type==='draft_identifier');
    const lockTime=latestIdentifier?new Date(latestIdentifier.created_at).getTime():null;
    const latestGrid=messages.find(x=>(x.type==='draft_grid'||x.type==='draft_grid_partial'||x.type==='draft_full') && (!lockTime || new Date(x.created_at).getTime()<=lockTime));
    if(latestGrid) applyPayload(latestGrid);
    if(latestIdentifier){applyPayload(latestIdentifier); setStatus('Carton complet : identifiant reçu. Tu peux corriger puis enregistrer.',true);}
    else if(latestGrid){const n=gridNumbers(currentGrid).length; setStatus('Grille reçue : '+n+'/15 numéros. Identifiant à scanner ou saisir.',true);}
    else if(messages[0]) applyPayload(messages[0]);
    else setStatus((presence&&presence.length)?'Téléphone connecté. En attente de scan.':'En attente de connexion téléphone.',!!(presence&&presence.length));
  }
  async function nextImportNumero(){const client=Loto.supabaseClient; const base=990000; try{const {data}=await client.from('loto_cartons').select('numero').gte('numero',base).order('numero',{ascending:false}).limit(1); return data?.[0]?.numero?Number(data[0].numero)+1:base+1;}catch(e){return base+Math.floor(Date.now()%9000);}}
  async function saveImportedCard(){
    const client=Loto.supabaseClient; if(!client){setStatus('Supabase non configuré.',false); return;}
    try{
      const external=String(el('adminScanExternalCode')?.value||currentIdentifier||'').trim().toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9\/-]/g,'');
      const grid=readGrid(); const nums=gridNumbers(grid); if(!external) throw new Error('Identifiant du carton obligatoire.'); if(nums.length!==15) throw new Error('Le carton doit contenir 15 numéros. Actuellement : '+nums.length+'.');
      const signature=numbersSignature(grid);
      const {data:dupExt,error:dupExtErr}=await client.from('loto_cartons').select('numero,external_code').eq('external_code',external).limit(1); if(dupExtErr) throw dupExtErr; if(dupExt&&dupExt.length) throw new Error('Identifiant déjà enregistré : '+external);
      const {data:dupSig,error:dupSigErr}=await client.from('loto_cartons').select('numero,carton_code').eq('numbers_signature',signature).limit(1); if(dupSigErr) throw dupSigErr; if(dupSig&&dupSig.length) throw new Error('Grille déjà enregistrée avec les mêmes 15 numéros.');
      const numero=await nextImportNumero(); const code='IMPORT-'+String(numero);
      const row={numero,carton_code:code,association_id:null,card_order:null,external_code:external,external_code_type:currentIdentifierType||'manuel',external_ocr_quality:currentQuality||null,numbers_signature:signature,serie:'IMPORT',lignes:gridToLignes(grid),grille:grid,qr_payload:external,status:'disponible',ocr_quality:currentQuality||null,origine:'Import scan téléphone',actif:true,updated_at:new Date().toISOString()};
      const {error}=await client.from('loto_cartons').insert(row); if(error) throw error;
      setStatus('Carton enregistré dans la base : '+external,true);
      clearDraft(false);
    }catch(e){setStatus('Erreur enregistrement : '+(e.message||e),false);}
  }
  function clearDraft(message=true){currentGrid=emptyGrid(); currentIdentifier=''; currentQuality=0; currentIdentifierType='manuel'; const input=el('adminScanExternalCode'); if(input) input.value=''; renderGrid(currentGrid); if(message) setStatus('Carton vidé. Prêt pour un nouveau scan.',true);}
  function startRealtime(){const client=Loto.supabaseClient; if(!client) return; try{const ch=client.channel('scan_queue_admin_v347_'+sessionCode()).on('postgres_changes',{event:'INSERT',schema:'public',table:'scan_queue',filter:'session_code=eq.'+sessionCode()},()=>refreshQueue()).subscribe(); window.__scanQueueAdminChannel=ch;}catch(e){console.warn('Realtime scan_queue indisponible',e);}}
  function init(){if(!el('cartons')) return; renderGrid(emptyGrid()); renderQr(); el('queueRefresh')?.addEventListener('click',refreshQueue); el('saveImportedCard')?.addEventListener('click',saveImportedCard); el('clearImportedDraft')?.addEventListener('click',()=>clearDraft(true)); document.querySelector('[data-tab="cartons"]')?.addEventListener('click',()=>setTimeout(refreshQueue,100)); startRealtime(); refreshQueue(); setInterval(()=>{if(el('cartons')?.classList.contains('active')) refreshQueue();},2000);}
  Loto.ensureSession().then(init).catch(init);
})();
