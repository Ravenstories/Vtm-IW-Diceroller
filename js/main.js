// js/main.js

import { loadJSON } from './core/dataService.js';
import { initRosterUI } from './ui/rosterUI.js';
import { initTraitUI } from './ui/traitUI.js';
import { initLogUI, appendLog } from './ui/logUI.js';
import { calculateBonuses } from './logic/bonusCalculator.js';

let vampireUnits = [], humanUnits = [], traits = {}, terrain = [];

async function initApp() {
  [vampireUnits, humanUnits, traits, terrain] = await Promise.all([
    loadJSON('./data/vampires.json'),
    loadJSON('./data/humans.json'),
    loadJSON('./data/traits.json'),
    loadJSON('./data/terrain.json')
  ]);

  initRosterUI(vampireUnits, humanUnits);
  initTraitUI(traits);
  initLogUI();

  setupBattleRoll();
}

function setupBattleRoll() {
  const rollBtn = document.getElementById('roll-btn');
  rollBtn.addEventListener('click', () => {
    const vampire = getSelectedUnit('vampire');
    const human = getSelectedUnit('human');
    const terrainType = document.getElementById('terrain-select').value;

    const vampireBonus = calculateBonuses(vampire, terrainType, traits);
    const humanBonus = calculateBonuses(human, terrainType, traits);

    const vampirePower = vampire.P + vampireBonus.power;
    const humanToughness = human.T + humanBonus.toughness;

    const result = compareDiceRolls(vampirePower, humanToughness);
    appendLog(vampire, human, vampireBonus, humanBonus, terrainType, result);
  });
}

function getSelectedUnit(type) {
  const select = document.getElementById(`${type}-select`);
  const value = select.value;
  const [name, hp] = value.split(' (HP ');
  const list = type === 'vampire' ? vampireUnits : humanUnits;
  return list.find(u => u.name === name.trim());
}

function compareDiceRolls(power, toughness) {
  const roll = () => Array.from({ length: power }, () => Math.ceil(Math.random() * 10)).filter(x => x >= 6).length;
  const result = roll() - Array.from({ length: toughness }, () => Math.ceil(Math.random() * 10)).filter(x => x >= 6).length;
  return result > 0 ? 'Vampire' : result < 0 ? 'Human' : 'Draw';
}

initApp();
