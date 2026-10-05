import type { CardDefinition } from './CardDefinition';
import { DEFAULT_FOIL_LAYOUT } from './CardLayout';
import { resolveCoverageMaps } from '../assets/CardCoverage';
import { packMapChannels, type PackedMapKey } from '../assets/MapPacking';
import { resolveCardProfile } from '../materials/profiles/resolveCardProfile';
import type { FieldData, PatternSpec } from '../materials/patterns/ManufacturingField';
import type { MotifImage } from '../materials/patterns/MotifField';
import { previewOptics, PREVIEW_PARAMETER_COLUMNS } from './PreviewOptics';
import { PreviewReadQueue } from './PreviewReadQueue';
import { cachedCardAsset } from '../assets/CachedCardAssets';
import { cardCacheRevision, persistentCards } from '../assets/PersistentCardCache';
import { PreviewPixelCache } from './PreviewPixelCache';

const previewReads = new PreviewReadQueue();
export const previewPixels = new PreviewPixelCache();

export const PREVIEW_WIDTH = 512, PREVIEW_HEIGHT = 720;
export const PREVIEW_MAP_WIDTH = 128, PREVIEW_MAP_HEIGHT = 180;
export const PREVIEW_FIELD_WIDTH = 256, PREVIEW_FIELD_HEIGHT = 360;
export const PREVIEW_ARRAY_SIZES = [[PREVIEW_WIDTH, PREVIEW_HEIGHT], ...Array.from({ length: 8 }, (_, i) =>
  i === 2 || i === 5 ? [PREVIEW_FIELD_WIDTH, PREVIEW_FIELD_HEIGHT] : [PREVIEW_MAP_WIDTH, PREVIEW_MAP_HEIGHT])] as const;
export interface CardPreview { images: Uint8Array[]; parameters: Float32Array; dimensions?: CardDefinition['dimensions']; }
export const PREVIEW_BYTES = PREVIEW_ARRAY_SIZES.reduce((sum, [w, h]) => sum + w * h * 4, 0) + PREVIEW_PARAMETER_COLUMNS * 16;
type PrepareField = (spec: PatternSpec, height: number, motif?: MotifImage) => Promise<FieldData>;

/** CPU-only reduced tier: same masks, layer priority and manufactured field
 * generator as focus. Artwork and metallic lettering retain a sharper UV grid. */
export async function prepareCardPreview(card: CardDefinition, signal: AbortSignal, prepareField: PrepareField,
  decodeSvg?: (blob: Blob, width: number, height: number) => Promise<Uint8Array>): Promise<CardPreview> {
  const width = PREVIEW_MAP_WIDTH, height = PREVIEW_MAP_HEIGHT;
  const blobs = new Map<string, Promise<Blob>>(), decoded = new Map<string, Promise<Uint8Array>>();
  const decode = async (path: string, w: number, h: number, signal: AbortSignal) => {
    signal.throwIfAborted();
    const url = /^(blob:|data:|https?:\/\/)/.test(path) ? path : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
    if (!blobs.has(url)) blobs.set(url, cachedCardAsset(url));
    const blob = await blobs.get(url)!;
    if (blob.type.includes('svg') && decodeSvg) return decodeSvg(blob, w, h);
    let image: ImageBitmap;
    if (blob.type.includes('svg')) {
      const source = new Image(), objectUrl = URL.createObjectURL(blob); source.src = objectUrl;
      // Rasterize at the authored aspect first. Drawing SVG directly at the
      // atlas aspect applies preserveAspectRatio and insets the mask sides.
      try { await source.decode(); image = await createImageBitmap(source); }
      finally { URL.revokeObjectURL(objectUrl); }
    } else image = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
    try {
      signal.throwIfAborted();
      const canvas = new OffscreenCanvas(w, h), context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(image, 0, 0, w, h);
      return new Uint8Array(context.getImageData(0, 0, w, h).data);
    } finally { image.close(); }
  };
  const read = (path: string, w = width, h = height) => {
    const key = JSON.stringify([path, w, h]);
    if (!decoded.has(key)) decoded.set(key, previewPixels.read(key, signal, async sharedSignal => {
      // Mutable remote/imported sources retain normal HTTP semantics. Authored
      // inputs are versioned by source + preparation code, just like previews.
      const local = !/^(https?:|blob:|data:)/.test(path);
      const diskKey = local ? `pixels-v1:${await cardCacheRevision()}:${key}` : undefined;
      const load = async () => {
        sharedSignal.throwIfAborted();
        const stored = diskKey ? await persistentCards.get<Uint8Array>(diskKey) : undefined;
        sharedSignal.throwIfAborted();
        if (stored instanceof Uint8Array && stored.length === w * h * 4) {
          previewPixels.metrics.persistentHits++; return stored;
        }
        const pixels = await previewReads.run(sharedSignal, async () => {
          const started = performance.now(); previewPixels.metrics.decodes++;
          try { return await decode(path, w, h, sharedSignal); }
          finally { previewPixels.metrics.decodeMs += performance.now() - started; }
        });
        if (diskKey) await persistentCards.set(diskKey, pixels, pixels.byteLength);
        return pixels;
      };
      // Keep the lock through persistence so different workers decode once.
      return diskKey && navigator.locks ? navigator.locks.request(diskKey, { signal: sharedSignal }, load) : load();
    }));
    return decoded.get(key)!;
  };
  const profile = resolveCardProfile(card), paths = { ...resolveCoverageMaps(card), ...profile.maps };
  const settings = { ...card.mapSettings, ...profile.mapSettings };
  const parameters = previewOptics(card, profile);
  const sharpReverse = card.coverageMode === 'reverse' && !!paths.foil && !paths.metallic;
  // Keep individual metallic letter edges at artwork resolution; the small
  // optical maps otherwise blur gold into the surrounding title panel.
  const titlePath = profile.structure.field === 'secret' ? paths.secondaryFoil ?? paths.metallic : paths.metallic;
  const keys = ['coverage', 'foil', 'secondaryFoil', 'extendedFoil', 'metallic', 'protection', 'roughness', 'surface', 'height', 'pattern', 'secondaryPattern', 'stampPattern', 'stamp', 'laminate', 'sparkle'] as const;
  const [front, titleMask, titleProtection, reverseFoil, reverseProtection, inputEntries, normalSource] = await Promise.all([
    read(card.front, PREVIEW_WIDTH, PREVIEW_HEIGHT).catch(error => {
      if (signal.aborted || !card.frontFallback) throw error;
      return read(card.frontFallback, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    }),
    titlePath ? read(titlePath, PREVIEW_WIDTH, PREVIEW_HEIGHT) : undefined,
    titlePath && paths.protection ? read(paths.protection, PREVIEW_WIDTH, PREVIEW_HEIGHT) : undefined,
    sharpReverse ? read(paths.foil!, PREVIEW_WIDTH, PREVIEW_HEIGHT) : undefined,
    sharpReverse && paths.protection ? read(paths.protection, PREVIEW_WIDTH, PREVIEW_HEIGHT) : undefined,
    Promise.all(keys.filter(key => paths[key]).map(async key => [key, await read(paths[key]!)] as const)),
    paths.normal ? read(paths.normal) : undefined,
  ]);
  for (let i = 0; i < front.length; i += 4) front[i + 3] = titleMask ? Math.round(titleMask[i] * (1 - (titleProtection?.[i] ?? 0) / 255)) : 0;
  if (sharpReverse) {
    for (let i = 0; i < front.length; i += 4) front[i + 3] = Math.round(reverseFoil![i] * (1 - (reverseProtection?.[i] ?? 0) / 255));
  }
  const inputs: Partial<Record<PackedMapKey, Uint8Array>> = Object.fromEntries(inputEntries);
  const hasCoverage = ['coverage', 'foil', 'secondaryFoil', 'extendedFoil', 'metallic'].some(key => key in inputs);
  const packed = packMapChannels(width, height, inputs, card.imported && !hasCoverage && profile.id !== 'print-only' ? 255 : 0);
  const layers = [profile, profile.secondary, profile.stamp];
  const fields: Uint8Array[] = [], details: Uint8Array[] = [];
  for (let index = 0; index < 3; index++) {
    signal.throwIfAborted();
    const fw = index === 0 ? PREVIEW_FIELD_WIDTH : width, fh = index === 0 ? PREVIEW_FIELD_HEIGHT : height;
    const layer = layers[index], field = new Uint8Array(fw * fh * 4), detail = new Uint8Array(field.length);
    const directionPath = [paths.direction, paths.secondaryDirection, paths.stampDirection][index];
    const motifPath = [paths.motif, paths.secondaryMotif, paths.stampMotif][index];
    const authored = directionPath ? await read(directionPath, fw, fh) : undefined;
    let generated: FieldData | undefined;
    if (layer && layer.enabled !== false && profile.id !== 'print-only' && !['plain', 'radial', 'secret'].includes(layer.structure.field)) {
      let motif: MotifImage | undefined;
      if (motifPath) {
        // Preserve connected star identities at the source's useful resolution.
        const mw = 512, mh = 720, rgba = await read(motifPath, mw, mh), data = new Uint8Array(mw * mh);
        for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
        motif = { width: mw, height: mh, data };
      }
      generated = await prepareField({ kind: layer.structure.field as PatternSpec['kind'], seed: card.seed + [0, 8191, 16381][index],
        aspect: card.dimensions.width / card.dimensions.height, scale: layer.structure.scale, layout: card.layout, motif: layer.structure.motif }, fh, motif);
      signal.throwIfAborted();
    }
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const i = (y * fw + x) * 4;
      const source = generated ? (Math.min(generated.height - 1, Math.floor((fh - 1 - y) / fh * generated.height)) * generated.width + Math.min(generated.width - 1, Math.floor(x / fw * generated.width))) * 4 : 0;
      for (let c = 0; c < 4; c++) {
        field[i + c] = authored?.[i + c] ?? generated?.direction[source + c] ?? [255, 128, 85, 255][c];
        detail[i + c] = generated?.relief[source + c] ?? 128;
      }
      const maskIndex = (Math.floor(y / fh * height) * width + Math.floor(x / fw * width)) * 4;
      field[i + 3] = Math.round(field[i + 3] * packed.pattern[maskIndex + index] / 255);
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
    if (!sharpReverse) {
      // Packed coverage and nonfoil stamps can also define metallic print.
      const fallbackMetal = titleMask ? (enabled[2] ? 0 : packed.surface[i + 3]) : coverage[i + 3];
      for (let yy = Math.floor(y * PREVIEW_HEIGHT / height); yy < Math.floor((y + 1) * PREVIEW_HEIGHT / height); yy++)
        for (let xx = Math.floor(x * PREVIEW_WIDTH / width); xx < Math.floor((x + 1) * PREVIEW_WIDTH / width); xx++) {
          const alpha = (yy * PREVIEW_WIDTH + xx) * 4 + 3;
          front[alpha] = Math.max(front[alpha], fallbackMetal);
        }
    }
    // Differentiation precedes clipping. Match the viewer's physical centimetres.
    const emboss = settings.embossStrength ?? .25, normalScale = profile.disabledMechanisms?.includes('relief') ? 0 : settings.normalScale ?? 1;
    let nx = normalSource ? (normalSource[i] / 255 * 2 - 1) * normalScale : (at(x - 1, y) - at(x + 1, y)) * emboss * .008 * width / (2 * card.dimensions.width);
    let ny = normalSource ? (normalSource[i + 1] / 255 * 2 - 1) * normalScale : (at(x, y + 1) - at(x, y - 1)) * emboss * .008 * height / (2 * card.dimensions.height);
    const nz = normalSource ? normalSource[i + 2] / 255 * 2 - 1 : 1;
    for (let layer = 0; layer < 3; layer++) {
      const offset = layer * 32;
      // Dense LC cuts use the sharper primary field in the fragment shader.
      if (layer === 0 && profile.structure.field === 'legendary-fireworks') continue;
      const di = layer === 0 ? (Math.floor(y / height * PREVIEW_FIELD_HEIGHT) * PREVIEW_FIELD_WIDTH + Math.floor(x / width * PREVIEW_FIELD_WIDTH)) * 4 : i;
      nx += (details[layer][di] / 255 - .5) * parameters[offset + 9] * parameters[offset + 10] * masks[layer];
      ny += (details[layer][di + 1] / 255 - .5) * parameters[offset + 9] * parameters[offset + 10] * masks[layer];
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
    // Metallic coverage lives in artwork alpha; use the freed channel for
    // sparkle protection without repurposing the film-thickness detail map.
    coverage[i + 3] = packed.surface[i + 2];
  }
  return { images: [front, coverage, normal, ...fields, ...details], parameters, dimensions: card.dimensions };
}
