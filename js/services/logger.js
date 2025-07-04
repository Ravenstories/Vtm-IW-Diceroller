/* logBattleResult(unitA, unitB, terrainId, stats, result) -------------- */
export function logBattleResult (vamp, human, terrainId, stats, result) {
  const log = document.createElement("article");
  log.className = "battle-log";

  /* ⇢ Title */
  log.innerHTML = `
    <h4>Battle on ${terrainId}</h4>
    <strong>${vamp.name}</strong> vs <strong>${human.name}</strong>
    <ul class="rolls">
      ${row("Vampire Power",        result.rolls.vp, "Human Toughness",  result.rolls.ht)}
      ${row("Human Power",          result.rolls.hp, "Vampire Toughness",result.rolls.vt)}
      ${row("Vampire Obscurity",    result.rolls.vo, "Human Revelation", result.rolls.hr)}
    </ul>
    <p class="winner">🏆 Winner: <b>${result.winner}</b></p>
    <hr/>
  `;

  document.getElementById("battleLog").prepend(log); // newest on top
}

/* helper → one pretty list item per opposed roll */
function row (lhsLabel, lhs, rhsLabel, rhs) {
  const s = (n) => n === 1 ? "success" : "successes";
  const fmt = ({ rolls, successes }) =>
        `<span class="faces">${rolls.join(", ")}</span>
         <em>${successes} ${s(successes)}</em>`;

  return `<li>
    ${lhsLabel}: ${fmt(lhs)}
    &nbsp;vs&nbsp;
    ${rhsLabel}: ${fmt(rhs)}
  </li>`;
}
