(function(){
  const toggle=document.getElementById('showCommissaireScanner');
  if(!toggle)return;
  Loto.onChange(state=>{toggle.checked=!!state.options?.showCommissaireScanner;});
  toggle.addEventListener('change',async()=>{
    const enabled=toggle.checked;
    await Loto.save({options:{...Loto.state().options,showCommissaireScanner:enabled}});
    const message=document.getElementById('saveMsg');
    if(message){
      message.style.display='block';message.className='notice ok-note';
      message.textContent=enabled?'Bouton « Scanner un carton » affiché sur la page commissaire.':'Bouton « Scanner un carton » masqué sur la page commissaire.';
    }
  });
})();
