import type { CardDefinition } from './CardDefinition.ts';
import { wizardsPromoCards, wizardsMoviePromoIds, wizardsHoloPromoCards, wizardsSpecialPromoCards } from '../pokemon/WizardsPromoCatalog.ts';

const specialPromoIds = new Set(wizardsSpecialPromoCards.map(card => card.id));

/** The complete original front is printed onto the standard card geometry. */
export const wizardsPromoDefinitions: CardDefinition[] = wizardsPromoCards.filter(card => !card.variants.includes('holo') && !specialPromoIds.has(card.id)).map(card => ({
  id: `pokemon:${card.id}:normal`, title: card.name, franchise: 'Pokémon',
  set: 'Wizards Black Star Promos', number: `${card.localId}/53 · Promo · ${wizardsMoviePromoIds.has(card.id) ? 'First Movie gold stamp' : 'Non-holo'}`,
  dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
  front: card.front!, back: '/cards/pokemon/back.jpg',
  profile: wizardsMoviePromoIds.has(card.id) ? 'pokemon-first-movie-gold' : 'print-only',
  ...(wizardsMoviePromoIds.has(card.id) ? { maps: { metallic: `/cards/pokemon/wizards-promos/maps/${card.localId}-movie-gold.png` } } : {}),
  seed: 199900 + Number(card.localId),
  pokemon: { ...card, variant: 'normal', materialProfile: wizardsMoviePromoIds.has(card.id) ? 'pokemon-first-movie-gold' : 'print-only' },
  source: { image: card.localId === '1'
    ? 'https://www.wildcardcyclone.com/cdn/shop/products/Pikachu1BasicPokemonBlackStarPromo_800x.jpg?v=1606705896'
    : `https://assets.tcgdex.net/en/base/basep/${card.localId}/high.png`,
    metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
    notes: wizardsMoviePromoIds.has(card.id) ? 'First Movie distribution with upright gold stamp. Registered PNG glyph coverage uses the existing non-diffractive metallic ink channel. No booster association.' : card.localId === '1'
      ? 'Unstamped ordinary Wizards Promo #1 photographed front, perspective corrected to a local PNG. Print-only treatment; no stamp overlay or pack association.'
      : 'Original Wizards Black Star Promo front, locally cached as PNG. Ordinary print-only treatment; no foil, stamp overlay, or pack association.' },
  layout: { artwork: [65/600, 96/825, 535/600, 430/825], innerFrame: [22/600, 22/825, 578/600, 803/825] },
}));
wizardsPromoDefinitions.push(...wizardsHoloPromoCards.map(card => ({
 id:`pokemon:${card.id}:holo`,title:card.name,franchise:'Pokémon' as const,set:'Wizards Black Star Promos',number:`${card.localId}/53 · Promo · Holo`,
 dimensions:{width:6.3,height:8.8,thickness:.032,cornerRadius:.3,bevel:.007},front:card.front!,back:'/cards/pokemon/back.jpg',profile:'pokemon-base-set-2-cosmos',seed:199900+Number(card.localId),
 ...(Number(card.localId)>=34 ? { profileOverrides: { diffraction: { strength: .32 }, surface: { foilReflectance: .055, sheen: 0, laminate: .10 } } } : {}),
 maps:{foil:`/cards/pokemon/wizards-promos/maps/${card.localId}-foil.png`,protection:`/cards/pokemon/wizards-promos/maps/${card.localId}-protection.png`,motif:`/cards/pokemon/wizards-promos/maps/${card.localId}-cosmos.png`},mapSettings:{embossStrength:0},substrate:{color:[0,0,0] as [number,number,number],printRetention:1},
 pokemon:{...card,variant:'holo' as const,materialProfile:'pokemon-base-set-2-cosmos'},
 source:{image:`https://assets.tcgdex.net/en/base/basep/${card.localId}/high.png`,metadata:`https://api.tcgdex.net/v2/en/cards/${card.id}`,notes:'TCGdex clean front; user cutouts and registered filled Cosmos dots. Entei and Pichu use exterior foil. No booster association.'},
})));

export const wizardsSpecialPromoDefinitions: CardDefinition[] = wizardsSpecialPromoCards.map(card => {
  const number = card.localId;
  const source = { image: `https://assets.tcgdex.net/en/base/basep/${number}/high.png`,
    metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}` };
  const common = {
    id: `pokemon:${card.id}:${card.variants[0]}`, title: card.name, franchise: 'Pokémon' as const,
    set: 'Wizards Black Star Promos',
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', seed: 199900 + Number(number),
  };
  if (number === '18') return {
    ...common, number: '18/53 · Promo · Non-holo', profile: 'print-only',
    pokemon: { ...card, variant: 'normal' as const, materialProfile: 'print-only' },
    source: { ...source, notes: 'Sparkle is part of the printed artwork in the local front. No foil map or booster association.' },
    layout: { artwork: [66/600, 97/825, 534/600, 422/825], innerFrame: [23/600, 22/825, 578/600, 801/825] },
  };
  if (number === '33') return {
    ...common, number: '33/53 · Promo · Non-holo', profile: 'print-only',
    pokemon: { ...card, variant: 'normal' as const, materialProfile: 'print-only' },
    source: { ...source, notes: 'Complete printed front with no added foil response or booster association.' },
    layout: { artwork: [65/600, 97/825, 535/600, 425/825], innerFrame: [23/600, 23/825, 578/600, 800/825] },
  };
  return {
    ...common, number: `${number}/53 · Promo · e-Reader layout`, profile: 'print-only',
    pokemon: { ...card, variant: 'normal' as const, materialProfile: 'print-only' },
    source: { ...source, notes: 'Exact e-Reader dot strips and any printed movie logo are present on the complete local front. No separate stamp or foil overlay; no booster association.' },
    layout: { artwork: [63/600, 94/825, 575/600, 412/825], innerFrame: [67/600, 22/825, 579/600, 782/825] },
  };
});
wizardsPromoDefinitions.push(...wizardsSpecialPromoDefinitions);
