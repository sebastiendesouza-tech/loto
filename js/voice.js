(function(){
  let recognition=null, engineRunning=false, processingEnabled=false;
  let lastVoiceNumber=null,lastVoiceAt=0;
  let mode=localStorage.getItem('loto_voice_mode')||'le';
  const REECOUTE_DELAY_MS=0,SAME_NUMBER_GUARD_MS=5000,INTERIM_STABLE_MS=200;
  let interimTimer=null,interimCandidate=null,keywordContext=null;
  function clearInterim(){clearTimeout(interimTimer);interimTimer=null;interimCandidate=null;}
  function clearSpeechContext(){clearInterim();keywordContext=null;}
  const units=['','un','deux','trois','quatre','cinq','six','sept','huit','neuf'];
  const teens={10:'dix',11:'onze',12:'douze',13:'treize',14:'quatorze',15:'quinze',16:'seize',17:'dix sept',18:'dix huit',19:'dix neuf'};
  const tens={20:'vingt',30:'trente',40:'quarante',50:'cinquante',60:'soixante'};
  function norm(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/-/g,' ').replace(/\s+/g,' ').trim();}
  function frenchNumber(n){n=Number(n);if(n<10)return units[n];if(n<20)return teens[n];if(n<70){const t=Math.floor(n/10)*10,u=n%10;if(!u)return tens[t];if(u===1)return tens[t]+' et un';return tens[t]+' '+units[u];}if(n<80){if(n===71)return 'soixante et onze';return 'soixante '+frenchNumber(n-60);}if(n===80)return 'quatre vingts';if(n<90)return 'quatre vingt '+units[n-80];if(n===90)return 'quatre vingt dix';return '';}
  const phraseToNumber=new Map();for(let n=1;n<=90;n++){const phrase=frenchNumber(n),variants=new Set([phrase,phrase.replace(/ et /g,' ')]);if(n===80)variants.add('quatre vingt');if(n===81)variants.add('quatre vingt et un');variants.forEach(v=>phraseToNumber.set(norm(v),n));}
  const alt=Array.from(phraseToNumber.keys()).sort((a,b)=>b.length-a.length).map(v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const wordRegex=new RegExp('\\b('+alt+')\\b','g');
  function extractNumbers(text){const t=norm(text),found=[];let m;const dr=/\b([1-9]|[1-8][0-9]|90)\b/g;while((m=dr.exec(t)))found.push({index:m.index,n:Number(m[1])});while((m=wordRegex.exec(t))){const n=phraseToNumber.get(norm(m[1]));if(n)found.push({index:m.index,n});}found.sort((a,b)=>a.index-b.index);return found.map(x=>x.n);}
  // An interim "7" can become "71" well after a fixed stability delay.
  // Only final transcripts may accept a number that can still be extended.
  function isNumberPrefix(n){return n<10||n===10||(n>=20&&n<=80&&n%10===0);}
  function keywordAccepted(t){if(mode==='free')return true;if(mode==='numero')return /\bnumero\b/.test(t);return /\ble\b/.test(t);}
  function commands(text){
    if(mode==='free')return [{number:extractNumbers(text)[0]}];
    const matches=[...text.matchAll(mode==='numero'?/\bnumero\b/g:/\ble\b/g)];
    return matches.map((match,index)=>({number:extractNumbers(text.slice(match.index+match[0].length,matches[index+1]?.index))[0]}));
  }
  async function validateVoiceNumber(n){
    const now=Date.now();
    if(!processingEnabled||lastVoiceNumber===n&&now-lastVoiceAt<SAME_NUMBER_GUARD_MS)return;
    lastVoiceNumber=n;lastVoiceAt=now;
    await Loto.setPendingNumber(n);
  }
  function supported(){return window.SpeechRecognition||window.webkitSpeechRecognition;}
  function ensureEngine(onStatus){
    const SR=supported();
    if(!SR){onStatus&&onStatus(false,'Reconnaissance vocale non disponible');return false;}
    if(engineRunning)return true;
    recognition=new SR();
    let lastFinalIndex=-1;
    const handledCommands=new Set();
    function accept(index,ordinal,number){
      const key=index+':'+ordinal;
      if(handledCommands.has(key)||!processingEnabled||!number)return;
      handledCommands.add(key);
      clearInterim();
      void validateVoiceNumber(number);
    }
    recognition.lang='fr-FR';
    recognition.continuous=true;
    recognition.interimResults=true;
    recognition.onstart=()=>{
      clearSpeechContext();
      lastFinalIndex=-1;
      handledCommands.clear();
      engineRunning=true;
      onStatus&&onStatus(processingEnabled,processingEnabled?'reconnaissance active':'reconnaissance en pause');
    };
    recognition.onresult=e=>{
      for(let i=e.resultIndex;i<e.results.length;i++){
        const result=e.results[i];
        if(i<=lastFinalIndex)continue;
        const raw=norm(result[0]?.transcript||'');
        let text=raw;
        // Some speech results split the keyword and number into separate segments.
        if(!keywordAccepted(raw)&&keywordContext&&Date.now()-keywordContext.at<2500
          &&(keywordContext.target===undefined||keywordContext.target===i)){
          keywordContext.target=i;text=keywordContext.prefix+' '+raw;
        }
        const announced=commands(text);
        if(!processingEnabled){
          clearSpeechContext();
          announced.forEach((command,ordinal)=>handledCommands.add(i+':'+ordinal));
          if(result.isFinal)lastFinalIndex=i;
          continue;
        }
        if(result.isFinal){
          lastFinalIndex=i;clearInterim();
          announced.forEach((command,ordinal)=>accept(i,ordinal,command.number));
          if(announced.some(command=>command.number))keywordContext=null;
          else if(mode!=='free'&&(mode==='numero'?/^numero$/:/^le(?: numero)?$/).test(raw)){
            keywordContext={prefix:raw,at:Date.now()};
          }
          continue;
        }
        // Each explicit announcement has its own slot. Chrome can append the next
        // "le ..." to a segment that already produced a previous number.
        // A following keyword closes the previous announcement, including a
        // single digit, without waiting for the service to finalize the segment.
        announced.slice(0,-1).forEach((command,ordinal)=>accept(i,ordinal,command.number));
        const ordinal=announced.length-1,number=announced[ordinal]?.number;
        if(number&&interimCandidate?.index===i&&interimCandidate.ordinal===ordinal&&interimCandidate.number===number)continue;
        clearInterim();
        if(!number||handledCommands.has(i+':'+ordinal)||isNumberPrefix(number))continue;
        interimCandidate={index:i,ordinal,number};
        interimTimer=setTimeout(()=>accept(i,ordinal,number),INTERIM_STABLE_MS);
      }
    };
    recognition.onend=()=>{
      clearSpeechContext();
      if(!engineRunning)return;
      try{recognition.start();}catch{}
    };
    recognition.onerror=e=>{
      clearSpeechContext();
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
  function resume(onStatus){if(!ensureEngine(onStatus))return;processingEnabled=true;clearSpeechContext();onStatus&&onStatus(true,'reconnaissance active');}
  function pause(onStatus){processingEnabled=false;clearSpeechContext();lastVoiceNumber=null;onStatus&&onStatus(false,'reconnaissance en pause');}
  function toggle(onStatus){processingEnabled?pause(onStatus):resume(onStatus);}
  function setMode(v){mode=['free','le','numero'].includes(v)?v:'le';localStorage.setItem('loto_voice_mode',mode);clearSpeechContext();}
  window.LotoVoice={start:resume,stop:pause,toggle,pause,resume,isActive:()=>processingEnabled,isEngineRunning:()=>engineRunning,setMode,getMode:()=>mode,parseNumber:text=>extractNumbers(text)[0]||null,extractNumbers,REECOUTE_DELAY_MS,SAME_NUMBER_GUARD_MS,INTERIM_STABLE_MS};
})();
