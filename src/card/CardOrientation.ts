import type { CardDefinition } from './CardDefinition';

/** Sideways Pokémon fronts retain their portrait UVs in the gallery.
 * A negative Z roll turns the physical card clockwise in the viewer. */
export function viewerCardRoll(card: Pick<CardDefinition, 'franchise' | 'title' | 'pokemon'>): number {
  if (card.franchise !== 'Pokémon') return 0;
  const name = card.pokemon?.name ?? card.title;
  return card.pokemon?.rarity === 'BREAK Rare' || /\b(?:BREAK|LEGEND)$/.test(name.trim())
    ? -Math.PI / 2 : 0;
}
