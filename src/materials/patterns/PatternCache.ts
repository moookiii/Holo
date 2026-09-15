import { DataTexture, RGBAFormat, UnsignedByteType, LinearMipmapLinearFilter, LinearFilter, NoColorSpace, type Texture } from 'three/webgpu';
import type { FieldData, PatternSpec } from './ManufacturingField';

export interface PatternTextures { direction: Texture; relief: Texture; }
export class PatternCache {
  private worker = new Worker(new URL('./pattern.worker.ts', import.meta.url), { type: 'module' });
  private sequence = 0;
  private requests = new Map<number, { resolve: (f: FieldData) => void; reject: (e: Error) => void }>();
  private cache = new Map<string, Promise<PatternTextures>>();
  private textures = new Set<DataTexture>();
  constructor() {
    this.worker.onmessage = (event: MessageEvent<{ id: number; field: FieldData; error?: string }>) => {
      const task = this.requests.get(event.data.id); if (!task) return;
      this.requests.delete(event.data.id);
      if (event.data.error) task.reject(new Error(event.data.error)); else task.resolve(event.data.field);
    };
    this.worker.onerror = e => { for (const r of this.requests.values()) r.reject(new Error(e.message)); this.requests.clear(); };
  }
  get(spec: PatternSpec, motifTexture?: Texture): Promise<PatternTextures> {
    const key = JSON.stringify([spec, motifTexture?.uuid]);
    if (!this.cache.has(key)) this.cache.set(key, new Promise<FieldData>((resolve, reject) => {
      let motifImage;
      if (motifTexture) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(motifTexture.image as HTMLImageElement, 0, 0, 512, 512);
        const rgba = context.getImageData(0, 0, 512, 512).data, data = new Uint8Array(512 * 512);
        for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
        motifImage = { width: 512, height: 512, data };
      }
      const id = ++this.sequence; this.requests.set(id, { resolve, reject });
      this.worker.postMessage({ id, spec, motifImage }, motifImage ? [motifImage.data.buffer] : []);
    }).then(data => {
      const make = (values: Uint8Array) => {
        const t = new DataTexture(values, data.width, data.height, RGBAFormat, UnsignedByteType);
        t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter; t.generateMipmaps = true;
        t.colorSpace = NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; this.textures.add(t); return t;
      };
      return { direction: make(data.direction), relief: make(data.relief) };
    }).catch(error => { this.cache.delete(key); throw error; }));
    return this.cache.get(key)!;
  }
  dispose() {
    this.worker.terminate(); for (const r of this.requests.values()) r.reject(new Error('Pattern generation disposed'));
    for (const t of this.textures) t.dispose(); this.cache.clear(); this.textures.clear(); this.requests.clear();
  }
}
