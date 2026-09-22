import { DataTexture, Texture, RGBAFormat, UnsignedByteType, LinearMipmapLinearFilter, LinearFilter, NoColorSpace, SRGBColorSpace, type Material, type BufferGeometry, type Camera, type Object3D, type RenderTarget, type Scene, type WebGPURenderer } from 'three/webgpu';
import { AssetManager } from '../assets/AssetManager';
import { startupMark } from '../rendering/LoadTiming';
import { capturePassContext } from '../rendering/PassCompileContext';
import { CardMapLoader } from '../assets/CardMapLoader';
import { PrintFrontMaterial } from '../materials/PrintFrontMaterial';
import { CardTextureCache } from './CardTextureCache';
import { HolographicMaterial, type ProfileFields } from '../materials/HolographicMaterial';
import type { FoilLayer, HolographicProfile } from '../materials/HolographicProfile';
import { createEdgeMaterial, createPrintMaterial } from '../materials/CardSurfaceMaterial';
import { PatternCache } from '../materials/patterns/PatternCache';
import { resolveCardProfile } from '../materials/profiles/resolveCardProfile';
import type { CardDefinition } from './CardDefinition';
import { createCardGeometry } from './CardGeometry';
import { CardInstance } from './CardInstance';
import { createMetalReliefGeometry, type HeightField } from './MetalReliefGeometry';
import type { CardMaterialMaps } from '../assets/CardMapLoader';
import type { PatternTextures } from '../materials/patterns/PatternCache';
import type { PreparedCardCpu, CpuImage } from './CardCpuPreparation';

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
  private textures = new CardTextureCache();
  private gpuStats = { realizations: 0, sharedTextureCreates: 0, sharedTextureHits: 0, compilations: 0, materialCreationMs: 0, gpuRealizationMs: 0, printMaterials: 0, holoMaterials: 0,
    renderPipelines: 0, printPipelines: 0, holoPipelines: 0 };
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

  async realizeCardGpu(prepared: PreparedCardCpu, signal?: AbortSignal, compile = true): Promise<CardInstance> {
    signal?.throwIfAborted(); if (this.disposed) throw new Error('Card factory disposed');
    const started = performance.now(), releases: (() => void)[] = [], resources = new Set<Texture>();
    const definition = prepared.definition, profile = prepared.profile;
    const retain = !definition.imported;
    const imageTexture = (image: CpuImage, color = true) => {
      const lease = this.textures.acquire(image.source ? `${color ? 'srgb' : 'data'}:${image.source}` : image.bitmap,
        image.width * image.height * 4 * 4 / 3, () => {
          const texture = new Texture(image.bitmap); texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
          texture.minFilter = LinearMipmapLinearFilter; texture.magFilter = LinearFilter; texture.anisotropy = 8;
          texture.generateMipmaps = true; texture.needsUpdate = true; return texture;
        }, retain);
      releases.push(lease.release); resources.add(lease.texture); return lease.texture;
    };
    const bytesTexture = (bytes: Uint8Array, width: number, height: number) => {
      const lease = this.textures.acquire(bytes, width * height * 4 * 4 / 3, () => {
        const texture = new DataTexture(bytes, width, height, RGBAFormat, UnsignedByteType);
        texture.flipY = true; texture.colorSpace = NoColorSpace; texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter; texture.anisotropy = 8; texture.generateMipmaps = true; texture.needsUpdate = true; return texture;
      }, retain);
      releases.push(lease.release); resources.add(lease.texture); return lease.texture;
    };
    const field = (data: import('../materials/patterns/ManufacturingField').FieldData | undefined): PatternTextures | undefined => data
      ? { direction: bytesTexture(data.direction, data.width, data.height), relief: bytesTexture(data.relief, data.width, data.height) } : undefined;
    let instance: CardInstance | undefined;
    try {
      const front = imageTexture(prepared.front);
      const shared = !definition.imported ? this.assets.fromBitmap(definition.back, prepared.back.bitmap, true) : undefined;
      if (shared) { if (shared.hit) this.gpuStats.sharedTextureHits++; else this.gpuStats.sharedTextureCreates++; }
      const waitStarted = performance.now();
      const back = shared ? await shared.texture : imageTexture(prepared.back);
      const waitMs = shared ? performance.now() - waitStarted : 0;
      resources.add(back);
      signal?.throwIfAborted(); if (this.disposed) throw new Error('Card factory disposed');
      const key = JSON.stringify([definition.dimensions, definition.construction, definition.construction ? [definition.maps?.height, definition.backMaps?.height] : null]);
      if (!this.geometries.has(key)) this.geometries.set(key, createCardGeometry(definition.dimensions));
      const yugioh = definition.franchise === 'Yu-Gi-Oh!';
      const source = prepared.maps;
      const normal = source.normal ? imageTexture(source.normal, false) : undefined;
      let material: HolographicMaterial | PrintFrontMaterial;
      let materialStarted: number;
      if (profile.id === 'print-only') {
        const roughness = source.printRoughness ? imageTexture(source.printRoughness, false) : undefined;
        const height = source.printHeight ? imageTexture(source.printHeight, false) : undefined;
        materialStarted = performance.now();
        material = new PrintFrontMaterial(front, definition, profile, normal, roughness, height);
        this.gpuStats.printMaterials++;
      } else {
        const packed = source.packed;
        const maps: CardMaterialMaps = { ...source,
          coverage: packed ? bytesTexture(packed.coverage, packed.width, packed.height) : this.assets.black,
          surface: packed ? bytesTexture(packed.surface, packed.width, packed.height) : this.assets.neutralSurface,
          pattern: packed ? bytesTexture(packed.pattern, packed.width, packed.height) : this.assets.white,
          hologram: packed?.hologram ? bytesTexture(packed.hologram, packed.width, packed.height) : undefined,
          normal: normal ?? this.assets.flatNormal,
          direction: source.direction ? imageTexture(source.direction, false) : undefined,
          secondaryDirection: source.secondaryDirection ? imageTexture(source.secondaryDirection, false) : undefined,
          stampDirection: source.stampDirection ? imageTexture(source.stampDirection, false) : undefined,
        };
        const fields = { primary: field(prepared.fields.primary), secondary: field(prepared.fields.secondary), stamp: field(prepared.fields.stamp) };
        materialStarted = performance.now();
        const holo = new HolographicMaterial(front, maps.coverage, maps.surface, definition.seed, profile, definition.substrate, maps, definition.frontBorderColor, yugioh, yugioh);
        holo.setProfile(profile, fields); holo.setAspect(definition.dimensions.width / definition.dimensions.height, definition.dimensions.height); material = holo;
        this.gpuStats.holoMaterials++;
      }
      const reverse = createPrintMaterial(back, this.assets.black, yugioh ? { clearcoat: .18, clearcoatRoughness: .38 } : undefined, definition.backCrop);
      const materials = [material, reverse, createEdgeMaterial(definition.construction ? profile.metallicInk : undefined)];
      this.gpuStats.materialCreationMs += performance.now() - materialStarted;
      instance = new CardInstance(definition, this.geometries.get(key)!, materials, () => {
        this.instances.delete(instance!); releases.forEach(release => release());
      }); this.instances.add(instance);
      instance.mesh.userData.resourceTextures = [...resources];
      this.gpuStats.realizations++; this.gpuStats.gpuRealizationMs += performance.now() - started - waitMs;
      instance.mesh.frustumCulled = false;
      if (compile) await this.compile(instance.mesh);
      signal?.throwIfAborted(); instance.mesh.frustumCulled = true; return instance;
    } catch (error) { if (instance) instance.dispose(); else releases.forEach(release => release()); throw error; }
  }

  /** Only called during the explicit pack transition. Full-size card uploads
   * and mip generation finish before compilation/presentation begins. */
  async uploadCardResources(cards: CardInstance[]) {
    const resources = new Set<Texture>(cards.flatMap(card => card.mesh.userData.resourceTextures ?? []));
    for (const texture of resources) this.renderer.initTexture(texture);
    await this.finishResourceUploads();
    return resources.size;
  }
  async finishResourceUploads() {
    // WebGPU queue fence is a readiness boundary, not a GPU-duration timer.
    const backend = this.renderer.backend as unknown as { device?: { queue: { onSubmittedWorkDone(): Promise<void> } } };
    await backend.device?.queue.onSubmittedWorkDone();
  }

  async compile(object: Object3D) {
    this.gpuStats.compilations++;
    const objects = new Set<Object3D>(); object.traverse(child => objects.add(child));
    // r186 backend contract (not yet declared on @types/three's base Backend).
    const backend = this.renderer.backend as unknown as { createRenderPipeline: (object: { object: Object3D; material: Material }, promises?: Promise<unknown>[]) => void };
    const createPipeline = backend.createRenderPipeline;
    // Three r186 otherwise waits for each link before submitting the next.
    // These objects are not presented until compile() resolves. Submit all
    // independent links during the traversal, then join their readiness here.
    const links: Promise<unknown>[] = [];
    backend.createRenderPipeline = (...args: Parameters<typeof createPipeline>) => {
      const renderObject = args[0];
      if (objects.has(renderObject.object)) {
        this.gpuStats.renderPipelines++;
        if (renderObject.material instanceof PrintFrontMaterial) this.gpuStats.printPipelines++;
        if (renderObject.material instanceof HolographicMaterial) this.gpuStats.holoPipelines++;
      }
      return createPipeline.call(backend, renderObject, objects.has(renderObject.object) && args[1] ? links : args[1]);
    };
    const target = this.renderer.getRenderTarget(), mrt = this.renderer.getMRT();
    let compilation: Promise<void>;
    try {
      this.renderer.setRenderTarget(this.target); this.renderer.setMRT(null);
      // Match both HDR attachments and the nested beauty-pass context.
      const contexts = (this.renderer as unknown as { _renderContexts: { get: (target: RenderTarget | null, mrt?: unknown, depth?: number) => unknown } })._renderContexts;
      compilation = capturePassContext(contexts, this.target, () => this.renderer.compileAsync(object, this.camera, this.scene));
    } catch (error) {
      backend.createRenderPipeline = createPipeline; throw error;
    } finally {
      this.renderer.setRenderTarget(target); this.renderer.setMRT(mrt);
    }
    try { await compilation; await Promise.all(links); }
    finally {
      // A cancelled/failed load must not dispose a program still being linked.
      await Promise.allSettled(links);
      backend.createRenderPipeline = createPipeline;
    }
  }

  async create(definition: CardDefinition, signal?: AbortSignal, compile = true, priority = 0, editableOptics = false): Promise<CardInstance> {
    const check = () => {
      signal?.throwIfAborted();
      if (this.disposed) throw new Error('Card factory disposed');
    };
    check();
    const profile = resolveCardProfile(definition);
    if (profile.id === 'print-only' && !editableOptics && !definition.construction) {
      const paths = { ...definition.maps, ...profile.maps };
      const [front, back, normal, roughness, height] = await Promise.all([
        this.assets.load(definition.front, true), this.assets.load(definition.back, true),
        paths.normal ? this.assets.load(paths.normal, false) : undefined,
        paths.roughness ? this.assets.load(paths.roughness, false) : undefined,
        paths.height ? this.assets.load(paths.height, false) : undefined,
      ]);
      check(); const key = JSON.stringify([definition.dimensions]);
      if (!this.geometries.has(key)) this.geometries.set(key, createCardGeometry(definition.dimensions));
      const materials = [new PrintFrontMaterial(front, definition, profile, normal, roughness, height),
        createPrintMaterial(back, this.assets.black, definition.franchise === 'Yu-Gi-Oh!' ? { clearcoat: .18, clearcoatRoughness: .38 } : undefined, definition.backCrop), createEdgeMaterial()];
      this.gpuStats.printMaterials++;
      const instance = new CardInstance(definition, this.geometries.get(key)!, materials, () => this.instances.delete(instance));
      this.instances.add(instance);
      try { instance.mesh.frustumCulled = false; if (compile) await this.compile(instance.mesh); check(); instance.mesh.frustumCulled = true; return instance; }
      catch (error) { instance.dispose(); throw error; }
    }
    const frontReady = this.assets.load(definition.front, true);
    const reverseDefinition = definition.construction ? { ...definition, maps: definition.backMaps, coverageMode: undefined,
      construction: { ...definition.construction, frontReliefCm: definition.construction.backReliefCm },
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
    const key = JSON.stringify([definition.dimensions, definition.construction, definition.construction ? [definition.maps?.height, definition.backMaps?.height] : null]);
    startupMark('initialAssetsReady');
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
        if (!this.geometries.has(key)) this.geometries.set(key, createMetalReliefGeometry(definition.dimensions, frontHeight, backHeight, definition.construction.frontReliefCm, definition.construction.backReliefCm));
      } else this.geometries.set(key, createCardGeometry(definition.dimensions));
    }
    // All awaited work precedes per-instance material allocation, including abort checks.
    const yugioh = definition.franchise === 'Yu-Gi-Oh!';
    const holo = new HolographicMaterial(front, maps.coverage, maps.surface, definition.seed, profile,
      definition.substrate, maps, definition.frontBorderColor, yugioh, yugioh);
    holo.setProfile(profile, fields);
    holo.setAspect(definition.dimensions.width / definition.dimensions.height, definition.dimensions.height);
    const reverse = backMaps ? new HolographicMaterial(back, backMaps.coverage, backMaps.surface, definition.seed, profile, undefined, backMaps)
      : createPrintMaterial(back, this.assets.black, yugioh ? { clearcoat: .18, clearcoatRoughness: .38 } : undefined, definition.backCrop);
    if (reverse instanceof HolographicMaterial) { reverse.setProfile(profile, fields); reverse.setAspect(definition.dimensions.width / definition.dimensions.height, definition.dimensions.height); }
    const materials = [holo, reverse, createEdgeMaterial(definition.construction ? profile.metallicInk : undefined)];
    const instance = new CardInstance(definition, this.geometries.get(key)!, materials, () => this.instances.delete(instance));
    this.instances.add(instance);
    try {
      instance.mesh.frustumCulled = false;
      startupMark('initialGpuRealization');
      if (compile) await this.compile(instance.mesh);
      startupMark('initialCompilation');
      check();
      instance.mesh.frustumCulled = true;
      return instance;
    } catch (error) { instance.dispose(); throw error; }
  }
  inUse(id: string) { return [...this.instances].some(card => card.definition.id === id); }
  stats() { const textures = this.textures.stats(); return { instances: this.instances.size, geometries: this.geometries.size, residentGpuTextures: this.renderer.info.memory.textures, ...this.gpuStats, ...textures,
    textureRealizations: textures.textureRealizations + this.gpuStats.sharedTextureCreates,
    textureCacheHits: textures.textureCacheHits + this.gpuStats.sharedTextureHits }; }
  dispose() {
    this.disposed = true;
    this.instances.forEach(card => card.dispose());
    this.geometries.forEach(geometry => geometry.dispose()); this.geometries.clear();
    this.maps.dispose(); this.assets.dispose(); this.patterns.dispose();
    this.textures.dispose();
  }
}
