(function(){
  const C = window.LOTO_CONFIG || {};
  const supabaseClient = window.supabase && C.SUPABASE_URL ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const defaultState = () => ({
    appVersion: C.APP_VERSION || 'v2.2.6-final',
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
    program: { id: '', title: '', date: '', parties: [], sales_tracking_enabled: false },
    savedPrograms: [],
    updatedAt: new Date().toISOString()
  });
  let state = defaultState();
  let listeners = [];
  let channel = null;
  const code = () => new URLSearchParams(location.search).get('s') || localStorage.getItem('loto_session_code') || C.DEFAULT_SESSION_CODE || 'SESSION_ACTIVE';
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
  function makeId(prefix='id'){ return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); }
  function freshGamePatch(program){ return { drawnNumbers:[], pendingNumber:null, bingoNumbers:[], miniBingoTakenParties:[], miniBingoReady:false, miniBingoActive:false, publicCard:null, cardClosedAt:Date.now(), checkedCards:[], currentPartieIndex:0, currentPrizeIndex:0, program: program || state.program || defaultState().program }; }
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
    await save({ drawnNumbers: drawn, pendingNumber: n, history: addLog('pending', 'Prévalidation ' + n, { n }) });
    window.clearTimeout(window.__lotoPendingTimer);
    window.__lotoPendingTimer = window.setTimeout(() => commitPending(), (state.options?.prevalidateSeconds || 6) * 1000);
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
    const old = state || {};
    const initial = defaultState();
    initial.sessionCode = code();
    initial.lotoName = old.lotoName || initial.lotoName;
    initial.options = old.options || initial.options;
    initial.program = old.program || initial.program;
    initial.savedPrograms = old.savedPrograms || initial.savedPrograms;
    initial.history = addLog('new_game','Nouvelle partie');
    await save(initial);
  }
  function currentPartie(){ return (state.program?.parties || [])[state.currentPartieIndex || 0] || null; }
  function visiblePrizes(partie){ return (partie?.prizes || []).filter(x => x && x.enabled !== false); }
  function gameModeLabel(partie){ const m = partie?.gameMode || 'ligne'; if(m === 'carton') return 'Carton plein'; if(m === 'bingoMystere') return 'Bingo mystère'; return 'À la ligne'; }
  function currentPrize(){ const p=currentPartie(); return visiblePrizes(p)[state.currentPrizeIndex || 0] || null; }
  function stepLabel(partie=currentPartie(), prizeIndex=state.currentPrizeIndex || 0){
    const mode = partie?.gameMode || 'ligne';
    if(mode === 'bingoMystere') return 'Bingo mystère';
    if(mode === 'carton') return 'Carton plein';
    if(prizeIndex === 0) return '1 ligne';
    if(prizeIndex === 1) return '2 lignes';
    return 'Carton plein';
  }
  function currentRequirement(){
    const partie = currentPartie();
    const prizeIndex = state.currentPrizeIndex || 0;
    const mode = partie?.gameMode || 'ligne';
    const full = mode === 'carton' || mode === 'bingoMystere' || prizeIndex >= 2;
    const requiredLines = full ? 3 : (prizeIndex === 0 ? 1 : 2);
    return {
      mode,
      prizeIndex,
      label: stepLabel(partie, prizeIndex),
      requiredLines,
      full,
      lastNumberRequired: state.options?.lastNumberRequired !== false
    };
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
  const betweenPartMessages = [
    '🎉 Partie terminée ! Vous pouvez démarquer vos cartons. Bonne chance pour la prochaine partie !',
    '🏁 Fin de partie ! Démarquez vos cartons, on repart bientôt.',
    '🎊 Bravo aux gagnants ! Démarquez vos cartons et préparez la suite.',
    '🍀 On remet les compteurs à zéro ! Démarquez vos cartons.',
    '✨ Cette partie est terminée. Démarquez tranquillement vos cartons.',
    '🎯 Les jeux sont faits ! Démarquez vos cartons, la prochaine partie arrive.',
    '🎈 Un lot de plus attribué ! Démarquez vos cartons.',
    '🥳 Prenez quelques secondes pour démarquer, on continue.',
    '⭐ Encore une belle partie ! Démarquez vos cartons.',
    '🎁 Les lots continuent ! Démarquez vos cartons et restez prêts.',
    '😊 Une partie s’achève, une autre arrive. Vous pouvez démarquer.',
    '🍀 La chance tourne ! Démarquez vos cartons.',
    '🎊 Merci pour votre bonne humeur ! Démarquez vos cartons.',
    '🎉 Fin de cette partie ! Un petit démarquage, et on repart.',
    '🌟 Nouvelle chance dans quelques instants ! Démarquez vos cartons.',
    '🎯 Partie terminée. Démarquez tranquillement vos cartons.',
    '🍀 Restez avec nous ! Démarquez vos cartons.',
    '🎉 Bravo à tous ! Démarquez vos cartons pour la suite.',
    '🏁 Fin de manche ! Démarquez vos cartons.',
    '🎁 Prochain lot bientôt en jeu. Démarquez vos cartons.'
  ];
  const finalMessages = [
    '🎉 Notre loto est terminé. Merci à toutes et à tous pour votre présence, et merci à nos bénévoles !',
    '❤️ Merci d’avoir partagé ce moment avec nous. Merci aux joueurs et à tous les bénévoles.',
    '👏 Félicitations aux gagnants ! Merci à tous les participants et aux bénévoles.',
    '🎊 Merci pour votre fidélité et votre bonne humeur. À bientôt pour un prochain loto !',
    '🍀 Le loto touche à sa fin. Merci aux joueurs et aux bénévoles qui ont rendu cette journée possible.',
    '🎉 Merci pour votre participation ! Nous espérons que vous avez passé un agréable moment.',
    '🤝 Un grand merci à nos bénévoles, partenaires et joueurs. Bonne fin de journée à toutes et à tous.',
    '🌟 Merci pour votre présence tout au long de cette journée. À très bientôt.',
    '🎁 Merci d’avoir participé à notre loto. Votre présence fait vivre cette belle journée.',
    '❤️ À très bientôt pour une prochaine édition ! Merci aux joueurs et aux bénévoles.'
  ];
  const bingoIntroMessages = [
    '🎉 Les parties classiques sont terminées ! Place maintenant au Mini-bingo !',
    '🎊 Ne rangez pas vos tickets ! Le Mini-bingo commence dans quelques instants.',
    '⭐ Les lots principaux sont attribués… il est temps de passer au Mini-bingo !',
    '🍀 Une dernière chance de gagner ! Préparez-vous pour le Mini-bingo.',
    '🎁 Ce n’est pas fini ! Le Mini-bingo va commencer.',
    '🏁 Fin des parties classiques. Le Mini-bingo arrive maintenant.',
    '🎯 Restez bien avec nous : place au Mini-bingo !',
    '🥳 Encore un moment de jeu : le Mini-bingo démarre bientôt.',
    '✨ Préparez vos tickets Mini-bingo, on continue !',
    '🍀 Le loto continue avec le Mini-bingo. Bonne chance à tous !'
  ];
  function randomFrom(list){
    const arr = list && list.length ? list : ['Partie terminée.'];
    const last = state.toast?.message || '';
    const choices = arr.length > 1 ? arr.filter(x => x !== last) : arr;
    return choices[Math.floor(Math.random() * choices.length)];
  }
  function endOfPartieToast(progress){
    const parties = state.program?.parties || [];
    const currentPi = state.currentPartieIndex || 0;
    const prizes = visiblePrizes(parties[currentPi]);
    const currentLi = state.currentPrizeIndex || 0;
    const isLastPrize = !prizes.length || currentLi >= prizes.length - 1;
    if(!isLastPrize) return null;
    const isLastPartie = currentPi >= parties.length - 1;
    let type = 'partie_end';
    let message = randomFrom(betweenPartMessages);
    if(isLastPartie){
      if(state.options?.bingoEnabled){ type = 'mini_bingo_intro'; message = randomFrom(bingoIntroMessages); }
      else { type = 'loto_end'; message = randomFrom(finalMessages); }
    }
    return { type, message, at: Date.now(), duration: 5000 };
  }
  async function winner(){
    const parties = state.program?.parties || [];
    const currentPi = state.currentPartieIndex || 0;
    const prizes = visiblePrizes(parties[currentPi]);
    const currentLi = state.currentPrizeIndex || 0;
    const isLastPrize = !prizes.length || currentLi >= prizes.length - 1;
    const isLastPartie = currentPi >= parties.length - 1;
    const progress = nextProgress();
    const toast = endOfPartieToast(progress);
    const patch = { ...progress, history:addLog('winner','Gagnant validé', { partie: state.currentPartieIndex, lot: state.currentPrizeIndex }) };
    if(isLastPrize) applyMiniBingoLastNumber(patch);
    if(toast) {
      patch.toast = toast;
      // Fin de partie : le message de démarquage est affiché et le tableau est immédiatement remis à zéro
      // pour préparer la partie suivante ou le Mini-bingo.
      patch.drawnNumbers = [];
      patch.pendingNumber = null;
      patch.publicCard = null;
      patch.checkedCards = [];
    }
    if(isLastPrize && isLastPartie && state.options?.bingoEnabled) patch.miniBingoReady = true;
    await save(patch);
  }
  async function startMiniBingo(){
    await save({ drawnNumbers:[], pendingNumber:null, publicCard:null, cardClosedAt:Date.now(), checkedCards:[], miniBingoReady:false, miniBingoActive:true, toast:{ type:'mini_bingo_start', message:'🎯 Mini-bingo lancé ! Bonne chance à tous.', at:Date.now(), duration:5000 }, history:addLog('mini_bingo_start','Lancement Mini-bingo') });
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
  async function fetchCard(numero){
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
    const allDrawn = [...(state.drawnNumbers || [])];
    const last = state.pendingNumber || allDrawn.slice(-1)[0] || null;
    const afterList = [...allDrawn, ...(state.pendingNumber ? [state.pendingNumber] : [])];
    const after = new Set(afterList.map(Number));
    const beforeList = last ? afterList.filter((n, idx) => !(Number(n) === Number(last) && idx === afterList.map(Number).lastIndexOf(Number(last)))) : afterList;
    const before = new Set(beforeList.map(Number));
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
    const lastRuleOk = !req.lastNumberRequired || (req.full ? (lastOnCard && lastCompletesGain) : (lastOnWinningLine && lastCompletesGain));
    const valid = requirementReached && lastRuleOk;

    const messages = [];
    if(!requirementReached){
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
    if(valid) reason = 'Gain valide';
    else if(messages.length) reason = messages[0];
    else reason = 'Non valide';

    return { numero:card.numero, serie:card.serie, lignes, lineResults, okLines, okLinesBefore, full: okLines === 3, missing: allMissing, requirement:req, lastNumber:last, requirementReached, lastCompletesGain, valid, reason, messages };
  }
  async function controlCard(numero){
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
      if(opts.button) b.onclick = () => { const drawnNow = new Set(state.drawnNumbers || []); if(drawnNow.has(i)){ if(confirm('Annuler le numéro '+i+' ?')) cancelNumber(i, 'grid_click'); } else drawNumber(i, 'click'); };
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
  function pageHeader(){ document.querySelectorAll('[data-title]').forEach(e => e.textContent = C.APP_NAME || 'Loto by SdS'); document.querySelectorAll('[data-version]').forEach(e => e.textContent = C.APP_VERSION || ''); document.querySelectorAll('[data-session]').forEach(e => e.textContent = code()); document.querySelectorAll('[data-loto-name]').forEach(e => e.textContent = state.program?.title || state.lotoName || C.APP_NAME || 'Loto by SdS'); }
  window.Loto = { C, supabaseClient, state:()=>state, defaultState, code, title, makeId, freshGamePatch, onChange, ensureSession, save, drawNumber, setPendingNumber, commitPending, cancelPending, undoLast, cancelNumber, replaceNumber, newGame, currentPartie, currentPrize, gameModeLabel, stepLabel, currentRequirement, nextPrize, winner, startMiniBingo, renderNumbers, lastNumber, fetchCard, controlCard, showPublicCard, hidePublicCard, checkCard, protectPage, pageHeader, normalizeProgram, programSettings };
})();
