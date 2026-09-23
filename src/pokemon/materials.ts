import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import type { PokemonCard, PrintVariant } from './types.ts';
import { baseSetAuthoredIds, baseSetCards } from '../card/BaseSetCards.ts';
import { PRISMATIC_SET_ID } from './PrismaticCatalog.ts';
import { prismaticDefinition, prismaticProfile } from './PrismaticSurfaces.ts';

/** Stable identities for existing authored printings, never a name-only match. */
const authored: Record<string, Partial<Record<PrintVariant, string>>> = {
  'sv02-135': { holo: 'tyranitar-paldea-evolved' },
  'swsh4-188': { holo: 'pikachu-vmax-vivid-voltage' },
  'neo1-9': { holo: 'lugia-neo-genesis' },
  'base6-74': { reverse: 'eevee-legendary-reverse' },
  'ecard1-40': { reverse: 'charizard-expedition-reverse' },
  'ex6-83': { reverse: 'squirtle-frlg-reverse' },
};
export function pokemonProfile(card: PokemonCard, variant: PrintVariant): string {
  if (card.setId === PRISMATIC_SET_ID) return prismaticProfile(card.id, variant);
  if (variant === 'normal') return 'print-only';
  if (variant === 'holo' && card.setId === 'base1' && baseSetAuthoredIds[card.id]) return 'pokemon-base-set-star';
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
export function pokemonDefinition(card: PokemonCard, variant: PrintVariant, existing: readonly CardDefinition[], packSetId?: string): CardDefinition {
  if (card.setId === PRISMATIC_SET_ID) return prismaticDefinition(card.id, variant);
  // These SVE cards belong to several sets. Only Prismatic's pack context
  // defers the reverse finish and keeps its nonfoil Energy out of the picker.
  if (packSetId === PRISMATIC_SET_ID && card.setId === 'sve') {
    if ((variant !== 'normal' && variant !== 'reverse') || !card.variants.includes(variant)) throw new Error('Invalid Prismatic Evolutions Energy printing.');
    const definition = pokemonDefinition({ ...card, variants: ['normal'] }, 'normal', existing);
    return { ...definition, id: `pokemon:${card.id}:${variant}`, pickerHidden: true,
      number: `${card.localId} · ${variant === 'reverse' ? 'Standard reverse holo · foil pending' : 'Non-holo'}`,
      pokemon: { ...card, variant, materialProfile: 'print-only', ...(variant === 'reverse' ? { treatmentStatus: 'deferred' as const } : {}) } };
  }
  if (!card.variants.includes(variant)) throw new Error(`Invalid ${variant} printing for ${card.id}`);
  const baseId = variant === 'holo' && card.setId === 'base1' ? baseSetAuthoredIds[card.id] : undefined;
  const exact = existing.find(c => c.id === (baseId ?? authored[card.id]?.[variant]))
    // Authored Base Set masks must also survive callers with a smaller library.
    ?? (baseId ? baseSetCards.find(c => c.id === baseId) : undefined);
  const profile = exact?.profile ?? pokemonProfile(card, variant);
  const fullArt = card.era === 'sv' && ['Illustration Rare', 'Special Illustration Rare', 'Ultra Rare', 'Hyper Rare'].includes(card.rarity);
  const fullArtBasic = fullArt && variant === 'holo' && card.category === 'Pokemon' && !card.evolveFrom;
  const suppliedMask = fullArtBasic
    ? '/cards/pokemon/sv-full-art-basic-foil.svg'
    : card.setId === 'sve' && variant === 'holo'
    ? '/cards/pokemon/energy/sv-artwork-mask.png'
    : card.era === 'sv' && variant === 'reverse' && card.category === 'Trainer'
      ? '/cards/pokemon/sv-trainer-reverse-artwork.png'
    : card.era === 'sv' && variant === 'reverse' && card.category === 'Pokemon' && card.evolveFrom
      ? '/cards/pokemon/sv-evolved-reverse-artwork.png'
      : card.era === 'sv' && variant === 'holo' && card.category === 'Trainer' && !fullArt
        ? '/cards/pokemon/sv-trainer-artwork.png' : undefined;
  const id = `pokemon:${card.id}:${variant}`;
  const metadata = { ...card, variant, materialProfile: profile };
  if (exact) return { ...exact, id, pokemon: metadata, number: `${card.localId} · ${card.rarity} · ${variant}` };
  return { id, title: card.name, franchise: 'Pokémon', set: card.setName, number: `${card.localId} · ${card.rarity} · ${variant}`,
    dimensions: DIMENSIONS.standard, front: card.front ?? '', back: '/cards/pokemon/back.jpg', profile, seed: 1741,
    pokemon: metadata,
    proceduralFoil: suppliedMask ? undefined : variant === 'normal' ? undefined : variant === 'reverse' ? 'reverse' : ['Common', 'Uncommon', 'Rare'].includes(card.rarity) ? card.era === 'sv' ? undefined : 'artwork' : 'full',
    maps: suppliedMask ? { foil: suppliedMask } : card.era === 'sv' && variant === 'holo' && ['Common', 'Uncommon', 'Rare'].includes(card.rarity)
      ? { foil: card.evolveFrom ? '/cards/pokemon/sv-evolved-artwork.png' : '/cards/pokemon/sv-basic-artwork.svg' } : undefined,
    // Reuse existing etched optics without borrowing Pikachu's authored relief.
    profileOverrides: profile === 'pokemon-rainbow-etched' ? { structure: { relief: 0 }, diffraction: { strength: .24 }, glints: { strength: 1.4 } } : undefined,
    layout: fullArt ? { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] } : card.era === 'sv' ? {
      // Bounds registered to the 600 × 825 TCGdex front, inside the picture rails.
      artwork: [48/600, 82/825, 553/600, 390/825], innerFrame: [.035, .025, .965, .975],
    } : { artwork: [.08, .10, .92, .48], innerFrame: [.035, .025, .965, .975] },
  };
}
