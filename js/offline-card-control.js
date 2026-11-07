/* Public PC backup: cache the actual active cards and sales before a cutoff. */
(function(){
  const CACHE_PREFIX='loto_offline_cards_v1:';
  let flight=null,lastAttempt=0,lastKey='',lastSales=false,snapshot=null;
  function context(){
    const state=Loto.state(),lotoId=state.program?.id||state.sessionCode||Loto.code();
    const sales=!!state.program?.sales_tracking_enabled;
    return {lotoId,sales,key:CACHE_PREFIX+encodeURIComponent(Loto.C.SUPABASE_URL||'local')+':'+encodeURIComponent(lotoId)};
  }
  function load(ctx){
    if(lastKey!==ctx.key||lastSales!==ctx.sales){
      lastKey=ctx.key;lastSales=ctx.sales;lastAttempt=0;snapshot=null;
      try{snapshot=JSON.parse(localStorage.getItem(ctx.key)||'null');}catch{}
    }
    return snapshot;
  }
  async function pages(table,filter){
    const rows=[];
    for(let offset=0;;offset+=500){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      try{
        const query=filter(Loto.supabaseClient.from(table).select(table==='loto_cartons'?'numero,serie,lignes,grille':'numero'));
        const {data,error}=await query.order('numero',{ascending:true}).range(offset,offset+499).abortSignal(controller.signal);
        if(error)throw error;
        if(!Array.isArray(data))throw new Error('Liste de cartons indisponible');
        rows.push(...data);if(data.length<500)return rows;
      }finally{clearTimeout(timer);}
    }
  }
  async function prepare(){
    const ctx=context();load(ctx);
    if(flight||!Loto.supabaseClient||!Loto.syncStatus().connected)return;
    if(lastAttempt&&Date.now()-lastAttempt<60000)return;
    lastAttempt=Date.now();
    flight=(async()=>{
      try{
        const cards=await pages('loto_cartons',query=>query.eq('actif',true));
        const sales=ctx.sales?await pages('loto_carton_sales',query=>query.eq('loto_id',ctx.lotoId).eq('status','vendu')):null;
        const next={lotoId:ctx.lotoId,cards,sales,at:Date.now()};
        // Keep the previous complete snapshot if storage fails or a request fails.
        localStorage.setItem(ctx.key,JSON.stringify(next));
        if(context().key===ctx.key)snapshot=next;
      }catch(error){console.warn('Préparation du contrôle hors connexion indisponible.',error);}
      finally{flight=null;if(context().key!==ctx.key)void prepare();}
    })();
    await flight;
  }
  async function control(numero){
    const ctx=context(),cached=load(ctx),state=Loto.state();
    const missing=Loto.knownMissingCardMessage(numero);
    if(missing)return {found:false,numero,message:missing};
    const card=cached?.cards?.find(card=>String(card.numero)===String(numero));
    if(!card)return {found:false,numero,message:'Carton '+numero+' non disponible dans le cache du PC. Préparez les cartons avec une connexion Internet avant la coupure.'};
    if(ctx.sales&&!Array.isArray(cached.sales))return {found:false,numero,message:'Le suivi des ventes de ce loto n’est pas disponible dans le cache du PC.'};
    const result=Loto.checkCard(card);
    result.salesTrackingEnabled=ctx.sales;
    const sold=new Set((cached.sales||[]).map(row=>Number(row.numero)));
    result.soldForCurrentLoto=!ctx.sales||sold.has(Number(card.numero));
    result.salesStatus=ctx.sales?(result.soldForCurrentLoto?'vendu':'non_vendu'):'non_controle';
    result.offlineControl=true;result.offlineCacheAt=cached.at;
    if(!result.soldForCurrentLoto){result.valid=false;result.reason='Carton non vendu pour ce loto';}
    if(result.loserMode&&result.stillInGame){
      result.winnerCheckAvailable=false;
      if(ctx.sales&&result.soldForCurrentLoto){
        const cards=cached.cards.filter(card=>sold.has(Number(card.numero)));
        if(cards.length===sold.size){
          const drawn=new Set([...(state.drawnNumbers||[]),...(state.pendingNumber?[state.pendingNumber]:[])].map(Number));
          const remaining=cards.filter(card=>(card.lignes||[]).flat().every(n=>!drawn.has(Number(n))));
          result.remainingCards=remaining.length;result.winnerCheckAvailable=true;
          result.winnerEligible=remaining.length===1&&Number(remaining[0].numero)===Number(card.numero);
          if(result.winnerEligible){result.valid=true;result.reason='Dernier carton en jeu';}
        }
      }
    }
    await Loto.save({checkedCards:[{...result,at:new Date().toISOString()},...(state.checkedCards||[])].slice(0,50)});
    return {found:true,result};
  }
  Loto.onChange(()=>{load(context());void prepare();});
  Loto.onSyncChange(()=>{void prepare();});
  window.LotoOfflineCards={prepare,control};
})();
