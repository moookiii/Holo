import type { CardDefinition } from './CardDefinition';
import { DEFAULT_FOIL_LAYOUT } from './CardDefinition';
import { resolveCoverageMaps } from '../assets/CardCoverage';
import { packMapChannels, type PackedMapKey } from '../assets/MapPacking';
import { resolveCardProfile } from '../materials/profiles/resolveCardProfile';
import type { FieldData, PatternSpec } from '../materials/patterns/ManufacturingField';
import type { MotifImage } from '../materials/patterns/MotifField';
import { previewOptics, PREVIEW_PARAMETER_COLUMNS } from './PreviewOptics';

export const PREVIEW_WIDTH = 256, PREVIEW_HEIGHT = 360;
export const PREVIEW_MAP_WIDTH = 128, PREVIEW_MAP_HEIGHT = 180;
export const PREVIEW_ARRAY_SIZES = [[PREVIEW_WIDTH, PREVIEW_HEIGHT], ...Array.from({ length: 8 }, () => [PREVIEW_MAP_WIDTH, PREVIEW_MAP_HEIGHT])] as const;
export interface CardPreview { images: Uint8Array[]; parameters: Float32Array; }
export const PREVIEW_BYTES = PREVIEW_ARRAY_SIZES.reduce((sum, [w, h]) => sum + w * h * 4, 0) + PREVIEW_PARAMETER_COLUMNS * 16;
type PrepareField = (spec: PatternSpec, height: number, motif?: MotifImage) => Promise<FieldData>;

/** CPU-only reduced tier: same masks, layer priority and manufactured field
 * generator as focus. Fine maps are half resolution, artwork stays 256 × 360. */
export async function prepareCardPreview(card: CardDefinition, signal: AbortSignal, prepareField: PrepareField): Promise<CardPreview> {
  const width = PREVIEW_MAP_WIDTH, height = PREVIEW_MAP_HEIGHT;
  const read = async (path: string, w = width, h = height) => {
    signal.throwIfAborted();
    const url = /^(blob:|data:|https?:\/\/)/.test(path) ? path : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) throw new Error(`Preview unavailable (${response.status})`);
    const blob = await response.blob();
    let image: ImageBitmap | HTMLImageElement, objectUrl: string | undefined;
    if (blob.type.includes('svg')) {
      image = new Image(); objectUrl = URL.createObjectURL(blob); image.src = objectUrl;
      try { await image.decode(); } catch (error) { URL.revokeObjectURL(objectUrl); throw error; }
    } else image = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
    try {
      signal.throwIfAborted();
      const canvas = new OffscreenCanvas(w, h), context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(image, 0, 0, w, h);
      return new Uint8Array(context.getImageData(0, 0, w, h).data);
    } finally { if (image instanceof ImageBitmap) image.close(); if (objectUrl) URL.revokeObjectURL(objectUrl); }
  };
  const front = await read(card.front, PREVIEW_WIDTH, PREVIEW_HEIGHT).catch(error => {
    if (signal.aborted || !card.frontFallback) throw error;
    return read(card.frontFallback, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  });
  const profile = resolveCardProfile(card), paths = { ...resolveCoverageMaps(card), ...profile.maps };
  const settings = { ...card.mapSettings, ...profile.mapSettings };
  const parameters = previewOptics(card, profile);
  const inputs: Partial<Record<PackedMapKey, Uint8Array>> = {};
  const keys = ['coverage', 'foil', 'secondaryFoil', 'extendedFoil', 'metallic', 'protection', 'roughness', 'surface', 'height', 'pattern', 'secondaryPattern', 'stampPattern', 'stamp', 'laminate'] as const;
  for (const key of keys) if (paths[key]) inputs[key] = await read(paths[key]!);
  const normalSource = paths.normal ? await read(paths.normal) : undefined;
  const hasCoverage = ['coverage', 'foil', 'secondaryFoil', 'extendedFoil', 'metallic'].some(key => key in inputs);
  const packed = packMapChannels(width, height, inputs, card.imported && !hasCoverage && profile.id !== 'print-only' ? 255 : 0);
  const layers = [profile, profile.secondary, profile.stamp];
  const fields: Uint8Array[] = [], details: Uint8Array[] = [];
  for (let index = 0; index < 3; index++) {
    signal.throwIfAborted();
    const layer = layers[index], field = new Uint8Array(width * height * 4), detail = new Uint8Array(field.length);
    const directionPath = [paths.direction, paths.secondaryDirection, paths.stampDirection][index];
    const motifPath = [paths.motif, paths.secondaryMotif, paths.stampMotif][index];
    const authored = directionPath ? await read(directionPath) : undefined;
    let generated: FieldData | undefined;
    if (layer && layer.enabled !== false && profile.id !== 'print-only' && !['plain', 'radial'].includes(layer.structure.field)) {
      let motif: MotifImage | undefined;
      if (motifPath) {
        // Preserve connected star identities at the source's useful resolution.
        const mw = 512, mh = 720, rgba = await read(motifPath, mw, mh), data = new Uint8Array(mw * mh);
        for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
        motif = { width: mw, height: mh, data };
      }
      generated = await prepareField({ kind: layer.structure.field as PatternSpec['kind'], seed: card.seed + [0, 8191, 16381][index],
        aspect: card.dimensions.width / card.dimensions.height, scale: layer.structure.scale, layout: card.layout, motif: layer.structure.motif }, height, motif);
      signal.throwIfAborted();
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const source = generated ? (Math.min(generated.height - 1, Math.floor((height - 1 - y) / height * generated.height)) * generated.width + Math.min(generated.width - 1, Math.floor(x / width * generated.width))) * 4 : 0;
      for (let c = 0; c < 4; c++) {
        field[i + c] = authored?.[i + c] ?? generated?.direction[source + c] ?? [255, 128, 85, 255][c];
        detail[i + c] = generated?.relief[source + c] ?? 128;
      }
      field[i + 3] = Math.round(field[i + 3] * packed.pattern[i + index] / 255);
    }
    fields.push(field); details.push(detail);
  }
  const coverage = new Uint8Array(width * height * 4), normal = new Uint8Array(coverage.length);
  const art = (card.layout ?? DEFAULT_FOIL_LAYOUT).artwork;
  const enabled = layers.map(layer => !!layer && layer.enabled !== false && profile.id !== 'print-only');
  const at = (xx: number, yy: number) => packed.surface[(Math.min(height - 1, Math.max(0, yy)) * width + Math.min(width - 1, Math.max(0, xx))) * 4] / 255;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    let primary = Math.max(packed.coverage[i], profile.extendedCoverage ? packed.pattern[i + 3] : 0) / 255;
    if (!hasCoverage && card.proceduralFoil) {
      const inside = x / width >= art[0] && x / width <= art[2] && y / height >= art[1] && y / height <= art[3];
      primary = (card.proceduralFoil === 'full' || (card.proceduralFoil === 'artwork' ? inside : !inside)) ? 1 : 0;
      primary *= 1 - (inputs.protection?.[i] ?? 0) / 255;
    }
    const stamp = enabled[2] ? packed.surface[i + 3] / 255 : 0;
    const secondary = enabled[1] ? packed.coverage[i + 1] / 255 * (1 - stamp) : 0;
    const masks = [enabled[0] ? primary * (1 - secondary) * (1 - stamp) : 0, secondary, stamp];
    for (let layer = 0; layer < 3; layer++) coverage[i + layer] = Math.round(masks[layer] * 255);
    coverage[i + 3] = Math.max(packed.coverage[i + 2], enabled[2] ? 0 : packed.surface[i + 3]);
    // Differentiation precedes clipping. Match the viewer's physical centimetres.
    const emboss = settings.embossStrength ?? .25, normalScale = profile.disabledMechanisms?.includes('relief') ? 0 : settings.normalScale ?? 1;
    let nx = normalSource ? (normalSource[i] / 255 * 2 - 1) * normalScale : (at(x - 1, y) - at(x + 1, y)) * emboss * .008 * width / (2 * card.dimensions.width);
    let ny = normalSource ? (normalSource[i + 1] / 255 * 2 - 1) * normalScale : (at(x, y + 1) - at(x, y - 1)) * emboss * .008 * height / (2 * card.dimensions.height);
    const nz = normalSource ? normalSource[i + 2] / 255 * 2 - 1 : 1;
    for (let layer = 0; layer < 3; layer++) {
      const offset = layer * 32;
      nx += (details[layer][i] / 255 - .5) * parameters[offset + 9] * parameters[offset + 10] * masks[layer];
      ny += (details[layer][i + 1] / 255 - .5) * parameters[offset + 9] * parameters[offset + 10] * masks[layer];
    }
    const length = Math.hypot(nx, ny, nz) || 1;
    normal[i] = Math.round((nx / length * .5 + .5) * 255); normal[i + 1] = Math.round((ny / length * .5 + .5) * 255); normal[i + 2] = Math.round((nz / length * .5 + .5) * 255);
    let roughness = profile.id === 'print-only' ? profile.surface.roughness : .48;
    for (let layer = 0; layer < 3; layer++) if (layers[layer]) roughness += (layers[layer]!.surface.roughness - roughness) * masks[layer];
    const metal = coverage[i + 3] / 255;
    roughness = roughness * (1 - metal) + (profile.metallicInk?.roughness ?? .28) * metal;
    const mode = settings.roughnessMode ?? (inputs.roughness ? 'absolute' : 'profile');
    if (mode === 'absolute') roughness = packed.surface[i + 1] / 255;
    if (mode === 'offset') roughness += (packed.surface[i + 1] - 128) / 255 * .35;
    normal[i + 3] = Math.round(Math.max(.045, Math.min(1, roughness)) * 255);
  }
  return { images: [front, coverage, normal, ...fields, ...details], parameters };
}
