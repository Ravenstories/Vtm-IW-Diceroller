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

  // 1. Vampire power vs Human toughness
  const vRolls = rollDice(vampire.power || 0);
  const hRolls = rollDice(human.toughness || 0);
  const vSuc = countSuccesses(vRolls);
  const hSuc = countSuccesses(hRolls);
  output.push(`
    <h3>Vampire Power vs Human Toughness</h3>
    <p>${vampire.name} (Power): ${vRolls.join(', ')} — <strong>${vSuc}</strong> successes</p>
    <p>${human.name} (Toughness): ${hRolls.join(', ')} — <strong>${hSuc}</strong> successes</p>
    <strong>Winner: ${vSuc > hSuc ? vampire.name : hSuc > vSuc ? human.name : 'Draw'}</strong>
  `);

  // 2. Human power vs Vampire toughness
  const hRolls2 = rollDice(human.power || 0);
  const vRolls2 = rollDice(vampire.toughness || 0);
  const hSuc2 = countSuccesses(hRolls2);
  const vSuc2 = countSuccesses(vRolls2);
  output.push(`
    <h3>Human Power vs Vampire Toughness</h3>
    <p>${human.name} (Power): ${hRolls2.join(', ')} — <strong>${hSuc2}</strong> successes</p>
    <p>${vampire.name} (Toughness): ${vRolls2.join(', ')} — <strong>${vSuc2}</strong> successes</p>
    <strong>Winner: ${hSuc2 > vSuc2 ? human.name : vSuc2 > hSuc2 ? vampire.name : 'Draw'}</strong>
  `);

  // 3. Obscurity vs Revelation
  const vObs = vampire.obscurity || 0;
  const hRev = human.revelation || 0;
  const vRolls3 = rollDice(vObs);
  const hRolls3 = rollDice(hRev);
  const vSuc3 = countSuccesses(vRolls3);
  const hSuc3 = countSuccesses(hRolls3);
  output.push(`
    <h3>Obscurity vs Revelation</h3>
    <p>${vampire.name} (Obscurity): ${vRolls3.join(', ')} — <strong>${vSuc3}</strong> successes</p>
    <p>${human.name} (Revelation): ${hRolls3.join(', ')} — <strong>${hSuc3}</strong> successes</p>
    <strong>Winner: ${vSuc3 > hSuc3 ? vampire.name : hSuc3 > vSuc3 ? human.name : 'Draw'}</strong>
  `);

  document.getElementById("results").innerHTML = output.join("<hr/>");
}


function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
