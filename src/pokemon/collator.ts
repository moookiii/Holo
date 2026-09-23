import { randomSequence } from '../pack/PackDefinition.ts';
import { recipeFor, type PokemonRecipe } from './recipes.ts';
import type { PokemonCard, PokemonPull, ResolvedPokemonPack } from './types.ts';
import { basicEnergyCards } from './energy.ts';

function hash(text: string) { let n = 2166136261; for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
export function collatePokemon(setId: string, boosterId: string, seed: number, cards: readonly PokemonCard[], recipe: PokemonRecipe | undefined = recipeFor(setId)): ResolvedPokemonPack {
  if (!recipe || recipe.setId !== setId) throw new Error(`Opening is not supported for ${setId}: no validated recipe.`);
  if (recipe.boosterIds && !recipe.boosterIds.includes(boosterId)) throw new Error('This booster has no validated recipe.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid pack seed');
  const pool = cards.filter(c => c.setId === setId && c.era === recipe.era && (!c.boosterIds || c.boosterIds.includes(boosterId))).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (new Set(pool.map(c => c.id)).size !== pool.length) throw new Error('Duplicate card metadata');
  // Cosmetic art variants have identical eligible pools and therefore identical pulls.
  const eligibilityKey = [...pool, ...(recipe.slots.some(slot => slot.pool === 'energy') ? basicEnergyCards : [])].map(c => `${c.id}:${[...c.variants].sort().join(',')}:${c.rarity}:${c.category ?? ''}:${c.energyType ?? ''}`).join('|');
  const random = randomSequence(hash(`${seed}:${setId}:${recipe.id}:${recipe.version}:${eligibilityKey}`));
  const pulls: PokemonPull[] = [];
  for (const slot of recipe.slots) {
    if (!Number.isInteger(slot.count) || slot.count < 1 || !slot.outcomes.length || slot.outcomes.some(o => !Number.isFinite(o.weight) || o.weight <= 0) || Math.abs(slot.outcomes.reduce((n, o) => n + o.weight, 0) - 1) > 1e-8) throw new Error(`Invalid recipe slot ${slot.id}`);
    const slotPool = slot.pool === 'energy' ? basicEnergyCards : pool;
    const outcomes = slot.outcomes.map(o => ({ ...o, pool: slotPool.filter(c => o.rarities.includes(c.rarity) && c.variants.includes(o.variant) && (!o.cardIds || o.cardIds.includes(c.id)) && (!o.excludedCardIds || !o.excludedCardIds.includes(c.id)) && (!o.categories || (c.category !== undefined && o.categories.includes(c.category))) && (!o.energyTypes || (c.energyType !== undefined && o.energyTypes.includes(c.energyType)))) }));
    // Never redistribute a missing rarity's odds or quietly bias an incomplete pool.
    for (const o of outcomes) if (o.pool.length < (slot.unique ? slot.count : 1)) throw new Error(`Incomplete ${slot.id} pool (${o.rarities.join('/')}). Retry metadata or choose another booster.`);
    const used = new Set<string>();
    for (let i = 0; i < slot.count; i++) {
      let roll = random(); const selected = outcomes.find(o => (roll -= o.weight) < 0) ?? outcomes.at(-1)!;
      const available = selected.pool.filter(c => !slot.unique || !used.has(c.id));
      const card = available[Math.floor(random() * available.length)]; used.add(card.id);
      const snapshot = Object.freeze({ ...card, variants: Object.freeze([...card.variants]) as unknown as PokemonCard['variants'], boosterIds: card.boosterIds ? Object.freeze([...card.boosterIds]) as unknown as string[] : undefined, foil: Object.freeze({ ...card.foil }) });
      pulls.push(Object.freeze({ card: snapshot, variant: selected.variant, slot: `${slot.id}:${i + 1}` }));
    }
  }
  if (pulls.length < 1 || pulls.length > 12) throw new Error('Unsupported physical pack size');
  const identity = JSON.stringify(['pokemon', setId, boosterId, recipe.id, recipe.version, seed, pulls.map(p => [p.card.id, p.variant, p.slot])]);
  return Object.freeze({ type: 'pokemon', setId, boosterId, seed, eligibilityKey, recipeId: recipe.id, recipeVersion: recipe.version, pulls: Object.freeze(pulls), identity });
}
