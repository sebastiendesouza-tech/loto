(function(){
  let recognition = null;
  let active = false;
  let firstHeard = null;
  let lastVoiceNumber = null;
  let lastVoiceAt = 0;

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = {10:'dix',11:'onze',12:'douze',13:'treize',14:'quatorze',15:'quinze',16:'seize',17:'dix sept',18:'dix huit',19:'dix neuf'};
  const tens = {20:'vingt',30:'trente',40:'quarante',50:'cinquante',60:'soixante'};

  function norm(text){
    return String(text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[’']/g,' ')
      .replace(/-/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function frenchNumber(n){
    n = Number(n);
    if(n < 10) return units[n];
    if(n < 20) return teens[n];
    if(n < 70){
      const t = Math.floor(n / 10) * 10;
      const u = n % 10;
      if(!u) return tens[t];
      if(u === 1) return tens[t] + ' et un';
      return tens[t] + ' ' + units[u];
    }
    if(n < 80){
      if(n === 71) return 'soixante et onze';
      return 'soixante ' + frenchNumber(n - 60);
    }
    if(n === 80) return 'quatre vingts';
    if(n < 90) return 'quatre vingt ' + units[n - 80];
    if(n === 90) return 'quatre vingt dix';
    return '';
  }

  const phraseToNumber = new Map();
  for(let n=1;n<=90;n++){
    const phrase = frenchNumber(n);
    const variants = new Set([phrase, phrase.replace(/ et /g, ' ')]);
    if(n === 80) variants.add('quatre vingt');
    if(n === 81) variants.add('quatre vingt et un');
    variants.forEach(v => phraseToNumber.set(norm(v), n));
  }
  const numberAlternation = Array.from(phraseToNumber.keys())
    .sort((a,b)=>b.length-a.length)
    .map(v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))
    .join('|');
  const wordRegex = new RegExp('\\b(' + numberAlternation + ')\\b','g');

  function extractNumbers(text){
    const t = norm(text);
    const found = [];
    let m;
    const digitRegex = /\b([1-9]|[1-8][0-9]|90)\b/g;
    while((m = digitRegex.exec(t))){
      found.push({ index:m.index, n:Number(m[1]) });
    }
    while((m = wordRegex.exec(t))){
      const n = phraseToNumber.get(norm(m[1]));
      if(n) found.push({ index:m.index, n });
    }
    found.sort((a,b)=>a.index-b.index);
    const result = [];
    for(const item of found){
      if(!result.length || result[result.length-1] !== item.n) result.push(item.n);
      else result.push(item.n);
    }
    return result;
  }

  async function validateVoiceNumber(n){
    const now = Date.now();
    if(lastVoiceNumber === n && now - lastVoiceAt < 1400) return;
    lastVoiceNumber = n;
    lastVoiceAt = now;
    firstHeard = null;
    await Loto.setPendingNumber(n);
  }

  async function handle(text){
    const t = norm(text);
    if(!t) return;
    if(t.includes('fermer affichage') || t.includes('fermer carton')) return Loto.hidePublicCard();
    if(t.includes('annuler dernier')) return Loto.undoLast();
    if(t.includes('erreur')) { firstHeard = null; lastVoiceNumber = null; return Loto.cancelPending(); }

    const nums = extractNumbers(t);
    if(!nums.length) return;

    // Cas le plus courant : le navigateur rend toute la phrase d'un coup : "le 22 le 22".
    for(let i=1;i<nums.length;i++){
      if(nums[i] === nums[i-1]) return validateVoiceNumber(nums[i]);
    }

    // Cas en deux résultats séparés : "le 22" puis "le 22".
    const n = nums[0];
    if(firstHeard === n) return validateVoiceNumber(n);
    firstHeard = n;
  }

  function supported(){ return window.SpeechRecognition || window.webkitSpeechRecognition; }
  function start(onStatus){
    const SR = supported();
    if(!SR) { onStatus && onStatus(false, 'Reconnaissance vocale non disponible'); return; }
    if(active) { onStatus && onStatus(true, 'écoute active'); return; }
    recognition = new SR();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { onStatus && onStatus(true, 'écoute active'); };
    recognition.onresult = e => {
      for(let i=e.resultIndex;i<e.results.length;i++){
        const transcript = e.results[i][0].transcript || '';
        // Traitement des resultats intermediaires : validation plus rapide des numeros repetes.
        handle(transcript);
      }
    };
    recognition.onend = () => { if(active) { try{ recognition.start(); }catch{} } };
    recognition.onerror = (e) => {
      const msg = e && e.error ? e.error : 'erreur micro';
      if(msg === 'not-allowed' || msg === 'service-not-allowed'){
        active = false;
        onStatus && onStatus(false, 'micro refusé');
      } else {
        onStatus && onStatus(active, msg);
      }
    };
    active = true;
    try{ recognition.start(); }
    catch(e){ active=false; onStatus && onStatus(false, 'démarrage impossible'); }
  }
  function stop(onStatus){ active = false; firstHeard = null; lastVoiceNumber = null; try{ recognition && recognition.stop(); }catch{} onStatus && onStatus(false, 'micro arrêté'); }
  function toggle(onStatus){ active ? stop(onStatus) : start(onStatus); }
  window.LotoVoice = { start, stop, toggle, isActive:()=>active, parseNumber:(text)=>extractNumbers(text)[0]||null, extractNumbers };
})();
