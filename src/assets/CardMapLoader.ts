import { DataTexture, RGBAFormat, UnsignedByteType, LinearMipmapLinearFilter, LinearFilter, NoColorSpace, type Texture } from 'three/webgpu';
import type { CardDefinition, CardLayout } from '../card/CardDefinition';
import { AssetManager } from './AssetManager';
import { resolveCoverageMaps } from './CardCoverage';
import { PACKED_MAP_KEYS, type PackedMapKey, type PackedMaps } from './MapPacking';

export interface CardMaterialMaps {
  coverage: Texture; surface: Texture; pattern: Texture; normal: Texture;
  direction?: Texture; secondaryDirection?: Texture; stampDirection?: Texture;
  hologram?: Texture;
  layout?: CardLayout;
  hasNormal: boolean; hasStamp: boolean; hasExtendedFoil: boolean;
  roughnessMode: 'profile' | 'absolute' | 'offset';
  embossStrength?: number; normalScale: number;
}

/** Packs many optional artist-facing maps into three GPU textures off the render thread. */
export class CardMapLoader {
  private worker = new Worker(new URL('./map-packer.worker.ts', import.meta.url), { type: 'module' });
  private sequence = 0;
  private pending = new Map<number, { resolve: (maps: PackedMaps) => void; reject: (error: Error) => void }>();
  private cache = new Map<string, Promise<CardMaterialMaps>>();
  private owned = new Set<Texture>();
  private owners = new Map<string, Set<Texture>>();
  private keys = new Map<string, Set<string>>();
  private released = new Set<string>();
  constructor(private assets: AssetManager) {
    this.worker.onmessage = (event: MessageEvent<{ id: number; maps: PackedMaps; error?: string }>) => {
      const request = this.pending.get(event.data.id); if (!request) return;
      this.pending.delete(event.data.id);
      if (event.data.error) request.reject(new Error(event.data.error)); else request.resolve(event.data.maps);
    };
    this.worker.onerror = event => { for (const request of this.pending.values()) request.reject(new Error(event.message)); this.pending.clear(); };
  }
  load(card: CardDefinition, aspect: number, needsAnniversary = false): Promise<CardMaterialMaps> {
    if (card.construction) aspect = card.dimensions.width / card.dimensions.height;
    const key = JSON.stringify([card.id, card.coverageMode, card.maps, card.mapSettings, card.construction, card.layout, aspect, needsAnniversary]);
    this.released.delete(card.id);
    if (!this.keys.has(card.id)) this.keys.set(card.id, new Set());
    this.keys.get(card.id)!.add(key);
    if (!this.cache.has(key)) this.cache.set(key, this.prepare(card, aspect, needsAnniversary).catch(error => { this.cache.delete(key); throw error; }));
    return this.cache.get(key)!;
  }
  private async prepare(card: CardDefinition, aspect: number, needsAnniversary: boolean): Promise<CardMaterialMaps> {
    const paths = resolveCoverageMaps(card);
    const wholeFront = card.imported
      && ![paths.coverage, paths.foil, paths.extendedFoil, paths.secondaryFoil, paths.metallic, paths.stamp, paths.hologram].some(Boolean);
    // Authored paths are required when present: an invalid mask must not silently change a printing.
    const load = async (path: string | undefined, fallback?: Texture) => path ? this.assets.load(path, false) : fallback;
    const [coverage, surface, normal, direction, secondaryDirection, stampDirection, anniversary] = await Promise.all([
      load(paths.coverage, wholeFront ? this.assets.fullFoil : this.assets.black), load(paths.surface, this.assets.neutralSurface), load(paths.normal, this.assets.flatNormal),
      load(paths.direction), load(paths.secondaryDirection), load(paths.stampDirection),
      needsAnniversary ? this.assets.load('/materials/ygo-25th.webp', false) : Promise.resolve(undefined),
    ]);
    let result: Pick<CardMaterialMaps, 'coverage' | 'surface' | 'pattern' | 'hologram'> = { coverage: coverage!, surface: surface!, pattern: this.assets.white };
    const packedInputs = PACKED_MAP_KEYS.some(name => !!paths[name]);
    // Plain print cards have no channels to combine. Reuse the shared 1 x 1
    // defaults instead of sending an empty 1024px job through the bitmap and
    // packing pipeline, then allocating three redundant GPU textures. This is
    // the common pack-opening path (four commons plus one foil).
    if (packedInputs || anniversary || wholeFront) {
      const images: Partial<Record<PackedMapKey, ImageBitmap>> = {};
      let anniversaryImage: ImageBitmap | undefined;
      try {
        const decoded = await Promise.allSettled(PACKED_MAP_KEYS.map(async name => { if (paths[name]) {
          const texture = await this.assets.load(paths[name]!, false);
          images[name] = await createImageBitmap(texture.image as HTMLImageElement);
        } }));
        const failure = decoded.find(result => result.status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
        if (anniversary) anniversaryImage = await createImageBitmap(anniversary.image as HTMLImageElement);
        const packed = await new Promise<PackedMaps>((resolve, reject) => {
          const id = ++this.sequence; this.pending.set(id, { resolve, reject });
          this.worker.postMessage({ id, aspect, images, anniversary: anniversaryImage, defaultPrimary: wholeFront ? 255 : 0 }, [...Object.values(images), ...(anniversaryImage ? [anniversaryImage] : [])]);
        });
        if (this.released.has(card.id)) throw new Error('The imported card was removed.');
        const make = (bytes: Uint8Array) => {
          const texture = new DataTexture(bytes, packed.width, packed.height, RGBAFormat, UnsignedByteType);
          // Canvas rows start at the top, just like the original print images.
          texture.flipY = true;
          texture.colorSpace = NoColorSpace; texture.minFilter = LinearMipmapLinearFilter; texture.magFilter = LinearFilter;
          texture.anisotropy = 8; texture.generateMipmaps = true; texture.needsUpdate = true; this.owned.add(texture);
          if (!this.owners.has(card.id)) this.owners.set(card.id, new Set()); this.owners.get(card.id)!.add(texture);
          return texture;
        };
        result = { coverage: make(packed.coverage), surface: make(packed.surface), pattern: make(packed.pattern), hologram: packed.hologram ? make(packed.hologram) : undefined };
      } catch (error) { Object.values(images).forEach(image => image.close()); anniversaryImage?.close(); throw error; }
    }
    if (this.released.has(card.id)) throw new Error('The imported card was removed.');
    return { ...result, layout: card.layout, normal: normal!, direction, secondaryDirection, stampDirection, hasNormal: !!paths.normal, hasStamp: !!paths.stamp, hasExtendedFoil: !!paths.extendedFoil,
      roughnessMode: card.mapSettings?.roughnessMode ?? (paths.roughness ? 'absolute' : 'profile'),
      embossStrength: card.construction ? (paths.normal ? 0 : card.construction.frontReliefCm / .008)
        : card.mapSettings?.embossStrength ?? (paths.height ? .25 : undefined), normalScale: card.mapSettings?.normalScale ?? 1 };
  }
  release(cardId: string) {
    this.released.add(cardId);
    for (const key of this.keys.get(cardId) ?? []) this.cache.delete(key); this.keys.delete(cardId);
    for (const texture of this.owners.get(cardId) ?? []) { texture.dispose(); this.owned.delete(texture); } this.owners.delete(cardId);
  }
  dispose() {
    this.worker.terminate(); for (const request of this.pending.values()) request.reject(new Error('Material map loading disposed'));
    for (const texture of this.owned) texture.dispose(); this.owned.clear(); this.pending.clear(); this.cache.clear(); this.owners.clear(); this.keys.clear(); this.released.clear();
  }
}
