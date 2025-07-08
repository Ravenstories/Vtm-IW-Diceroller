let unitDefinitions = [];
const units = "./data/units.json";

export async function loadUnitData() {
  const res = await fetch(units);
  const json = await res.json();
  unitDefinitions = json; 
}

export function getUnitTypes() {
  return unitDefinitions.map(u => u.id);
}

export function getUnitById(id) {
  return unitDefinitions.find(u => u.id === id);
}

export function getAllUnits() {
  return unitDefinitions;
}
