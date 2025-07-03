// js/unitService.js
import units from '../data/units.json' assert { type: 'json' };

export function getUnitByName(name) {
  const allUnits = [...units.vampires, ...units.humans];
  return allUnits.find(u => u.name === name);
}
