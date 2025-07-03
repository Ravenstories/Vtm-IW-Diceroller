// js/unitService.js
import units from '../data/units.json' with { type: 'json' };

export function getUnitByName(name) {
  const allUnits = [...units.vampires, ...units.humans];
  return allUnits.find(u => u.name === name);
}
