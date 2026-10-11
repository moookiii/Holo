import type { CardDefinition } from '../card/CardDefinition.ts';
import { galleryPokemonCorrections, galleryPokemonMetadata } from './data/gallery-metadata.generated.ts';

/** Enrich an exact registered print, without changing any optical properties. */
export function completePokemonMetadata(card: CardDefinition): CardDefinition {
  if (card.franchise !== 'Pokémon' || card.construction?.kind === 'metal') return card;
  const source = galleryPokemonMetadata[card.id];
  const correction = galleryPokemonCorrections[card.id];
  if (!source && !correction) return card;
  if (card.pokemon?.id === source?.id && card.pokemon?.rarity && card.pokemon?.category
    && (!correction || card.title === correction.title && card.number === correction.number)) return card;
  const pokemon = { ...source, ...card.pokemon };
  for (const field of ['rarity', 'category'] as const) {
    if (!pokemon[field] && source?.[field]) pokemon[field] = source[field];
  }
  return {
    ...card,
    ...(correction ? { title: correction.title, number: correction.number } : {}),
    pokemon,
    source: card.source ?? {
      image: correction?.source ?? card.front,
      metadata: `https://api.tcgdex.net/v2/en/cards/${pokemon.id}`,
      notes: 'Exact English set and collector number checked against TCGdex. Authored front and material retained.',
    },
  };
}

/** TCGdex permits absent/None rarity. Do not infer rarity from foil or name. */
export function tcgdexRarity(value: string | undefined | null): string {
  if (!value || value.toLowerCase() === 'none') return 'Unmarked';
  return value.replace(/\b\w/g, character => character.toUpperCase());
}
