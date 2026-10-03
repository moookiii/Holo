import data from './data/alpha-cards.json' with { type: 'json' };
import type { MagicCard, MagicSet } from './types.ts';

export const alphaCards: readonly MagicCard[] = Object.freeze(data.map(row => Object.freeze({ ...row }) as MagicCard));
export const alphaSet: MagicSet = Object.freeze({ id: 'lea', name: 'Alpha', series: { id: 'limited-edition', name: 'Limited Edition' },
  releaseDate: '1993-08-05', cards: alphaCards, productIds: ['magic:lea:booster'] });
export const magicSets: readonly MagicSet[] = Object.freeze([alphaSet]);
export function validateAlphaCatalog() {
  if (alphaCards.length !== 295 || new Set(alphaCards.map(c => c.id)).size !== 295) throw new Error('Alpha requires 295 unique printings');
  for (const [rarity, count] of Object.entries({ common: 84, uncommon: 95, rare: 116 }))
    if (alphaCards.filter(c => c.rarity === rarity).length !== count) throw new Error(`Invalid Alpha ${rarity} count`);
  if (alphaCards.some(c => c.frame !== '1993' || c.border !== 'black' || c.finishes.join() !== 'nonfoil')) throw new Error('Unexpected Alpha treatment');
}
validateAlphaCatalog();
