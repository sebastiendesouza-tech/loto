(function(){
  const C = window.LOTO_CONFIG || {};
  const supabaseClient = window.supabase && C.SUPABASE_URL ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const defaultState = () => ({
    appVersion: C.APP_VERSION || 'v2.0.0-dev',
    sessionCode: C.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE',
    lotoName: C.APP_NAME || 'LOTO SDS',
    drawnNumbers: [],
    pendingNumber: null,
    history: [],
    publicCard: null,
    checkedCards: [],
    currentPartieIndex: 0,
    currentPrizeIndex: 0,
    options: { showLots: false, bingoEnabled: false, showBingo: false, prevalidateSeconds: 6 },
    bingoNumbers: [],
    program: { title: 'Loto', parties: [] },
    updatedAt: new Date().toISOString()
  });
  let state = defaultState();
  let listeners = [];
  let channel = null;
  const code = () => new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || C.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';
  const title = () => `${state.lotoName || C.APP_NAME || 'LOTO SDS'} ${C.APP_VERSION || ''}`.trim();
  const safeJson = (x, fallback) => { try { return JSON.parse(x); } catch { return fallback; } };
  function notify(){ listeners.forEach(fn => fn(state)); }
  function onChange(fn){ listeners.push(fn); fn(state); return () => listeners = listeners.filter(x => x !== fn); }
  function mergeState(next){ state = Object.assign(defaultState(), next || {}); state.sessionCode = code(); notify(); }
  async function ensureSession(){
    if(!supabaseClient) { mergeState(safeJson(localStorage.getItem('loto_state'), defaultState())); return; }
    const sessionCode = code(); localStorage.setItem('loto_session_code', sessionCode);
    const { data, error } = await supabaseClient.from('loto_app_sessions').select('state').eq('code', sessionCode).maybeSingle();
    if(error) console.warn(error);
    if(data && data.state) mergeState(data.state);
    else {
      const initial = defaultState(); initial.sessionCode = sessionCode;
      await supabaseClient.from('loto_app_sessions').upsert({ code: sessionCode, state: initial, updated_at: new Date().toISOString() });
      mergeState(initial);
    }
    subscribe(sessionCode);
  }
  function subscribe(sessionCode){
    if(!supabaseClient) return;
    if(channel) supabaseClient.removeChannel(channel);
    channel = supabaseClient.channel('loto_session_' + sessionCode)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'loto_app_sessions', filter:'code=eq.' + sessionCode }, payload => {
        if(payload.new && payload.new.state) mergeState(payload.new.state);
      })
      .subscribe();
  }
  async function save(patch){
    const next = Object.assign({}, state, patch || {}, { updatedAt: new Date().toISOString(), appVersion: C.APP_VERSION });
    if(!next.history) next.history = [];
    state = next; notify();
    if(!supabaseClient){ localStorage.setItem('loto_state', JSON.stringify(state)); return; }
    const { error } = await supabaseClient.from('loto_app_sessions').upsert({ code: code(), state, updated_at: new Date().toISOString() });
    if(error) console.error(error);
  }
  function addLog(type, label, data){ return [{ t:new Date().toISOString(), type, label, data: data || null }, ...(state.history || [])].slice(0,300); }
  async function drawNumber(n, mode='manual'){
    n = Number(n); if(!n || n<1 || n>90) return;
    let drawn = [...(state.drawnNumbers || [])];
    if(drawn.includes(n)) return;
    const oldPending = state.pendingNumber;
    if(oldPending && !drawn.includes(oldPending)) drawn.push(oldPending);
    drawn.push(n);
    await save({ drawnNumbers: drawn, pendingNumber: null, history: addLog('draw', 'Numéro ' + n, { n, mode }) });
  }
  async function setPendingNumber(n){
    n = Number(n); if(!n || n<1 || n>90) return;
    let drawn = [...(state.drawnNumbers || [])];
    const oldPending = state.pendingNumber;
    if(oldPending && oldPending !== n && !drawn.includes(oldPending)) drawn.push(oldPending);
    if(drawn.includes(n)) return;
    await save({ drawnNumbers: drawn, pendingNumber: n, history: addLog('pending', 'Prévalidation ' + n, { n }) });
    window.clearTimeout(window.__lotoPendingTimer);
    window.__lotoPendingTimer = window.setTimeout(() => commitPending(), (state.options?.prevalidateSeconds || 6) * 1000);
  }
  async function commitPending(){
    const p = state.pendingNumber; if(!p) return;
    const drawn = [...(state.drawnNumbers || [])];
    if(!drawn.includes(p)) drawn.push(p);
    await save({ drawnNumbers: drawn, pendingNumber: null, history: addLog('validate', 'Validation ' + p, { n:p }) });
  }
  async function cancelPending(){ if(state.pendingNumber) await save({ pendingNumber:null, history:addLog('cancel_pending','Erreur vocale') }); }
  async function undoLast(){
    const drawn = [...(state.drawnNumbers || [])]; const last = drawn.pop();
    await save({ drawnNumbers: drawn, pendingNumber:null, history:addLog('undo','Annulation dernier ' + (last || ''), { n:last }) });
  }
  async function newGame(){
    const initial = defaultState(); initial.sessionCode = code(); initial.history = addLog('new_game','Nouvelle partie');
    await save(initial);
  }
  async function fetchCard(numero){
    if(!supabaseClient) return null;
    const { data, error } = await supabaseClient.from('loto_cartons').select('*').eq('numero', Number(numero)).eq('actif', true).maybeSingle();
    if(error) console.warn(error);
    return data;
  }
  function checkCard(card){
    const drawn = new Set([...(state.drawnNumbers || []), ...(state.pendingNumber ? [state.pendingNumber] : [])]);
    const lignes = card?.lignes || [];
    const lineResults = lignes.map(l => ({ numbers:l, missing:l.filter(n => !drawn.has(Number(n))), ok:l.every(n => drawn.has(Number(n))) }));
    const okLines = lineResults.filter(l => l.ok).length;
    const allMissing = lineResults.flatMap(l => l.missing);
    return { numero:card.numero, serie:card.serie, lignes, lineResults, okLines, full: okLines === 3, missing: allMissing };
  }
  async function controlCard(numero){
    const card = await fetchCard(numero);
    if(!card) return { found:false, numero };
    const result = checkCard(card);
    const checked = [{...result, at:new Date().toISOString()}, ...(state.checkedCards || [])].slice(0,50);
    await save({ checkedCards: checked, history:addLog('check','Contrôle carton ' + numero, result) });
    return { found:true, result };
  }
  async function showPublicCard(result){ await save({ publicCard: result, history:addLog('show_card','Affichage carton ' + result.numero) }); }
  async function hidePublicCard(){ await save({ publicCard:null, history:addLog('hide_card','Fermeture carton') }); }
  function renderNumbers(container, opts={}){
    if(!container) return;
    const drawn = new Set(state.drawnNumbers || []); const pending = state.pendingNumber;
    container.innerHTML = '';
    for(let i=1;i<=90;i++){
      const b = document.createElement(opts.button ? 'button':'div');
      b.className = 'num' + (drawn.has(i)?' drawn':'') + (pending===i?' pending':'') + (opts.button?' clickable':'');
      b.textContent = String(i).padStart(2,'0');
      if(opts.button) b.onclick = () => drawNumber(i, 'click');
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
  function pageHeader(){ document.querySelectorAll('[data-title]').forEach(e => e.textContent = C.APP_NAME || 'LOTO SDS'); document.querySelectorAll('[data-version]').forEach(e => e.textContent = C.APP_VERSION || ''); document.querySelectorAll('[data-session]').forEach(e => e.textContent = code()); }
  window.Loto = { C, supabaseClient, state:()=>state, defaultState, code, title, onChange, ensureSession, save, drawNumber, setPendingNumber, commitPending, cancelPending, undoLast, newGame, renderNumbers, lastNumber, fetchCard, controlCard, showPublicCard, hidePublicCard, checkCard, protectPage, pageHeader };
})();
