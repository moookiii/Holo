import type { CardDefinition, CardDimensions } from '../card/CardDefinition.ts';
import type { MagicCard } from './types.ts';

/** MTG dimensions, independent of Pokémon. Alpha corner/stock thickness and
 * bevel are adjustable estimates pending measured physical specimens. */
export const ALPHA_DIMENSIONS: CardDimensions = Object.freeze({ width: 6.3, height: 8.8, thickness: .032, cornerRadius: .32, bevel: .007 });
export function magicDefinition(card: MagicCard): CardDefinition {
  return { id: card.id, title: card.name, franchise: 'Magic: The Gathering', set: card.setName, number: card.number,
    dimensions: ALPHA_DIMENSIONS, front: card.front, back: '/cards/magic/back.png', profile: 'print-only', seed: 1993000 + Number(card.number),
    magic: card, physicalProfile: 'mtg',
    layout: { artwork: [.10, .12, .90, .53], innerFrame: [.035, .025, .965, .975] },
    mapSettings: { embossStrength: 0, normalScale: 0 },
    source: { image: card.image, metadata: card.metadata, notes: 'Unmodified Alpha scan cached from Scryfall. Original 1993 black-border nonfoil print; no security stamp. Collector number is a catalog identifier, not printed text. Coated stock uses the shared physical surface; depth and corners remain estimates.' } };
}
