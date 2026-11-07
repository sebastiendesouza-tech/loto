(function(){
  const esc=text=>String(text??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  const busy=new WeakSet();
  function render(container,{state=Loto.state(),interactive=false}={}){
    const info=Loto.mysteryState(state);
    if(!info.active)return;
    if(info.travel){
      container.innerHTML='<div class="mystery-travel"><small>10e LOT · VOYAGE</small><strong>Séjour au Cap</strong><span>Carton plein</span></div>';
      return;
    }
    const canPick=interactive&&info.awaitingChoice;
    container.innerHTML=`<div class="mystery-board" aria-label="Neuf cartons mystères">${Array.from({length:9},(_,i)=>{
      const slot=i+1,selected=info.selected.includes(slot),label='Carton '+slot+(selected?' · déjà choisi':' · disponible');
      return canPick?`<button type="button" class="mystery-card ${selected?'chosen':'available'}" data-mystery-slot="${slot}" aria-label="${label}" ${selected||busy.has(container)?'disabled':''}><b>${slot}</b></button>`:`<div class="mystery-card ${selected?'chosen':'available'}" aria-label="${label}"><b>${slot}</b></div>`;
    }).join('')}</div>${info.lastSlot?`<div class="mystery-last-choice">Carton ${info.lastSlot} : <strong>${esc(info.prizes[info.lastSlot-1]?.label||'Lot mystère')}</strong></div>`:''}`;
    container.querySelectorAll('[data-mystery-slot]').forEach(button=>{
      button.onclick=async()=>{
        if(button.disabled||busy.has(container))return;
        const slot=Number(button.dataset.mysterySlot);
        if(!confirm('Attribuer le carton mystère n°'+slot+' ?\n'+(info.prizes[slot-1]?.label||'Lot mystère')) )return;
        busy.add(container);container.querySelectorAll('[data-mystery-slot]').forEach(button=>button.disabled=true);
        try{await Loto.pickMysteryCard(slot);}
        finally{busy.delete(container);if(Loto.mysteryState().active)render(container,{state:Loto.state(),interactive});}
      };
    });
  }
  window.LotoMysteryBoard={render};
})();
