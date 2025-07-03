// js/traitService.js
import traits from '../../data/traits.json' with { type: 'json' };

export function getTraitModifiers(unit, context = {}) {
  const modifiers = { power: 0, toughness: 0, obscurity: 0 };
  const activeTraits = [];

  unit.traits?.forEach(traitName => {
    const trait = traits[traitName];
    if (!trait || !trait.effects) return;

    trait.effects.forEach(effect => {
      const { trigger, modifiers: effectModifiers } = effect;

      if (!trigger?.type || !triggerHandlers[trigger.type]) return;

      const isTriggered = triggerHandlers[trigger.type](trigger, context);
      if (isTriggered) {
        for (const [stat, value] of Object.entries(effectModifiers)) {
          if (modifiers[stat] != null) modifiers[stat] += value;
        }
        activeTraits.push(traitName);
      }
    });
  });

  return { modifiers, activeTraits };
}

const triggerHandlers = {
  terrain: (trigger, context) => trigger.value.includes(context.terrain),
  targetUnitTrait: (trigger, context) =>
    context.opponent?.traits?.includes(trigger.value),
  receivedBuff: (trigger, context) => context.hasReceivedBuff === true,
  needsBlood: (trigger, context) => context.needsBlood === true,
  // Add more handlers as needed
};

export function getTraitDescription(traitName) {
  return traits[traitName]?.description || '';
}

export function getTerrainBonuses(unit, terrain) {
  const context = { terrain };
  return getTraitModifiers(unit, context).modifiers;
}