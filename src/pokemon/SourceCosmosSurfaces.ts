import type { CardMapPaths } from '../card/CardDefinition.ts';
import { sourceCosmos } from './data/source-cosmos.generated.ts';

interface SourceSurface {
  cardId: string;
  variant: string;
  tcglVariantId?: string | null;
  foilType: string;
  textured: boolean;
  profile: string;
  maps: CardMapPaths;
  evidence: string;
}
const registry = new Map(sourceCosmos.map(r => [`${r.cardId}:${r.variant}`, r]));

/** Stable offline PNGs; no image detection or whole-set GPU preparation. */
export function sourceCosmosSurface<T extends SourceSurface>(surface: T): T {
  const record = registry.get(`${surface.cardId}:${surface.variant}`);
  if (!record) return surface;
  if (surface.foilType !== 'Cosmos' || surface.textured
    || surface.tcglVariantId !== record.tcglVariantId
    || !['print-only', 'pokemon-base-set-2-cosmos'].includes(surface.profile)) {
    throw new Error(`Mismatched source Cosmos printing ${surface.cardId}:${surface.variant}`);
  }
  return { ...surface, profile: 'pokemon-base-set-2-cosmos',
    maps: { ...surface.maps, ...record.maps }, evidence: record.evidence,
    treatmentStatus: 'existing-material', deferredEffect: null };
}
