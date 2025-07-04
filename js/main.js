// main.js – fully patched version
// ---------------------------------
// Make sure the relative paths match your folder structure.
// This file assumes:
//   /data/traits.json          ← list of trait definitions
//   /js/traits.js              ← exports `getTraitModifiers()`
//   HTML contains the IDs used below (terrain, roll, log, etc.)

/* ----------------------------------
   Imports & constants
---------------------------------- */
import traits from "../data/traits.json" with { type: "json" };
import { getTraitModifiers } from "./traits.js";

// Grab DOM handles once
const terrainSelect   = document.getElementById("terrain");
const rollBtn         = document.getElementById("roll");
const log             = document.getElementById("log");
const vampireListEl   = document.getElementById("vampireRoster");
const humanListEl     = document.getElementById("humanRoster");
const vampireTraitsEl = document.getElementById("vampireTraits");
const humanTraitsEl   = document.getElementById("humanTraits");

/* ----------------------------------
   Local state (very small and flat)
---------------------------------- */
let vampireRoster = [];
let humanRoster   = [];

/* ----------------------------------
   Utility helpers
---------------------------------- */
function getTraitDescription(name) {
  return traits[name]?.description ?? "";
}

export function applyBonuses(unit, modifiers, activeTraits = []) {
  return {
    ...unit,
    power:      unit.power      + (modifiers.power      ?? 0),
    toughness:  unit.toughness  + (modifiers.toughness ?? 0),
    obscurity:  unit.obscurity  + (modifiers.obscurity ?? 0),
    revelation: unit.revelation + (modifiers.revelation ?? 0),

    // keep a record of which traits actually triggered this round
    activeTraits,
  };
}

function makeTraitBlock(unit) {
  if (!unit.activeTraits?.length) return "<em>No traits activated.</em>";
  return `<strong>${unit.name}</strong><ul>${unit.activeTraits
    .map(
      (t) => `<li>${t} — ${getTraitDescription(t)}</li>`
    )
    .join("")}</ul>`;
}

function updateTraitInfo(vampireStats, humanStats) {
  vampireTraitsEl.innerHTML = makeTraitBlock(vampireStats);
  humanTraitsEl.innerHTML   = makeTraitBlock(humanStats);
}

/* ----------------------------------
   Roster rendering & UI controls
---------------------------------- */
function renderRosters() {
  vampireListEl.innerHTML = "";
  humanListEl.innerHTML   = "";

  vampireRoster.forEach((u, i) =>
    vampireListEl.appendChild(makeRosterRow("vampire", u, i))
  );
  humanRoster.forEach((u, i) =>
    humanListEl.appendChild(makeRosterRow("human", u, i))
  );
}

function makeRosterRow(race, u, i) {
  const row = document.createElement("li");
  row.innerHTML = `
    <div>
      <strong>${u.name}</strong> <small>HP ${u.health}/${u.maxHealth}</small><br/>
      <small>Pow ${u.power}, Tgh ${u.toughness}, Obs ${u.obscurity}</small><br/>
      <small>Traits: ${u.traits?.join(", ") || "—"}</small>
    </div>
    <span class="controls">
      <button onclick="adjustHealth('${race}',${i},-1)">-</button>
      <button onclick="adjustHealth('${race}',${i},1)">+</button>
      <button onclick="removeUnit('${race}',${i})">x</button>
    </span>`;
  return row;
}

// Expose health adjusters to global for inline onclick
window.adjustHealth = function (race, index, delta) {
  const roster = race === "vampire" ? vampireRoster : humanRoster;
  roster[index].health = Math.max(
    0,
    Math.min(roster[index].maxHealth, roster[index].health + delta)
  );
  renderRosters();
};

window.removeUnit = function (race, index) {
  const roster = race === "vampire" ? vampireRoster : humanRoster;
  roster.splice(index, 1);
  renderRosters();
};

/* ----------------------------------
   Manual (single‑click) battle logic
---------------------------------- */
rollBtn.addEventListener("click", () => {
  if (!vampireRoster.length || !humanRoster.length) return;

  const attacker = vampireRoster[0]; // simple: first vampire in list
  const defender = humanRoster[0];   // simple: first human in list
  const terrain  = terrainSelect.value;

  // 🔑 Trait‑modifier fix (destructure!)
  const { modifiers, activeTraits } = getTraitModifiers(attacker, {
    terrain,
    opponent: defender,
  });

  const attackerStats = applyBonuses(attacker, modifiers, activeTraits);

  /* A very naive dice roll just for demo purposes */
  const attackerRoll = Math.ceil(Math.random() * 10) + attackerStats.power;
  const defenderRoll = Math.ceil(Math.random() * 10) + defender.toughness;
  const winner       = attackerRoll >= defenderRoll ? attackerStats.name : defender.name;

  logBattleResult(attackerStats, defender, attackerRoll, defenderRoll, winner);

  // Keep the Trait‑effects side panel in sync
  updateTraitInfo(attackerStats, defender);
});

function logBattleResult(att, def, attRoll, defRoll, winner) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `
    <p>${att.name} rolled ${attRoll} vs ${def.name} rolled ${defRoll}</p>
    <p><strong>${winner}</strong> wins!</p>`;
  log.prepend(entry);
}

/* ----------------------------------
   Trait‑list (static sidebar)
---------------------------------- */
function populateTraitList() {
  const ul = document.getElementById("traitList");
  Object.entries(traits).forEach(([name, cfg]) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${name}</strong> — ${cfg.description}`;
    ul.appendChild(li);
  });
}

/* ----------------------------------
   Initial boot‑strapping
---------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  populateTraitList();
  renderRosters();
});




// js/main.js
/*
import units from '../data/units.json' with { type: 'json' };
import terrain from '../data/terrain.json' with { type: 'json' };
import { getTraitModifiers } from './services/traitService.js';
import { logBattleResult } from './services/logger.js';

let activeUnits = {
  vampires: [],
  humans: []
};

function populateTraitList() {
  const ul = document.getElementById('traitList');
  Object.entries(traits).forEach(([name, cfg]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${name}</strong> — ${cfg.description}`;
    ul.appendChild(li);
  });
}

function populateSelect(id, options) {
  const sel = document.getElementById(id);
  sel.innerHTML = '';
  options.forEach((opt, idx) => sel.add(new Option(opt.name, idx)));
}

function renderRosters() {
  const root = document.getElementById('rosters');
  root.innerHTML = '';
  ['vampires', 'humans'].forEach(race => {
    const block = document.createElement('div');
    block.innerHTML = `<h3>${race.toUpperCase()}</h3>`;
    activeUnits[race].forEach((u, i) => {
      const row = document.createElement('div');
      row.className = 'roster-unit';
      row.innerHTML = `
        <div>
          <strong>${u.name}</strong> <small>HP ${u.health}/${u.maxHealth}</small><br/>
          <small>Pow ${u.power}, Tgh ${u.toughness}, Obs ${u.obscurity}</small><br/>
          <small>Traits: ${u.traits?.join(', ') || '—'}</small>
        </div>
        <span class="controls">
          <button onclick="adjustHealth('${race}',${i},-1)">-</button>
          <button onclick="adjustHealth('${race}',${i},1)">+</button>
          <button onclick="removeUnit('${race}',${i})">x</button>
        </span>`;
      block.appendChild(row);
    });
    root.appendChild(block);
  });
  updateActiveSelects();
}

function updateActiveSelects() {
  ['vampires', 'humans'].forEach(race => {
    const sel = document.getElementById(race.slice(0, -1) + 'ActiveSelect');
    sel.innerHTML = '';
    activeUnits[race].forEach((u, i) => sel.add(new Option(`${u.name} (${u.health})`, i)));
  });
}

function adjustHealth(race, i, delta) {
  activeUnits[race][i].health = Math.max(0, Math.min(activeUnits[race][i].maxHealth, activeUnits[race][i].health + delta));
  renderRosters();
}

function removeUnit(race, i) {
  activeUnits[race].splice(i, 1);
  renderRosters();
}

function addUnit(race) {
  const sel = document.getElementById(`${race}Select`);
  const unit = JSON.parse(JSON.stringify(units[race][sel.value]));
  unit.health = unit.maxHealth;
  activeUnits[race].push(unit);
  renderRosters();
}

function populateTerrainSelect() {
  const sel = document.getElementById('terrainSelect');
  terrain.forEach(t => sel.add(new Option(t.name, t.key)));
}

function startBattle() {
  const v = activeUnits.vampires[document.getElementById('vampireActiveSelect').value];
  const h = activeUnits.humans[document.getElementById('humanActiveSelect').value];
  const t = document.getElementById('terrainSelect').value;
  if (!v || !h || !t) return alert('Choose terrain and units');

  const vMods = getTraitModifiers(v, { terrain: t, opponent: h });
  const hMods = getTraitModifiers(h, { terrain: t, opponent: v });

  const stats = {
    vampire: {
      power: v.power + (vMods.power || 0),
      toughness: v.toughness + (vMods.toughness || 0),
      obscurity: v.obscurity + (vMods.obscurity || 0),
      activeTraits: vMods.activeTraits || []
    },
    human: {
      power: h.power + (hMods.power || 0),
      toughness: h.toughness + (hMods.toughness || 0),
      revelation: h.revelation + (hMods.revelation || 0),
      activeTraits: hMods.activeTraits || []
    }
  };

  const result = resolveBattle(stats);
  updateTraitInfo(finalStats.vampire, finalStats.human);
  logBattleResult(v, h, t, stats, result);
  renderTraitInfo(v, h, stats);
}

function resolveBattle(stats) {
  const roll = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10) + 1);
  const suc = r => r.filter(n => n >= 6).length;

  const vampPow = suc(roll(stats.vampire.power));
  const humTgh = suc(roll(stats.human.toughness));
  const humPow = suc(roll(stats.human.power));
  const vampTgh = suc(roll(stats.vampire.toughness));
  const vampObs = suc(roll(stats.vampire.obscurity));
  const humRev = suc(roll(stats.human.revelation));

  const score = [vampPow > humTgh, humPow > vampTgh, vampObs > humRev];
  const winCount = score.filter(Boolean).length;
  const winner = winCount >= 2 ? 'Vampires' : 'Humans';

  return {
    winner,
    reason: `${vampPow}vP vs ${humTgh}hT, ${humPow}hP vs ${vampTgh}vT, ${vampObs}vO vs ${humRev}hR`
  };
}

function renderTraitInfo(vampireUnit, humanUnit, stats) {
  const vampBlock = document.getElementById('vampireTraits');
  const humBlock = document.getElementById('humanTraits');

  vampBlock.innerHTML = `<h5>${vampireUnit.name} Traits</h5>` +
    stats.vampire.activeTraits.map(name =>
      `<div><strong>${name}</strong>: ${getTraitDescription(name)}</div>`
    ).join('');

  humBlock.innerHTML = `<h5>${humanUnit.name} Traits</h5>` +
    stats.human.activeTraits.map(name =>
      `<div><strong>${name}</strong>: ${getTraitDescription(name)}</div>`
    ).join('');
}

function updateTraitInfo(vampireStats, humanStats) {
  const v = document.getElementById('vampireTraits');
  const h = document.getElementById('humanTraits');
  v.innerHTML = makeTraitBlock(vampireStats);
  h.innerHTML = makeTraitBlock(humanStats);
}

function makeTraitBlock(unit) {
  if (!unit.activeTraits?.length) return '<em>No traits activated.</em>';
  return `<strong>${unit.name}</strong><ul>${unit.activeTraits
      .map(t => `<li>${t} — ${getTraitDescription(t)}</li>`).join('')}</ul>`;
}

// Init
window.addUnit = addUnit;
window.adjustHealth = adjustHealth;
window.removeUnit = removeUnit;
window.startBattle = startBattle;

document.addEventListener('DOMContentLoaded', () => {
  populateTraitList();
  populateSelect('vampiresSelect', units.vampires);
  populateSelect('humansSelect', units.humans);
  populateTerrainSelect();
  renderRosters();
});
*/