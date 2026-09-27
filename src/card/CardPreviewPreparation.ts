import type { CardDefinition } from './CardDefinition';
import { DEFAULT_FOIL_LAYOUT } from './CardDefinition';
import { resolveCoverageMaps } from '../assets/CardCoverage';
import { packMapChannels, type PackedMapKey } from '../assets/MapPacking';
import { resolveCardProfile } from '../materials/profiles/resolveCardProfile';

export const PREVIEW_WIDTH = 256, PREVIEW_HEIGHT = 360;
export interface CardPreview { front: Uint8Array; optical: Uint8Array; normal: Uint8Array; }
export const PREVIEW_BYTES = PREVIEW_WIDTH * PREVIEW_HEIGHT * 4 * 3;

/** CPU-only, reduced tier of the same coverage/profile pipeline. Does not
 * populate full-resolution caches or start manufacturing workers. */
export async function prepareCardPreview(card: CardDefinition, signal: AbortSignal): Promise<CardPreview> {
  const width = PREVIEW_WIDTH, height = PREVIEW_HEIGHT;
  const canvas = new OffscreenCanvas(width, height), context = canvas.getContext('2d', { willReadFrequently: true })!;
  const read = async (path: string) => {
    signal.throwIfAborted();
    const url = /^(blob:|data:|https?:\/\/)/.test(path) ? path : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) throw new Error(`Preview unavailable (${response.status})`);
    const blob = await response.blob();
    let image: ImageBitmap | HTMLImageElement, objectUrl: string | undefined;
    if (blob.type.includes('svg')) {
      image = new Image(); objectUrl = URL.createObjectURL(blob); image.src = objectUrl;
      try { await image.decode(); } catch (error) { URL.revokeObjectURL(objectUrl); throw error; }
    } else image = await createImageBitmap(blob, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' });
    try {
      signal.throwIfAborted(); context.clearRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
      return new Uint8Array(context.getImageData(0, 0, width, height).data);
    } finally { if (image instanceof ImageBitmap) image.close(); if (objectUrl) URL.revokeObjectURL(objectUrl); }
  };
  const front = await read(card.front).catch(error => {
    if (signal.aborted || !card.frontFallback) throw error;
    return read(card.frontFallback);
  });
  const profile = resolveCardProfile(card), paths = { ...resolveCoverageMaps(card), ...profile.maps };
  const inputs: Partial<Record<PackedMapKey, Uint8Array>> = {};
  const keys = ['coverage', 'foil', 'secondaryFoil', 'extendedFoil', 'metallic', 'protection', 'roughness', 'surface', 'height', 'pattern', 'stamp'] as const;
  if (profile.id !== 'print-only') for (const key of keys) if (paths[key]) inputs[key] = await read(paths[key]!);
  const normalSource = paths.normal ? await read(paths.normal) : undefined;
  const hasCoverage = ['coverage', 'foil', 'secondaryFoil', 'extendedFoil', 'metallic'].some(key => key in inputs);
  const packed = packMapChannels(width, height, inputs, card.imported && !hasCoverage && profile.id !== 'print-only' ? 255 : 0);
  const optical = new Uint8Array(width * height * 4), normal = new Uint8Array(optical.length);
  if (normalSource) normal.set(normalSource);
  const art = (card.layout ?? DEFAULT_FOIL_LAYOUT).artwork;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    let coverage = Math.max(packed.coverage[i], packed.coverage[i + 1], packed.coverage[i + 2], packed.pattern[i + 3], packed.surface[i + 3]);
    if (!hasCoverage && card.proceduralFoil) {
      const inside = x / width >= art[0] && x / width <= art[2] && y / height >= art[1] && y / height <= art[3];
      coverage = (card.proceduralFoil === 'full' || (card.proceduralFoil === 'artwork' ? inside : !inside)) ? 255 : 0;
      coverage *= 1 - (inputs.protection?.[i] ?? 0) / 255;
    }
    optical[i] = profile.id === 'print-only' ? 0 : coverage;
    optical[i + 1] = inputs.roughness || inputs.surface ? packed.surface[i + 1] : Math.round(profile.surface.roughness * 255);
    optical[i + 2] = packed.pattern[i]; optical[i + 3] = 255;
    if (normalSource) continue;
    // Differentiate continuous authored height BEFORE material masking.
    const at = (xx: number, yy: number) => packed.surface[(Math.min(height - 1, Math.max(0, yy)) * width + Math.min(width - 1, Math.max(0, xx))) * 4] / 255;
    const strength = (card.mapSettings?.embossStrength ?? .25) * 4;
    const nx = (at(x - 1, y) - at(x + 1, y)) * strength, ny = (at(x, y + 1) - at(x, y - 1)) * strength;
    const length = Math.hypot(nx, ny, 1);
    normal[i] = Math.round((nx / length * .5 + .5) * 255);
    normal[i + 1] = Math.round((ny / length * .5 + .5) * 255);
    normal[i + 2] = Math.round((1 / length * .5 + .5) * 255); normal[i + 3] = 255;
  }
  return { front, optical, normal };
}
