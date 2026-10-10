import { dragonDiscoveryRecords } from './data/dragon-discovery.generated.ts';
import { DIMENSIONS, type CardDefinition } from '../card/CardDefinition.ts';
import type { PokemonCard, PokemonSet, PrintVariant } from './types.ts';
import { localBoosterArt } from './boosterArt.ts';

export const DRAGON_DISCOVERY_ID = '2024sv';
export const dragonDiscoveryCards: readonly PokemonCard[] = dragonDiscoveryRecords.map(record => ({
  ...record, variants: [...record.variants], foil: { ...record.foil },
  setId: DRAGON_DISCOVERY_ID, setName: "McDonald's Dragon Discovery", seriesId: 'sv', seriesName: 'Scarlet & Violet', era: 'sv',
  front: `/cards/pokemon/dragon-discovery/${record.localId}.png`, thumbnail: `/cards/pokemon/dragon-discovery/${record.localId}.png`,
}));
export const dragonDiscoverySet: PokemonSet = {
  id: DRAGON_DISCOVERY_ID, name: "McDonald's Dragon Discovery", series: { id: 'sv', name: 'Scarlet & Violet' }, era: 'sv',
  releaseDate: '2025-01-21', cardIds: dragonDiscoveryCards.map(card => card.id),
  boosters: localBoosterArt(DRAGON_DISCOVERY_ID)!,
};
export function dragonDiscoveryCard(id: string): PokemonCard {
  const card = dragonDiscoveryCards.find(card => card.id === id);
  if (!card) throw new Error(`Unknown Dragon Discovery card: ${id}`);
  return { ...card, variants: [...card.variants], foil: { ...card.foil }, types: card.types ? [...card.types] : undefined };
}
export function dragonDiscoveryDefinition(id: string, variant: PrintVariant): CardDefinition {
  const card = dragonDiscoveryCard(id);
  if (!card.variants.includes(variant)) throw new Error(`Invalid Dragon Discovery printing: ${id}:${variant}`);
  return {
    id: `pokemon:${id}:${variant}`, title: card.name, franchise: 'Pokémon', set: card.setName,
    number: `${card.localId.padStart(3, '0')}/015 · ${variant === 'holo' ? 'Confetti holo · finish pending' : 'Non-holo'}`,
    dimensions: DIMENSIONS.standard, front: card.front!, back: '/cards/pokemon/back.jpg', profile: 'print-only', seed: 2024015,
    galleryVisible: true, pokemon: { ...card, variant, materialProfile: 'print-only', ...(variant === 'holo' ? { treatmentStatus: 'deferred' as const } : {}) },
    source: { image: card.front!, metadata: `/cards/pokemon/dragon-discovery/${card.localId}-source.json`,
      notes: 'Exact English M24EN printing. TCGplayer scan, TCGdex metadata. Original confetti is photographed into holo fronts; animated finish awaits clean exact-print fronts and protection. No TCGL etch is available or fabricated.' },
  };
}
export const dragonDiscoveryDefinitions = dragonDiscoveryCards.map(card => dragonDiscoveryDefinition(card.id, card.variants[0]));
