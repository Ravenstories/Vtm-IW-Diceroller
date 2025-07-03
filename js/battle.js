// js/battle.js (Refactored to follow SOLID principles)
import { getUnitByName } from './unitService.js';
import { getTraitEffects } from './traitService.js';
import { logBattleResult } from './logger.js';

export function simulateBattle(vampire, human, terrain, traitsData) {
  const vampireUnit = getUnitByName(vampire);
  const humanUnit = getUnitByName(human);

  const vampireBonuses = getTraitEffects(vampireUnit.traits, terrain, traitsData);
  const humanBonuses = getTraitEffects(humanUnit.traits, terrain, traitsData);

  const finalStats = {
    vampire: applyBonuses(vampireUnit, vampireBonuses),
    human: applyBonuses(humanUnit, humanBonuses)
  };

  const result = resolveBattle(finalStats);
  logBattleResult(vampireUnit, humanUnit, terrain, finalStats, result);
  return result;
}

function applyBonuses(unit, bonuses) {
  return {
    name: unit.name,
    power: unit.power + (bonuses.power || 0),
    toughness: unit.toughness + (bonuses.toughness || 0),
    obscurity: unit.obscurity + (bonuses.obscurity || 0),
    revelation: unit.revelation + (bonuses.revelation || 0),
    traits: unit.traits,
    activeTraits: bonuses.activeTraits || []
  };
}

function resolveBattle(stats) {
  const result = {
    winner: 'Draw',
    reason: 'Equal scores'
  };

  if (stats.vampire.power > stats.human.toughness) {
    result.winner = stats.vampire.name;
    result.reason = 'Vampire overwhelmed human toughness';
  } else if (stats.human.power > stats.vampire.toughness) {
    result.winner = stats.human.name;
    result.reason = 'Human overwhelmed vampire toughness';
  }

  return result;
}
