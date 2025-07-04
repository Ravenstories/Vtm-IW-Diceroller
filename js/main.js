// js/main.js – patched again (roster‑render fix)
// -------------------------------------------------
// • Reverts to the original single #rosters container
//   to avoid null‑element errors.
// • Still includes all previous trait‑bonus fixes.

/* ----------------------------------
   Imports & constants
---------------------------------- */
import units   from "../data/units.json"   with { type: "json" };
import terrain from "../data/terrain.json" with { type: "json" };
import traits  from "../data/traits.json"  with { type: "json" };

import { getTraitModifiers } from "./services/traitService.js";
import { logBattleResult }  from "./services/logger.js";

/* ----------------------------------
   DOM helpers – resolve once
---------------------------------- */
const rosterRoot     = document.getElementById("rosters"); // <<< only existing container
const terrainSelect  = document.getElementById("terrainSelect");
const traitListEl    = document.getElementById("traitList");
const vampTraitsEl   = document.getElementById("vampireTraits");
const humanTraitsEl  = document.getElementById("humanTraits");

/* ----------  PERSISTENCE  ---------- */
const LS_KEY_ROSTER = "vtm-roster";
const LS_KEY_LOG    = "vtm-battle-log";

function saveRoster () {
  localStorage.setItem(LS_KEY_ROSTER, JSON.stringify(activeUnits));
}

function loadRoster () {
  try {
    const data = JSON.parse(localStorage.getItem(LS_KEY_ROSTER) || "");
    if (data?.vampires && data?.humans) activeUnits = data;
  } catch { /* ignore parse errors */ }
}

export function saveBattleLog (html) {
  localStorage.setItem(LS_KEY_LOG, html);
}

function restoreBattleLog () {
  const html = localStorage.getItem(LS_KEY_LOG);
  if (html) document.getElementById("results").innerHTML = html;
}
/* ---------------------------------- */

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
    .map((t) => `<li>${t} — ${getTraitDescription(t)}</li>`) .join("")}</ul>`;
}

function renderTraitInfo(vampireStats, humanStats) {
  vampTraitsEl.innerHTML  = makeTraitBlock(vampireStats);
  humanTraitsEl.innerHTML = makeTraitBlock(humanStats);
}

/* ----------------------------------
   Roster rendering & UI controls
---------------------------------- */
function renderRosters () {
  rosterRoot.innerHTML = "";

  ["vampires", "humans"].forEach(race => {
    const isVamp   = race === "vampires";
    const obsLabel = isVamp ? "Obs" : "Rev";      // ★ new
    const block    = document.createElement("div");
    block.className = "roster-block";
    block.innerHTML = `<h4>${race.toUpperCase()}</h4>`;

    activeUnits[race].forEach((u, i) => {
      const obsVal = isVamp ? u.obscurity : u.revelation ?? 0; // ★ new

      const row = document.createElement("div");
      row.className = "roster-unit";
      row.innerHTML = `
        <div>
          <strong>${u.name}</strong>
          <small>HP ${u.health}/${u.maxHealth}</small><br/>
          <small>Pow ${u.power}, Tgh ${u.toughness}, ${obsLabel} ${obsVal}</small><br/>
          <small>Traits: ${u.traits?.join(", ") || "—"}</small>
          <small>Tags: ${u.tags?.join(", ") || "—"}</small>
        </div>
        <span class="controls">
          <button onclick="adjustHealth('${race}',${i},-1)">-</button>
          <button onclick="adjustHealth('${race}',${i},1)">+</button>
          <button onclick="removeUnit('${race}',${i})">x</button>
        </span>`;
      block.appendChild(row);
    });

    rosterRoot.appendChild(block);
  });

  updateActiveSelects();
  saveRoster();
}

function updateActiveSelects() {
  ["vampires", "humans"].forEach((race) => {
    const sel = document.getElementById(race.slice(0, -1) + "ActiveSelect");
    if (!sel) return; // fail‑safe if element missing
    sel.innerHTML = "";
    activeUnits[race].forEach((u, i) =>
      sel.add(new Option(`${u.name} (${u.health})`, i))
    );
  });
}

window.adjustHealth = function (race, i, delta) {
  const u = activeUnits[race][i];
  if (!u) return;
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
  terrainSelect.innerHTML = "";                 // clear just in case
  terrain.forEach(t =>                          // t.id is in the JSON
    terrainSelect.add(new Option(t.name, t.id))
  );
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

/* ----------------------------------
   Roll helper (shared by each stat)
---------------------------------- */
/* helper – roll N d10, count ≥ 6 as successes */
function roll (pool) {
  const faces     = Array.from({ length: pool }, () => Math.floor(Math.random() * 10) + 1);
  const successes = faces.filter(n => n >= 6).length;
  return { faces, successes };
}

function resolveBattle (s) {
  /* perform every opposed test */
  const vp = roll(s.vampire.power);
  const ht = roll(s.human.toughness);

  const hp = roll(s.human.power);
  const vt = roll(s.vampire.toughness);

  const vo = roll(s.vampire.obscurity);
  const hr = roll(s.human.revelation);

  const outcomes = {
    vampAttack : vp.successes > ht.successes,
    humanAttack: hp.successes > vt.successes,
    stealth    : vo.successes > hr.successes
  };

  const winner = Object.values(outcomes).filter(Boolean).length >= 2
               ? "Vampires"
               : "Humans";

  /* keep rolls so the logger can show them */
  return {
    winner,
    detail : { vp, ht, hp, vt, vo, hr }    //  ← NEW
  };
}

/* ----------------------------------
   Boot‑strap
---------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadRoster();          
  populateTraitList();
  populateSelect("vampiresSelect", units.vampires);
  populateSelect("humansSelect",   units.humans);
  populateTerrainSelect();
  renderRosters();
  restoreBattleLog();   
});

/* Helper: populateSelect (unchanged) */
function populateSelect(id, options) {
  const sel = document.getElementById(id);
  sel.innerHTML = "";
  options.forEach((opt, idx) => sel.add(new Option(opt.name, idx)));
}
