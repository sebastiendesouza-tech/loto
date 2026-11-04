(function(){
  let recognition=null, engineRunning=false, processingEnabled=false;
  let lastVoiceNumber=null,lastVoiceAt=0,mutedUntil=0;
  let mode=localStorage.getItem('loto_voice_mode')||'le';
  const REECOUTE_DELAY_MS=350,SAME_NUMBER_GUARD_MS=5000,INTERIM_STABLE_MS=500;
  let interimTimer=null,interimCandidate=null;
  function clearInterim(){clearTimeout(interimTimer);interimTimer=null;interimCandidate=null;}
  const units=['','un','deux','trois','quatre','cinq','six','sept','huit','neuf'];
  const teens={10:'dix',11:'onze',12:'douze',13:'treize',14:'quatorze',15:'quinze',16:'seize',17:'dix sept',18:'dix huit',19:'dix neuf'};
  const tens={20:'vingt',30:'trente',40:'quarante',50:'cinquante',60:'soixante'};
  function norm(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/-/g,' ').replace(/\s+/g,' ').trim();}
  function frenchNumber(n){n=Number(n);if(n<10)return units[n];if(n<20)return teens[n];if(n<70){const t=Math.floor(n/10)*10,u=n%10;if(!u)return tens[t];if(u===1)return tens[t]+' et un';return tens[t]+' '+units[u];}if(n<80){if(n===71)return 'soixante et onze';return 'soixante '+frenchNumber(n-60);}if(n===80)return 'quatre vingts';if(n<90)return 'quatre vingt '+units[n-80];if(n===90)return 'quatre vingt dix';return '';}
  const phraseToNumber=new Map();for(let n=1;n<=90;n++){const phrase=frenchNumber(n),variants=new Set([phrase,phrase.replace(/ et /g,' ')]);if(n===80)variants.add('quatre vingt');if(n===81)variants.add('quatre vingt et un');variants.forEach(v=>phraseToNumber.set(norm(v),n));}
  const alt=Array.from(phraseToNumber.keys()).sort((a,b)=>b.length-a.length).map(v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const wordRegex=new RegExp('\\b('+alt+')\\b','g');
  function extractNumbers(text){const t=norm(text),found=[];let m;const dr=/\b([1-9]|[1-8][0-9]|90)\b/g;while((m=dr.exec(t)))found.push({index:m.index,n:Number(m[1])});while((m=wordRegex.exec(t))){const n=phraseToNumber.get(norm(m[1]));if(n)found.push({index:m.index,n});}found.sort((a,b)=>a.index-b.index);return found.map(x=>x.n);}
  function keywordAccepted(t){if(mode==='free')return true;if(mode==='numero')return /\bnumero\b/.test(t);return /\ble\b/.test(t);}
  async function validateVoiceNumber(n){const now=Date.now();if(!processingEnabled||now<mutedUntil)return;if(lastVoiceNumber===n&&now-lastVoiceAt<SAME_NUMBER_GUARD_MS)return;lastVoiceNumber=n;lastVoiceAt=now;clearInterim();mutedUntil=now+REECOUTE_DELAY_MS;await Loto.setPendingNumber(n);}
  async function handle(text){if(!processingEnabled||Date.now()<mutedUntil)return;const t=norm(text);if(!t||!keywordAccepted(t))return;const nums=extractNumbers(t);if(!nums.length)return;await validateVoiceNumber(nums[0]);}
  function supported(){return window.SpeechRecognition||window.webkitSpeechRecognition;}
  function ensureEngine(onStatus){
    const SR=supported();
    if(!SR){onStatus&&onStatus(false,'Reconnaissance vocale non disponible');return false;}
    if(engineRunning)return true;
    recognition=new SR();
    let lastFinalIndex=-1;
    const handledResultIndexes=new Set();
    function accept(index,text){
      if(handledResultIndexes.has(index)||!processingEnabled||Date.now()<mutedUntil)return;
      const t=norm(text);
      if(!keywordAccepted(t)||!extractNumbers(t).length)return;
      handledResultIndexes.add(index);
      clearInterim();
      void handle(t);
    }
    recognition.lang='fr-FR';
    recognition.continuous=true;
    recognition.interimResults=true;
    recognition.onstart=()=>{
      clearInterim();
      lastFinalIndex=-1;
      handledResultIndexes.clear();
      engineRunning=true;
      onStatus&&onStatus(processingEnabled,processingEnabled?'reconnaissance active':'reconnaissance en pause');
    };
    recognition.onresult=e=>{
      for(let i=e.resultIndex;i<e.results.length;i++){
        const result=e.results[i];
        if(handledResultIndexes.has(i)||i<=lastFinalIndex)continue;
        const text=norm(result[0]?.transcript||'');
        if(result.isFinal){
          lastFinalIndex=i;
          clearInterim();
          accept(i,text);
          continue;
        }
        if(!processingEnabled||Date.now()<mutedUntil){clearInterim();continue;}
        // Restart the stability delay on every text revision: "le 9" may
        // still become "le 90". Consume each speech segment only once.
        if(interimCandidate?.index===i&&interimCandidate.text===text)continue;
        clearInterim();
        if(!keywordAccepted(text)||!extractNumbers(text).length)continue;
        interimCandidate={index:i,text};
        interimTimer=setTimeout(()=>accept(i,text),INTERIM_STABLE_MS);
      }
    };
    recognition.onend=()=>{
      clearInterim();
      if(!engineRunning)return;
      try{recognition.start();}catch{}
    };
    recognition.onerror=e=>{
      clearInterim();
      const msg=e?.error||'erreur micro';
      if(msg==='aborted')return;
      if(msg!=='no-speech'){
        engineRunning=false;processingEnabled=false;
        try{recognition.abort();}catch{}
      }
      onStatus&&onStatus(processingEnabled,msg);
    };
    engineRunning=true;
    try{recognition.start();return true;}
    catch{engineRunning=false;processingEnabled=false;onStatus&&onStatus(false,'démarrage impossible');return false;}
  }
  function resume(onStatus){if(!ensureEngine(onStatus))return;processingEnabled=true;clearInterim();onStatus&&onStatus(true,'reconnaissance active');}
  function pause(onStatus){processingEnabled=false;clearInterim();lastVoiceNumber=null;onStatus&&onStatus(false,'reconnaissance en pause');}
  function toggle(onStatus){processingEnabled?pause(onStatus):resume(onStatus);}
  function setMode(v){mode=['free','le','numero'].includes(v)?v:'le';localStorage.setItem('loto_voice_mode',mode);clearInterim();}
  window.LotoVoice={start:resume,stop:pause,toggle,pause,resume,isActive:()=>processingEnabled,isEngineRunning:()=>engineRunning,setMode,getMode:()=>mode,parseNumber:text=>extractNumbers(text)[0]||null,extractNumbers,REECOUTE_DELAY_MS,SAME_NUMBER_GUARD_MS,INTERIM_STABLE_MS};
})();
