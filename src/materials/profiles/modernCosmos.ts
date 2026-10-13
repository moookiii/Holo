import type { CardDefinition } from '../../card/CardDefinition.ts';
import type { FoilLayer, HolographicProfile } from '../HolographicProfile.ts';

const cosmosIds = new Set([
  'pokemon-base-set-2-cosmos', 'pokemon-cosmos', 'pokemon-cosmos-hd',
  'svp-cosmos', 'pokemon-evolutions-holo',
]);
const masterImageSeries = new Set(['bw', 'xy', 'sm', 'swsh', 'sv', 'me']);

/** Route native modern Cosmos prints through absorbing backing. Vintage scans
 * already contain that absorption; an explicitly selected alternate stays exact.
 * Deferred print-only cards never acquire fabricated Cosmos geometry. */
export function modernCosmosProfileId(card: CardDefinition, selected: string): string {
  return selected === card.profile && card.franchise === 'Pokémon'
    && masterImageSeries.has(card.pokemon?.seriesId ?? '') && cosmosIds.has(selected)
    ? `modern-${selected}` : selected;
}

function darkBacking(layer: FoilLayer): FoilLayer {
  return {
    ...layer,
    diffraction: { ...layer.diffraction }, structure: { ...layer.structure }, glints: { ...layer.glints },
    // Absorb the broad foil field beneath ink; dot diffraction keeps its exact
    // energy and orientation. Coverage/protection clips absorption in both the
    // viewer and packed gallery shader. No master-image or mask edits.
    surface: { ...layer.surface, substrateDarkening: .82, substrateReflection: .42,
      foilReflectance: .055, sheen: .08, laminate: .12 },
  };
}

export function createModernCosmosProfiles(profiles: readonly HolographicProfile[]): HolographicProfile[] {
  return profiles.filter(p => cosmosIds.has(p.id)).map(base => ({
    ...base, ...darkBacking(base), id: `modern-${base.id}`, name: `${base.name} · Modern masters`,
    description: `${base.description} Dark absorbing foil backing for Black & White and later clean master images; original motifs, diffraction and protected print are preserved.`,
    secondary: base.secondary ? darkBacking(base.secondary) : undefined,
    stamp: base.stamp ? darkBacking(base.stamp) : undefined,
  }));
}
