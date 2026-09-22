import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import type { PokemonCard, PrintVariant } from './types.ts';

/** Stable identities for existing authored printings, never a name-only match. */
const authored: Record<string, Partial<Record<PrintVariant, string>>> = {
  'sv02-135': { holo: 'tyranitar-paldea-evolved' },
  'swsh4-188': { holo: 'pikachu-vmax-vivid-voltage' },
  'base1-4': { holo: 'charizard-base-set' },
  'neo1-9': { holo: 'lugia-neo-genesis' },
  'base6-74': { reverse: 'eevee-legendary-reverse' },
  'ecard1-40': { reverse: 'charizard-expedition-reverse' },
  'ex6-83': { reverse: 'squirtle-frlg-reverse' },
};
export function pokemonProfile(card: PokemonCard, variant: PrintVariant): string {
  if (variant === 'normal') return 'print-only';
  const foil = card.foil?.[variant]?.toLowerCase() ?? '';
  if (foil.includes('cosmos')) return 'pokemon-cosmos';
  if (foil.includes('galaxy')) return 'pokemon-galaxy-star';
  if (foil.includes('confetti')) return 'pokemon-pixel';
  if (foil.includes('cracked')) return 'pokemon-cracked-ice';
  if (/rainbow|hyper|ultra|special illustration/i.test(card.rarity)) return 'pokemon-rainbow-etched';
  if (variant === 'reverse') return card.era === 'ecard' ? 'pokemon-e-reader' : 'pokemon-sheen';
  if (card.era === 'sv') return 'pokemon-mirage';
  if (card.era === 'swsh') return 'pokemon-vertical-line';
  if (card.era === 'sm') return 'pokemon-water-web';
  if (card.era === 'xy') return 'pokemon-sheen';
  if (card.era === 'base') return 'pokemon-galaxy-star';
  if (card.era === 'neo') return 'pokemon-cosmos';
  return 'pokemon-sheen';
}
export function pokemonDefinition(card: PokemonCard, variant: PrintVariant, existing: readonly CardDefinition[]): CardDefinition {
  if (!card.variants.includes(variant)) throw new Error(`Invalid ${variant} printing for ${card.id}`);
  const exact = existing.find(c => c.id === authored[card.id]?.[variant]);
  const profile = exact?.profile ?? pokemonProfile(card, variant);
  const id = `pokemon:${card.id}:${variant}`;
  const metadata = { ...card, variant, materialProfile: profile };
  if (exact) return { ...exact, id, pokemon: metadata, number: `${card.localId} · ${card.rarity} · ${variant}` };
  return { id, title: card.name, franchise: 'Pokémon', set: card.setName, number: `${card.localId} · ${card.rarity} · ${variant}`,
    dimensions: DIMENSIONS.standard, front: card.front ?? '', back: '/cards/pokemon/back.jpg', profile, seed: 1741,
    pokemon: metadata,
    proceduralFoil: variant === 'normal' ? undefined : variant === 'reverse' ? 'reverse' : ['Common', 'Uncommon', 'Rare'].includes(card.rarity) ? card.era === 'sv' ? undefined : 'artwork' : 'full',
    maps: card.era === 'sv' && variant === 'holo' && ['Common', 'Uncommon', 'Rare'].includes(card.rarity)
      ? { foil: `/cards/pokemon/sv-${card.evolveFrom ? 'evolved' : 'basic'}-artwork.svg` } : undefined,
    // Reuse existing etched optics without borrowing Pikachu's authored relief.
    profileOverrides: profile === 'pokemon-rainbow-etched' ? { structure: { relief: 0 }, diffraction: { strength: .24 }, glints: { strength: 1.4 } } : undefined,
    layout: card.era === 'sv' ? {
      // Bounds registered to the 600 × 825 TCGdex front, inside the picture rails.
      artwork: [48/600, 82/825, 553/600, 390/825], innerFrame: [.035, .025, .965, .975],
    } : { artwork: [.08, .10, .92, .48], innerFrame: [.035, .025, .965, .975] },
  };
}
