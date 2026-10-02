import type { CardDefinition } from './CardDefinition.ts';
import { wizardsPromoCards } from '../pokemon/WizardsPromoCatalog.ts';

/** The complete original front is printed onto the standard card geometry. */
export const wizardsPromoDefinitions: CardDefinition[] = wizardsPromoCards.map(card => ({
  id: `pokemon:${card.id}:normal`, title: card.name, franchise: 'Pokémon',
  set: 'Wizards Black Star Promos', number: `${card.localId}/53 · Promo · Non-holo`,
  dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
  front: card.front!, back: '/cards/pokemon/back.jpg',
  profile: 'print-only', seed: 199900 + Number(card.localId),
  pokemon: { ...card, variant: 'normal', materialProfile: 'print-only' },
  source: { image: card.localId === '1'
    ? 'https://www.wildcardcyclone.com/cdn/shop/products/Pikachu1BasicPokemonBlackStarPromo_800x.jpg?v=1606705896'
    : `https://assets.tcgdex.net/en/base/basep/${card.localId}/high.png`,
    metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
    notes: card.localId === '1'
      ? 'Unstamped ordinary Wizards Promo #1 photographed front, perspective corrected to a local PNG. Print-only treatment; no stamp overlay or pack association.'
      : 'Original Wizards Black Star Promo front, locally cached as PNG. Ordinary print-only treatment; no foil, stamp overlay, or pack association.' },
  layout: { artwork: [65/600, 96/825, 535/600, 430/825], innerFrame: [22/600, 22/825, 578/600, 803/825] },
}));
