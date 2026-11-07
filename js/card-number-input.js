(function(){
  function bind(input,prefixElement){
    let prefix=null;
    function clearError(){input.setCustomValidity('');}
    function invalid(message){input.setCustomValidity(message);input.reportValidity();input.focus();}
    Loto.onChange(state=>{
      const next=Loto.cardNumberPrefix(state);
      if(next===prefix)return;
      prefix=next;prefixElement.textContent=prefix;input.value='';clearError();
      input.setAttribute('aria-label','Trois derniers chiffres du carton, série '+prefix);
    });
    input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(0,3);clearError();};
    input.onpaste=event=>{
      const digits=(event.clipboardData?.getData('text')||'').replace(/\D/g,'');
      if(digits.length<=3)return;
      event.preventDefault();
      if(digits.length===6&&digits.startsWith(prefix)){input.value=digits.slice(3);clearError();}
      else{input.value='';invalid('Collez un numéro de 6 chiffres commençant par '+prefix+', ou saisissez les 3 derniers chiffres.');}
    };
    return {
      read(){
        const suffix=input.value.trim();
        if(!/^\d{3}$/.test(suffix)){invalid('Saisissez exactement les 3 derniers chiffres du carton.');return null;}
        clearError();return prefix+suffix;
      },
      setFullNumber(value){
        const code=String(value||'').trim();
        input.value=/^\d{6}$/.test(code)&&code.startsWith(prefix)?code.slice(3):'';clearError();
      }
    };
  }
  window.LotoCardNumberInput={bind};
})();
