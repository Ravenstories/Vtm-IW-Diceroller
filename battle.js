let units = { vampires: [], humans: [] };

fetch('units.json')
  .then(res => res.json())
  .then(data => {
    units = data;
    populateDropdowns();
  });

function populateDropdowns() {
  const vampireSelect = document.getElementById("vampireUnit");
  const humanSelect = document.getElementById("humanUnit");

  units.vampires.forEach((unit, i) =>
    vampireSelect.add(new Option(unit.name, i))
  );
  units.humans.forEach((unit, i) =>
    humanSelect.add(new Option(unit.name, i))
  );
}

function rollDice(count) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 10) + 1);
}

function countSuccesses(rolls) {
  return rolls.filter(x => x >= 6).length;
}

function startBattle() {
  const vampire = units.vampires[document.getElementById("vampireUnit").value];
  const human = units.humans[document.getElementById("humanUnit").value];
  const output = [];

  const categories = ["strength", "toughness"];
  categories.forEach(stat => {
    const vRolls = rollDice(vampire[stat] || 0);
    const hRolls = rollDice(human[stat] || 0);
    const vSuc = countSuccesses(vRolls);
    const hSuc = countSuccesses(hRolls);
    output.push(`
      <h3>${capitalize(stat)}</h3>
      <p>${vampire.name}: ${vRolls.join(', ')} — <strong>${vSuc}</strong> successes</p>
      <p>${human.name}: ${hRolls.join(', ')} — <strong>${hSuc}</strong> successes</p>
      <strong>Winner: ${vSuc > hSuc ? vampire.name : hSuc > vSuc ? human.name : 'Draw'}</strong>
    `);
  });

  // Special case: Obscurity vs Revelation
  const vObs = vampire.obscurity || 0;
  const hRev = human.revelation || 0;
  const vRolls = rollDice(vObs);
  const hRolls = rollDice(hRev);
  const vSuc = countSuccesses(vRolls);
  const hSuc = countSuccesses(hRolls);
  output.push(`
    <h3>Obscurity vs Revelation</h3>
    <p>${vampire.name} (Obscurity): ${vRolls.join(', ')} — <strong>${vSuc}</strong> successes</p>
    <p>${human.name} (Revelation): ${hRolls.join(', ')} — <strong>${hSuc}</strong> successes</p>
    <strong>Winner: ${vSuc > hSuc ? vampire.name : hSuc > vSuc ? human.name : 'Draw'}</strong>
  `);

  document.getElementById("results").innerHTML = output.join("<hr/>");
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
