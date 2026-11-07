(function(){
  const toggle=document.getElementById('showCommissaireScanner');
  const series=document.getElementById('cardSeries');
  Loto.onChange(state=>{
    if(toggle)toggle.checked=!!state.options?.showCommissaireScanner;
    if(series)series.value=String(state.options?.cardSeries)==='102000'?'102000':'101000';
  });
  async function saveOption(key,value,text){
    await Loto.save({options:{...Loto.state().options,[key]:value}});
    const message=document.getElementById('saveMsg');
    if(message){message.style.display='block';message.className='notice ok-note';message.textContent=text;}
  }
  if(toggle)toggle.addEventListener('change',()=>{
    const enabled=toggle.checked;
    return saveOption('showCommissaireScanner',enabled,enabled?'Bouton « Scanner un carton » affiché sur la page commissaire.':'Bouton « Scanner un carton » masqué sur la page commissaire.');
  });
  if(series)series.addEventListener('change',()=>{
    const value=series.value==='102000'?'102000':'101000';
    return saveOption('cardSeries',value,'Série '+value+' à '+(Number(value)+999)+' utilisée pour le contrôle des cartons.');
  });
})();
