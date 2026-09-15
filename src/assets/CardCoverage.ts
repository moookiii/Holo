import type { CardDefinition, CardMapPaths } from '../card/CardDefinition';

/** Resolve printing coverage before channel packing, without another GPU sampler.
 * Artwork, body motifs, secondary artwork and stamps are authored independently.
 * An absent reverse mask is an error, never an inverted artwork rectangle.
 */
export function resolveCoverageMaps(card: Pick<CardDefinition, 'coverageMode' | 'maps'>): CardMapPaths {
  const { reverseFoil, ...maps } = card.maps ?? {};
  if (card.coverageMode === 'reverse') {
    if (!reverseFoil) throw new Error('Reverse coverage requires maps.reverseFoil.');
    maps.foil = reverseFoil;
  }
  return maps;
}
