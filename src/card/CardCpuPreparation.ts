import { getProfile } from '../materials/profiles/index';
import type { CardDefinition, CardMapPaths } from './CardDefinition';
import { resolveCoverageMaps } from '../assets/CardCoverage';
import { PACKED_MAP_KEYS, type PackedMapKey, type PackedMaps } from '../assets/MapPacking';
import type { FoilLayer, HolographicProfile } from '../materials/HolographicProfile';
import { resolveCardProfile } from '../materials/profiles/resolveCardProfile';
import type { FieldData, PatternSpec } from '../materials/patterns/ManufacturingField';
import type { CardPreview } from './CardPreviewPreparation';
import { CardPreviewCache } from './CardPreviewCache';
import type { MotifImage } from '../materials/patterns/MotifField';
import { cachedCardAsset } from '../assets/CachedCardAssets';
import { SharedPreparation } from './SharedPreparation';

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
            return await cachedCardAsset(url);
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
  private workers: Worker[] = [];
  private workerLimit = Math.min(3, Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) / 2)));
  private loads = new Map<Worker, number>();
  private sequence = 0;
  private pending = new Map<number, { resolve: (field: FieldData) => void; reject: (error: Error) => void }>();
  private cache = new Map<string, Promise<FieldData>>();
  private createWorker() {
    const worker = new Worker(new URL('../materials/patterns/pattern.worker.ts', import.meta.url), { type: 'module' });
    this.workers.push(worker); this.loads.set(worker, 0);
    worker.onmessage = (event: MessageEvent<{ id: number; field?: FieldData; error?: string }>) => {
      this.loads.set(worker, Math.max(0, this.loads.get(worker)! - 1));
      const task = this.pending.get(event.data.id); if (!task) return;
      this.pending.delete(event.data.id);
      if (event.data.error || !event.data.field) task.reject(new Error(event.data.error ?? 'Pattern worker failed'));
      else task.resolve(event.data.field);
    };
    worker.onerror = event => {
      for (const task of this.pending.values()) task.reject(new Error(event.message));
      this.pending.clear(); this.workers.forEach(worker => worker.terminate()); this.workers = []; this.loads.clear();
    };
    return worker;
  }
  get(spec: PatternSpec, motif?: CpuImage, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const key = JSON.stringify([spec, motif?.source, motif?.width, motif?.height]);
    if (!this.cache.has(key)) this.cache.set(key, new Promise<FieldData>((resolve, reject) => {
      const id = ++this.sequence;
      let motifImage: { width: number; height: number; data: Uint8Array } | undefined;
      if (motif) {
        const canvas = new OffscreenCanvas(motif.width, motif.height), context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(motif.bitmap, 0, 0); const pixels = context.getImageData(0, 0, motif.width, motif.height).data;
        const data = new Uint8Array(motif.width * motif.height); for (let i = 0; i < data.length; i++) data[i] = pixels[i * 4];
        motifImage = { width: motif.width, height: motif.height, data };
      }
      this.pending.set(id, { resolve, reject });
      let worker = this.workers.find(worker => this.loads.get(worker) === 0);
      if (!worker && this.workers.length < this.workerLimit) worker = this.createWorker();
      worker ??= this.workers.reduce((least, candidate) => this.loads.get(candidate)! < this.loads.get(least)! ? candidate : least);
      this.loads.set(worker, this.loads.get(worker)! + 1);
      worker.postMessage({ id, spec, motifImage }, motifImage ? [motifImage.data.buffer] : []);
    }).catch(error => { this.cache.delete(key); throw error; }));
    return this.cache.get(key)!;
  }
  dispose() { this.workers.forEach(worker => worker.terminate()); this.workers = []; this.loads.clear(); for (const task of this.pending.values()) task.reject(new Error('CPU pattern cache disposed')); this.pending.clear(); this.cache.clear(); }
}

interface PreviewMetrics {
  pixels: { hits: number; misses: number; avoidedDecodes: number; decodes: number; decodeMs: number; bytes: number; budget: number; persistentHits: number };
  preparations: number; persistentHits: number; preparationMs: number;
  persistent: { hits: number; misses: number; writes: number; errors: number; evictions: number; bytes: number; readMs: number; writeMs: number; budget: number };
  assets: { downloads: number; avoidedDownloads: number; memoryHits: number };
}
class CpuPreviewWorker {
  metrics?: PreviewMetrics;
  private worker = new Worker(new URL('./card-preview.worker.ts', import.meta.url), { type: 'module' });
  private sequence = 0;
  private pending = new Map<number, { resolve: (preview: CardPreview) => void; reject: (error: Error) => void }>();
  get pendingCount() { return this.pending.size; }
  constructor() {
    this.worker.onmessage = (event: MessageEvent<{ type: string; id: number; svgId?: number; blob?: Blob; width?: number; height?: number; preview?: CardPreview; error?: string; metrics?: PreviewMetrics }>) => {
      const message = event.data;
      if (message.metrics) this.metrics = message.metrics;
      if (message.type === 'svg' && message.blob && message.svgId !== undefined) {
        void this.decodeSvg(message.blob, message.width!, message.height!).then(pixels => {
          this.worker.postMessage({ type: 'svg-result', id: message.id, svgId: message.svgId, pixels }, [pixels.buffer]);
        }).catch(error => this.worker.postMessage({ type: 'svg-result', id: message.id, svgId: message.svgId, error: String(error) }));
        return;
      }
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      if (message.type === 'ready' && message.preview) task.resolve(message.preview);
      else task.reject(new Error(message.error ?? 'Preview worker failed'));
    };
    this.worker.onerror = event => {
      for (const task of this.pending.values()) task.reject(new Error(event.message));
      this.pending.clear();
    };
  }
  private async decodeSvg(blob: Blob, width: number, height: number) {
    const url = URL.createObjectURL(blob), image = new Image();
    try {
      image.src = url;
      await image.decode();
      const canvas = new OffscreenCanvas(width, height), context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(image, 0, 0, width, height);
      return new Uint8Array(context.getImageData(0, 0, width, height).data);
    } finally { URL.revokeObjectURL(url); }
  }
  prepare(card: CardDefinition, signal: AbortSignal) {
    signal.throwIfAborted();
    const id = ++this.sequence;
    return new Promise<CardPreview>((resolve, reject) => {
      const cancel = () => {
        this.pending.delete(id);
        this.worker.postMessage({ type: 'cancel', id });
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      };
      this.pending.set(id, {
        resolve: preview => { signal.removeEventListener('abort', cancel); resolve(preview); },
        reject: error => { signal.removeEventListener('abort', cancel); reject(error); },
      });
      signal.addEventListener('abort', cancel, { once: true });
      this.worker.postMessage({ type: 'prepare', id, card });
    });
  }
  dispose() {
    this.worker.terminate();
    for (const task of this.pending.values()) task.reject(new Error('Preview worker disposed'));
    this.pending.clear();
  }
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
  private previewWorkers: CpuPreviewWorker[] = [];
  private previewWorkerLimit = Math.min(4, Math.max(1, Math.floor(navigator.hardwareConcurrency / 2)));
  private previews = new CardPreviewCache();
  private previewJobs = new SharedPreparation<CardPreview>();
  private previewPreparations = 0;
  hasPreview(card: CardDefinition) { return !this.disposed && this.previews.has(card); }
  cachedPreview(card: CardDefinition) { return this.disposed ? undefined : this.previews.get(card, false); }
  async preparePreview(card: CardDefinition, signal: AbortSignal) {
    signal.throwIfAborted();
    if (this.disposed) throw new Error('CPU preparation disposed');
    const cached = this.previews.get(card);
    if (cached) return cached;
    return this.previewJobs.run(JSON.stringify(card), signal, async signal => {
    this.previewPreparations++;
    let worker = this.previewWorkers.find(candidate => candidate.pendingCount === 0);
    if (!worker && this.previewWorkers.length < this.previewWorkerLimit) {
      worker = new CpuPreviewWorker(); this.previewWorkers.push(worker);
    }
    worker ??= this.previewWorkers.reduce((least, candidate) => candidate.pendingCount < least.pendingCount ? candidate : least);
    const preview = await worker.prepare(card, signal);
    signal.throwIfAborted();
    if (this.disposed) throw new Error('CPU preparation disposed');
    this.previews.set(card, preview);
    return preview;
    });
  }
  /** Reuse pack preparation only when the complete definition is compatible. */
  async cached(card: CardDefinition): Promise<PreparedCardCpu | undefined> {
    const profile = resolveCardProfile(card), aspect = card.dimensions.width / card.dimensions.height;
    const key = this.preparationKey(card, profile, aspect);
    const pending = this.cache.get(key);
    if (!pending) return undefined;
    const value = await pending.catch(() => undefined);
    return value && JSON.stringify(value.definition) === JSON.stringify(card) ? value : undefined;
  }
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
  private preparationKey(card: CardDefinition, profile: HolographicProfile, aspect: number) {
    return JSON.stringify([card.id, profile.id, this.mapKey(card, profile, aspect, profile.watermark === 'quarter-century'), card.backProfile, card.backMaps]);
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
    await Promise.all(PACKED_MAP_KEYS.map(async name => {
      if (paths[name]) packedInputs[name] = await clone(paths[name]!);
    }));
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
    if (!layer || layer.structure.field === 'radial' || layer.structure.field === 'plain' || layer.structure.field === 'secret') return undefined;
    const motif = ['symbol-foil', 'base-set-star', 'base-set-2-cosmos', 'ancient-mew'].includes(layer.structure.field) && motifPath ? await this.assets.image(motifPath, signal) : undefined;
    const started = performance.now();
    try { return await (this.patterns ??= new CpuPatternCache()).get({ kind: layer.structure.field, seed, aspect: card.dimensions.width / card.dimensions.height, scale: layer.structure.scale,
      ...(layer.structure.motif ? { motif: layer.structure.motif } : {}), ...(['collector', 'collector-prismatic'].includes(layer.structure.field) ? { layout: card.layout } : {}) }, motif, signal); }
    finally { this.patternMs += performance.now() - started; }
  }
  async prepare(card: CardDefinition, signal: AbortSignal): Promise<PreparedCardCpu> {
    if (this.disposed) throw new Error('CPU preparation disposed');
    const profile = resolveCardProfile(card), aspect = card.dimensions.width / card.dimensions.height, anniversary = profile.watermark === 'quarter-century';
    const key = this.preparationKey(card, profile, aspect);
    if (this.cache.has(key)) { this.hitCount++; return this.cache.get(key)!; }
    this.missCount++;
    if (!this.cache.has(key)) this.cache.set(key, (async () => {
      signal.throwIfAborted();
      const frontReady = card.frontFallback
        ? this.assets.image(card.front, AbortSignal.any([signal, AbortSignal.timeout(8_000)])).catch(error => {
          if (signal.aborted) throw error;
          console.warn(`Using local front fallback for ${card.id}`, error);
          return this.assets.image(card.frontFallback!, signal);
        })
        : this.assets.image(card.front, signal);
      const mapsReady = (async () => { const started = performance.now(); try { return await this.prepareMaps(card, profile, aspect, anniversary, signal); } finally { this.mapMs += performance.now() - started; } })();
      const print = profile.id === 'print-only';
      const [front, back, maps, primary, secondary, stamp] = await Promise.all([
        frontReady, this.assets.image(card.back, signal), mapsReady,
        print ? undefined : this.prepareLayer(profile, card, card.seed, signal, card.maps?.motif), print ? undefined : this.prepareLayer(profile.secondary, card, card.seed + 8191, signal, card.maps?.secondaryMotif), print ? undefined : this.prepareLayer(profile.stamp, card, card.seed + 16381, signal, card.maps?.stampMotif),
      ]);
      signal.throwIfAborted();
      const backMaps = card.backProfile ? await this.prepareMaps({ ...card, front: card.back, maps: card.backMaps }, getProfile(card.backProfile), aspect, false, signal) : undefined;
      return { definition: card, profile, front, back, maps, backMaps, fields: { primary, secondary, stamp }, preparedAt: performance.now() };
    })().catch(error => { this.cache.delete(key); throw error; }));
    return this.cache.get(key)!;
  }
  stats() {
    const workers = this.previewWorkers.flatMap(worker => worker.metrics ? [worker.metrics] : []);
    const sum = (value: (metrics: PreviewMetrics) => number) => workers.reduce((total, metrics) => total + value(metrics), 0);
    return { hits: this.hitCount, misses: this.missCount, entries: this.cache.size, mapMs: this.mapMs, patternMs: this.patternMs, gpuCalls: 0,
      ...this.previews.stats(), previewRequests: this.previewPreparations, previewPreparations: sum(m => m.preparations), previewWorkers: this.previewWorkers.length,
      previewDeduplicated: this.previewJobs.hits, persistentPreviewHits: sum(m => m.persistentHits), previewPreparationMs: sum(m => m.preparationMs),
      persistentHits: sum(m => m.persistent.hits), persistentMisses: sum(m => m.persistent.misses), persistentErrors: sum(m => m.persistent.errors),
      persistentReadMs: sum(m => m.persistent.readMs), persistentWriteMs: sum(m => m.persistent.writeMs),
      persistentBytes: Math.max(0, ...workers.map(m => m.persistent.bytes)), persistentBudget: Math.max(0, ...workers.map(m => m.persistent.budget)),
      decodedInputHits: sum(m => m.pixels.hits), decodedInputMisses: sum(m => m.pixels.misses),
      avoidedDecodes: sum(m => m.pixels.avoidedDecodes), imageDecodes: sum(m => m.pixels.decodes), imageDecodeMs: sum(m => m.pixels.decodeMs),
      decodedInputBytes: sum(m => m.pixels.bytes), decodedInputBudget: sum(m => m.pixels.budget), persistentPixelHits: sum(m => m.pixels.persistentHits),
      downloads: sum(m => m.assets.downloads), avoidedDownloads: sum(m => m.assets.avoidedDownloads) };
  }
  dispose() { this.disposed = true; this.assets.clear(); this.patterns?.dispose(); this.previewWorkers.forEach(worker => worker.dispose()); this.previewWorkers = []; this.maps?.dispose(); this.cache.clear(); this.previews.clear(); }
}
