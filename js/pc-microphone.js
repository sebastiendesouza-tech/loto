/* Session-scoped microphone commands; never overwrite the shared game state. */
(function(){
  const MODES = ['free', 'le', 'numero'];
  const STALE_MS = 10000;
  function connect(role, render){
    const host = role === 'host';
    const client = Loto.supabaseClient;
    const id = (window.crypto?.randomUUID?.() || Loto.makeId('mic'));
    let channel = null, connected = false, closed = false, initialized = false;
    let sourceMode = 'micro';
    let remote = null, lastSeen = 0, pending = null, pendingTimer = null;
    let error = '', lastRequest = '', lastSequence = 0, sequence = 0;

    function snapshot(){
      const online = connected && !!remote && Date.now() - lastSeen < STALE_MS;
      return host ? { connected, online:true, ready:initialized, active:LotoVoice.isActive(), sourceMode, mode:LotoVoice.getMode(), error, pending:false }
        : { connected, online, ready:online && remote.ready, active:online && remote.active,
            sourceMode:pending?.action === 'source-mode' ? pending.value : (online ? remote.sourceMode : 'micro'), mode:online ? remote.mode : 'le',
            error:error || (online ? remote.error : ''), pending:!!pending };
    }
    function notify(){ if(!closed) render(snapshot()); }
    async function send(event, payload){
      if(!connected || !channel || closed) return false;
      try { return await channel.send({type:'broadcast', event, payload}) === 'ok'; }
      catch { return false; }
    }
    function publish(){
      if(!host || closed) return;
      const status = snapshot();
      void send('status', {hostId:id, sequence:++sequence, ready:status.ready, active:status.active,
        sourceMode:status.sourceMode, mode:status.mode, error:status.error, requestId:lastRequest});
      notify();
    }
    function voiceStatus(on, label){
      const ignored = ['reconnaissance active', 'reconnaissance en pause', 'aborted', 'no-speech'];
      const messages = {
        'not-allowed':'Autorisez le microphone dans Chrome sur le PC.',
        'service-not-allowed':'La reconnaissance vocale est bloquée dans Chrome sur le PC.',
        'audio-capture':'Vérifiez le branchement et la sélection du micro sur le PC.',
        'network':'Le service vocal est indisponible. Vérifiez Internet sur le PC puis reprenez l’écoute.'
      };
      error = ignored.includes(label) ? '' : (messages[label] || label || '');
      if(['not-allowed', 'service-not-allowed', 'Reconnaissance vocale non disponible'].includes(label)) initialized = false;
      publish();
    }
    function apply(active){
      sourceMode = active ? 'micro' : 'manual';
      error = '';
      if(active) LotoVoice.resume(voiceStatus);
      else LotoVoice.pause(voiceStatus);
      publish();
    }
    function finishPending(){
      clearTimeout(pendingTimer); pendingTimer = null; pending = null;
    }
    function receiveStatus(payload){
      if(host || !payload || typeof payload.hostId !== 'string' || !Number.isFinite(payload.sequence)
        || typeof payload.active !== 'boolean' || typeof payload.ready !== 'boolean'
        || !['micro','manual'].includes(payload.sourceMode) || !MODES.includes(payload.mode)) return;
      // A second public screen must not steal an already armed PC's controls.
      if(remote && remote.hostId !== payload.hostId && Date.now() - lastSeen < STALE_MS && remote.ready) return;
      if(remote?.hostId === payload.hostId && payload.sequence <= lastSequence) return;
      remote = payload; lastSequence = payload.sequence; lastSeen = Date.now();
      if(pending && pending.hostId === payload.hostId && pending.requestId === payload.requestId){ finishPending(); error = ''; }
      notify();
    }
    function receiveCommand(payload){
      if(!host || !payload || payload.hostId !== id
        || typeof payload.requestId !== 'string' || payload.requestId === lastRequest) return;
      if(payload.action !== 'active' && payload.action !== 'mode' && payload.action !== 'source-mode') return;
      if(payload.action === 'active' && typeof payload.value !== 'boolean') return;
      if(payload.action === 'active' && !initialized) return;
      if(payload.action === 'mode' && !MODES.includes(payload.value)) return;
      if(payload.action === 'source-mode' && !['micro','manual'].includes(payload.value)) return;
      lastRequest = payload.requestId;
      if(payload.action === 'mode'){ LotoVoice.setMode(payload.value); publish(); }
      else if(payload.action === 'source-mode'){
        sourceMode = payload.value;
        if(sourceMode === 'manual') apply(false);
        else if(initialized) apply(true);
        else { error = 'Cliquez sur Micro PC sur le PC pour autoriser le microphone.'; publish(); }
      }
      else apply(payload.value);
    }
    async function command(action, value){
      const s = snapshot();
      if(host || !s.online || pending || (action !== 'source-mode' && !s.ready)
        || (action === 'source-mode' && value === 'micro' && !s.ready)) return;
      error = '';
      const request = {hostId:remote.hostId, requestId:id + '_' + (++sequence), action, value};
      pending = request;
      pendingTimer = setTimeout(()=>{
        pending = null; error = 'Le PC ne répond pas. Vérifiez sa connexion et son état avant de réessayer.'; notify();
      }, 6000);
      notify();
      const ok = await send('command', request);
      if(!ok && pending === request){
        finishPending(); error = 'Commande non transmise. Vérifiez la connexion Internet.'; notify();
      }
    }
    const api = {
      toggle(){
        if(!host) return command('active', !snapshot().active);
        // Only a click on the PC arms this page; tablet commands cannot request permission.
        if(!initialized){ initialized = true; error=''; apply(true); }
        else apply(!LotoVoice.isActive());
      },
      setMode(mode){ if(MODES.includes(mode)) return host ? (LotoVoice.setMode(mode), publish()) : command('mode', mode); },
      setSourceMode(mode){
        if(!['micro','manual'].includes(mode))return;
        if(host){
          sourceMode=mode;
          if(mode==='manual')apply(false);
          else if(initialized)apply(true);
          else {error='Cliquez sur Micro PC sur le PC pour autoriser le microphone.';publish();}
          return;
        }
        return command('source-mode',mode);
      },
      close(){
        closed = true; finishPending(); clearInterval(timer);
        window.removeEventListener('pagehide', api.close);
        if(host) LotoVoice.pause();
        if(channel) void client.removeChannel(channel);
      }
    };
    const timer = setInterval(()=>{ if(host) publish(); else notify(); }, 2000);
    window.addEventListener('pagehide', api.close);
    if(client){
      channel = client.channel('loto_pc_microphone_' + Loto.code(), {config:{broadcast:{ack:true}}});
      channel.on('broadcast', {event:'status'}, ({payload})=>receiveStatus(payload))
        .on('broadcast', {event:'command'}, ({payload})=>receiveCommand(payload))
        .on('broadcast', {event:'status-request'}, ()=>{ if(host) publish(); });
      channel.subscribe(status=>{
        if(closed) return;
        connected = status === 'SUBSCRIBED';
        if(!connected){ remote = null; lastSeen = 0; lastSequence = 0; }
        if(connected){ if(host) publish(); else void send('status-request', {}); }
        notify();
      });
    }
    notify();
    return api;
  }
  window.LotoPcMicrophone = {connect};
})();
