// js/logger.js
export function logBattleResult(vampire, human, terrain, stats, result) {
  const log = document.getElementById('battle-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  entry.innerHTML = `
    <h4>Battle on ${terrain}</h4>
    <p><strong>${vampire.name}</strong> vs <strong>${human.name}</strong></p>
    <ul>
      <li>Vampire Power (${stats.vampire.power}) vs Human Toughness (${stats.human.toughness})</li>
      <li>Human Power (${stats.human.power}) vs Vampire Toughness (${stats.vampire.toughness})</li>
      <li>Vampire Obscurity (${stats.vampire.obscurity}) vs Human Revelation (${stats.human.revelation})</li>
    </ul>
    <p><strong>Winner:</strong> ${result.winner}</p>
    <p><em>${result.reason}</em></p>
    ${stats.vampire.activeTraits.length > 0 ? `<p>Vampire traits used: ${stats.vampire.activeTraits.join(', ')}</p>` : ''}
    ${stats.human.activeTraits.length > 0 ? `<p>Human traits used: ${stats.human.activeTraits.join(', ')}</p>` : ''}
    <hr />
  `;

  log.prepend(entry);
}

function displayTraits(unit) {
  if (!unit.activeTraits || unit.activeTraits.length === 0) return '';
  return `<br /><em>Activated Traits:</em> ${unit.activeTraits.join(', ')}`;
}
