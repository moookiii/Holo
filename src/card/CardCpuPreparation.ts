import type { CardDefinition, CardMapPaths } from './CardDefinition';
import { resolveCoverageMaps } from '../assets/CardCoverage';
import { PACKED_MAP_KEYS, type PackedMapKey, type PackedMaps } from '../assets/MapPacking';
import type { FoilLayer, HolographicProfile } from '../materials/HolographicProfile';
import { resolveCardProfile } from '../materials/profiles/resolveCardProfile';
import type { FieldData, PatternSpec } from '../materials/patterns/ManufacturingField';

export interface CpuImage { bitmap: ImageBitmap; width: number; height: number; source?: string; }
export interface PreparedMapsCpu {
  proceduralFoil?: CardDefinition['proceduralFoil'];
  packed?: PackedMaps;
  normal?: CpuImage;
  printRoughness?: CpuImage;
  printHeight?: CpuImage;
  direction?: CpuImage;
  secondaryDirection?: CpuImage;
  stampDirection?: CpuImage;
  hasNormal: boolean;
  hasStamp: boolean;
  hasExtendedFoil: boolean;
  layout?: CardDefinition['layout'];
  roughnessMode: 'profile' | 'absolute' | 'offset';
  embossStrength?: number;
  normalScale: number;
}
export interface PreparedCardCpu {
  definition: CardDefinition;
  profile: HolographicProfile;
  front: CpuImage;
  back: CpuImage;
  maps: PreparedMapsCpu;
  fields: { primary?: FieldData; secondary?: FieldData; stamp?: FieldData };
  backMaps?: PreparedMapsCpu;
  preparedAt: number;
}

function urlFor(path: string) {
  if (/^(blob:|data:|https?:\/\/)/.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

class CpuAssetCache {
  private blobs = new Map<string, Promise<Blob>>();
  private images = new Map<string, Promise<CpuImage>>();
  async blob(path: string, signal: AbortSignal) {
    const url = urlFor(path);
    let pending = this.blobs.get(url);
    if (!pending) {
      pending = (async () => {
        for (let attempt = 0; ; attempt++) {
          signal.throwIfAborted();
          try {
            const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
            if (!response.ok) throw new Error(`Unable to load ${url} (${response.status})`);
            return await response.blob();
          } catch (error) {
            if (signal.aborted) throw error;
            if (attempt >= 2) throw new Error(`Unable to load ${url}. Retry preparation.`, { cause: error });
            await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
          }
        }
      })().catch(error => { this.blobs.delete(url); throw error; });
      this.blobs.set(url, pending);
    }
    return pending;
  }
  async image(path: string, signal: AbortSignal): Promise<CpuImage> {
    const key = urlFor(path);
    let pending = this.images.get(key);
    if (!pending) {
      pending = this.blob(path, signal).then(async blob => {
        let bitmap: ImageBitmap;
        if (blob.type.includes('svg')) {
          // Chrome cannot decode SVG Blob directly with createImageBitmap.
          // Image decoding and canvas rasterization remain CPU-only.
          const url = URL.createObjectURL(blob), image = new Image();
          try { image.src = url; await image.decode(); bitmap = await createImageBitmap(image); }
          finally { URL.revokeObjectURL(url); }
        } else bitmap = await createImageBitmap(blob);
        return { bitmap, width: bitmap.width, height: bitmap.height, source: key };
      }).catch(error => { this.images.delete(key); throw error; });
      this.images.set(key, pending);
    }
    return pending;
  }
  clear() {
    for (const image of this.images.values()) void image.then(value => value.bitmap.close()).catch(() => {});
    this.blobs.clear(); this.images.clear();
  }
}

class CpuPatternCache {
  private worker = new Worker(new URL('../materials/patterns/pattern.worker.ts', import.meta.url), { type: 'module' });
  private sequence = 0;
  private pending = new Map<number, { resolve: (field: FieldData) => void; reject: (error: Error) => void }>();
  private cache = new Map<string, Promise<FieldData>>();
  constructor() {
    this.worker.onmessage = (event: MessageEvent<{ id: number; field?: FieldData; error?: string }>) => {
      const task = this.pending.get(event.data.id); if (!task) return;
      this.pending.delete(event.data.id);
      if (event.data.error || !event.data.field) task.reject(new Error(event.data.error ?? 'Pattern worker failed'));
      else task.resolve(event.data.field);
    };
    this.worker.onerror = event => { for (const task of this.pending.values()) task.reject(new Error(event.message)); this.pending.clear(); };
  }
  get(spec: PatternSpec, motif?: CpuImage, signal?: AbortSignal) {
    const key = JSON.stringify([spec, motif?.source, motif?.width, motif?.height]);
    if (!this.cache.has(key)) this.cache.set(key, new Promise<FieldData>((resolve, reject) => {
      if (signal?.aborted) { reject(signal.reason); return; }
      const id = ++this.sequence;
      let motifImage: { width: number; height: number; data: Uint8Array } | undefined;
      if (motif) {
        const canvas = new OffscreenCanvas(motif.width, motif.height), context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(motif.bitmap, 0, 0); const pixels = context.getImageData(0, 0, motif.width, motif.height).data;
        const data = new Uint8Array(motif.width * motif.height); for (let i = 0; i < data.length; i++) data[i] = pixels[i * 4];
        motifImage = { width: motif.width, height: motif.height, data };
      }
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, spec, motifImage }, motifImage ? [motifImage.data.buffer] : []);
    }));
    return this.cache.get(key)!;
  }
  dispose() { this.worker.terminate(); for (const task of this.pending.values()) task.reject(new Error('CPU pattern cache disposed')); this.pending.clear(); this.cache.clear(); }
}

class CpuMapCache {
  private worker = new Worker(new URL('../assets/map-packer.worker.ts', import.meta.url), { type: 'module' });
  private sequence = 0;
  private pending = new Map<number, { resolve: (maps: PackedMaps) => void; reject: (error: Error) => void }>();
  private cache = new Map<string, Promise<PackedMaps>>();
  constructor() {
    this.worker.onmessage = (event: MessageEvent<{ id: number; maps?: PackedMaps; error?: string }>) => {
      const task = this.pending.get(event.data.id); if (!task) return;
      this.pending.delete(event.data.id);
      if (event.data.error || !event.data.maps) task.reject(new Error(event.data.error ?? 'Map worker failed'));
      else task.resolve(event.data.maps);
    };
    this.worker.onerror = event => { for (const task of this.pending.values()) task.reject(new Error(event.message)); this.pending.clear(); };
  }
  get(key: string, aspect: number, images: Partial<Record<PackedMapKey, CpuImage>>, anniversary: CpuImage | undefined, defaultPrimary: number) {
    if (!this.cache.has(key)) this.cache.set(key, new Promise<PackedMaps>((resolve, reject) => {
      const id = ++this.sequence, transferable: Transferable[] = [], payload: Partial<Record<PackedMapKey, ImageBitmap>> = {};
      for (const [name, image] of Object.entries(images)) { payload[name as PackedMapKey] = image.bitmap; transferable.push(image.bitmap); }
      if (anniversary) transferable.push(anniversary.bitmap);
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, aspect, images: payload, anniversary: anniversary?.bitmap, defaultPrimary }, transferable);
    }));
    return this.cache.get(key)!;
  }
  dispose() { this.worker.terminate(); for (const task of this.pending.values()) task.reject(new Error('CPU map cache disposed')); this.pending.clear(); this.cache.clear(); }
}

export class CardCpuPreparation {
  private assets = new CpuAssetCache();
  // No idle pack-worker startup competes with the first card's workers.
  private patterns?: CpuPatternCache;
  private maps?: CpuMapCache;
  private cache = new Map<string, Promise<PreparedCardCpu>>();
  private disposed = false;
  private hitCount = 0;
  private missCount = 0;
  private mapMs = 0;
  private patternMs = 0;
  constructor(private readonly profiles: readonly HolographicProfile[]) {}
  private mapKey(card: CardDefinition, profile: HolographicProfile, aspect: number, anniversary: boolean) {
    return JSON.stringify([card.id, card.maps, card.mapSettings, card.layout, profile.maps, aspect, anniversary]);
  }
  private async prepareMaps(card: CardDefinition, profile: HolographicProfile, aspect: number, anniversary: boolean, signal: AbortSignal): Promise<PreparedMapsCpu> {
    if (profile.id === 'print-only') {
      const paths = { ...card.maps, ...profile.maps };
      const [normal, printRoughness, printHeight] = await Promise.all([
        paths.normal ? this.assets.image(paths.normal, signal) : undefined,
        paths.roughness ? this.assets.image(paths.roughness, signal) : undefined,
        paths.height ? this.assets.image(paths.height, signal) : undefined,
      ]);
      return { normal, printRoughness, printHeight, hasNormal: !!normal, hasStamp: false, hasExtendedFoil: false,
        roughnessMode: card.mapSettings?.roughnessMode ?? (printRoughness ? 'absolute' : 'profile'),
        embossStrength: card.mapSettings?.embossStrength, normalScale: card.mapSettings?.normalScale ?? 1 };
    }
    const paths = { ...resolveCoverageMaps(card), ...profile.maps } as CardMapPaths;
    const wholeFront = card.imported && ![paths.coverage, paths.foil, paths.extendedFoil, paths.secondaryFoil, paths.metallic, paths.stamp, paths.hologram].some(Boolean);
    const clone = async (path: string) => { const image = await this.assets.image(path, signal); const bitmap = await createImageBitmap(image.bitmap); return { bitmap, width: bitmap.width, height: bitmap.height }; };
    const packedInputs: Partial<Record<PackedMapKey, CpuImage>> = {};
    for (const name of PACKED_MAP_KEYS) if (paths[name]) packedInputs[name] = await clone(paths[name]!);
    const anniversaryImage = anniversary ? await clone('/materials/ygo-25th.webp') : undefined;
    let packed: PackedMaps | undefined;
    if (Object.keys(packedInputs).length || anniversary || wholeFront) packed = await (this.maps ??= new CpuMapCache()).get(JSON.stringify([paths, aspect, anniversary, wholeFront]), aspect, packedInputs, anniversaryImage, wholeFront ? 255 : 0);
    const [normal, direction, secondaryDirection, stampDirection] = await Promise.all([
      paths.normal ? this.assets.image(paths.normal, signal) : undefined,
      paths.direction ? this.assets.image(paths.direction, signal) : undefined,
      paths.secondaryDirection ? this.assets.image(paths.secondaryDirection, signal) : undefined,
      paths.stampDirection ? this.assets.image(paths.stampDirection, signal) : undefined,
    ]);
    return { packed, proceduralFoil: card.proceduralFoil, normal, direction, secondaryDirection, stampDirection, hasNormal: !!paths.normal, hasStamp: !!paths.stamp, hasExtendedFoil: !!paths.extendedFoil,
      layout: card.layout, roughnessMode: card.mapSettings?.roughnessMode ?? (paths.roughness ? 'absolute' : 'profile'),
      embossStrength: card.construction ? (paths.normal ? 0 : card.construction.frontReliefCm / .008) : card.mapSettings?.embossStrength ?? (paths.height ? .25 : undefined), normalScale: card.mapSettings?.normalScale ?? 1 };
  }
  private async prepareLayer(layer: FoilLayer | undefined, card: CardDefinition, seed: number, signal: AbortSignal, motifPath?: string) {
    if (!layer || layer.structure.field === 'radial' || layer.structure.field === 'plain') return undefined;
    const motif = layer.structure.field === 'symbol-foil' && motifPath ? await this.assets.image(motifPath, signal) : undefined;
    const started = performance.now();
    try { return await (this.patterns ??= new CpuPatternCache()).get({ kind: layer.structure.field, seed, aspect: card.dimensions.width / card.dimensions.height, scale: layer.structure.scale,
      ...(layer.structure.motif ? { motif: layer.structure.motif } : {}), ...(['collector', 'collector-prismatic'].includes(layer.structure.field) ? { layout: card.layout } : {}) }, motif, signal); }
    finally { this.patternMs += performance.now() - started; }
  }
  async prepare(card: CardDefinition, signal: AbortSignal): Promise<PreparedCardCpu> {
    if (this.disposed) throw new Error('CPU preparation disposed');
    const profile = resolveCardProfile(card), aspect = card.dimensions.width / card.dimensions.height, anniversary = profile.watermark === 'quarter-century';
    const key = JSON.stringify([card.id, profile.id, this.mapKey(card, profile, aspect, anniversary)]);
    if (this.cache.has(key)) { this.hitCount++; return this.cache.get(key)!; }
    this.missCount++;
    if (!this.cache.has(key)) this.cache.set(key, (async () => {
      signal.throwIfAborted();
      const mapsReady = (async () => { const started = performance.now(); try { return await this.prepareMaps(card, profile, aspect, anniversary, signal); } finally { this.mapMs += performance.now() - started; } })();
      const print = profile.id === 'print-only';
      const [front, back, maps, primary, secondary, stamp] = await Promise.all([
        this.assets.image(card.front, signal), this.assets.image(card.back, signal), mapsReady,
        print ? undefined : this.prepareLayer(profile, card, card.seed, signal, card.maps?.motif), print ? undefined : this.prepareLayer(profile.secondary, card, card.seed + 8191, signal, card.maps?.secondaryMotif), print ? undefined : this.prepareLayer(profile.stamp, card, card.seed + 16381, signal, card.maps?.stampMotif),
      ]);
      signal.throwIfAborted();
      return { definition: card, profile, front, back, maps, fields: { primary, secondary, stamp }, preparedAt: performance.now() };
    })().catch(error => { this.cache.delete(key); throw error; }));
    return this.cache.get(key)!;
  }
  stats() { return { hits: this.hitCount, misses: this.missCount, entries: this.cache.size, mapMs: this.mapMs, patternMs: this.patternMs, gpuCalls: 0 }; }
  dispose() { this.disposed = true; this.assets.clear(); this.patterns?.dispose(); this.maps?.dispose(); this.cache.clear(); }
}
