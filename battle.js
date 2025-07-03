/* ---------- State ---------- */
let unitTemplates = {};
let activeUnits = { vampires: [], humans: [] };
const LS_KEY = 'vtm_roster';

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  fetch('units.json')
    .then(r => r.json())
    .then(json => {
      unitTemplates = json;
      loadRoster();
      populateRecruitDropdowns();
      renderRoster();
    });
});

/* ---------- Recruit ---------- */
function populateRecruitDropdowns() {
  ['vampires', 'humans'].forEach(race => {
    const sel = document.getElementById(race + 'Select');
    sel.innerHTML = '';                           // reset
    unitTemplates[race].forEach((u, i) => {
      sel.add(new Option(u.name, i));
    });
  });
}

function addUnit(race) {
  const idx = +document.getElementById(race + 'Select').value;
  if (Number.isNaN(idx)) return;
  const t = unitTemplates[race][idx];
  activeUnits[race].push({ ...t, health: t.maxHealth });
  saveRoster();
  renderRoster();
}

/* ---------- Roster UI ---------- */
function renderRoster() {
  const pane = document.getElementById('rosterPane');
  pane.innerHTML = '<h2>Active Roster</h2>';

  ['vampires', 'humans'].forEach(race => {
    const sub = document.createElement('h3');
    sub.textContent = race[0].toUpperCase() + race.slice(1);
    pane.appendChild(sub);

    activeUnits[race].forEach((u, i) => {
      const row = document.createElement('div');
      row.className = 'roster-unit';

      /* header line */
      const head = document.createElement('div');
      head.className = 'roster-head';
      head.innerHTML = `
        <span><strong>${u.name}</strong> (HP ${u.health}/${u.maxHealth})</span>
        <span>
          <button class="small" onclick="adjHP('${race}',${i},-1)">-</button>
          <button class="small" onclick="adjHP('${race}',${i},1)">+</button>
          <button class="small" onclick="remUnit('${race}',${i})">✖</button>
        </span>`;
      row.appendChild(head);

      /* stat badges */
      const badges = document.createElement('div');
      badges.className = 'badges';
      const statBadges = (race==='vampires')
        ? [`P:${u.power}` , `T:${u.toughness}`, `O:${u.obscurity}`]
        : [`P:${u.power}` , `T:${u.toughness}`, `R:${u.revelation}`];
      statBadges.forEach(txt=>{
        const b=document.createElement('span');b.className='badge';b.textContent=txt;badges.appendChild(b);
      });

      /* trait pills */
      u.traits.forEach(tr=>{
        const t=document.createElement('span');t.className='badge trait';t.textContent=tr;badges.appendChild(t);
      });
      row.appendChild(badges);
      pane.appendChild(row);
    });
  });
  refreshCombatantSelects();
}

function adjHP(r,i,d){const u=activeUnits[r][i];u.health=Math.max(0,Math.min(u.maxHealth,u.health+d));saveRoster();renderRoster();}
function remUnit(r,i){activeUnits[r].splice(i,1);saveRoster();renderRoster();}

/* ---------- Battle ---------- */
function refreshCombatantSelects() {
  const vSel = document.getElementById('vampireActiveSelect');
  const hSel = document.getElementById('humanActiveSelect');
  vSel.innerHTML = ''; hSel.innerHTML = '';
  activeUnits.vampires.forEach((u,i)=>vSel.add(new Option(`${u.name} (HP ${u.health})`,i)));
  activeUnits.humans  .forEach((u,i)=>hSel.add(new Option(`${u.name} (HP ${u.health})`,i)));
}

const succ = rolls => rolls.filter(x=>x>=6).length;
const roll = n => Array.from({length:n},()=>Math.floor(Math.random()*10)+1);

function applyTerrainMods(unit, terrain){
  let bonus = { power:0, toughness:0, obscurity:0, revelation:0 };
  unit.traits.forEach(tr=>{
    switch(tr){
      case 'Protean':
        if(terrain==='forest'){ bonus.power+=1; bonus.obscurity+=2; }
        break;
      case 'Stone Sentinel':
        if(terrain==='urban'){ bonus.toughness+=1; }
        break;
      case 'Social Chameleons':
        if(terrain==='urban'){ bonus.obscurity+=3; }
        break;
      /* expand with more traits here */
    }
  });
  return bonus;
}

function startBattle(){
  const vIdx = document.getElementById('vampireActiveSelect').value;
  const hIdx = document.getElementById('humanActiveSelect').value;
  if(vIdx===''||hIdx===''){alert('Pick fighters');return;}
  const terrain = document.getElementById('terrainSelect').value;

  const vamp = activeUnits.vampires[vIdx];
  const hum  = activeUnits.humans[hIdx];

  const vMod = applyTerrainMods(vamp,terrain);
  const hMod = applyTerrainMods(hum ,terrain);

  const sections = [];

  sections.push( duel(
    {unit:vamp, stat:'power', bonus:vMod.power},
    {unit:hum , stat:'toughness', bonus:hMod.toughness},
    'Vampire Power vs Human Toughness' ));

  sections.push( duel(
    {unit:hum , stat:'power', bonus:hMod.power},
    {unit:vamp, stat:'toughness', bonus:vMod.toughness},
    'Human Power vs Vampire Toughness' ));

  sections.push( duel(
    {unit:vamp, stat:'obscurity', bonus:vMod.obscurity},
    {unit:hum , stat:'revelation', bonus:hMod.revelation},
    'Obscurity vs Revelation' ));

  document.getElementById('results').innerHTML = sections.join('<hr>');
}

function duel(a,b,label){
  const aVal = (a.unit[a.stat]||0)+a.bonus;
  const bVal = (b.unit[b.stat]||0)+b.bonus;
  const rA = roll(aVal); const rB = roll(bVal);
  const sA = succ(rA);   const sB = succ(rB);
  const winner = sA>sB? a.unit.name : sB>sA ? b.unit.name : 'Draw';
  return `
    <h3>${label}</h3>
    <p>${a.unit.name} (${cap(a.stat)}${a.bonus?`+${a.bonus}`:''}): ${rA.join(', ')} — <b>${sA}</b></p>
    <p>${b.unit.name} (${cap(b.stat)}${b.bonus?`+${b.bonus}`:''}): ${rB.join(', ')} — <b>${sB}</b></p>
    <strong>Winner: ${winner}</strong>`;
}
const cap=s=>s[0].toUpperCase()+s.slice(1);

/* ---------- Persistence ---------- */
function saveRoster(){localStorage.setItem(LS_KEY,JSON.stringify(activeUnits));}
function loadRoster(){const d=localStorage.getItem(LS_KEY);if(d)try{activeUnits=JSON.parse(d);}catch{}}
