import { DataTexture, RGBAFormat, UnsignedByteType, LinearMipmapLinearFilter, LinearFilter, NoColorSpace, type Texture } from 'three/webgpu';
import type { FieldData, PatternSpec } from './ManufacturingField';
import { openingCache } from '../../rendering/CardOpeningTiming';

export interface PatternTextures { direction: Texture; relief: Texture; }
export class PatternCache {
  private workers: Worker[];
  private busy = new Set<Worker>();
  private sequence = 0;
  private requests = new Map<number, { resolve: (f: FieldData) => void; reject: (e: Error) => void }>();
  private cache = new Map<string, Promise<PatternTextures>>();
  private textures = new Set<DataTexture>();
  private settled = new Map<string, PatternTextures>();
  private disposed = false;
  private queue: { id: number; key: string; priority: number; message: unknown; transfers: Transferable[] }[] = [];
  private backgroundPaused = false;
  constructor(workerCount = 1) {
    this.workers = Array.from({ length: workerCount }, () => new Worker(new URL('./pattern.worker.ts', import.meta.url), { type: 'module' }));
    for (const worker of this.workers) {
      worker.onmessage = (event: MessageEvent<{ id: number; field: FieldData; error?: string; persistentHit?: boolean }>) => {
        this.busy.delete(worker);
        const task = this.requests.get(event.data.id); if (!task) { this.dispatch(); return; }
        this.requests.delete(event.data.id);
        if (event.data.error) task.reject(new Error(event.data.error));
        else { openingCache('persistent-manufacturing-field', !!event.data.persistentHit); task.resolve(event.data.field); }
        this.dispatch();
      };
      worker.onerror = e => {
        this.busy.delete(worker);
        for (const r of this.requests.values()) r.reject(new Error(e.message));
        this.requests.clear(); this.queue = [];
      };
    }
  }
  setBackgroundPaused(paused: boolean) { this.backgroundPaused = paused; this.dispatch(); }
  private dispatch() {
    this.queue.sort((a, b) => b.priority - a.priority || a.id - b.id);
    for (const [index, worker] of this.workers.entries()) {
      if (this.busy.has(worker) || !this.queue.length) continue;
      const task = this.queue[0];
      if (task.priority < 0 && (this.backgroundPaused || index > 0)) continue;
      this.queue.shift(); this.busy.add(worker);
      worker.postMessage(task.message, task.transfers);
    }
  }
  get(spec: PatternSpec, motifTexture?: Texture, priority = 0): Promise<PatternTextures> {
    if (this.disposed) return Promise.reject(new Error('Pattern cache disposed'));
    const key = JSON.stringify([spec, motifTexture?.uuid]);
    const previous = this.settled.get(key);
    if (previous) { this.settled.delete(key); this.settled.set(key, previous); }
    const queued = this.queue.find(task => task.key === key);
    if (queued && queued.priority < priority) { queued.priority = priority; this.dispatch(); }
    if (!this.cache.has(key)) this.cache.set(key, new Promise<FieldData>((resolve, reject) => {
      let motifImage;
      if (motifTexture) {
        const source = motifTexture.image as HTMLImageElement;
        const canvas = document.createElement('canvas');
        const registered = spec.kind === 'ancient-mew' || spec.kind === 'base-set-star' || spec.kind === 'base-set-2-cosmos';
        canvas.width = registered ? source.width : 512;
        canvas.height = registered ? source.height : 512;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data, data = new Uint8Array(canvas.width * canvas.height);
        for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
        motifImage = { width: canvas.width, height: canvas.height, data };
      }
      const id = ++this.sequence; this.requests.set(id, { resolve, reject });
      this.queue.push({ id, key, priority, message: { id, spec, motifImage }, transfers: motifImage ? [motifImage.data.buffer] : [] }); this.dispatch();
    }).then(data => {
      if (this.disposed) throw new Error('Pattern cache disposed');
      const make = (values: Uint8Array) => {
        const t = new DataTexture(values, data.width, data.height, RGBAFormat, UnsignedByteType);
        t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter; t.generateMipmaps = true;
        t.colorSpace = NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; this.textures.add(t); return t;
      };
      const field = { direction: make(data.direction), relief: make(data.relief) };
      this.settled.set(key, field); return field;
    }).catch(error => { this.cache.delete(key); throw error; }));
    return this.cache.get(key)!;
  }
  /** Authoring caches can evict old fields while protecting those bound to the live card. */
  trim(limit: number, protectedFields: Array<PatternTextures | undefined> = []) {
    for (const [key, field] of this.settled) {
      if (this.settled.size <= limit) break;
      if (protectedFields.includes(field)) continue;
      field.direction.dispose(); field.relief.dispose();
      this.textures.delete(field.direction as DataTexture); this.textures.delete(field.relief as DataTexture);
      this.settled.delete(key); this.cache.delete(key);
    }
  }
  stats() { return { fields: this.settled.size, textures: this.textures.size, pending: this.requests.size }; }
  resources() { return [...this.textures]; }
  dispose() {
    this.disposed = true;
    this.workers.forEach(worker => worker.terminate()); for (const r of this.requests.values()) r.reject(new Error('Pattern generation disposed'));
    this.queue = []; this.busy.clear();
    for (const t of this.textures) t.dispose(); this.cache.clear(); this.textures.clear(); this.requests.clear(); this.settled.clear();
  }
}
