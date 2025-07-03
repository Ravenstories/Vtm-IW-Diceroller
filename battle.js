/* ---------- State ---------- */
let unitTemplates = {};            // loaded from units.json
let activeUnits = { vampires: [], humans: [] };
const LS_KEY = 'vtm_roster';

/* ---------- Initial Load ---------- */
document.addEventListener('DOMContentLoaded', () => {
  fetch('units.json')
    .then(r => r.json())
    .then(json => {
      unitTemplates = json;
      loadRoster();
      populateRecruitDropdowns();
      renderActiveUnits();
    });
});

/* ---------- Recruit & Roster ---------- */
function populateRecruitDropdowns() {
  ['vampires', 'humans'].forEach(race => {
    const sel = document.getElementById(race + 'Select');
    sel.innerHTML = '';
    unitTemplates[race].forEach((u, i) => sel.add(new Option(u.name, i)));
  });
}

function addUnit(race) {
  const idx = +document.getElementById(race + 'Select').value;
  if (Number.isNaN(idx)) return;
  const temp = unitTemplates[race][idx];
  activeUnits[race].push({ ...temp, health: temp.maxHealth });
  saveRoster();
  renderActiveUnits();
}

function removeUnit(race, i) {
  activeUnits[race].splice(i, 1);
  saveRoster();
  renderActiveUnits();
}

function adjustHealth(race, i, delta) {
  const u = activeUnits[race][i];
  u.health = Math.max(0, Math.min(u.maxHealth, u.health + delta));
  saveRoster();
  renderActiveUnits();
}

/* ---------- Rendering ---------- */
function renderActiveUnits() {
  const wrap = document.getElementById('activeRoster');
  wrap.innerHTML = '';

  ['vampires', 'humans'].forEach(race => {
    const title = document.createElement('h2');
    title.textContent = race[0].toUpperCase() + race.slice(1) + ' Roster';
    wrap.appendChild(title);

    activeUnits[race].forEach((u, i) => {
      const row = document.createElement('div');
      row.className = 'roster-unit';
      row.innerHTML = `
        <span><strong>${u.name}</strong> (HP ${u.health}/${u.maxHealth})</span>
        <span>
          <button onclick="adjustHealth('${race}',${i},-1)">-</button>
          <button onclick="adjustHealth('${race}',${i},1)">+</button>
          <button onclick="removeUnit('${race}',${i})">✖</button>
        </span>`;
      wrap.appendChild(row);
    });
  });

  updateCombatantSelects();
}

function updateCombatantSelects() {
  const vSel = document.getElementById('vampireActiveSelect');
  const hSel = document.getElementById('humanActiveSelect');
  [vSel, hSel].forEach(sel => (sel.innerHTML = ''));

  activeUnits.vampires.forEach((u, i) =>
    vSel.add(new Option(`${u.name} (HP ${u.health})`, i))
  );
  activeUnits.humans.forEach((u, i) =>
    hSel.add(new Option(`${u.name} (HP ${u.health})`, i))
  );
}

/* ---------- Battle Logic ---------- */
function rollDice(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10) + 1);
}
const successes = rolls => rolls.filter(r => r >= 6).length;

function duel(att, attStat, def, defStat, label) {
  const rA = rollDice(att[attStat] || 0);
  const rD = rollDice(def[defStat] || 0);
  const sA = successes(rA);
  const sD = successes(rD);
  const winner = sA > sD ? att.name : sD > sA ? def.name : 'Draw';
  return `
    <h3>${label}</h3>
    <p>${att.name} (${capitalize(attStat)}): ${rA.join(', ')} — <b>${sA}</b></p>
    <p>${def.name} (${capitalize(defStat)}): ${rD.join(', ')} — <b>${sD}</b></p>
    <strong>Winner: ${winner}</strong>`;
}

function startBattle() {
  const vIdx = document.getElementById('vampireActiveSelect').value;
  const hIdx = document.getElementById('humanActiveSelect').value;
  if (vIdx === '' || hIdx === '') {
    alert('Pick one active Vampire and one active Human.');
    return;
  }
  const vamp = activeUnits.vampires[vIdx];
  const human = activeUnits.humans[hIdx];

  const out = [
    duel(vamp, 'power', human, 'toughness', 'Vampire Power vs Human Toughness'),
    duel(human, 'power', vamp, 'toughness', 'Human Power vs Vampire Toughness'),
    duel(vamp, 'obscurity', human, 'revelation', 'Obscurity vs Revelation')
  ];
  document.getElementById('results').innerHTML = out.join('<hr>');
}

const capitalize = str => str[0].toUpperCase() + str.slice(1);

/* ---------- Persistence ---------- */
function saveRoster() {
  localStorage.setItem(LS_KEY, JSON.stringify(activeUnits));
}
function loadRoster() {
  const data = localStorage.getItem(LS_KEY);
  if (data) {
    try { activeUnits = JSON.parse(data); } catch { /* ignore */ }
  }
}
