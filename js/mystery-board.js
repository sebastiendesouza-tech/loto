(function(){
  const busy=new WeakSet();
  function render(container,{state=Loto.state(),interactive=false}={}){
    const info=Loto.mysteryState(state);
    if(!info.active)return;
    if(info.travel){
      container.innerHTML='<div class="mystery-travel"><small>SUPER QUINE · VOYAGE</small><strong>Séjour au Cap</strong><span>Carton plein</span></div>';
      return;
    }
    const canPick=interactive&&info.awaitingChoice;
    container.innerHTML=`<div class="mystery-board" aria-label="Neuf cartons mystères">${Array.from({length:9},(_,i)=>{
      const slot=i+1,selected=info.selected.includes(slot),label='Carton '+slot+(selected?' · déjà choisi':' · disponible');
      return canPick?`<button type="button" class="mystery-card ${selected?'chosen':'available'}" data-mystery-slot="${slot}" aria-label="${label}" ${selected||busy.has(container)?'disabled':''}><b>${slot}</b></button>`:`<div class="mystery-card ${selected?'chosen':'available'}" aria-label="${label}"><b>${slot}</b></div>`;
    }).join('')}</div>`;
    container.querySelectorAll('[data-mystery-slot]').forEach(button=>{
      button.onclick=async()=>{
        if(button.disabled||busy.has(container))return;
        const slot=Number(button.dataset.mysterySlot);
        busy.add(container);container.querySelectorAll('[data-mystery-slot]').forEach(button=>button.disabled=true);
        const before=Loto.state();
        const sameRound=()=>{
          const now=Loto.state();
          return now.gameActive&&!now.gameEnded&&now.program?.id===before.program?.id&&Number(now.currentPartieIndex||0)===Number(before.currentPartieIndex||0)&&now._syncRoundId===before._syncRoundId&&Loto.mysteryState(now).assigned===slot;
        };
        try{
          const chosen=await Loto.pickMysteryCard(slot);
          if(chosen===false||!sameRound())return;
          const next=Number(before.currentPartieIndex||0)+1;
          const question=next<(before.program?.parties||[]).length?'Passer à la partie n°'+(next+1)+' ?':'Terminer cette partie ?';
          if(confirm(question+'\nLes numéros du tirage seront remis à zéro.')&&sameRound())await Loto.winner();
        }
        finally{busy.delete(container);if(Loto.mysteryState().active)render(container,{state:Loto.state(),interactive});}
      };
    });
  }
  window.LotoMysteryBoard={render};
})();
