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

/* UI builders */
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

/* Roster ops */
function addUnit(race){
  const idx=+document.getElementById(race+'Select').value;
  if(Number.isNaN(idx))return;
  const base=unitTemplates[race][idx];
  activeUnits[race].push({...base,health:base.maxHealth,tags:base.tags||[]});
  saveRoster();renderRoster();
}
function adjHP(r,i,d){const u=activeUnits[r][i];u.health=Math.max(0,Math.min(u.maxHealth,u.health+d));saveRoster();renderRoster();}
function remUnit(r,i){activeUnits[r].splice(i,1);saveRoster();renderRoster();}

/* Rendering */
function renderRoster(){
  const pane=document.getElementById('rosterPane');
  pane.innerHTML='<h2>Active Roster</h2>';
  ['vampires','humans'].forEach(r=>{
    pane.insertAdjacentHTML('beforeend',`<h3>${cap(r)}</h3>`);
    activeUnits[r].forEach((u,i)=>{
      const stats=r==='vampires'
        ?['P:'+u.power,'T:'+u.toughness,'O:'+u.obscurity]
        :['P:'+u.power,'T:'+u.toughness,'R:'+u.revelation];
      const traitBadges=u.traits.map(tr=>`<span class="badge trait" title="${findTrait(tr)?.description||''}">${tr}</span>`).join('');
      pane.insertAdjacentHTML('beforeend',`
        <div class="roster-unit">
          <div class="roster-head">
            <span><strong>${u.name}</strong> (HP ${u.health}/${u.maxHealth})</span>
            <span>
              <button class="small" onclick="adjHP('${r}',${i},-1)">-</button>
              <button class="small" onclick="adjHP('${r}',${i},1)">+</button>
              <button class="small" onclick="remUnit('${r}',${i})">✖</button>
            </span>
          </div>
          <div class="badges">
            ${stats.map(s=>`<span class="badge">${s}</span>`).join('')}
            ${traitBadges}
          </div>
        </div>`);
    });
  });
  refreshCombatantSelects();
}

function refreshCombatantSelects(){
  vampireActiveSelect.innerHTML='';humanActiveSelect.innerHTML='';
  activeUnits.vampires.forEach((u,i)=>vampireActiveSelect.add(new Option(`${u.name} (HP ${u.health})`,i)));
  activeUnits.humans.forEach((u,i)=>humanActiveSelect.add(new Option(`${u.name} (HP ${u.health})`,i)));
}

function renderTraitReference(){
  const ref=document.getElementById('traitRef');if(!ref)return;
  const grp={passive:[],action:[]};traitList.forEach(t=>grp[t.type].push(t));
  ref.innerHTML='';
  ['passive','action'].forEach(type=>{
    if(grp[type].length){
      ref.insertAdjacentHTML('beforeend',`<h3>${cap(type)} Traits</h3>`);
      grp[type].forEach(t=>ref.insertAdjacentHTML('beforeend',`<p><strong>${t.id}:</strong> ${t.description}</p>`));
    }
  });
}

/* Modifiers */
function terrainMods(unit,terrain){
  const bonus={power:0,toughness:0,obscurity:0,revelation:0};
  unit.traits.forEach(tr=>{
    const data=findTrait(tr);
    if(data?.terrainMods?.[terrain]){
      Object.entries(data.terrainMods[terrain]).forEach(([s,v])=>bonus[s]=(bonus[s]||0)+v);
    }
  });
  return bonus;
}
function conditionalMods(att,def){
  const bonus={power:0,toughness:0,obscurity:0,revelation:0};
  att.traits.forEach(tr=>{
    const data=findTrait(tr);
    if(data?.conditionalMods){
      data.conditionalMods.forEach(cond=>{
        if(cond.targetTags.some(tag=>def.tags?.includes(tag))){
          bonus[cond.stat]=(bonus[cond.stat]||0)+cond.value;
        }
      });
    }
  });
  return bonus;
}
function sumMods(...objs){
  const out={power:0,toughness:0,obscurity:0,revelation:0};
  objs.forEach(o=>{for(const k in o)out[k]+=o[k];});
  return out;
}

/* Battle */
function startBattle(){
  const vIdx=vampireActiveSelect.value,hIdx=humanActiveSelect.value;
  if(vIdx===''||hIdx===''){alert('Pick fighters');return;}
  const terrain=terrainSelect.value;
  const vamp=activeUnits.vampires[vIdx], hum=activeUnits.humans[hIdx];
  const vBonus=sumMods(terrainMods(vamp,terrain),conditionalMods(vamp,hum));
  const hBonus=sumMods(terrainMods(hum,terrain),conditionalMods(hum,vamp));

  const logs=[
    duel(vamp,'power',vBonus,power=>power,hum,'toughness',hBonus,terrain),
    duel(hum,'power',hBonus,power=>power,vamp,'toughness',vBonus,terrain),
    duel(vamp,'obscurity',vBonus,ob=>ob,hum,'revelation',hBonus,terrain)
  ];
  results.innerHTML=logs.map(l=>l.html).join('<hr>');
  battleHistory.push(...logs.map(l=>l.text));
  renderHistory();
}

function duel(att,attStat,attBon,sel,def,defStat,defBon,terrain){
  const baseA=att[attStat]||0, baseD=def[defStat]||0;
  const aPlus=attBon[attStat]||0, dPlus=defBon[defStat]||0;
  const totA=baseA+aPlus, totD=baseD+dPlus;
  const rollsA=roll(totA), rollsD=roll(totD);
  const sucA=succ(rollsA), sucD=succ(rollsD);
  const win=sucA>sucD?att.name:sucD>sucA?def.name:'Draw';
  const fmt=(base,plus)=> plus?` (${base}+${plus} = ${base+plus})`:'';
  const html=`
    <h3>${att.name} ${cap(attStat)} vs ${def.name} ${cap(defStat)} — ${terrain}</h3>
    <p>${att.name}: ${rollsA.join(', ')} — <b>${sucA}</b><small>${fmt(baseA,aPlus)}</small></p>
    <p>${def.name}: ${rollsD.join(', ')} — <b>${sucD}</b><small>${fmt(baseD,dPlus)}</small></p>
    <strong>Winner: ${win}</strong>`;
  const text=`${att.name} (${attStat} ${totA}) vs ${def.name} (${defStat} ${totD}) on ${terrain}. Winner: ${win}.`;
  return {html,text};
}

/* History */
function renderHistory(){
  const div=document.getElementById('history');
  if(!div)return;
  div.innerHTML=battleHistory.map(t=>`<p>${t}</p>`).join('')+(battleHistory.length?'<button onclick="downloadLog()">Download log</button>':'');
}
function downloadLog(){
  const blob=new Blob([battleHistory.join('\\n')],{type:'text/plain'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob); link.download='battle_log.txt'; link.click();
}

/* Persistence */
function saveRoster(){localStorage.setItem(LS_KEY,JSON.stringify(activeUnits));}
function loadRoster(){const d=localStorage.getItem(LS_KEY);if(d)try{activeUnits=JSON.parse(d);}catch{}}