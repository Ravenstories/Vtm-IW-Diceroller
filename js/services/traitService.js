// js/traitService.js
import traits from '../../data/traits.json' with { type: 'json' };

/**
 * Applies trait-based modifiers to a unit's stats based on context
 * @param {Object} unit - The unit to process
 * @param {Object} context - { terrain: string, opponent: Object }
 * @returns {Object} { modifiers, activeTraits }
 */
export function getTraitModifiers(unit, context) {
  let modifiers = { power: 0, toughness: 0, obscurity: 0 };
  let activeTraits = [];

  unit.traits?.forEach(traitName => {
    const trait = traits[traitName];
    if (!trait || !trait.effects) return;

    trait.effects.forEach(effect => {
      const trigger = effect.trigger;
      let match = false;

      if (trigger.type === 'terrain' && trigger.value.includes(context.terrain)) {
        match = true;
      }

      if (trigger.type === 'targetUnitTrait' && context.opponent?.traits?.includes(trigger.value)) {
        match = true;
      }

      if (match) {
        for (let [stat, value] of Object.entries(effect.modifiers)) {
          if (modifiers[stat] != null) modifiers[stat] += value;
        }
        activeTraits.push(traitName);
      }
    });
  });

  return { modifiers, activeTraits };
}

/**
 * Gets the description for a trait
 * @param {string} traitName
 * @returns {string}
 */
export function getTraitDescription(traitName) {
  return traits[traitName]?.description || '';
}
