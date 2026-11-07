/* Card inventory: read the database without changing the current draw. */
(function(){
  const el=id=>document.getElementById(id),root=el('cardManager');if(!root)return;
  const size=25,escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let sheetRequest=0;
  let page=0,rows=[],hasMore=false,loading=false,request=0,mutation=false,opened=false,selected=null;
  const status=text=>{el('cardManagerStatus').textContent=text;};
  function controls(){
    root.querySelectorAll('button').forEach(button=>button.disabled=loading||mutation);
    el('cardManagerPrevious').disabled=loading||mutation||page===0;
    el('cardManagerNext').disabled=loading||mutation||!hasMore;
  }
  function failure(error){return error?.message||'Connexion indisponible. Réessayez avec Internet.';}
  async function load(){
    const token=++request;opened=true;
    const client=Loto.supabaseClient;
    if(!client){status('Connexion aux cartons indisponible. Vérifiez Internet puis relancez la recherche.');return;}
    loading=true;controls();status('Chargement des cartons…');
    try{
      let query=client.from('loto_cartons').select('numero,carton_code,external_code,serie,actif,status,lignes,grille,sheet_code,sheet_position,support_type').order('numero',{ascending:true});
      const term=el('cardManagerQuery').value.trim(),series=el('cardManagerSeries').value.trim(),filter=el('cardManagerState').value;
      // Never interpolate arbitrary PostgREST syntax from a search field.
      if(term){
        if(!/^[\p{L}\p{N} _-]+$/u.test(term))throw new Error('Utilisez des lettres, chiffres, espaces ou tirets pour la recherche.');
        const alternatives=['carton_code.ilike.*'+term+'*','external_code.ilike.*'+term+'*','sheet_code.ilike.*'+term+'*'];
        if(/^\d+$/.test(term)&&Number.isSafeInteger(Number(term)))alternatives.unshift('numero.eq.'+Number(term));
        query=query.or(alternatives.join(','));
      }
      if(series)query=query.eq('serie',series);
      if(el('cardManagerType').value==='six')query=query.or('support_type.eq.P6,serie.eq.IMPORT_PLANCHE_6');
      if(filter==='active')query=query.eq('actif',true);
      if(filter==='archived')query=query.eq('actif',false);
      const {data,error}=await query.range(page*size,page*size+size);
      if(token!==request)return;if(error)throw error;
      if(!Array.isArray(data))throw new Error('Liste des cartons indisponible.');
      hasMore=data.length>size;rows=data.slice(0,size);
      el('cardManagerRows').innerHTML=rows.map((card,index)=>`<tr><td>${escape(card.external_code||card.carton_code||card.numero)}</td><td class="card-manager-numbers">${(card.lignes||[]).map(line=>'<span>'+line.map(n=>escape(String(n).padStart(2,'0'))).join(' · ')+'</span>').join('')}</td><td>${escape(card.sheet_code||(card.serie==='IMPORT_PLANCHE_6'?'Planche de 6':card.support_type==='P6'?'Planche de 6':'Individuel'))}${card.sheet_position?'<small>Carton '+escape(card.sheet_position)+'</small>':''}${card.sheet_code?'<button type="button" class="secondary" data-card-sheet="'+index+'">Voir la planche</button>':''}</td><td>${escape(card.serie||'—')}</td><td>${card.actif===false?'Archivé':'Actif'}</td><td><div class="card-manager-actions"><button type="button" data-card-view="${index}">Voir / contrôler</button><button type="button" class="${card.actif===false?'green':'red'}" data-card-change="${index}">${card.actif===false?'Restaurer':'Supprimer'}</button></div></td></tr>`).join('');
      el('cardManagerRows').querySelectorAll('[data-card-view]').forEach(button=>button.onclick=()=>show(rows[Number(button.dataset.cardView)]));
      el('cardManagerRows').querySelectorAll('[data-card-sheet]').forEach(button=>button.onclick=()=>showSheet(rows[Number(button.dataset.cardSheet)]));
      el('cardManagerRows').querySelectorAll('[data-card-change]').forEach(button=>button.onclick=()=>change(rows[Number(button.dataset.cardChange)]));
      el('cardManagerPage').textContent='Page '+(page+1);
      status(rows.length?`${rows.length} carton(s) affiché(s)${hasMore?' · suite à la page suivante':''}.`:'Aucun carton trouvé.');
    }catch(error){if(token===request){rows=[];hasMore=false;el('cardManagerRows').innerHTML='';status(failure(error));}}
    finally{if(token===request){loading=false;controls();}}
  }
  function show(card){
    if(!card)return;++sheetRequest;selected=card;const detail=el('cardManagerDetail'),result=Loto.checkCard(card);
    const drawn=new Set([...(Loto.state().drawnNumbers||[]),...(Loto.state().pendingNumber?[Loto.state().pendingNumber]:[])].map(Number));
    const label=card.external_code||card.carton_code||card.numero;
    const inPlay=!!Loto.state().gameActive;
    const resultLabel=result.loserMode?(result.stillInGame?'Encore en jeu':'Éliminé'):(result.valid?'Gain valide':'Non valide');
    detail.hidden=false;detail.innerHTML=`<div class="card-manager-detail-heading"><div><h4>Carton ${escape(label)}</h4><p>Numéro : ${escape(card.numero)} · Série : ${escape(card.serie||'—')} · ${card.actif===false?'Archivé':'Actif'}</p></div><button type="button" id="cardManagerClose" class="secondary">Fermer</button></div><div class="card-manager-grid">${Loto.cardGridRows(card).map(line=>line.map(n=>`<span class="${n===null?'empty':drawn.has(Number(n))?'hit':''}">${n===null?'':String(n).padStart(2,'0')}</span>`).join('')).join('')}</div>${inPlay?`<p><b>${escape(Loto.cardControlMode(result))} : ${escape(resultLabel)}</b>${Loto.cardFailureReasons(result).map(reason=>' · '+escape(reason)).join('')}</p><p class="muted">Contrôle des numéros du tirage en cours. La vente du carton et le dernier joueur debout sont vérifiés dans la salle.</p>`:'<p class="muted">Aucune partie en cours. La grille enregistrée est affichée.</p>'}`;
    el('cardManagerClose').onclick=()=>{++sheetRequest;selected=null;detail.hidden=true;};
    detail.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  }
  async function showSheet(card){
    if(!card?.sheet_code)return;
    const token=++sheetRequest;selected=null;
    const detail=el('cardManagerDetail');detail.hidden=false;detail.textContent='Chargement de la planche…';
    try{
      const {data,error}=await Loto.supabaseClient.from('loto_cartons').select('numero,external_code,carton_code,lignes,grille,actif,sheet_position').eq('sheet_code',card.sheet_code).order('sheet_position',{ascending:true});
      if(token!==sheetRequest)return;if(error)throw error;
      if(!data?.length)throw new Error('Planche introuvable.');
      detail.innerHTML=`<div class="card-manager-detail-heading"><h4>Planche ${escape(card.sheet_code)} · ${data.length} carton(s)</h4><button id="cardManagerClose" type="button" class="secondary">Fermer</button></div><div class="card-manager-sheet">${data.map(row=>`<article><h4>${escape(row.external_code||row.carton_code||row.numero)}${row.actif===false?' · Archivé':''}</h4><div class="card-manager-grid">${Loto.cardGridRows(row).flat().map(n=>`<span class="${n===null?'empty':''}">${n===null?'':String(n).padStart(2,'0')}</span>`).join('')}</div></article>`).join('')}</div>`;
      el('cardManagerClose').onclick=()=>{++sheetRequest;detail.hidden=true;};
      detail.scrollIntoView?.({block:'nearest',behavior:'smooth'});
    }catch(error){if(token===sheetRequest){detail.hidden=true;status(failure(error));}}
  }
  async function change(card){
    if(mutation||loading||!card)return;
    const restore=card.actif===false,label=card.external_code||card.carton_code||card.numero;
    const question=restore?`Restaurer le carton ${label} ?`:`Supprimer le carton ${label} de la liste active ?\nIl sera archivé et pourra être restauré. Son numéro restera réservé.`;
    if(!confirm(question))return;
    mutation=true;controls();
    try{
      const patch={actif:restore,status:restore?'disponible':'archive',updated_at:new Date().toISOString()};
      const {data,error}=await Loto.supabaseClient.from('loto_cartons').update(patch).eq('numero',card.numero).eq('actif',!restore).select('numero');
      if(error)throw error;if(!data?.length)throw new Error('Le carton a changé ou la modification est refusée. Relancez la recherche.');
      selected=null;el('cardManagerDetail').hidden=true;
      if(rows.length===1&&page>0)page--;
      await load();status(`Carton ${label} ${restore?'restauré':'archivé'}.`);
    }catch(error){status(failure(error));}
    finally{mutation=false;controls();}
  }
  el('cardManagerSearch').onsubmit=event=>{event.preventDefault();if(mutation)return;page=0;++sheetRequest;selected=null;el('cardManagerDetail').hidden=true;void load();};
  el('cardManagerPrevious').onclick=()=>{if(!loading&&!mutation&&page>0){page--;void load();}};
  el('cardManagerNext').onclick=()=>{if(!loading&&!mutation&&hasMore){page++;void load();}};
  document.querySelector('[data-tab="cartons"]')?.addEventListener('click',()=>{if(!loading&&!mutation)void load();});
  Loto.onChange(()=>{if(selected)show(selected);});
  if(document.getElementById('cartons')?.classList.contains('active'))void load();
})();
