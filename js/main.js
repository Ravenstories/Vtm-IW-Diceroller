// js/main.js – patched version (2025‑07‑04)
// -------------------------------------------------
// • Correctly handles the `{ modifiers, activeTraits }` object
//   returned by `getTraitModifiers()`.
// • Imports `traits.json` so descriptions are available.
// • Fixes “finalStats” reference error.
// • Deduplicates trait‑info rendering.
// • Keeps existing folder structure – no imaginary files.

/* ----------------------------------
   Imports & constants
---------------------------------- */
import units   from "../data/units.json"   with { type: "json" };
import terrain from "../data/terrain.json" with { type: "json" };
import traits  from "../data/traits.json"  with { type: "json" };

import { getTraitModifiers } from "./services/traitService.js";
import { logBattleResult }  from "./services/logger.js";

/* ----------------------------------
   DOM helpers
---------------------------------- */
const terrainSelect   = document.getElementById("terrainSelect");
const vampireRosterEl = document.getElementById("vampireRoster");
const humanRosterEl   = document.getElementById("humanRoster");
const traitListEl     = document.getElementById("traitList");
const vampTraitsEl    = document.getElementById("vampireTraits");
const humanTraitsEl   = document.getElementById("humanTraits");

/* ----------------------------------
   Local state
---------------------------------- */
let activeUnits = {
  vampires: [],
  humans:   []
};

/* ----------------------------------
   Utilities
---------------------------------- */
function getTraitDescription(name) {
  return traits[name]?.description || "";
}

function makeTraitBlock(unit) {
  if (!unit.activeTraits?.length) return "<em>No traits activated.</em>";
  return `<strong>${unit.name}</strong><ul>${unit.activeTraits
    .map((t) => `<li>${t} — ${getTraitDescription(t)}</li>`)
    .join("")}</ul>`;
}

function renderTraitInfo(vampireStats, humanStats) {
  vampTraitsEl.innerHTML  = makeTraitBlock(vampireStats);
  humanTraitsEl.innerHTML = makeTraitBlock(humanStats);
}

/* ----------------------------------
   Roster rendering & UI controls
---------------------------------- */
function renderRosters() {
  vampireRosterEl.innerHTML = "";
  humanRosterEl.innerHTML   = "";

  ["vampires", "humans"].forEach((race) => {
    const target = race === "vampires" ? vampireRosterEl : humanRosterEl;
    activeUnits[race].forEach((u, i) => {
      const row = document.createElement("div");
      row.className = "roster-unit";
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
      target.appendChild(row);
    });
  });
  updateActiveSelects();
}

function updateActiveSelects() {
  ["vampires", "humans"].forEach((race) => {
    const sel = document.getElementById(race.slice(0, -1) + "ActiveSelect");
    sel.innerHTML = "";
    activeUnits[race].forEach((u, i) =>
      sel.add(new Option(`${u.name} (${u.health})`, i))
    );
  });
}

window.adjustHealth = function (race, i, delta) {
  const u = activeUnits[race][i];
  u.health = Math.max(0, Math.min(u.maxHealth, u.health + delta));
  renderRosters();
};

window.removeUnit = function (race, i) {
  activeUnits[race].splice(i, 1);
  renderRosters();
};

window.addUnit = function (race) {
  const sel  = document.getElementById(`${race}Select`);
  const unit = JSON.parse(JSON.stringify(units[race][sel.value]));
  unit.health = unit.maxHealth;
  activeUnits[race].push(unit);
  renderRosters();
};

/* ----------------------------------
   Terrain & trait list setup
---------------------------------- */
function populateTerrainSelect() {
  terrain.forEach((t) => terrainSelect.add(new Option(t.name, t.key)));
}

function populateTraitList() {
  traitListEl.innerHTML = "";
  Object.entries(traits).forEach(([name, cfg]) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${name}</strong> — ${cfg.description}`;
    traitListEl.appendChild(li);
  });
}

/* ----------------------------------
   Battle logic (single manual battle)
---------------------------------- */
window.startBattle = function () {
  const v = activeUnits.vampires[document.getElementById("vampireActiveSelect").value];
  const h = activeUnits.humans[document.getElementById("humanActiveSelect").value];
  const t = terrainSelect.value;

  if (!v || !h || !t) return alert("Choose terrain and units");

  // 🔑 Correctly unpack modifier objects
  const { modifiers: vMods, activeTraits: vActive } = getTraitModifiers(v, {
    terrain: t,
    opponent: h,
  });
  const { modifiers: hMods, activeTraits: hActive } = getTraitModifiers(h, {
    terrain: t,
    opponent: v,
  });

  const stats = {
    vampire: {
      name: v.name,
      power:      v.power      + (vMods.power      || 0),
      toughness:  v.toughness  + (vMods.toughness || 0),
      obscurity:  v.obscurity  + (vMods.obscurity || 0),
      activeTraits: vActive || [],
    },
    human: {
      name: h.name,
      power:      h.power      + (hMods.power      || 0),
      toughness:  h.toughness  + (hMods.toughness || 0),
      revelation: h.revelation + (hMods.revelation || 0),
      activeTraits: hActive || [],
    },
  };

  const result = resolveBattle(stats);
  logBattleResult(v, h, t, stats, result);
  renderTraitInfo(stats.vampire, stats.human);
};

function resolveBattle(stats) {
  const roll = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10) + 1);
  const suc  = (r) => r.filter((n) => n >= 6).length;

  const vampPow = suc(roll(stats.vampire.power));
  const humTgh  = suc(roll(stats.human.toughness));
  const humPow  = suc(roll(stats.human.power));
  const vampTgh = suc(roll(stats.vampire.toughness));
  const vampObs = suc(roll(stats.vampire.obscurity));
  const humRev  = suc(roll(stats.human.revelation));

  const score    = [vampPow > humTgh, humPow > vampTgh, vampObs > humRev];
  const winCount = score.filter(Boolean).length;
  const winner   = winCount >= 2 ? "Vampires" : "Humans";

  return {
    winner,
    reason: `${vampPow}vP vs ${humTgh}hT, ${humPow}hP vs ${vampTgh}vT, ${vampObs}vO vs ${humRev}hR`,
  };
}

/* ----------------------------------
   Boot‑strap
---------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  populateTraitList();
  populateSelect("vampiresSelect", units.vampires);
  populateSelect("humansSelect",   units.humans);
  populateTerrainSelect();
  renderRosters();
});

/* Helper: populateSelect (unchanged) */
function populateSelect(id, options) {
  const sel = document.getElementById(id);
  sel.innerHTML = "";
  options.forEach((opt, idx) => sel.add(new Option(opt.name, idx)));
}
