Loto.pageHeader();
Loto.protectPage();

document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(b.dataset.tab).classList.add('active');
});

const lotoName=document.getElementById('lotoName'),
  lotoDate=document.getElementById('lotoDate'),
  prevalidate=document.getElementById('prevalidate'),
  lastNumberRequired=document.getElementById('lastNumberRequired'),
  showLots=document.getElementById('showLots'),
  bingoEnabled=document.getElementById('bingoEnabled'),
  showBingo=document.getElementById('showBingo'),
  partiesList=document.getElementById('partiesList'),
  partieCount=document.getElementById('partieCount'),
  simulationEnabled=document.getElementById('simulationEnabled'),
  simulationSeconds=document.getElementById('simulationSeconds');

const prizeTypes=['Lot 1','Lot 2','Lot 3'];
function defaultPrize(i,label=''){return {type:prizeTypes[i],label,enabled:true};}
function defaultPartie(i){return {name:'Partie '+(i+1),gameMode:'ligne',prizes:[defaultPrize(0),defaultPrize(1),defaultPrize(2)]};}
function esc(v){return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}

function drawParties(){
  const s=Loto.state();
  const parties=s.program?.parties||[];
  partieCount.value=parties.length||Number(partieCount.value||6);
  partiesList.innerHTML=parties.map((p,i)=>{
    const mode=p.gameMode||'ligne';
    return `<div class="card partie-edit">
      <h3>Partie ${i+1}</h3>
      <div class="two-cols">
        <label>Nom<input data-p="${i}" data-f="name" value="${esc(p.name||('Partie '+(i+1)))}"></label>
        <label>Mode de jeu
          <select data-p="${i}" data-f="gameMode">
            <option value="ligne" ${mode==='ligne'?'selected':''}>À la ligne</option>
            <option value="carton" ${mode==='carton'?'selected':''}>Au carton plein</option>
          </select>
        </label>
      </div>
      <div class="three-cols">
        ${prizeTypes.map((t,pi)=>`<div><label>${t}</label><input data-p="${i}" data-prize="${pi}" placeholder="Nom du ${t.toLowerCase()}" value="${esc(p.prizes?.[pi]?.label||'')}"></div>`).join('')}
      </div>
    </div>`;
  }).join('')||'<p>Aucune partie.</p>';
}

function readProgram(){
  const s=Loto.state();
  const parties=JSON.parse(JSON.stringify(s.program?.parties||[]));
  partiesList.querySelectorAll('[data-p]').forEach(inp=>{
    const p=Number(inp.dataset.p);
    parties[p] ||= defaultPartie(p);
    parties[p].prizes ||= [defaultPrize(0),defaultPrize(1),defaultPrize(2)];
    if(inp.dataset.f==='name') parties[p].name=inp.value;
    if(inp.dataset.f==='gameMode') parties[p].gameMode=inp.value;
    if(inp.dataset.prize){
      const pi=Number(inp.dataset.prize);
      parties[p].prizes[pi] ||= defaultPrize(pi);
      parties[p].prizes[pi].type=prizeTypes[pi];
      parties[p].prizes[pi].enabled=true;
      parties[p].prizes[pi].label=inp.value;
    }
  });
  parties.forEach((partie,i)=>{
    partie.name ||= 'Partie '+(i+1);
    partie.gameMode ||= 'ligne';
    partie.prizes ||= [];
    for(let pi=0;pi<3;pi++){
      partie.prizes[pi] ||= defaultPrize(pi);
      partie.prizes[pi].type=prizeTypes[pi];
      partie.prizes[pi].enabled=true;
    }
  });
  return {title:lotoName.value||Loto.state().program?.title||'Loto',date:lotoDate.value||'',parties};
}

document.getElementById('saveGeneral').onclick=()=>Loto.save({
  lotoName:lotoName.value||'LOTO SDS',
  program:{...(Loto.state().program||{}),title:lotoName.value||'Loto',date:lotoDate.value||''},
  options:{...Loto.state().options,prevalidateSeconds:Number(prevalidate.value||6),lastNumberRequired:lastNumberRequired.checked}
});

document.getElementById('generateParties').onclick=()=>{
  let program=readProgram();
  const target=Math.max(1,Number(partieCount.value||1));
  while(program.parties.length<target) program.parties.push(defaultPartie(program.parties.length));
  program.parties=program.parties.slice(0,target);
  Loto.save({program});
};

document.getElementById('saveProgram').onclick=()=>Loto.save({
  program:readProgram(),
  currentPartieIndex:0,
  currentPrizeIndex:0,
  options:{...Loto.state().options,showLots:showLots.checked}
});

document.getElementById('saveBingo').onclick=()=>Loto.save({options:{...Loto.state().options,bingoEnabled:bingoEnabled.checked,showBingo:showBingo.checked}});
document.getElementById('saveSimulation').onclick=()=>Loto.save({simulation:{enabled:simulationEnabled.checked,seconds:Number(simulationSeconds.value||10)}});
document.getElementById('testCardBtn').onclick=async()=>{
  const n=document.getElementById('testCard').value;
  const c=await Loto.fetchCard?.(n);
  document.getElementById('testCardResult').textContent=c?JSON.stringify(c,null,2):'Carton introuvable';
};

Loto.onChange(s=>{
  Loto.pageHeader();
  lotoName.value=s.lotoName||'LOTO SDS';
  lotoDate.value=s.program?.date||'';
  prevalidate.value=s.options?.prevalidateSeconds||6;
  lastNumberRequired.checked=s.options?.lastNumberRequired!==false;
  showLots.checked=!!s.options?.showLots;
  bingoEnabled.checked=!!s.options?.bingoEnabled;
  showBingo.checked=!!s.options?.showBingo;
  simulationEnabled.checked=!!s.simulation?.enabled;
  simulationSeconds.value=s.simulation?.seconds||10;
  drawParties();
});
Loto.ensureSession();
