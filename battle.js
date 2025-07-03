let unitTemplates = {};
let activeUnits = {
  vampires: [],
  humans: []
};

fetch('units.json')
  .then(res => res.json())
  .then(data => {
    unitTemplates = data;
    populateRaceDropdowns();
  });

function populateRaceDropdowns() {
  const races = Object.keys(unitTemplates);
  races.forEach(race => {
    const select = document.getElementById(race + "Unit");
    unitTemplates[race].forEach((unit, i) => {
      const option = new Option(unit.name, i);
      select.add(option);
    });
  });
  renderActiveUnits();
}

function addUnit(race) {
  const selectedIndex = document.getElementById(race + "Unit").value;
  const template = unitTemplates[race][selectedIndex];
  const unit = {
    ...template,
    health: template.maxHealth
  };
  activeUnits[race].push(unit);
  renderActiveUnits();
}

function adjustHealth(race, index, delta) {
  activeUnits[race][index].health = Math.max(0, activeUnits[race][index].health + delta);
  renderActiveUnits();
}

function removeUnit(race, index) {
  activeUnits[race].splice(index, 1);
  renderActiveUnits();
}

function renderActiveUnits() {
  const container = document.getElementById("activeRoster");
  container.innerHTML = "";

  Object.entries(activeUnits).forEach(([race, units]) => {
    const title = document.createElement("h3");
    title.textContent = race.charAt(0).toUpperCase() + race.slice(1);
    container.appendChild(title);

    units.forEach((unit, i) => {
      const div = document.createElement("div");
      div.innerHTML = `
        <strong>${unit.name}</strong> 
        (${unit.health}/${unit.maxHealth}) 
        <button onclick="adjustHealth('${race}', ${i}, -1)">-</button>
        <button onclick="adjustHealth('${race}', ${i}, 1)">+</button>
        <button onclick="removeUnit('${race}', ${i})">Remove</button>
      `;
      container.appendChild(div);
    });
  });
}