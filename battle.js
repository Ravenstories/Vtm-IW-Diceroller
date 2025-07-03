/* ---------- Globals ---------- */
const JsonPath = "Json-Files/";
let unitTemplates = {};
let terrains = [];
let traitList = [];
let activeUnits = { vampires: [], humans: [] };
let battleHistory = [];
const LS_KEY = 'vtm_roster';

/* ---------- Startup ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  try{
    [unitTemplates, terrains, traitList] = await Promise.all([
      fetch(JsonPath + 'units.json').then(r=>r.json()),
      fetch(JsonPath + 'terrain.json').then(r=>r.json()),
      fetch(JsonPath + 'traits.json').then(r=>r.json())
    ]);
    loadRoster();
    populateRecruitDropdowns();
    populateTerrainSelect();
    renderRoster();
    renderTraitReference();
    renderHistory();
  }catch(e){console.error('Init failed',e);}
});

/* ---------- Helper look‑ups ---------- */
const findTrait = id => traitList.find(t=>t.id===id) || null;
const roll = n => Array.from({length:n},()=>Math.floor(Math.random()*10)+1);
const succ = arr => arr.filter(x=>x>=6).length;
const cap  = s => s[0].toUpperCase()+s.slice(1);

/* ---------- UI population ---------- */
function populateRecruitDropdowns(){
  ['vampires','humans'].forEach(r=>{
    const sel=document.getElementById(r+'Select');
    sel.innerHTML='';
    unitTemplates[r].forEach((u,i)=>sel.add(new Option(u.name,i)));
  });
}
function populateTerrainSelect(){
  const sel=document.getElementById('terrainSelect');
  sel.innerHTML='';
  terrains.forEach(t=>sel.add(new Option(t.name,t.id)));
}

/* ---------- Roster ops ---------- */
function addUnit(race){
  const idx=+document.getElementById(race+'Select').value;
  if(Number.isNaN(idx)) return;
  const t=unitTemplates[race][idx];
  const clone={...t,health:t.maxHealth, tags:t.tags||[]};
  activeUnits[race].push(clone);
  saveRoster(); renderRoster();
}
function adjHP(r,i,d){
  const u=activeUnits[r][i];
  u.health=Math.max(0,Math.min(u.maxHealth,u.health+d));
  saveRoster(); renderRoster();
}
function remUnit(r,i){
  activeUnits[r].splice(i,1);
  saveRoster(); renderRoster();
}

/* ---------- Roster render ---------- */
function renderRoster(){
  const pane=document.getElementById('rosterPane');
  pane.innerHTML='<h2>Active Roster</h2>';
  ['vampires','humans'].forEach(r=>{
    const sub=document.createElement('h3');
    sub.textContent=cap(r);
    pane.appendChild(sub);

    activeUnits[r].forEach((u,i)=>{
      const row=document.createElement('div'); row.className='roster-unit';
      row.innerHTML=`
        <div class="roster-head">
          <span><strong>${u.name}</strong> (HP ${u.health}/${u.maxHealth})</span>
          <span>
            <button class="small" onclick="adjHP('${r}',${i},-1)">-</button>
            <button class="small" onclick="adjHP('${r}',${i},1)">+</button>
            <button class="small" onclick="remUnit('${r}',${i})">✖</button>
          </span>
        </div>`;
      const badges=document.createElement('div'); badges.className='badges';
      const stats=(r==='vampires')
        ? ['P:'+u.power,'T:'+u.toughness,'O:'+u.obscurity]
        : ['P:'+u.power,'T:'+u.toughness,'R:'+u.revelation];
      stats.forEach(txt=>{
        const b=document.createElement('span'); b.className='badge'; b.textContent=txt; badges.appendChild(b);
      });
      u.traits.forEach(tr=>{
        const data=findTrait(tr);
        const b=document.createElement('span');
        b.className='badge trait';
        b.textContent=tr;
        if(data) b.title=data.description;
        badges.appendChild(b);
      });
      row.appendChild(badges);
      pane.appendChild(row);
    });
  });
  refreshCombatantSelects();
}

/* ---------- Combatant selects ---------- */
function refreshCombatantSelects(){
  ['vampireActiveSelect','humanActiveSelect'].forEach(id=>document.getElementById(id).innerHTML='');
  activeUnits.vampires.forEach((u,i)=>vampireActiveSelect.add(new Option(`${u.name} (HP ${u.health})`,i)));
  activeUnits.humans.forEach((u,i)=>humanActiveSelect.add(new Option(`${u.name} (HP ${u.health})`,i)));
}

/* ---------- Trait Reference ---------- */
function renderTraitReference(){
  const ref=document.getElementById('traitRef'); if(!ref) return;
  const group={ passive:[], action:[] };
  traitList.forEach(t=>group[t.type].push(t));
  ref.innerHTML='';
  ['passive','action'].forEach(type=>{
    if(group[type].length){
      const h=document.createElement('h3'); h.textContent=cap(type)+' Traits'; ref.appendChild(h);
      group[type].forEach(t=>{
        ref.insertAdjacentHTML('beforeend',`<p><strong>${t.id}:</strong> ${t.description}</p>`);
      });
    }
  });
}

/* ---------- Modifiers ---------- */
function terrainModsFor(unit, terrain){
  const sum={power:0,toughness:0,obscurity:0,revelation:0};
  unit.traits.forEach(tr=>{
    const data=findTrait(tr);
    if(data?.terrainMods?.[terrain]){
      Object.entries(data.terrainMods[terrain]).forEach(([stat,val])=>{
        sum[stat]=(sum[stat]||0)+val;
      });
    }
  });
  return sum;
}
function generalModsFor(attacker, defender, stat){
  let mod=0;
  if(attacker.traits.includes('Command Authority') && defender.tags?.includes('peasant') && stat==='power'){
    mod+=2;
  }
  return mod;
}

/* ---------- Battle ---------- */
function startBattle(){
  const vIdx=vampireActiveSelect.value, hIdx=humanActiveSelect.value;
  if(vIdx===''||hIdx===''){alert('Pick fighters');return;}
  const terrain=terrainSelect.value;

  const vamp=activeUnits.vampires[vIdx];
  const hum =activeUnits.humans[hIdx];

  const vTer=terrainModsFor(vamp,terrain);
  const hTer=terrainModsFor(hum ,terrain);

  const logs=[];
  logs.push( duel(vamp,'power',hum,'toughness',terrain,vTer,hTer) );
  logs.push( duel(hum,'power',vamp,'toughness',terrain,hTer,vTer) );
  logs.push( duel(vamp,'obscurity',hum,'revelation',terrain,vTer,hTer) );

  const resultHTML=logs.map(l=>l.html).join('<hr>');
  results.innerHTML=resultHTML;

  battleHistory.push(...logs.map(l=>l.text));
  renderHistory();
}

function duel(att,attStat,def,defStat,terrain,attTer,defTer){
  const baseA=att[attStat]||0, baseD=def[defStat]||0;
  const terA=attTer[attStat]||0, terD=defTer[defStat]||0;
  const genA=generalModsFor(att,def,attStat), genD=generalModsFor(def,att,defStat);

  const totalA=baseA+terA+genA;
  const totalD=baseD+terD+genD;

  const rollsA=roll(totalA), rollsD=roll(totalD);
  const sucA=succ(rollsA), sucD=succ(rollsD);

  const winner=sucA>sucD?att.name:sucD>sucA?def.name:'Draw';

  const bonusStr=(base,ter,gen)=> ter||gen ? ` (${base}${ter?`+${ter}`:''}${gen?`+${gen}`:''} = ${base+ter+gen})` : '';

  const html=`
    <h3>${cap(attStat)} vs ${cap(defStat)} — ${terrain}</h3>
    <p>${att.name}: ${rollsA.join(', ')} — <b>${sucA}</b> successes <small>${bonusStr(baseA,terA,genA)}</small></p>
    <p>${def.name}: ${rollsD.join(', ')} — <b>${sucD}</b> successes <small>${bonusStr(baseD,terD,genD)}</small></p>
    <strong>Winner: ${winner}</strong>`;
  const text=`${att.name} (${attStat} ${totalA}) rolled ${sucA} vs ${def.name} (${defStat} ${totalD}) rolled ${sucD} on ${terrain}. Winner: ${winner}.`;
  return {html,text};
}

/* ---------- History ---------- */
function renderHistory(){
  const histDiv=document.getElementById('history');
  if(!histDiv) return;
  histDiv.innerHTML=battleHistory.map(l=>`<p>${l}</p>`).join('')+
    (battleHistory.length?'<button onclick="downloadLog()">Download log</button>':'');
}
function downloadLog(){
  const blob=new Blob([battleHistory.join('\\n')],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='battle_log.txt';
  a.click();
}

/* ---------- Persistence ---------- */
function saveRoster(){localStorage.setItem(LS_KEY,JSON.stringify(activeUnits));}
function loadRoster(){const d=localStorage.getItem(LS_KEY);if(d)try{activeUnits=JSON.parse(d);}catch{}}