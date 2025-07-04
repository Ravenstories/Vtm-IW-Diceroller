// js/battle.js
import { getUnitByName } from './unitService.js';
import { getTraitModifiers } from './traitService.js';
import { logBattleResult } from './logger.js';

export function simulateBattle(vampire, human, terrain) {
  const vampireUnit = getUnitByName(vampire);
  const humanUnit = getUnitByName(human);

  const { modifiers: vampMods,  activeTraits: vampActive  } = getTraitModifiers(
       vampireUnit, { terrain, opponent: humanUnit });
  const { modifiers: humanMods, activeTraits: humanActive } = getTraitModifiers(
       humanUnit,   { terrain, opponent: vampireUnit });

  const finalStats = {
    vampire: applyBonuses(vampireUnit, vampMods,  vampActive),
    human:   applyBonuses(humanUnit, humanMods, humanActive)
  };

  const result = resolveBattle(finalStats);
  logBattleResult(vampireUnit, humanUnit, terrain, finalStats, result);
  return result;
}

function applyBonuses(unit, modifiers, activeTraits = []) {
  return {
    name: unit.name,
    power:      unit.power      + (modifiers.power      ?? 0),
    toughness:  unit.toughness  + (modifiers.toughness ?? 0),
    obscurity:  unit.obscurity  + (modifiers.obscurity ?? 0),
    revelation: unit.revelation + (modifiers.revelation ?? 0),
    traits: unit.traits,
    activeTraits
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