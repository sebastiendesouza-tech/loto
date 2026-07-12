(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));
  function set(id,value){const el=$(id);if(el)el.textContent=value;}
  function fmtDate(v){if(!v)return 'Non renseignée';try{return new Date(v+'T12:00:00').toLocaleDateString('fr-FR')}catch{return v}}
  function renderState(s){
    const p=s.program||{};
    set('dashLotoName',p.title||'Aucun loto lancé');
    set('dashLotoDate',fmtDate(p.date));
    set('dashParties',(p.parties||[]).length||0);
    set('dashDrawn',(s.drawnNumbers||[]).length);
    set('dashCurrent',Loto.lastNumber?.()||'—');
    set('dashSalesMode',Loto.programSettings(p).salesTrackingEnabled?'Activé':'Désactivé');
    const status=$('dashLotoStatus'); if(status){status.textContent=p.id?'Loto actif':'Aucun loto actif';status.className='dashboard-status '+(p.id?'good':'neutral');}
    set('dashSync',s.updatedAt?new Date(s.updatedAt).toLocaleTimeString('fr-FR'):'—');
  }
  async function refreshStats(){
    const client=Loto.supabaseClient,s=Loto.state(),p=s.program||{},lotoId=p.id||s.sessionCode||Loto.code();
    if(!client){set('dashDbState','Supabase non configuré');return;}
    const [{count:created,error:e1},{data:sales,error:e2}]=await Promise.all([
      client.from('loto_cartons').select('numero',{count:'exact',head:true}).eq('actif',true).eq('origine','Loto by SdS'),
      client.from('loto_carton_sales').select('status').eq('loto_id',lotoId)
    ]);
    if(e1||e2){set('dashDbState','Lecture impossible');return;}
    const sold=(sales||[]).filter(x=>x.status==='vendu').length;
    set('dashCreated',created||0);set('dashSold',sold);set('dashAvailable',Math.max(0,(created||0)-sold));set('dashDbState','Connectée');
  }
  function issue(level,title,detail){return `<div class="integrity-row ${level}"><b>${esc(title)}</b><span>${esc(detail)}</span></div>`}
  async function runIntegrity(){
    const out=$('integrityResults'),btn=$('runIntegrity'); if(!out||!btn)return;
    btn.disabled=true;out.innerHTML='<p>Contrôle en cours…</p>';
    const client=Loto.supabaseClient;
    if(!client){out.innerHTML=issue('warn','Supabase non configuré','Contrôle local uniquement impossible.');btn.disabled=false;return;}
    try{
      const {data,error}=await client.from('loto_cartons').select('numero,carton_code,qr_payload,origine,actif,grille,numbers_signature').limit(12000);
      if(error)throw error;
      const rows=data||[], dup=(key)=>{const seen=new Set(),d=[];for(const r of rows){const v=r[key];if(v==null||v==='')continue;if(seen.has(String(v)))d.push(v);else seen.add(String(v));}return d;};
      const dupNum=dup('numero'),dupCode=dup('carton_code'),dupQr=dup('qr_payload');
      const noOrigin=rows.filter(r=>!r.origine).length;
      const archived=rows.filter(r=>r.actif===false).length;
      const invalidGrid=rows.filter(r=>{const g=r.grille;if(!Array.isArray(g))return true;const nums=g.flat?.().map(Number).filter(n=>n>0)||[];return nums.length!==15||new Set(nums).size!==15||nums.some(n=>n<1||n>90);}).length;
      let html='';
      html+=issue(dupNum.length?'error':'ok','Identifiants internes',dupNum.length?`${dupNum.length} doublon(s) détecté(s).`:'Aucun doublon.');
      html+=issue(dupCode.length?'error':'ok','Codes cartons',dupCode.length?`${dupCode.length} doublon(s) détecté(s).`:'Codes uniques.');
      html+=issue(dupQr.length?'error':'ok','QR codes',dupQr.length?`${dupQr.length} doublon(s) détecté(s).`:'QR codes uniques.');
      html+=issue(invalidGrid?'warn':'ok','Grilles',invalidGrid?`${invalidGrid} grille(s) à vérifier. Le loto n’est pas bloqué.`:'Toutes les grilles contrôlées sont cohérentes.');
      html+=issue(noOrigin?'warn':'ok','Origine des cartons',noOrigin?`${noOrigin} carton(s) sans origine. Ils peuvent être exclus du suivi des ventes.`:'Origines renseignées.');
      html+=issue('info','Cartons archivés',`${archived} carton(s) archivé(s). Information uniquement.`);
      out.innerHTML=html+'<p class="muted">Ce rapport est informatif. Il ne bloque aucune fonction du loto.</p>';
    }catch(e){out.innerHTML=issue('warn','Contrôle incomplet',e.message||String(e));}
    btn.disabled=false;
  }
  $('runIntegrity')?.addEventListener('click',runIntegrity);
  $('refreshDashboard')?.addEventListener('click',refreshStats);
  Loto.onChange(s=>{Loto.pageHeader();renderState(s);});
  Loto.ensureSession().then(()=>{renderState(Loto.state());refreshStats();});
  Loto.protectPage();
})();
