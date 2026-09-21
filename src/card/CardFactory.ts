import type { BufferGeometry, Camera, Object3D, RenderTarget, Scene, WebGPURenderer } from 'three/webgpu';
import { AssetManager } from '../assets/AssetManager';
import { CardMapLoader } from '../assets/CardMapLoader';
import { HolographicMaterial, type ProfileFields } from '../materials/HolographicMaterial';
import type { FoilLayer, HolographicProfile } from '../materials/HolographicProfile';
import { createEdgeMaterial, createPrintMaterial } from '../materials/CardSurfaceMaterial';
import { PatternCache } from '../materials/patterns/PatternCache';
import { resolveCardProfile } from '../materials/profiles/resolveCardProfile';
import type { CardDefinition } from './CardDefinition';
import { createCardGeometry } from './CardGeometry';
import { CardInstance } from './CardInstance';
import { createMetalReliefGeometry, type HeightField } from './MetalReliefGeometry';

/** One resource domain for viewer, packs and imports. Disposing a card cannot
 * invalidate the shared textures or manufacturing fields of another card. */
export class CardFactory {
  readonly assets = new AssetManager(8);
  readonly maps = new CardMapLoader(this.assets);
  // Primary and stamp manufacturing fields are independent. Two workers cut
  // foreground pack preparation latency without allowing idle warmups to fill
  // both slots (PatternCache reserves the second worker for foreground work).
  private patterns = new PatternCache(2);
  private geometries = new Map<string, BufferGeometry>();
  private instances = new Set<CardInstance>();
  private disposed = false;
  constructor(private renderer: WebGPURenderer, private camera: Camera,
    private scene: Scene, private target: RenderTarget) {}

  setBackgroundPaused(paused: boolean) { this.patterns.setBackgroundPaused(paused); }
  async prepareProfile(profile: HolographicProfile, definition: CardDefinition, priority = 0, patterns = this.patterns): Promise<ProfileFields> {
    const aspect = definition.dimensions.width / definition.dimensions.height;
    const prepareLayer = async (layer: FoilLayer | undefined, seed: number, motifPath?: string) => {
      // Radial and plain layers are analytic in the material and contain no
      // authored manufacturing field. Avoid generating and uploading a full
      // 1024px pair of neutral textures for them during pack preparation.
      if (!layer || layer.structure.field === 'radial' || layer.structure.field === 'plain') return undefined;
      const motif = layer.structure.field === 'symbol-foil' && motifPath ? await this.assets.load(motifPath, false) : undefined;
      const field = await patterns.get({ kind: layer.structure.field, seed, aspect, scale: layer.structure.scale,
        ...(layer.structure.motif ? { motif: layer.structure.motif } : {}),
        ...(['collector', 'collector-prismatic'].includes(layer.structure.field) ? { layout: definition.layout } : {}) }, motif, priority);
      if (!this.disposed) { this.renderer.initTexture(field.direction); this.renderer.initTexture(field.relief); }
      return field;
    };
    const [primary, secondary, stamp] = await Promise.all([
      prepareLayer(profile, definition.seed, definition.maps?.motif),
      prepareLayer(profile.secondary, definition.seed + 8191, definition.maps?.secondaryMotif),
      prepareLayer(profile.stamp, definition.seed + 16381, definition.maps?.stampMotif),
    ]);
    return { primary, secondary, stamp };
  }

  async compile(object: Object3D) {
    const target = this.renderer.getRenderTarget(), mrt = this.renderer.getMRT();
    let compilation: Promise<void>;
    try {
      this.renderer.setRenderTarget(this.target); this.renderer.setMRT(null);
      // r186 captures the HDR attachment context before its first async yield.
      compilation = this.renderer.compileAsync(object, this.camera, this.scene);
    } finally {
      this.renderer.setRenderTarget(target); this.renderer.setMRT(mrt);
    }
    await compilation;
  }

  async create(definition: CardDefinition, signal?: AbortSignal, compile = true, priority = 0): Promise<CardInstance> {
    const check = () => {
      signal?.throwIfAborted();
      if (this.disposed) throw new Error('Card factory disposed');
    };
    check();
    const profile = resolveCardProfile(definition);
    const frontReady = this.assets.load(definition.front, true);
    const reverseDefinition = definition.construction ? { ...definition, maps: definition.backMaps, coverageMode: undefined,
      mapSettings: { ...definition.mapSettings, embossStrength: definition.construction.backReliefCm / .008 } } : undefined;
    const [front, back, maps, fields, backMaps] = await Promise.all([
      frontReady, this.assets.load(definition.back, true),
      frontReady.then(front => {
        const image = front.image as HTMLImageElement;
        return this.maps.load({ ...definition, maps: { ...definition.maps, ...profile.maps }, mapSettings: { ...definition.mapSettings, ...profile.mapSettings,
          ...(definition.construction ? { embossStrength: definition.construction.frontReliefCm / .008 } : {}) } }, image.width / image.height, profile.watermark === 'quarter-century');
      }),
      this.prepareProfile(profile, definition, priority),
      reverseDefinition ? this.maps.load(reverseDefinition, definition.dimensions.width / definition.dimensions.height) : Promise.resolve(undefined),
    ]);
    check();
    const yugioh = definition.franchise === 'Yu-Gi-Oh!';
    const holo = new HolographicMaterial(front, maps.coverage, maps.surface, definition.seed, profile,
      definition.substrate, maps, definition.frontBorderColor, yugioh, yugioh);
    holo.setProfile(profile, fields);
    holo.setAspect(definition.dimensions.width / definition.dimensions.height, definition.dimensions.height);
    const reverse = backMaps ? new HolographicMaterial(back, backMaps.coverage, backMaps.surface, definition.seed, profile, undefined, backMaps)
      : createPrintMaterial(back, this.assets.black, yugioh ? { clearcoat: .18, clearcoatRoughness: .38 } : undefined, definition.backCrop);
    if (reverse instanceof HolographicMaterial) { reverse.setProfile(profile, fields); reverse.setAspect(definition.dimensions.width / definition.dimensions.height, definition.dimensions.height); }
    const materials = [holo, reverse, createEdgeMaterial(definition.construction ? profile.metallicInk : undefined)];
    const key = JSON.stringify([definition.dimensions, definition.construction, definition.construction ? [definition.maps?.height, definition.backMaps?.height] : null]);
    if (!this.geometries.has(key)) {
      if (definition.construction) {
        const readHeight = async (path?: string): Promise<HeightField> => {
          if (!path) throw new Error('Metal collectibles require height maps on both faces.');
          const image = (await this.assets.load(path, false)).image as HTMLImageElement;
          const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0); const pixels = context.getImageData(0, 0, image.width, image.height).data;
          const data = new Uint8Array(image.width * image.height); for (let i = 0; i < data.length; i++) data[i] = pixels[i * 4];
          return { width: image.width, height: image.height, data };
        };
        const [frontHeight, backHeight] = await Promise.all([readHeight(definition.maps?.height), readHeight(definition.backMaps?.height)]);
        check();
        this.geometries.set(key, createMetalReliefGeometry(definition.dimensions, frontHeight, backHeight, definition.construction.frontReliefCm, definition.construction.backReliefCm));
      } else this.geometries.set(key, createCardGeometry(definition.dimensions));
    }
    const instance = new CardInstance(definition, this.geometries.get(key)!, materials, () => this.instances.delete(instance));
    this.instances.add(instance);
    try {
      instance.mesh.frustumCulled = false;
      if (compile) await this.compile(instance.mesh);
      check();
      instance.mesh.frustumCulled = true;
      return instance;
    } catch (error) { instance.dispose(); throw error; }
  }
  inUse(id: string) { return [...this.instances].some(card => card.definition.id === id); }
  stats() { return { instances: this.instances.size, geometries: this.geometries.size }; }
  dispose() {
    this.disposed = true;
    this.instances.forEach(card => card.dispose());
    this.geometries.forEach(geometry => geometry.dispose()); this.geometries.clear();
    this.maps.dispose(); this.assets.dispose(); this.patterns.dispose();
  }
}
