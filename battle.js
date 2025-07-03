/* ---------- Globals ---------- */
let unitTemplates = {};
let terrains = [];
let activeUnits = { vampires: [], humans: [] };
const LS_KEY = 'vtm_roster';

/* ---------- Startup ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  try{
    unitTemplates = await fetch('units.json').then(r=>r.json());
    terrains      = await fetch('terrain.json').then(r=>r.json());
    loadRoster();
    populateRecruitDropdowns();
    populateTerrainSelect();
    renderRoster();
  }catch(e){
    console.error('Init failed',e);
  }
});

/* ---------- Recruit Dropdowns ---------- */
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

/* ---------- Roster Ops ---------- */
function addUnit(race){
  const idx=+document.getElementById(race+'Select').value;
  if(Number.isNaN(idx)) return;
  const t=unitTemplates[race][idx];
  activeUnits[race].push({...t,health:t.maxHealth});
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

/* ---------- Roster Render ---------- */
function renderRoster(){
  const pane=document.getElementById('rosterPane');
  pane.innerHTML='<h2>Active Roster</h2>';

  ['vampires','humans'].forEach(r=>{
    const sub=document.createElement('h3');
    sub.textContent=r[0].toUpperCase()+r.slice(1);
    pane.appendChild(sub);

    activeUnits[r].forEach((u,i)=>{
      const row=document.createElement('div');
      row.className='roster-unit';
      row.innerHTML=`
        <div class="roster-head">
          <span><strong>${u.name}</strong> (HP ${u.health}/${u.maxHealth})</span>
          <span>
            <button class="small" onclick="adjHP('${r}',${i},-1)">-</button>
            <button class="small" onclick="adjHP('${r}',${i},1)">+</button>
            <button class="small" onclick="remUnit('${r}',${i})">✖</button>
          </span>
        </div>`;
      const badges=document.createElement('div');
      badges.className='badges';
      const stats=(r==='vampires')
        ? ['P:'+u.power,'T:'+u.toughness,'O:'+u.obscurity]
        : ['P:'+u.power,'T:'+u.toughness,'R:'+u.revelation];
      [...stats,...u.traits].forEach(txt=>{
        const b=document.createElement('span');
        b.className='badge'+(u.traits.includes(txt)?' trait':'');
        b.textContent=txt;
        badges.appendChild(b);
      });
      row.appendChild(badges);
      pane.appendChild(row);
    });
  });
  refreshCombatantSelects();
}

function refreshCombatantSelects(){
  const vSel=document.getElementById('vampireActiveSelect');
  const hSel=document.getElementById('humanActiveSelect');
  vSel.innerHTML=''; hSel.innerHTML='';
  activeUnits.vampires.forEach((u,i)=>vSel.add(new Option(`${u.name} (HP ${u.health})`,i)));
  activeUnits.humans.forEach((u,i)=>hSel.add(new Option(`${u.name} (HP ${u.health})`,i)));
}

/* ---------- Battle ---------- */
const roll=n=>Array.from({length:n},()=>Math.floor(Math.random()*10)+1);
const succ=arr=>arr.filter(x=>x>=6).length;
const cap=s=>s[0].toUpperCase()+s.slice(1);

function applyTerrainMods(unit, terrain){
  const b={power:0,toughness:0,obscurity:0,revelation:0};
  unit.traits.forEach(t=>{
    switch(t){
      case 'Protean': if(terrain==='forest'){b.power+=1;b.obscurity+=2;} break;
      case 'Stone Sentinel': if(terrain==='urban'){b.toughness+=1;} break;
      case 'Social Chameleons': if(terrain==='urban'){b.obscurity+=3;} break;
    }
  });
  return b;
}

function startBattle(){
  const vIdx=document.getElementById('vampireActiveSelect').value;
  const hIdx=document.getElementById('humanActiveSelect').value;
  if(vIdx===''||hIdx===''){alert('Pick fighters');return;}
  const terrain=document.getElementById('terrainSelect').value;

  const vamp=activeUnits.vampires[vIdx];
  const hum=activeUnits.humans[hIdx];
  const vMod=applyTerrainMods(vamp,terrain);
  const hMod=applyTerrainMods(hum,terrain);

  const sections=[
    duel({u:vamp,stat:'power',bon:vMod.power},{u:hum,stat:'toughness',bon:hMod.toughness},'Vampire Power vs Human Toughness'),
    duel({u:hum,stat:'power',bon:hMod.power},{u:vamp,stat:'toughness',bon:vMod.toughness},'Human Power vs Vampire Toughness'),
    duel({u:vamp,stat:'obscurity',bon:vMod.obscurity},{u:hum,stat:'revelation',bon:hMod.revelation},'Obscurity vs Revelation')
  ];
  document.getElementById('results').innerHTML=sections.join('<hr>');
}

function duel(a,b,label){
  const aVal=(a.u[a.stat]||0)+a.bon;
  const bVal=(b.u[b.stat]||0)+b.bon;
  const rA=roll(aVal), rB=roll(bVal);
  const sA=succ(rA), sB=succ(rB);
  const win=sA>sB?a.u.name:sB>sA?b.u.name:'Draw';
  return `
    <h3>${label}</h3>
    <p>${a.u.name} (${cap(a.stat)}${a.bon?`+${a.bon}`:''}): ${rA.join(', ')} — <b>${sA}</b></p>
    <p>${b.u.name} (${cap(b.stat)}${b.bon?`+${b.bon}`:''}): ${rB.join(', ')} — <b>${sB}</b></p>
    <strong>Winner: ${win}</strong>`;
}

/* ---------- Persistence ---------- */
function saveRoster(){localStorage.setItem(LS_KEY,JSON.stringify(activeUnits));}
function loadRoster(){const d=localStorage.getItem(LS_KEY);if(d)try{activeUnits=JSON.parse(d);}catch{}}