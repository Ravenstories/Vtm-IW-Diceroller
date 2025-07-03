
/* ===========================================================================
Vampire vs Human Dice Roller
Cleaned & fully data‑driven:
• terrain bonuses from traits.json.terrainMods
• conditional bonuses from traits.json.conditionalMods
• logs show which traits fired
• roster trait pills flash when used
========================================================================== */

/* ---------------- State ---------------- */
const JsonPath = "Json-Files/";
let unitTemplates = {};
let terrains      = [];
let traitList     = [];
let activeUnits   = { vampires: [], humans: [] };
let battleHistory = [];

const LS_KEY = 'vtm_roster';

/* ---------------- Bootstrap ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  try {
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
  } catch (err) {
    console.error('Init error:', err);
  }
});

/* ---------------- Utility helpers ---------------- */
const rollDice   = n   => Array.from({ length: n }, () => Math.floor(Math.random() * 10) + 1);
const successes  = arr => arr.filter(v => v >= 6).length;
const findTrait  = id  => traitList.find(t => t.id === id) || null;
const cap        = s   => s[0].toUpperCase() + s.slice(1);

/* ---------------- UI population ---------------- */
function populateRecruitDropdowns() {
  ['vampires', 'humans'].forEach(race => {
    const sel = document.getElementById(`${race}Select`);
    sel.innerHTML = '';
    unitTemplates[race].forEach((u, i) => sel.add(new Option(u.name, i)));
  });
}

function populateTerrainSelect() {
  const sel = document.getElementById('terrainSelect');
  sel.innerHTML = '';
  terrains.forEach(t => sel.add(new Option(t.name, t.id)));
}

/* ---------------- Roster operations ---------------- */
function addUnit(race) {
  const idx = +document.getElementById(`${race}Select`).value;
  if (Number.isNaN(idx)) return;
  const tpl = unitTemplates[race][idx];
  activeUnits[race].push({ ...tpl, health: tpl.maxHealth, tags: tpl.tags || [] });
  saveRoster();
  renderRoster();
}

function adjustHP(race, idx, delta) {
  const u = activeUnits[race][idx];
  u.health = Math.max(0, Math.min(u.maxHealth, u.health + delta));
  saveRoster();
  renderRoster();
}

function removeUnit(race, idx) {
  activeUnits[race].splice(idx, 1);
  saveRoster();
  renderRoster();
}

/* ---------------- Rendering ---------------- */
function renderRoster() {
  const pane = document.getElementById('rosterPane');
  pane.innerHTML = '<h2>Active Roster</h2>';

  ['vampires', 'humans'].forEach(race => {
    pane.insertAdjacentHTML('beforeend', `<h3>${cap(race)}</h3>`);

    activeUnits[race].forEach((u, i) => {
      const stats = race === 'vampires'
        ? [`P:${u.power}`, `T:${u.toughness}`, `O:${u.obscurity}`]
        : [`P:${u.power}`, `T:${u.toughness}`, `R:${u.revelation}`];

      pane.insertAdjacentHTML('beforeend', `
        <div class="roster-unit">
          <div class="roster-head">
            <span><strong>${u.name}</strong> (HP ${u.health}/${u.maxHealth})</span>
            <span>
              <button class="small" onclick="adjustHP('${race}',${i},-1)">-</button>
              <button class="small" onclick="adjustHP('${race}',${i},1)">+</button>
              <button class="small" onclick="removeUnit('${race}',${i})">✖</button>
            </span>
          </div>
          <div class="badges">
            ${stats.map(s => `<span class="badge">${s}</span>`).join('')}
            ${u.traits.map(tr => {
              const desc = findTrait(tr)?.description || '';
              return `<span class="badge trait" title="${desc}">${tr}</span>`;
            }).join('')}
          </div>
        </div>`);
    });
  });

  refreshCombatantSelects();
}

function refreshCombatantSelects() {
  vampireActiveSelect.innerHTML = '';
  humanActiveSelect.innerHTML   = '';
  activeUnits.vampires.forEach((u, i) => vampireActiveSelect.add(new Option(`${u.name} (HP ${u.health})`, i)));
  activeUnits.humans  .forEach((u, i) => humanActiveSelect.add(new Option(`${u.name} (HP ${u.health})`, i)));
}

function renderTraitReference() {
  const ref = document.getElementById('traitRef');
  if (!ref) return;
  const group = { passive: [], action: [] };
  traitList.forEach(t => group[t.type].push(t));

  ref.innerHTML = '';
  ['passive', 'action'].forEach(type => {
    if (!group[type].length) return;
    ref.insertAdjacentHTML('beforeend', `<h3>${cap(type)} Traits</h3>`);
    group[type].forEach(t => {
      ref.insertAdjacentHTML('beforeend', `<p><strong>${t.id}:</strong> ${t.description}</p>`);
    });
  });
}

/* ---------------- Bonus engines ---------------- */
function computeTerrainBonuses(unit, terrain) {
  const bonus = { power: 0, toughness: 0, obscurity: 0, revelation: 0 };
  const reasons = []; // [{trait, stat, value}]
  unit.traits.forEach(tr => {
    const data = findTrait(tr);
    const mods = data?.terrainMods?.[terrain];
    if (mods) {
      Object.entries(mods).forEach(([stat, val]) => {
        bonus[stat] += val;
        reasons.push({ trait: tr, stat, value: val });
      });
    }
  });
  return { bonus, reasons };
}

function computeConditionalBonuses(attacker, defender) {
  const bonus = { power: 0, toughness: 0, obscurity: 0, revelation: 0 };
  const reasons = [];
  attacker.traits.forEach(tr => {
    const data = findTrait(tr);
    data?.conditionalMods?.forEach(c => {
      if (c.targetTags.some(tag => defender.tags?.includes(tag))) {
        bonus[c.stat] += c.value;
        reasons.push({ trait: tr, stat: c.stat, value: c.value });
      }
    });
  });
  return { bonus, reasons };
}

function sumBonusObjs(...objs) {
  return objs.reduce((acc, obj) => {
    for (const k in obj) acc[k] = (acc[k] || 0) + obj[k];
    return acc;
  }, { power: 0, toughness: 0, obscurity: 0, revelation: 0 });
}

/* ---------------- Highlight trait pills ---------------- */
function flashTraitPills(reasonArr) {
  document.querySelectorAll('.activeTrait').forEach(el => el.classList.remove('activeTrait'));
  reasonArr.forEach(r => {
    document.querySelectorAll('.trait').forEach(el => {
      if (el.textContent.trim() === r.trait) el.classList.add('activeTrait');
    });
  });
  if (reasonArr.length) {
    setTimeout(() => document.querySelectorAll('.activeTrait').forEach(el => el.classList.remove('activeTrait')), 2500);
  }
}

/* ---------------- Battle ---------------- */
function startBattle() {
  const vIdx = vampireActiveSelect.value;
  const hIdx = humanActiveSelect.value;
  if (vIdx === '' || hIdx === '') { alert('Pick fighters'); return; }

  const terrain = terrainSelect.value;
  const vamp = activeUnits.vampires[vIdx];
  const hum  = activeUnits.humans[hIdx];

  const vTer = computeTerrainBonuses(vamp, terrain);
  const hTer = computeTerrainBonuses(hum , terrain);
  const vCon = computeConditionalBonuses(vamp, hum);
  const hCon = computeConditionalBonuses(hum , vamp);

  const vBonus = sumBonusObjs(vTer.bonus, vCon.bonus);
  const hBonus = sumBonusObjs(hTer.bonus, hCon.bonus);

  /* highlight any pills that contributed */
  flashTraitPills([...vTer.reasons, ...vCon.reasons, ...hTer.reasons, ...hCon.reasons]);

  /* Build logs */
  const logs = [
    duel(vamp, 'power', vBonus, [...vTer.reasons, ...vCon.reasons],
         hum , 'toughness', hBonus, [...hTer.reasons, ...hCon.reasons], terrain),

    duel(hum , 'power', hBonus, [...hTer.reasons, ...hCon.reasons],
         vamp, 'toughness', vBonus, [...vTer.reasons, ...vCon.reasons], terrain),

    duel(vamp, 'obscurity', vBonus, [...vTer.reasons, ...vCon.reasons],
         hum , 'revelation', hBonus, [...hTer.reasons, ...hCon.reasons], terrain)
  ];

  results.innerHTML = logs.map(l => l.html).join('<hr>');
  battleHistory.push(...logs.map(l => l.text));
  renderHistory();
}

function traitListForStat(reasons, stat) {
  return reasons.filter(r => r.stat === stat)
                .map(r => `${r.trait}(+${r.value})`)
                .join(', ');
}

function duel(a, aStat, aBonusObj, aReasons, b, bStat, bBonusObj, bReasons, terrain) {
  const baseA = a[aStat] || 0;
  const baseB = b[bStat] || 0;
  const plusA = aBonusObj[aStat] || 0;
  const plusB = bBonusObj[bStat] || 0;
  const totalA = baseA + plusA;
  const totalB = baseB + plusB;

  const rollsA = rollDice(totalA);
  const rollsB = rollDice(totalB);
  const sucA   = successes(rollsA);
  const sucB   = successes(rollsB);
  const winner = sucA > sucB ? a.name : sucB > sucA ? b.name : 'Draw';

  const bonusTxt = (base, plus, reasonArr, stat) =>
    plus ? ` (${base}+${plus} = ${base + plus}) <em>${traitListForStat(reasonArr, stat)}</em>` : '';

  return {
    html: `
      <h3>${cap(aStat)} clash (${terrain})</h3>
      <p>${a.name}: ${rollsA.join(', ')} — <b>${sucA}</b>${bonusTxt(baseA, plusA, aReasons, aStat)}</p>
      <p>${b.name}: ${rollsB.join(', ')} — <b>${sucB}</b>${bonusTxt(baseB, plusB, bReasons, bStat)}</p>
      <strong>Winner: ${winner}</strong>`,
    text: `${a.name} (${totalA}) vs ${b.name} (${totalB}) on ${terrain}. Winner: ${winner}`
  };
}

/* ---------------- History ---------------- */
function renderHistory() {
  const div = document.getElementById('history');
  if (!div) return;
  div.innerHTML = battleHistory.map(t => `<p>${t}</p>`).join('') +
                  (battleHistory.length ? '<button onclick="downloadLog()">Download log</button>' : '');
}

function downloadLog() {
  const blob = new Blob([battleHistory.join('\\n')], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'battle_log.txt';
  link.click();
}

/* ---------------- Persistence ---------------- */
function saveRoster() { localStorage.setItem(LS_KEY, JSON.stringify(activeUnits)); }
function loadRoster() {
  const saved = localStorage.getItem(LS_KEY);
  if (saved) try { activeUnits = JSON.parse(saved); } catch { /* ignore */ }
}