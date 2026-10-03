import type { PackDefinition } from '../pack/PackDefinition.ts';
import { LOB_PRODUCT_ID, implementationFor } from './catalog/implementations.ts';
import { lobProduct } from './sets/LegendOfBlueEyesProduct.ts';
import { collateYugioh } from './collator/collate.ts';
import { yugiohDefinition } from './materials.ts';

export function resolveYugiohProduct(catalogId: string, productId: string, seed: number) {
  if (implementationFor(catalogId)?.id !== productId || productId !== LOB_PRODUCT_ID) throw new Error('Pack opening is not implemented for this catalog entry');
  const resolved = collateYugioh(lobProduct, seed), definitions = resolved.cards.map(yugiohDefinition);
  const root = '/packs/yugioh/lob-first-edition';
  const pack: PackDefinition = { id: productId, name: lobProduct.name, category: 'Yu-Gi-Oh!', cardCount: 9, seed, order: 'fixed',
    contents: resolved.cards.map(c => ({ cardId: c.id, rarity: c.rarity === 'Secret Rare' ? 'signature' : c.rarity === 'Common' || c.rarity === 'Rare' ? 'standard' : 'foil' })),
    wrapper: { front: `${root}/front.png`, back: `${root}/back.png`, ink: `${root}/front-ink.png`, backInk: `${root}/back-ink.png`,
      width: 7.1, height: 11.8, depth: .54, printedSeals: true } };
  pack.contents.forEach(Object.freeze); Object.freeze(pack.contents); Object.freeze(pack.wrapper); Object.freeze(pack);
  return { pack, definitions, resolved };
}
