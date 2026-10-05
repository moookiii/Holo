/// <reference lib="webworker" />
import { generateField, type PatternSpec } from './ManufacturingField';
import { generateMotifField, type MotifImage } from './MotifField';
import { cardCacheRevision, persistentCards } from '../../assets/PersistentCardCache';
import type { FieldData } from './ManufacturingField';
self.onmessage = async (event: MessageEvent<{ id: number; spec: PatternSpec; motifImage?: MotifImage; height?: number }>) => {
  const { id, spec, motifImage, height } = event.data;
  try {
    let key = '';
    try {
      const motifHash = motifImage ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(motifImage.data)))].map(byte => byte.toString(16).padStart(2, '0')).join('') : '';
      key = `full-field-v1:${await cardCacheRevision()}:${JSON.stringify([spec, height, motifImage?.width, motifImage?.height, motifHash])}`;
    } catch { /* Cache access cannot prevent full-quality generation. */ }
    const stored = key ? await persistentCards.get<FieldData>(key) : undefined;
    const valid = stored && stored.width > 0 && stored.height > 0
      && stored.direction instanceof Uint8Array && stored.relief instanceof Uint8Array
      && stored.direction.length === stored.width * stored.height * 4 && stored.relief.length === stored.direction.length;
    // Let foreground shader compilation start only after this worker has
    // finished module/cache initialization and is ready to generate pixels.
    self.postMessage({ id, started: true });
    const field = valid ? stored : spec.kind === 'symbol-foil' && spec.motif
      ? generateMotifField(spec.seed, spec.aspect, spec.scale, height ?? 2048, spec.motif, motifImage) : generateField(spec, height, motifImage);
    // Complete structured cloning before transferring ownership to the caller.
    if (key && !valid) await persistentCards.set(key, field, field.direction.byteLength + field.relief.byteLength);
    self.postMessage({ id, field, persistentHit: !!valid }, { transfer: [field.direction.buffer, field.relief.buffer] });
  } catch (error) { self.postMessage({ id, error: String(error) }); }
};
