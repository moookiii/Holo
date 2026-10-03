import type { PackDefinition } from '../pack/PackDefinition.ts';
import type { MagicProduct } from './types.ts';
import { magicSets } from './AlphaCatalog.ts';
import { alphaSheets, alphaCollationNote, ALPHA_COLLATION_VERSION } from './AlphaCollationData.ts';
import { magicDefinition } from './materials.ts';
import { collateMagic } from './collate.ts';

export const alphaProduct: MagicProduct = Object.freeze({ id: 'magic:lea:booster', setId: 'lea', name: 'Limited Edition Alpha · Booster', packSize: 15,
  collationVersion: ALPHA_COLLATION_VERSION,
  sheets: alphaSheets, slots: Object.freeze([{ id: 'common', sheet: 'common', count: 11 }, { id: 'uncommon', sheet: 'uncommon', count: 3 }, { id: 'rare', sheet: 'rare', count: 1 }]),
  presentation: Object.freeze(['common', 'uncommon', 'rare']), stripeWidths: Object.freeze([2, 3, 4, 5]), note: alphaCollationNote });
export const magicProducts: readonly MagicProduct[] = Object.freeze([alphaProduct]);
export const alphaArtwork = '/packs/magic/alpha/front.png';
export function resolveMagicProduct(productId: string, seed: number) {
  const product = magicProducts.find(p => p.id === productId);
  if (!product) throw new Error(`Unknown Magic product: ${productId}`);
  const catalog = magicSets.find(set => set.id === product.setId)?.cards;
  if (!catalog) throw new Error(`Unavailable Magic set: ${product.setId}`);
  const resolved = collateMagic(product, seed, product.collationVersion);
  const definitions = resolved.pulls.map(pull => {
    const card = catalog.find(c => c.id === pull.cardId);
    if (!card) throw new Error(`Unavailable Magic printing: ${pull.cardId}`);
    return magicDefinition(card);
  });
  const root = '/packs/magic/alpha';
  const pack: PackDefinition = { id: product.id, name: product.name, category: 'Magic: The Gathering', seed, cardCount: product.packSize,
    magic: resolved, order: 'fixed', presentationOrder: resolved.presentationOrder,
    contents: resolved.pulls.map(pull => Object.freeze({ cardId: pull.cardId, rarity: 'standard' as const })),
    wrapper: { front: `${root}/front.png`, back: `${root}/back.png`, ink: `${root}/ink.png`, backInk: `${root}/ink.png`, width: 7.5, height: 13.4, depth: 1.02, printedSeals: true } };
  Object.freeze(pack.contents); Object.freeze(pack.wrapper); Object.freeze(pack);
  return { pack, definitions, resolved };
}
