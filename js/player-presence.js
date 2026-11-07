/* Session-scoped presence. Browser ids deduplicate player tabs, never people. */
(function(){
  function randomId(){return window.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);}
  function browserId(){
    try{
      const key='loto_player_browser_v1';let id=localStorage.getItem(key);
      if(!id){id=randomId();localStorage.setItem(key,id);}return id;
    }catch{return randomId();}
  }
  function playerCount(state){
    const browsers=new Set();
    Object.values(state||{}).forEach(entries=>{
      if(!Array.isArray(entries))return;
      entries.forEach(entry=>{if(entry?.page==='joueur'&&typeof entry.browserId==='string'&&entry.browserId)browsers.add(entry.browserId);});
    });
    return browsers.size;
  }
  function render(count,reason='Connexion du compteur en cours'){
    document.querySelectorAll('[data-player-presence-status]').forEach(badge=>{
      const value=badge.querySelector('[data-player-count]');if(value)value.textContent=count===null?'—':String(count);
      const label=count===null?reason:count+' joueur'+(count===1?'':'s')+' connecté'+(count===1?'':'s');
      badge.title=label;badge.setAttribute('aria-label',label);badge.dataset.state=count===null?'waiting':'connected';
    });
  }
  function connect(role){
    const client=Loto.supabaseClient,id=role==='player'?browserId():null;
    let channel=null,subscribed=false,synced=false,suspended=false,closed=false,cleanup=Promise.resolve();
    function offline(){return navigator.onLine===false;}
    function update(){
      if(closed||suspended||offline()||!subscribed||!synced){render(null,offline()?'Compteur indisponible : connexion interrompue':'Connexion du compteur en cours');return;}
      render(playerCount(channel.presenceState()));
    }
    async function announce(current){
      if(closed||suspended||offline()||channel!==current||!subscribed)return;
      try{await current.track(role==='player'?{page:'joueur',browserId:id}:{page:'equipe'});}catch{if(channel===current){synced=false;update();}}
    }
    async function start(){
      await cleanup;
      if(closed||suspended||offline()||channel||!client)return;
      const current=client.channel('loto_players_'+Loto.code(),{config:{presence:{key:randomId()}}});channel=current;
      current.on('presence',{event:'sync'},()=>{if(channel!==current)return;synced=true;update();})
        .subscribe(status=>{
          if(channel!==current||closed)return;
          subscribed=status==='SUBSCRIBED';
          if(subscribed){void announce(current);}else synced=false;
          update();
        });
    }
    function pause(){
      suspended=true;subscribed=false;synced=false;
      const old=channel;channel=null;
      if(old)cleanup=Promise.resolve(client.removeChannel(old)).catch(()=>{});
      update();
    }
    function resume(){suspended=false;void start();if(channel&&subscribed)void announce(channel);}
    function changedConnection(){
      if(offline()){synced=false;update();return;}
      resume();
    }
    function visible(){if(!document.hidden&&!suspended){if(channel&&subscribed)void announce(channel);else void start();}}
    function close(){
      if(closed)return;pause();closed=true;
      window.removeEventListener('offline',changedConnection);window.removeEventListener('online',changedConnection);
      window.removeEventListener('pagehide',pause);window.removeEventListener('pageshow',resume);window.removeEventListener('focus',visible);
      document.removeEventListener('visibilitychange',visible);
    }
    render(null,client?'Connexion du compteur en cours':'Compteur indisponible : service de connexion non chargé');
    if(client){
      window.addEventListener('offline',changedConnection);window.addEventListener('online',changedConnection);
      window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);window.addEventListener('focus',visible);
      document.addEventListener('visibilitychange',visible);void start();
    }
    return {close};
  }
  window.LotoPlayerPresence={connect,playerCount};
  const role=document.body?.dataset.playerPresence;
  if(role==='player'||role==='observer')connect(role);
})();
