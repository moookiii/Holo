import { completedCosmos } from './data/completed-cosmos.generated.ts';
import type { tcglXySurfaces } from './data/xy-tcgl.generated.ts';
import type { tcglBwSurfaces } from './data/bw-tcgl.generated.ts';
import { sourceCosmosSurface } from './SourceCosmosSurfaces.ts';

type Surface = typeof tcglXySurfaces[number] | typeof tcglBwSurfaces[number];
const registry = new Map<string, typeof completedCosmos[number]>(
  completedCosmos.map(record => [`${record.cardId}:${record.variant}`, record]),
);

/** Activate reviewed geometry only for the exact deferred source printing. */
export function completedCosmosSurface<T extends Surface>(source: T): T {
  const record = registry.get(`${source.cardId}:${source.variant}`);
  if (!record || source.treatmentStatus !== 'deferred') return sourceCosmosSurface(source);
  if (source.tcglVariantId !== record.tcglVariantId || source.foilType !== 'Cosmos'
    || source.textured || !source.originalAssets.foil) {
    throw new Error(`Unreviewed Cosmos printing ${source.tcglVariantId}`);
  }
  return { ...source, profile: 'pokemon-base-set-2-cosmos', textured: false,
    maps: { ...record.maps }, evidence: record.evidence,
    treatmentStatus: 'existing-material', deferredEffect: null };
}
