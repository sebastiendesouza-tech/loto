(function(){
  let recognition = null;
  let active = false;
  let firstHeard = null;
  const words = {
    'un':1,'une':1,'deux':2,'trois':3,'quatre':4,'cinq':5,'six':6,'sept':7,'huit':8,'neuf':9,'dix':10,
    'onze':11,'douze':12,'treize':13,'quatorze':14,'quinze':15,'seize':16,
    'vingt':20,'trente':30,'quarante':40,'cinquante':50,'soixante':60,
    'vingts':20
  };
  function parseNumber(text){
    text = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/-/g,' ');
    const m = text.match(/\b([1-9]|[1-8][0-9]|90)\b/); if(m) return Number(m[1]);
    if(text.includes('quatre vingt dix')) return 90;
    if(text.includes('quatre vingt')){ const u = unitAfter(text,'quatre vingt'); return 80 + u; }
    if(text.includes('soixante dix')){ const u = unitAfter(text,'soixante dix'); return 70 + u; }
    for(const [k,v] of Object.entries(words)){ if(text.includes(k)) return v; }
    return null;
  }
  function unitAfter(text, pattern){
    const part = text.split(pattern)[1] || '';
    for(const [k,v] of Object.entries(words)){ if(v<10 && part.includes(k)) return v; }
    return 0;
  }
  async function handle(text){
    text = (text || '').toLowerCase();
    if(text.includes('fermer affichage') || text.includes('fermer carton')) return Loto.hidePublicCard();
    if(text.includes('annuler dernier')) return Loto.undoLast();
    if(text.includes('erreur')) { firstHeard = null; return Loto.cancelPending(); }
    const n = parseNumber(text); if(!n) return;
    if(firstHeard === n){ firstHeard = null; await Loto.setPendingNumber(n); return; }
    firstHeard = n;
  }
  function supported(){ return window.SpeechRecognition || window.webkitSpeechRecognition; }
  function start(onStatus){
    const SR = supported(); if(!SR) { onStatus && onStatus(false, 'Reconnaissance vocale non disponible'); return; }
    if(active) return;
    recognition = new SR(); recognition.lang = 'fr-FR'; recognition.continuous = true; recognition.interimResults = false;
    recognition.onresult = e => { for(let i=e.resultIndex;i<e.results.length;i++){ if(e.results[i].isFinal) handle(e.results[i][0].transcript); } };
    recognition.onend = () => { if(active) { try{ recognition.start(); }catch{} } };
    recognition.onerror = () => {};
    active = true; try{ recognition.start(); }catch{}
    onStatus && onStatus(true);
  }
  function stop(onStatus){ active = false; firstHeard = null; try{ recognition && recognition.stop(); }catch{} onStatus && onStatus(false); }
  function toggle(onStatus){ active ? stop(onStatus) : start(onStatus); }
  window.LotoVoice = { start, stop, toggle, isActive:()=>active, parseNumber };
})();
