// js/logger.js
export function logBattleResult(vampire, human, terrain, stats, result) {
  const log = document.getElementById('results');
  const entry = document.createElement('div');
  entry.classList.add('log-entry');

  entry.innerHTML = `
    <h3>Battle: ${vampire.name} vs ${human.name}</h3>
    <p><strong>Terrain:</strong> ${terrain}</p>
    <p><strong>${vampire.name}</strong> → Power: ${stats.vampire.power}, Toughness: ${stats.vampire.toughness}, Obscurity: ${stats.vampire.obscurity} ${displayTraits(stats.vampire)}</p>
    <p><strong>${human.name}</strong> → Power: ${stats.human.power}, Toughness: ${stats.human.toughness}, Revelation: ${stats.human.revelation} ${displayTraits(stats.human)}</p>
    <p><strong>Result:</strong> ${result.winner} wins – ${result.reason}</p>
    <hr />
  `;

  log.prepend(entry);
}

function displayTraits(unit) {
  if (!unit.activeTraits || unit.activeTraits.length === 0) return '';
  return `<br /><em>Activated Traits:</em> ${unit.activeTraits.join(', ')}`;
}
