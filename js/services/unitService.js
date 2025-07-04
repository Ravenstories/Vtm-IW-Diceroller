// js/unitService.js
import units from '../../data/units.json' with { type: 'json' };

export function getUnitByName (name) {
  const u = [...units.vampires, ...units.humans].find(x => x.name === name);
  return u ? JSON.parse(JSON.stringify(u)) : null;
}
