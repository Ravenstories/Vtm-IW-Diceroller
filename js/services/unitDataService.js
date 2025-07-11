let units = {
  vampires: [],
  humans: [],
  allUnits: []
};

export async function loadUnitData() {
  const res = await fetch("./data/units.json");
  const json = await res.json();
  console.log("Unit data loaded:", json.length, "units found.");

  units.vampires = json.filter(u => u.tags.includes("undead"));
  units.humans = json.filter(u => u.tags.includes("human"));
  units.allUnits = json;
}

export function getUnitTypes() {
  return units.allUnits.map(u => u.id);
}

export function getUnitById(id) {
  return units.allUnits.find(u => u.id === id);
}

export function getAllUnits() {
  return units.allUnits;
}

export function getVampireUnits() {
  console.log("getVampireUnits called" + units.vampires.length);
  return units.vampires;
}
export function getHumanUnits() {
  console.log("getHumanUnits called" + units.humans.length);
  return units.humans;
}
