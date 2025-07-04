/* js/services/traitService.js
   — central place that turns a unit’s traits into flat stat bonuses
-------------------------------------------------------------- */
import traits from "../../data/traits.json" with { type: "json" };

/**
 * Inspect every trait a unit has, decide which ones trigger in the
 * given context, and accumulate their numeric bonuses.
 *
 * @param {Object} unit    — the unit record (must contain `traits` array)
 * @param {Object} context — { terrain, opponent, … }  runtime info
 * @returns {{ modifiers:Object, activeTraits:string[] }}
 */
export function getTraitModifiers (unit, context = {}) {

  /* 1️⃣  start with *no* assumptions about which stats exist           */
  const modifiers    = {};          // dynamic: we’ll add keys as we go
  const activeTraits = [];

  (unit.traits || []).forEach(traitName => {
    const trait = traits[traitName];
    if (!trait || !trait.effects) return;

    trait.effects.forEach(effect => {
      const { trigger, modifiers: effMods = {} } = effect;

      /* 2️⃣  decide whether this effect actually fires right now       */
      const handler = trigger?.type && triggerHandlers[trigger.type];
      const fires   = handler ? handler(trigger, context)            // context check
                              : !trigger;                            // no trigger = always

      if (!fires) return;

      /* 3️⃣  merge the numeric bonuses (works for *any* stat key)      */
      for (const [stat, value] of Object.entries(effMods)) {
        modifiers[stat] = (modifiers[stat] || 0) + value;
      }

      /* 4️⃣  remember the trait once per battle                        */
      if (!activeTraits.includes(traitName)) activeTraits.push(traitName);
    });
  });

  return { modifiers, activeTraits };
}

/* ----------------------------------------------------------
   Trigger handlers
   (add more keys here if you invent new trigger “types”)
---------------------------------------------------------- */
const triggerHandlers = {
  /** terrain match – case-insensitive, compares against terrain *key* */
  terrain : (trigger, ctx) => {
    const current = String(ctx.terrain || "").toLowerCase();
    return (trigger.value || [])
           .map(v => String(v).toLowerCase())
           .includes(current);
  },

  /** opponent has a specific trait */
  targetUnitTrait : (trigger, ctx) =>
    ctx.opponent?.traits?.includes(trigger.value),

  /** simple boolean flags the engine might pass in */
  receivedBuff : (_t, ctx) => ctx.hasReceivedBuff === true,
  needsBlood   : (_t, ctx) => ctx.needsBlood      === true,
};
