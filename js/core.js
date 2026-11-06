(function(){
  const C = window.LOTO_CONFIG || {};
  const remoteConfigured = !!C.SUPABASE_URL;
  const supabaseClient = window.supabase && C.SUPABASE_URL ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const defaultState = () => ({
    appVersion: C.APP_VERSION || 'v5',
    sessionCode: C.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE',
    lotoName: C.APP_NAME || 'Loto by SdS',
    drawnNumbers: [],
    pendingNumber: null,
    history: [],
    publicCard: null,
    cardClosedAt: 0,
    checkedCards: [],
    currentPartieIndex: 0,
    currentPrizeIndex: 0,
    options: { showLots: false, bingoEnabled: false, showBingo: false, miniBingoSource: 'first', prevalidateSeconds: 6, lastNumberRequired: true },
    bingoNumbers: [],
    miniBingoTakenParties: [],
    miniBingoReady: false,
    miniBingoActive: false,
    miniBingoWon: false,
    gameActive: false,
    gameEnded: false,
    program: { id: '', title: '', date: '', parties: [], sales_tracking_enabled: false },
    savedPrograms: [],
    _syncRoundId:'',
    updatedAt: new Date().toISOString()
  });
  let state = defaultState();
  let listeners = [];
  let channel = null;
  const code = () => {let cached='';try{cached=localStorage.getItem('loto_session_code')||'';}catch(error){}return new URLSearchParams(location.search).get('s')||cached||C.DEFAULT_SESSION_CODE||'SESSION_ACTIVE';};
  const title = () => `${state.lotoName || C.APP_NAME || 'Loto by SdS'} ${C.APP_VERSION || ''}`.trim();
  const safeJson = (x, fallback) => { try { return JSON.parse(x); } catch { return fallback; } };
  function notify(){ listeners.forEach(fn => fn(state)); }
  function onChange(fn){ listeners.push(fn); fn(state); return () => listeners = listeners.filter(x => x !== fn); }
  function normalizeProgram(program){
    const p = Object.assign({}, program || {});
    const sales = p.sales_tracking_enabled ?? p.suivi_ventes ?? p.track_sales ?? false;
    const voucher = p.validation_voucher_enabled ?? p.bon_validation ?? p.use_validation_ticket ?? false;
    p.sales_tracking_enabled = !!sales;
    p.validation_voucher_enabled = !!voucher;
    return p;
  }
  function programSettings(program=state.program){
    const p=normalizeProgram(program);
    return { salesTrackingEnabled:!!p.sales_tracking_enabled, validationVoucherEnabled:!!p.validation_voucher_enabled };
  }
  function mergeState(next){ state = Object.assign(defaultState(), next || {}); state.program = normalizeProgram(state.program); state.savedPrograms=(state.savedPrograms||[]).map(normalizeProgram); state.sessionCode = code(); notify(); }
  // Persist individual changes, rather than overwriting a newer remote game.
  let serverState=null, serverStamp='', sessionStarted=false, syncFlight=null;
  let syncReady=false, syncError='', syncConflict='', storageError=false;
  let serverReachable=false,connectionInterrupted=false,reconnectAvailable=false,reconnectId=0;
  function connectionLost(message){serverReachable=false;connectionInterrupted=true;reconnectAvailable=false;syncError=message;}
  function connectionConfirmed(){
    serverReachable=true;syncError='';
    if(connectionInterrupted){reconnectAvailable=true;reconnectId++;connectionInterrupted=false;}
  }
  let retryTimer=null, pollTimer=null, lastReadAt=0, sequence=0;
  const memoryPending=new Map(),syncListeners=[];
  const writerId=(window.crypto?.randomUUID?.()||('pc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const cacheKey=()=> 'loto_cache_v2:'+encodeURIComponent(code());
  const pendingPrefix=()=> 'loto_pending_v2:'+encodeURIComponent(code())+':';
  function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(error){storageError=true;return false;}}
  function read(key){try{return safeJson(localStorage.getItem(key),null);}catch(error){return null;}}
  function pendingChanges(){
    const found=new Map(memoryPending);
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(key?.startsWith(pendingPrefix())){const op=read(key);if(op?.id&&op.session===code())found.set(op.id,op);}
      }
    }catch(error){storageError=true;}
    return [...found.values()].sort((a,b)=>a.time-b.time||a.sequence-b.sequence||a.id.localeCompare(b.id));
  }
  function forget(op){memoryPending.delete(op.id);try{localStorage.removeItem(pendingPrefix()+op.id);}catch(error){storageError=true;}}
  function syncStatus(){
    const pending=pendingChanges().length;
    const offline=typeof navigator!=='undefined'&&navigator.onLine===false;
    return {connected:serverReachable&&!offline,reconnectAvailable,reconnectId,state:syncConflict||storageError?'attention':offline||syncError?'offline':syncFlight?'syncing':pending?'pending':syncReady?'online':'waiting',pending,message:syncConflict||(storageError?'Sauvegarde locale indisponible. Gardez cette page ouverte.':syncError)};
  }
  function notifySync(){
    const status=syncStatus();syncListeners.forEach(fn=>fn(status));
    if(typeof document==='undefined'||!document.querySelectorAll)return;
    const labels={attention:'À vérifier',offline:'Hors connexion',syncing:'Actualisation…',pending:'En attente',online:'À jour',waiting:'Connexion…'};
    document.querySelectorAll('[data-sync-status]').forEach(el=>{
      el.dataset.state=status.state;
      if(el.hasAttribute?.('data-sync-light')||document.body?.classList.contains('public-projection')){
        el.classList?.add('connection-light');
        const connected=status.connected;
        el.dataset.connected=String(connected);
        const label=(connected?'Connecté':'Connexion interrompue')+(status.pending?` · ${status.pending} changement(s) en attente`:'');
        el.textContent='';el.setAttribute('role','img');el.setAttribute('aria-label',label);el.title=label+(status.message?' — '+status.message:'');
      }else{
        el.textContent=labels[status.state]+(status.pending?` · ${status.pending} en attente`:'');el.title=status.message||'';
      }
    });
    document.querySelectorAll('[data-connection-info]').forEach(button=>{
      const label=status.connected?'Connecté':'Non connecté. Vérifiez votre connexion Internet.';
      button.title=label;button.setAttribute('aria-label',label);
      const tooltip=button.querySelector('[data-connection-tooltip]');
      if(tooltip)tooltip.textContent=label;
    });
    document.querySelectorAll('[data-sync-refresh]').forEach(button=>{
      const reconnectOnly=!!button.hasAttribute?.('data-sync-reconnect-only')||!!document.body?.classList.contains('public-projection');
      button.disabled=!!syncFlight||(reconnectOnly&&(!status.connected||!status.reconnectAvailable));
      button.title=reconnectOnly?(status.connected?(status.reconnectAvailable?'Connexion revenue : vous pouvez actualiser':'La mise à jour du tirage est automatique'):'Actualisation disponible au retour de la connexion'):(status.message||'Relire le tirage et transmettre les changements en attente');
    });
  }
  function onSyncChange(fn){syncListeners.push(fn);fn(syncStatus());return ()=>{const i=syncListeners.indexOf(fn);if(i>=0)syncListeners.splice(i,1);};}
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function difference(before,after){
    if(same(before,after))return null;
    if(after&&typeof after==='object'&&!Array.isArray(after)&&before&&typeof before==='object'&&!Array.isArray(before)){
      const children={};for(const key of Object.keys(after)){const d=difference(before[key],after[key]);if(d)children[key]=d;}
      return {children};
    }
    return {value:after};
  }
  function applyDifference(before,diff){
    if(Object.prototype.hasOwnProperty.call(diff,'value'))return clone(diff.value);
    const next={...(before||{})};for(const [key,d] of Object.entries(diff.children))next[key]=applyDifference(next[key],d);return next;
  }
  const phase=s=>[s._syncRoundId||'',s.program?.id||'',Number(s.currentPartieIndex||0),!!s.miniBingoActive].join('|');
  const guarded=new Set(['draw','pending','validate','cancel_pending','undo','cancel_number','replace_number','winner','next_prize','check','show_card','hide_card','stop_game','mini_bingo_start']);
  const numberOps=new Set(['draw','pending','validate','cancel_pending','undo','cancel_number','replace_number']);
  const logKey=entry=>JSON.stringify(entry);
  function makeOperation(patch){
    const log=patch.history?.[0],type=log?.type||'update';
    const changes={};
    for(const [key,value] of Object.entries(patch)){
      if(key==='history'||(numberOps.has(type)&&['drawnNumbers','pendingNumber'].includes(key)))continue;
      if(key==='savedPrograms'){
        const before=state.savedPrograms||[],after=value||[];
        changes[key]={programs:after.filter(p=>!same(p,before.find(old=>old.id===p.id))),removed:before.filter(p=>!after.some(next=>next.id===p.id)).map(p=>p.id)};
      }else{const d=difference(state[key],value);if(d)changes[key]=d;}
    }
    const previousLogs=new Set((state.history||[]).map(logKey));
    // Preserve creation order across a page restart, even within the same millisecond.
    const time=pendingChanges().reduce((latest,op)=>Math.max(latest,Number(op.time||0)+1),Date.now());
    return {id:writerId+'_'+(++sequence),sequence,time,session:code(),phase:phase(state),prize:Number(state.currentPrizeIndex||0),type,data:log?.data||{},pending:state.pendingNumber||null,changes,logs:(patch.history||[]).filter(entry=>!previousLogs.has(logKey(entry)))};
  }
  function applyOperation(base,op){
    const next=clone(base);
    if((next._syncAppliedOps||[]).includes(op.id))return {state:next,applied:true};
    if(guarded.has(op.type)&&(op.phase!==phase(next)||(['winner','next_prize'].includes(op.type)&&op.prize!==Number(next.currentPrizeIndex||0))))return {state:next,conflict:true};
    if(op.changes.program&&op.phase.split('|')[1]&&(op.phase.split('|')[1]!==String(next.program?.id||'')))return {state:next,conflict:true};
    for(const [key,diff] of Object.entries(op.changes)){
      if(key==='savedPrograms'){
        const ids=new Set(diff.programs.map(p=>p.id));
        next[key]=[...diff.programs,...(next[key]||[]).filter(p=>!ids.has(p.id)&&!diff.removed.includes(p.id))].slice(0,80);
      }else next[key]=applyDifference(next[key],diff);
    }
    if(numberOps.has(op.type)){
      let drawn=(next.drawnNumbers||[]).map(Number),pending=Number(next.pendingNumber)||null;
      const n=Number(op.data.n),type=op.type;
      if(type==='draw'){
        if(!drawn.includes(n)){if(pending&&!drawn.includes(pending))drawn.push(pending);drawn.push(n);pending=null;}
      }else if(type==='pending'){
        if(!drawn.includes(n)){if(pending&&pending!==n&&!drawn.includes(pending))drawn.push(pending);pending=n;}
      }else if(type==='validate'){
        if(pending===n){if(!drawn.includes(n))drawn.push(n);pending=null;}
      }else if(type==='cancel_pending'){if(pending===Number(op.pending))pending=null;}
      else if(type==='undo'||type==='cancel_number'){
        drawn=drawn.filter(value=>value!==n);if(pending===n||(type==='undo'&&pending===Number(op.pending)))pending=null;
      }else if(type==='replace_number'){
        const old=Number(op.data.oldNumber),replacement=Number(op.data.newNumber),index=drawn.indexOf(old),already=drawn.includes(replacement);
        if(index>=0)drawn=drawn.flatMap((value,i)=>value===replacement?[]:i===index?[replacement]:value===old?[]:[value]);
        else if(!already)drawn.push(replacement);
        if(pending===old)pending=already?null:replacement;else if(pending===replacement)pending=null;
      }
      next.drawnNumbers=drawn;next.pendingNumber=pending;
    }
    if(op.logs.length){const keys=new Set(op.logs.map(logKey));next.history=[...op.logs,...(next.history||[]).filter(entry=>!keys.has(logKey(entry)))].slice(0,300);}
    next.updatedAt=new Date(op.time).toISOString();next.appVersion=C.APP_VERSION;
    next._syncAppliedOps=[...(next._syncAppliedOps||[]),op.id].slice(-2048);
    return {state:next};
  }
  function persistCache(){store(cacheKey(),{state,remote:serverState,stamp:serverStamp});}
  function showRemote(row){
    if(!row?.state)return;
    if(row.updated_at&&serverStamp&&Date.parse(row.updated_at)<Date.parse(serverStamp))return;
    serverState=clone(row.state);serverStamp=row.updated_at||serverStamp;
    let view=clone(serverState);
    for(const op of pendingChanges())view=applyOperation(view,op).state;
    mergeState(view);persistCache();
  }
  function hydrateCache(){
    const cached=read(cacheKey());
    if(!cached?.state){
      const legacy=read('loto_state');
      if(legacy&&(!legacy.sessionCode||legacy.sessionCode===code()))mergeState(legacy);
    }
    if(cached?.state){serverState=cached.remote||cached.state;serverStamp=cached.stamp||'';let view=clone(serverState);for(const op of pendingChanges())view=applyOperation(view,op).state;mergeState(view);}
  }
  function retry(){
    if(retryTimer||!sessionStarted||!supabaseClient)return;
    retryTimer=window.setTimeout(()=>{retryTimer=null;void refreshSession();},4000);
  }
  async function sessionRequest(query){
    const controller=new AbortController();
    let timer;
    const timeout=new Promise((resolve,reject)=>{
      timer=window.setTimeout(()=>{controller.abort();reject(new Error('Délai de connexion dépassé'));},12000);
    });
    try{return await Promise.race([query.abortSignal(controller.signal),timeout]);}
    finally{window.clearTimeout(timer);}
  }
  async function readServer(){
    const {data,error}=await sessionRequest(supabaseClient.from('loto_app_sessions').select('state,updated_at').eq('code',code()).maybeSingle());
    if(error)throw error;
    lastReadAt=Date.now();connectionConfirmed();return data;
  }
  async function synchronize(){
    let row=await readServer();
    if(row?.state)showRemote(row);
    for(let attempt=0;attempt<250;attempt++){
      const op=pendingChanges()[0];if(!op)break;
      if(row?.state?._syncAppliedOps?.includes(op.id)){forget(op);continue;}
      const base=row?.state||serverState||defaultState();
      const applied=applyOperation(base,op);
      if(applied.conflict){forget(op);syncConflict='Un changement de l’ancienne partie n’a pas été appliqué. Vérifiez le tirage.';continue;}
      const stamp=new Date(Math.max(Date.now(),Date.parse(row?.updated_at||'')+1||0)).toISOString();
      let result;
      if(row?.state){
        let query=supabaseClient.from('loto_app_sessions').update({state:applied.state,updated_at:stamp}).eq('code',code());
        if(row.updated_at)query=query.eq('updated_at',row.updated_at);
        result=await sessionRequest(query.select('state,updated_at'));
      }else result=await sessionRequest(supabaseClient.from('loto_app_sessions').insert({code:code(),state:applied.state,updated_at:stamp}).select('state,updated_at'));
      if(result.error){if(result.error.code==='23505'){row=await readServer();if(row)showRemote(row);continue;}throw result.error;}
      if(!result.data?.length){row=await readServer();if(row)showRemote(row);continue;}
      row=result.data[0];forget(op);showRemote(row);
    }
    if(row?.state)showRemote(row);
    else if(!pendingChanges().length){serverState=defaultState();serverStamp='';mergeState(serverState);persistCache();}
    syncError='';syncReady=true;
    if(pendingChanges().length)retry();
    return {ok:true,pending:pendingChanges().length};
  }
  function refreshSession(){
    if(syncFlight)return syncFlight;
    if(!supabaseClient){
      if(remoteConfigured){connectionLost('Service de connexion indisponible. Le tirage reste sauvegardé sur cet appareil.');notifySync();return Promise.resolve({ok:false});}
      if(typeof navigator==='undefined'||navigator.onLine!==false)connectionConfirmed();
      syncReady=true;notifySync();return Promise.resolve({ok:true});
    }
    if(typeof navigator!=='undefined'&&navigator.onLine===false){connectionLost('Connexion interrompue. Les changements restent enregistrés sur cet appareil.');notifySync();retry();return Promise.resolve({ok:false});}
    syncFlight=Promise.resolve().then(synchronize).catch(error=>{connectionLost('Connexion indisponible. Les changements restent en attente.');console.warn('Synchronisation du loto en attente.',error);retry();return {ok:false,error};}).finally(()=>{syncFlight=null;notifySync();});
    notifySync();return syncFlight;
  }
  function subscribe(sessionCode){
    if(!supabaseClient||channel)return;
    const current=supabaseClient.channel('loto_session_'+sessionCode);
    channel=current;
    current.on('postgres_changes',{event:'*',schema:'public',table:'loto_app_sessions',filter:'code=eq.'+sessionCode},payload=>{
      if(payload.new?.state){showRemote(payload.new);connectionConfirmed();syncReady=true;notifySync();}
    }).on('broadcast',{event:'session-refresh'},()=>{void refreshSession();}).subscribe(status=>{
      if(channel!==current)return;
      if(status==='SUBSCRIBED'){void refreshSession();}
      else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
        // A failed live channel does not imply the session server is unreachable.
        void refreshSession();retry();
      }
    });
  }
  async function ensureSession(){
    if(!sessionStarted){
      sessionStarted=true;try{localStorage.setItem('loto_session_code',code());}catch(error){storageError=true;}
      hydrateCache();subscribe(code());
      if(window.addEventListener){
        window.addEventListener('online',()=>void refreshSession());
        window.addEventListener('offline',()=>{connectionLost('Connexion interrompue.');notifySync();});
        window.addEventListener('pageshow',()=>void refreshSession());
        window.addEventListener('focus',()=>void refreshSession());
        window.addEventListener('storage',event=>{if(event.key?.startsWith(pendingPrefix()))void refreshSession();});
        if(typeof document!=='undefined')document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)void refreshSession();});
        if(window.setInterval)pollTimer=window.setInterval(()=>{if((typeof document==='undefined'||!document.hidden)&&(pendingChanges().length||Date.now()-lastReadAt>=5000))void refreshSession();},5000);
      }
    }
    return refreshSession();
  }
  async function save(patch){
    if(!remoteConfigured&&!supabaseClient){state=Object.assign({},state,patch||{},{updatedAt:new Date().toISOString(),appVersion:C.APP_VERSION});store('loto_state',state);persistCache();notify();return;}
    const op=makeOperation(patch||{});
    memoryPending.set(op.id,op);store(pendingPrefix()+op.id,op);
    state=Object.assign({},state,patch||{},{updatedAt:new Date().toISOString(),appVersion:C.APP_VERSION});persistCache();notify();notifySync();
    if(!sessionStarted){sessionStarted=true;subscribe(code());}
    return refreshSession();
  }
  function bindSyncControls(){
    if(typeof document==='undefined'||!document.querySelectorAll)return;
    document.querySelectorAll('[data-connection-info]').forEach(button=>{
      if(button.dataset.connectionBound)return;button.dataset.connectionBound='1';
      button.addEventListener('click',()=>{
        const open=button.getAttribute('aria-expanded')!=='true';
        button.classList.toggle('is-open',open);button.setAttribute('aria-expanded',String(open));
      });
      button.addEventListener('blur',()=>{button.classList.remove('is-open');button.setAttribute('aria-expanded','false');});
    });
    document.querySelectorAll('[data-sync-refresh]').forEach(button=>{
      if(button.dataset.syncBound)return;button.dataset.syncBound='1';
      button.addEventListener('click',async()=>{
        if(button.disabled)return;
        const result=await ensureSession();
        if(result?.ok&&!pendingChanges().length){
          reconnectAvailable=false;
          if(syncConflict){alert(syncConflict);syncConflict='';}
          notifySync();
          // Wake connected screens immediately; polling also catches missed broadcasts.
          if(channel?.send)void channel.send({type:'broadcast',event:'session-refresh',payload:{session:code()}}).catch(()=>{});
        }
      });
    });
    notifySync();
  }
  function addLog(type, label, data){ return [{ t:new Date().toISOString(), type, label, data: data || null }, ...(state.history || [])].slice(0,300); }
  function makeId(prefix='id'){ return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); }
  function freshGamePatch(program){ return { _syncRoundId:makeId('round'), drawnNumbers:[], pendingNumber:null, bingoNumbers:[], miniBingoTakenParties:[], miniBingoReady:false, miniBingoActive:false, miniBingoWon:false, gameActive:true, gameEnded:false, publicCard:null, cardClosedAt:Date.now(), checkedCards:[], currentPartieIndex:0, currentPrizeIndex:0, program: program || state.program || defaultState().program }; }
  function canStartGame(){ return !state.gameActive; }
  async function stopCurrentGame(){
    await save({ _syncRoundId:makeId('round'), gameActive:false, gameEnded:true, miniBingoReady:false, miniBingoActive:false, drawnNumbers:[], pendingNumber:null, publicCard:null, cardClosedAt:Date.now(), toast:{type:'game_stopped',message:'Loto arrêté depuis l’administration.',at:Date.now(),duration:5000}, history:addLog('stop_game','Loto arrêté manuellement') });
  }
  async function markMiniBingoWon(){
    await save({ miniBingoWon:true, miniBingoReady:false, toast:{type:'mini_bingo_won',message:'Mini-bingo indiqué comme gagné.',at:Date.now(),duration:3500}, history:addLog('mini_bingo_won','Mini-bingo gagné') });
  }
  function applyMiniBingoFirstNumber(n, patch){
    if(!state.options?.bingoEnabled || state.miniBingoActive) return;
    if((state.options?.miniBingoSource || 'first') !== 'first') return;
    const pi = state.currentPartieIndex || 0;
    const taken = new Set(state.miniBingoTakenParties || []);
    if(taken.has(pi)) return;
    const b = nextBingoNumber(n);
    if(!b) return;
    taken.add(pi);
    patch.bingoNumbers = [...(state.bingoNumbers || []), b];
    patch.miniBingoTakenParties = [...taken];
  }
  function applyMiniBingoLastNumber(patch){
    if(!state.options?.bingoEnabled || state.miniBingoActive) return;
    if((state.options?.miniBingoSource || 'first') !== 'last') return;
    const pi = state.currentPartieIndex || 0;
    const taken = new Set(state.miniBingoTakenParties || []);
    if(taken.has(pi)) return;
    const n = state.pendingNumber || (state.drawnNumbers || []).slice(-1)[0];
    const b = nextBingoNumber(n);
    if(!b) return;
    taken.add(pi);
    patch.bingoNumbers = [...(state.bingoNumbers || []), b];
    patch.miniBingoTakenParties = [...taken];
  }
  async function drawNumber(n, mode='manual'){
    n = Number(n); if(!n || n<1 || n>90) return;
    let drawn = [...(state.drawnNumbers || [])];
    if(drawn.includes(n)) return;
    const oldPending = state.pendingNumber;
    if(oldPending && !drawn.includes(oldPending)) drawn.push(oldPending);
    drawn.push(n);
    const patch = { drawnNumbers: drawn, pendingNumber: null, history: addLog('draw', 'Numéro ' + n, { n, mode }) };
    applyMiniBingoFirstNumber(n, patch);
    await save(patch);
  }
  async function setPendingNumber(n){
    n = Number(n); if(!n || n<1 || n>90) return;
    let drawn = [...(state.drawnNumbers || [])];
    const oldPending = state.pendingNumber;
    if(oldPending && oldPending !== n && !drawn.includes(oldPending)) drawn.push(oldPending);
    if(drawn.includes(n)) return;
    const saving=save({ drawnNumbers: drawn, pendingNumber: n, history: addLog('pending', 'Prévalidation ' + n, { n }) });
    const currentPhase=phase(state);
    window.clearTimeout(window.__lotoPendingTimer);
    window.__lotoPendingTimer = window.setTimeout(() => {
      if(state.pendingNumber===n&&phase(state)===currentPhase)void commitPending();
    }, (state.options?.prevalidateSeconds || 6) * 1000);
    await saving;
  }
  async function commitPending(){
    const p = state.pendingNumber; if(!p) return;
    const drawn = [...(state.drawnNumbers || [])];
    if(!drawn.includes(p)) drawn.push(p);
    const patch = { drawnNumbers: drawn, pendingNumber: null, history: addLog('validate', 'Validation ' + p, { n:p }) };
    applyMiniBingoFirstNumber(p, patch);
    await save(patch);
  }
  async function cancelPending(){ if(state.pendingNumber) await save({ pendingNumber:null, history:addLog('cancel_pending','Erreur vocale') }); }
  async function undoLast(){
    const drawn = [...(state.drawnNumbers || [])]; const last = drawn.pop();
    await save({ drawnNumbers: drawn, pendingNumber:null, history:addLog('undo','Annulation dernier ' + (last || ''), { n:last }) });
  }
  async function cancelNumber(n, source='manual'){
    n = Number(n);
    if(!n || n<1 || n>90) return false;
    const drawn = [...(state.drawnNumbers || [])].filter(x => Number(x) !== n);
    const patch = { drawnNumbers: drawn, pendingNumber: Number(state.pendingNumber) === n ? null : state.pendingNumber, history:addLog('cancel_number','Annulation numéro ' + n, { n, source }) };
    await save(patch);
    return true;
  }
  async function replaceNumber(oldNumber, newNumber, source='manual'){
    oldNumber = Number(oldNumber); newNumber = Number(newNumber);
    if(!oldNumber || !newNumber || oldNumber<1 || oldNumber>90 || newNumber<1 || newNumber>90) return false;

    const originalDrawn = [...(state.drawnNumbers || [])].map(Number);
    const oldIndex = originalDrawn.findIndex(x => x === oldNumber);
    const newAlreadyDrawn = originalDrawn.includes(newNumber);
    let drawn = [];

    if(oldIndex >= 0){
      originalDrawn.forEach((x, idx) => {
        if(x === newNumber) return;
        if(idx === oldIndex) drawn.push(newNumber);
        else if(x !== oldNumber) drawn.push(x);
      });
    } else {
      drawn = originalDrawn.filter(x => x !== newNumber);
      drawn.push(newNumber);
    }

    let pendingNumber = state.pendingNumber;
    if(Number(pendingNumber) === oldNumber) pendingNumber = newAlreadyDrawn ? null : newNumber;
    else if(Number(pendingNumber) === newNumber) pendingNumber = null;

    const message = 'Correction : numéro ' + oldNumber + ' remplacé par ' + newNumber;
    const patch = {
      drawnNumbers: drawn,
      pendingNumber,
      toast: { type:'correction_number', message, at:Date.now(), duration:4500 },
      history:addLog('replace_number','Correction ' + oldNumber + ' → ' + newNumber, { oldNumber, newNumber, source })
    };
    await save(patch);
    return true;
  }
  async function newGame(){
    if(state.gameActive) return false;
    const old = state || {};
    const initial = defaultState();
    initial.sessionCode = code(); initial._syncRoundId=makeId('round');
    initial.lotoName = old.lotoName || initial.lotoName;
    initial.options = old.options || initial.options;
    initial.program = old.program || initial.program;
    initial.savedPrograms = old.savedPrograms || initial.savedPrograms;
    initial.history = addLog('new_game','Nouvelle partie');
    initial.gameActive = true; initial.gameEnded = false; initial.miniBingoWon = false;
    await save(initial);
    return true;
  }
  function partieLabel(s=state){
    const parties=s.program?.parties||[],index=Number(s.currentPartieIndex||0),partie=parties[index];
    if(!partie)return 'Partie simple';
    // The current position is authoritative; strip numbering from saved names.
    let name=String(partie.name||'').trim(),previous;
    do{
      previous=name;
      name=name.replace(/^partie\s*(?:n(?:um[eé]ro|[°ºo.]?)\s*)?\d+\b(?:\s*(?:\/|sur)\s*\d+)?\s*(?:[·:—–-]\s*)?/i,'').replace(/^partie$/i,'').trim();
    }while(name!==previous);
    return `Partie n°${index+1} / ${parties.length}`+(name?' · '+name:'');
  }
  function currentPartie(){ return (state.program?.parties || [])[state.currentPartieIndex || 0] || null; }
  function visiblePrizes(partie){ return (partie?.prizes || []).filter(x => x && x.enabled !== false); }
  function gameModeLabel(partie){ const m = partie?.gameMode || 'ligne'; if(m === 'carton') return 'Carton plein'; if(m === 'bingoMystere') return 'Bingo mystère'; if(m === 'perdant') return 'Partie du perdant'; return 'À la ligne'; }
  function currentPrize(){ const p=currentPartie(); return visiblePrizes(p)[state.currentPrizeIndex || 0] || null; }
  function stepLabel(partie=currentPartie(), prizeIndex=state.currentPrizeIndex || 0){
    const mode = partie?.gameMode || 'ligne';
    if(mode === 'bingoMystere') return 'Bingo mystère';
    if(mode === 'carton') return 'Carton plein';
    if(mode === 'perdant') return 'Aucun numéro tiré sur le carton';
    if(prizeIndex === 0) return '1 ligne';
    if(prizeIndex === 1) return '2 lignes';
    return 'Carton plein';
  }
  function currentRequirement(){
    const partie = currentPartie();
    const prizeIndex = state.currentPrizeIndex || 0;
    const mode = partie?.gameMode || 'ligne';
    const full = mode === 'carton' || mode === 'bingoMystere' || (mode !== 'perdant' && prizeIndex >= 2);
    const requiredLines = full ? 3 : (prizeIndex === 0 ? 1 : 2);
    return {
      mode,
      prizeIndex,
      label: stepLabel(partie, prizeIndex),
      requiredLines,
      full,
      lastNumberRequired: mode !== 'perdant' && state.options?.lastNumberRequired !== false
    };
  }
  function progressLabel(s=state){
    if(s.gameEnded)return 'Fin du loto';
    if(s.miniBingoReady)return 'Lancer Mini-bingo';
    if(s.miniBingoActive)return 'Fin du loto';
    const parties=s.program?.parties||[],pi=Number(s.currentPartieIndex||0),li=Number(s.currentPrizeIndex||0);
    if(li<visiblePrizes(parties[pi]).length-1)return 'Lot suivant';
    return pi<parties.length-1?'Partie suivante':'Fin du loto';
  }
  function nextProgress(){
    const parties = state.program?.parties || [];
    if(!parties.length) return { currentPartieIndex: state.currentPartieIndex || 0, currentPrizeIndex: state.currentPrizeIndex || 0 };
    let pi = state.currentPartieIndex || 0;
    let li = state.currentPrizeIndex || 0;
    const prizes = visiblePrizes(parties[pi]);
    if(li < prizes.length - 1) li++;
    else if(pi < parties.length - 1){ pi++; li = 0; }
    return { currentPartieIndex: pi, currentPrizeIndex: li };
  }
  async function nextPrize(){
    const progress = nextProgress();
    await save({ ...progress, history:addLog('next_prize','Lot suivant') });
  }
  function endOfPartieToast(){
    const parties = state.program?.parties || [];
    const currentPi = state.currentPartieIndex || 0;
    const prizes = visiblePrizes(parties[currentPi]);
    const currentLi = state.currentPrizeIndex || 0;
    const isLastPrize = !prizes.length || currentLi >= prizes.length - 1;
    if(!isLastPrize) return null;
    const isLastPartie = currentPi >= parties.length - 1;
    if(!isLastPartie) return { type:'partie_end', message:'Partie terminée.', at:Date.now(), duration:4000 };
    if(state.options?.bingoEnabled && !state.miniBingoWon){
      return { type:'mini_bingo_intro', message:'Le loto principal est terminé. Le Mini-bingo n’a pas encore été gagné.', at:Date.now(), duration:7000 };
    }
    return { type:'loto_end', message:'Le loto est terminé.', at:Date.now(), duration:7000 };
  }
  async function winner(){
    if(state.miniBingoActive){
      await save({ miniBingoActive:false, miniBingoReady:false, miniBingoWon:true, gameActive:false, gameEnded:true, drawnNumbers:[], pendingNumber:null, publicCard:null, checkedCards:[], toast:{type:'loto_end',message:'Le loto est terminé.',at:Date.now(),duration:7000}, history:addLog('mini_bingo_winner','Mini-bingo gagné et loto terminé') });
      return;
    }
    const parties = state.program?.parties || [];
    const currentPi = state.currentPartieIndex || 0;
    const prizes = visiblePrizes(parties[currentPi]);
    const currentLi = state.currentPrizeIndex || 0;
    const isLastPrize = !prizes.length || currentLi >= prizes.length - 1;
    const isLastPartie = currentPi >= parties.length - 1;
    const progress = nextProgress();
    const toast = endOfPartieToast();
    const patch = { ...progress, gameActive:true, gameEnded:false, history:addLog('winner','Gagnant validé', { partie: state.currentPartieIndex, lot: state.currentPrizeIndex }) };
    if(isLastPrize) applyMiniBingoLastNumber(patch);
    if(toast){
      patch._syncRoundId=makeId('round'); patch.toast=toast; patch.drawnNumbers=[]; patch.pendingNumber=null; patch.publicCard=null; patch.checkedCards=[];
    }
    if(isLastPrize && isLastPartie){
      if(state.options?.bingoEnabled && !state.miniBingoWon){ patch.miniBingoReady=true; patch.gameActive=true; patch.gameEnded=false; }
      else { patch.miniBingoReady=false; patch.gameActive=false; patch.gameEnded=true; }
    }
    await save(patch);
  }
  async function startMiniBingo(){
    if(state.miniBingoWon) return;
    await save({ _syncRoundId:makeId('round'), drawnNumbers:[], pendingNumber:null, publicCard:null, cardClosedAt:Date.now(), checkedCards:[], miniBingoReady:false, miniBingoActive:true, gameActive:true, gameEnded:false, toast:{ type:'mini_bingo_start', message:'Mini-bingo lancé.', at:Date.now(), duration:5000 }, history:addLog('mini_bingo_start','Lancement Mini-bingo') });
  }
  function nextBingoNumber(n){
    n = Number(n); if(!n || n<1 || n>90) return null;
    const used = new Set(state.bingoNumbers || []);
    for(let step=0; step<90; step++){
      const candidate = ((n - 1 + step) % 90) + 1;
      if(!used.has(candidate)) return candidate;
    }
    return null;
  }
  function knownMissingCardMessage(numero){
    const raw=String(numero??'').trim();
    const match=raw.match(/^SDS-(\d{1,2})-(\d{1,4})$/i);
    const id=match?Number(match[1])*10000+Number(match[2]):Number(raw);
    return id===101311?'Le carton 101311 n’est pas enregistré dans la base.':'';
  }
  async function fetchCard(numero){
    if(knownMissingCardMessage(numero))return null;
    if(!supabaseClient) return null;
    const raw = String(numero ?? '').trim();
    let query = supabaseClient.from('loto_cartons').select('*').eq('actif', true);
    const asNumber = Number(raw);
    if(raw && !Number.isNaN(asNumber)){
      const { data, error } = await query.eq('numero', asNumber).maybeSingle();
      if(error) console.warn(error);
      if(data) return data;
    }
    const m = raw.match(/SDS-(\d{1,2})-(\d{1,4})$/i);
    if(m){
      const internal = Number(String(m[1]).padStart(2,'0'))*10000 + Number(m[2]);
      const { data, error } = await supabaseClient.from('loto_cartons').select('*').eq('actif', true).eq('numero', internal).maybeSingle();
      if(error) console.warn(error);
      if(data) return data;
    }
    if(raw){
      const { data, error } = await supabaseClient.from('loto_cartons').select('*').eq('actif', true).or('carton_code.eq.'+raw+',qr_payload.eq.'+raw+',external_code.eq.'+raw).limit(1);
      if(error) console.warn(error);
      if(data && data[0]) return data[0];
    }
    return null;
  }
  function checkCard(card){
    const allDrawn = [...(state.drawnNumbers || [])].map(Number);
    const pending = state.pendingNumber ? Number(state.pendingNumber) : null;
    const last = pending || allDrawn.slice(-1)[0] || null;

    // Pendant l'annonce, le numero en attente est le dernier numero.
    // S'il est deja present dans drawnNumbers (synchronisation rapide), ne pas le doubler.
    const afterList = pending && !allDrawn.includes(pending) ? [...allDrawn, pending] : [...allDrawn];
    const after = new Set(afterList);

    // Etat juste avant le dernier tirage : on retire toutes les occurrences du dernier numero.
    // Cela evite un faux NON VALIDE lorsque le numero en attente a deja ete synchronise.
    const beforeList = last ? afterList.filter(n => Number(n) !== Number(last)) : afterList;
    const before = new Set(beforeList);
    const lignes = card?.lignes || [];
    const req = currentRequirement();
    const buildLines = (drawnSet) => lignes.map(l => ({
      numbers:l,
      missing:l.filter(n => !drawnSet.has(Number(n))),
      ok:l.every(n => drawnSet.has(Number(n))),
      hasLast:last ? l.map(Number).includes(Number(last)) : false
    }));
    const lineResults = buildLines(after);
    const beforeLineResults = buildLines(before);
    const okLines = lineResults.filter(l => l.ok).length;
    const okLinesBefore = beforeLineResults.filter(l => l.ok).length;
    const allMissing = [...new Set(lineResults.flatMap(l => l.missing).map(Number))].sort((a,b)=>a-b);
    const requirementReached = req.full ? okLines === 3 : okLines >= req.requiredLines;
    const requirementReachedBeforeLast = req.full ? okLinesBefore === 3 : okLinesBefore >= req.requiredLines;
    const lastCompletesGain = !last ? false : requirementReached && !requirementReachedBeforeLast;
    const completeLines = lineResults.filter(l => l.ok);
    const lastOnWinningLine = completeLines.some(l => l.hasLast);
    const lastOnCard = last ? lignes.flat().map(Number).includes(Number(last)) : false;
    const lastRuleOk = !req.lastNumberRequired || (req.full ? lastOnCard : lastOnWinningLine);
    const loserMode = req.mode === 'perdant';
    const hitsOnCard = lignes.flat().map(Number).filter(n => after.has(n));
    const stillInGame = loserMode && hitsOnCard.length === 0;
    const valid = loserMode ? false : requirementReached && lastRuleOk;

    const messages = [];
    if(loserMode){
      if(!stillInGame) messages.push('Carton perdant : numéro tiré présent');
    } else if(!requirementReached){
      if(req.full){
        messages.push('Carton plein incomplet');
      } else {
        const missingLines = Math.max(0, req.requiredLines - okLines);
        messages.push(missingLines === 1 ? 'Ligne incomplète' : `${missingLines} lignes manquantes`);
      }
      if(allMissing.length) messages.push(`Manque ${allMissing.length} numéro${allMissing.length > 1 ? 's' : ''} : ${allMissing.join(' - ')}`);
    }
    if(requirementReached && req.lastNumberRequired && !lastRuleOk){
      messages.push('Pas le dernier numéro');
    }
    if(!last && req.lastNumberRequired){
      messages.push('Aucun dernier numéro disponible');
    }

    let reason = '';
    if(loserMode && stillInGame) reason = 'Carton encore en jeu';
    else if(valid) reason = 'Gain valide';
    else if(messages.length) reason = messages[0];
    else reason = 'Non valide';

    return { numero:card.numero, serie:card.serie, lignes, lineResults, okLines, okLinesBefore, full: okLines === 3, missing: allMissing, requirement:req, lastNumber:last, requirementReached, lastCompletesGain, loserMode, stillInGame, hitsOnCard, valid, reason, messages };
  }
  function cardFailureLabel(result){
    if(!result || result.valid || (result.loserMode && result.winnerEligible)) return '';
    if(result.salesTrackingEnabled && !result.soldForCurrentLoto) return 'Carton non vendu pour ce loto';
    if(result.loserMode) return result.stillInGame ? (result.reason || 'Carton encore en jeu') : 'Carton perdant : un numéro tiré est présent';
    const requirement=result.requirement || currentRequirement();
    if(!result.requirementReached) return requirement.full ? 'Carton incomplet' : 'Ligne incomplète';
    if(requirement.lastNumberRequired) return 'Manque le dernier numéro';
    return 'Carton perdant';
  }
  async function controlCard(numero){
    const missingMessage=knownMissingCardMessage(numero);
    if(missingMessage)return {found:false,numero:101311,message:missingMessage};
    const card = await fetchCard(numero);
    if(!card) return { found:false, numero };
    const result = checkCard(card);
    result.salesTrackingEnabled = programSettings().salesTrackingEnabled;
    result.soldForCurrentLoto = true;
    result.salesStatus = 'non_controle';
    if(result.salesTrackingEnabled && supabaseClient){
      const lotoId = state.program?.id || state.sessionCode || code();
      try{
        const { data, error } = await supabaseClient.from('loto_carton_sales').select('*').eq('loto_id', lotoId).eq('numero', Number(card.numero)).eq('status','vendu').maybeSingle();
        if(error) throw error;
        result.soldForCurrentLoto = !!data;
        result.salesStatus = data ? 'vendu' : 'non_vendu';
        if(!data){
          result.valid = false;
          result.reason = 'Carton non vendu pour ce loto';
          result.messages = ['Carton non vendu pour ce loto', ...(result.messages || [])];
        }
      }catch(e){
        result.soldForCurrentLoto = true;
        result.salesStatus = 'controle_indisponible';
        result.messages = ['Suivi des ventes indisponible : contrôle non bloquant', ...(result.messages || [])];
      }
    }
    if(result.loserMode && result.stillInGame && result.salesTrackingEnabled && supabaseClient && result.soldForCurrentLoto){
      try{
        const lotoId = state.program?.id || state.sessionCode || code();
        const {data:sales,error:salesError}=await supabaseClient.from('loto_carton_sales').select('numero').eq('loto_id',lotoId).eq('status','vendu');
        if(salesError) throw salesError;
        const numbers=[...new Set((sales||[]).map(x=>Number(x.numero)).filter(Number.isFinite))];
        let cards=[];
        for(let i=0;i<numbers.length;i+=100){
          const {data,error}=await supabaseClient.from('loto_cartons').select('numero,lignes').eq('actif',true).in('numero',numbers.slice(i,i+100));
          if(error) throw error;
          cards=cards.concat(data||[]);
        }
        const drawn=new Set([...(state.drawnNumbers||[]),...(state.pendingNumber?[state.pendingNumber]:[])].map(Number));
        const remaining=cards.filter(c=>(c.lignes||[]).flat().every(n=>!drawn.has(Number(n))));
        result.remainingCards=remaining.length;
        result.winnerEligible=remaining.length===1 && Number(remaining[0].numero)===Number(card.numero);
        if(result.winnerEligible){ result.valid=true; result.reason='Dernier carton en jeu'; }
        else if(remaining.length>1) result.reason=`Encore ${remaining.length} cartons en jeu`;
        else result.reason='Aucun carton encore en jeu';
      }catch(e){
        result.winnerCheckAvailable=false;
        result.reason='Carton encore en jeu · contrôle des ventes indisponible';
      }
    } else if(result.loserMode && result.stillInGame){
      result.winnerCheckAvailable=false;
      result.reason='Carton encore en jeu · suivi des ventes requis pour confirmer le dernier';
    }
    const checked = [{...result, at:new Date().toISOString()}, ...(state.checkedCards || [])].slice(0,50);
    await save({ checkedCards: checked, history:addLog('check','Contrôle carton ' + (card.external_code || card.carton_code || numero), result) });
    return { found:true, result };
  }
  async function showPublicCard(result){ await save({ publicCard: result, history:addLog('show_card','Affichage carton ' + result.numero) }); }
  async function hidePublicCard(){ await save({ publicCard:null, cardClosedAt:Date.now(), history:addLog('hide_card','Fermeture carton') }); }
  function renderNumbers(container, opts={}){
    if(!container) return;
    const drawn = new Set(state.drawnNumbers || []); const pending = state.pendingNumber;
    container.innerHTML = '';
    for(let i=1;i<=90;i++){
      const b = document.createElement(opts.button ? 'button':'div');
      b.className = 'num' + (drawn.has(i)?' drawn':'') + (pending===i?' pending':'') + (opts.button?' clickable':'');
      b.textContent = String(i).padStart(2,'0');
      if(opts.button) b.onclick = () => {
        const drawnNow = new Set(state.drawnNumbers || []);
        if(state.pendingNumber===i){
          if(confirm('Annuler le numéro en attente '+i+' ?')) cancelPending();
        } else if(drawnNow.has(i)){
          if(confirm('Annuler le numéro '+i+' ?')) cancelNumber(i, 'grid_click');
        } else drawNumber(i, opts.source || 'click');
      };
      container.appendChild(b);
    }
  }
  function lastNumber(){ return state.pendingNumber || (state.drawnNumbers || []).slice(-1)[0] || '--'; }
  function protectPage(){
    if(sessionStorage.getItem('loto_team_ok') === '1') return;
    const overlay = document.createElement('div'); overlay.className = 'modal-lock';
    overlay.innerHTML = `<div class="lock-card"><h2>Accès équipe</h2><p>Code PIN</p><input id="pinInput" type="password" inputmode="numeric" autocomplete="off"><p id="pinErr" class="bad"></p><button id="pinBtn">Valider</button></div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#pinInput'); input.focus();
    const check = () => { if(input.value === String(C.TEAM_PIN || '2580')){ sessionStorage.setItem('loto_team_ok','1'); overlay.remove(); } else overlay.querySelector('#pinErr').textContent = 'PIN incorrect'; };
    overlay.querySelector('#pinBtn').onclick = check; input.onkeydown = e => { if(e.key==='Enter') check(); };
  }
  function pageHeader(){ bindSyncControls(); document.querySelectorAll('[data-title]').forEach(e => e.textContent = C.APP_NAME || 'Loto by SdS'); document.querySelectorAll('[data-version]').forEach(e => e.textContent = C.APP_VERSION || ''); document.querySelectorAll('[data-session]').forEach(e => e.textContent = code()); document.querySelectorAll('[data-loto-name]').forEach(e => e.textContent = state.program?.title || state.lotoName || C.APP_NAME || 'Loto by SdS'); }
  window.Loto = { C, supabaseClient, state:()=>state, defaultState, code, title, makeId, freshGamePatch, canStartGame, stopCurrentGame, markMiniBingoWon, onChange, ensureSession, refreshSession, syncStatus, onSyncChange, save, drawNumber, setPendingNumber, commitPending, cancelPending, undoLast, cancelNumber, replaceNumber, newGame, partieLabel, currentPartie, currentPrize, progressLabel, gameModeLabel, stepLabel, currentRequirement, nextPrize, winner, startMiniBingo, renderNumbers, lastNumber, knownMissingCardMessage, fetchCard, controlCard, cardFailureLabel, showPublicCard, hidePublicCard, checkCard, protectPage, pageHeader, normalizeProgram, programSettings };
})();
