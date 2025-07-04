/* js/logger.js -------------------------------------------------------- */
import { saveBattleLog } from "./main.js";   // path: logger → main


export function logBattleResult (vamp, human, terrainId, stats, result) {
  /* find (or lazily create) the log container */
  let logRoot = document.getElementById("results");
  if (!logRoot) {
    logRoot = document.createElement("div");
    logRoot.id = "results";
    document.body.appendChild(logRoot);
  }

  const row = (labelA, rA, labelB, rB) => {
    const fmt = r => `${r.faces.join(", ")} — <strong>${r.successes}</strong>`;
    return `<li>${labelA}: ${fmt(rA)} &nbsp;vs&nbsp; ${labelB}: ${fmt(rB)}</li>`;
  };

  const { vp, ht, hp, vt, vo, hr } = result.detail;

  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `
    <h4>Battle on ${terrainId}</h4>
    <p><strong>${vamp.name}</strong> vs <strong>${human.name}</strong></p>
    <ul class="roll-list">
      ${row("Vampire Power",    vp, "Human Toughness",  ht)}
      ${row("Human Power",      hp, "Vampire Toughness",vt)}
      ${row("Vampire Obscurity",vo, "Human Revelation", hr)}
    </ul>
    <p class="winner">🏆 <strong>Winner:</strong> ${result.winner}</p>
    ${stats.vampire.activeTraits.length
        ? `<p>Vampire traits used: ${stats.vampire.activeTraits.join(", ")}</p>` : ""}
    ${stats.human.activeTraits.length
        ? `<p>Human traits used: ${stats.human.activeTraits.join(", ")}</p>`   : ""}
    <hr/>
  `;

  /* newest battle on top */
  logRoot.prepend(entry);
  saveBattleLog(logRoot.innerHTML);
}
