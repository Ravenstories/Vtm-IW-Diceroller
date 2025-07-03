// js/main.js
import units from '../data/units.json' with { type: 'json' };
import terrain from '../data/terrain.json' with { type: 'json' };
import { getTraitModifiers } from './services/traitService.js';
import { logBattleResult } from './services/logger.js';

let activeUnits = {
  vampires: [],
  humans: []
};

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
        <span><strong>${u.name}</strong> (${u.health}/${u.maxHealth})</span>
        <span>
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
  logBattleResult(v, h, t, stats, result);
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

// Init
window.addUnit = addUnit;
window.adjustHealth = adjustHealth;
window.removeUnit = removeUnit;
window.startBattle = startBattle;

document.addEventListener('DOMContentLoaded', () => {
  populateSelect('vampiresSelect', units.vampires);
  populateSelect('humansSelect', units.humans);
  populateTerrainSelect();
  renderRosters();
});