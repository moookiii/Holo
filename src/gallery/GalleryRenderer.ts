import { createGalleryCardGeometry, galleryGeometryDimensions } from './GalleryGeometry';
import { createEdgeMaterial } from '../materials/CardSurfaceMaterial';
import { AssetManager } from '../assets/AssetManager';
import { doubleRareProfile } from '../materials/profiles/doubleRare';
import { DataArrayTexture, DataTexture, FloatType, RGBAFormat, NearestFilter, DynamicDrawUsage, Group, InstancedMesh, LinearFilter, Object3D, SRGBColorSpace, type PerspectiveCamera, type Scene } from 'three/webgpu';
import type { StudioLighting } from '../lighting/StudioLighting';
import { PREVIEW_BYTES, PREVIEW_ARRAY_SIZES, type CardPreview } from '../card/CardPreviewPreparation';
import { PREVIEW_PARAMETER_COLUMNS } from '../card/PreviewOptics';
import { GalleryMaterial, type UltraRareTextures } from './GalleryMaterial';
import { GALLERY_CAPACITY } from './GalleryLayout';
import { galleryBatchKey, galleryPreviewOpticalLayers, galleryShaderLayers } from './GalleryBatch';

interface Batch { mesh: InstancedMesh; edge: InstancedMesh; material: GalleryMaterial; compilation: Promise<void>; assets?: AssetManager; bytes?: number; }
interface GeometryBatch { face: ReturnType<typeof createGalleryCardGeometry>; edgeGeometry: ReturnType<typeof createGalleryCardGeometry>; edge: InstancedMesh; compilation: Promise<void>; }

/** Instanced draws share nine fixed-size texture arrays. Shader batches include
 * only mechanisms used by their cards, avoiding costly unused optical kernels.
 * Array layers update independently; scrolling never uploads the whole atlas. */
export class GalleryRenderer {
  readonly capacity = GALLERY_CAPACITY;
  private arrays = PREVIEW_ARRAY_SIZES.map(([width, height]) => {
    const texture = new DataArrayTexture(new Uint8Array(width * height * 4 * GALLERY_CAPACITY), width, height, GALLERY_CAPACITY);
    texture.minFilter = texture.magFilter = LinearFilter; texture.generateMipmaps = false; texture.needsUpdate = true;
    return texture;
  });
  readonly mesh = new Group();
  private parameterTexture = new DataTexture(new Float32Array(PREVIEW_PARAMETER_COLUMNS * 4 * GALLERY_CAPACITY), PREVIEW_PARAMETER_COLUMNS, GALLERY_CAPACITY, RGBAFormat, FloatType);
  private geometries = new Map<string, GeometryBatch>();
  private edge = createEdgeMaterial(undefined, undefined, .032 / 8.8, 8.8);
  private batches = new Map<string, Batch>();
  private slots = new Map<number, Batch>();
  private compilation = Promise.resolve();
  private disposed = false;
  private opticalAssets?: AssetManager;
  private opticalBytes = 0;
  private transform = new Object3D();
  private visible = new Set<number>();
  private drawn = new Set<InstancedMesh>();
  uploads = 0;
  constructor(scene: Scene, private compile: (mesh: Object3D) => Promise<void>) {
    this.arrays[0].colorSpace = SRGBColorSpace;
    this.parameterTexture.minFilter = this.parameterTexture.magFilter = NearestFilter;
    this.parameterTexture.needsUpdate = true;
    this.mesh.name = 'Gallery visible cards'; this.mesh.visible = false; scene.add(this.mesh);
  }
  async upload(slot: number, preview: CardPreview) {
    preview.images.forEach((bytes, index) => {
      const array = this.arrays[index]; (array.image.data as Uint8Array).set(bytes, slot * bytes.length);
      array.addLayerUpdate(slot); array.needsUpdate = true;
    });
    (this.parameterTexture.image.data as Float32Array).set(preview.parameters, slot * PREVIEW_PARAMETER_COLUMNS * 4);
    this.parameterTexture.needsUpdate = true;
    this.uploads++;
    const dimensions = galleryGeometryDimensions(preview.dimensions), geometryKey = JSON.stringify(dimensions);
    const layers = galleryShaderLayers(galleryPreviewOpticalLayers(preview.parameters, preview.images));
    const key = `${galleryBatchKey(layers)}:${geometryKey}:${preview.ultraRareMaps ? JSON.stringify(preview.ultraRareMaps) : ''}`;
    // Release exact-card textures when their last resident slot is reassigned.
    // No full-set texture array or preload: only uploaded cards own these maps.
    const previous = this.slots.get(slot);
    this.slots.delete(slot);
    if (previous?.assets && previous !== this.batches.get(key) && ![...this.slots.values()].includes(previous)) {
      for (const [oldKey, batch] of this.batches) if (batch === previous) this.batches.delete(oldKey);
      this.drawn.delete(previous.mesh); previous.mesh.removeFromParent(); previous.mesh.dispose();
      previous.material.dispose(); previous.assets.dispose();
    }
    // One lazy, shared full-resolution die per gallery. Reducing this to the
    // per-card field atlas turns the reference's pointed stars into blobs.
    const stars = layers.some(layer => layer.enabled && layer.doubleRare)
      ? await (this.opticalAssets ??= new AssetManager()).load(doubleRareProfile.maps!.direction!, false) : undefined;
    if (this.disposed) { this.opticalAssets?.dispose(); throw new Error('Gallery disposed'); }
    if (stars && !this.opticalBytes) {
      const image = stars.image as HTMLImageElement;
      let width = image.width, height = image.height;
      do {
        this.opticalBytes += width * height * 4;
        if (width === 1 && height === 1) break;
        width = Math.max(1, Math.floor(width / 2)); height = Math.max(1, Math.floor(height / 2));
      } while (true);
    }
    let batch = this.batches.get(key);
    if (!batch) {
      let assets: AssetManager | undefined, exact: UltraRareTextures | undefined, bytes = 0;
      if (preview.ultraRareMaps) {
        assets = new AssetManager();
        try {
          exact = Object.fromEntries(await Promise.all(Object.entries(preview.ultraRareMaps).map(async ([name, path]) =>
            [name, await assets!.load(path, name === 'front')])) ) as unknown as UltraRareTextures;
          for (const texture of Object.values(exact)) {
            let { width, height } = texture.image as HTMLImageElement;
            do { bytes += width * height * 4; if (width === 1 && height === 1) break;
              width = Math.max(1, Math.floor(width / 2)); height = Math.max(1, Math.floor(height / 2)); } while (true);
          }
          if (this.disposed) throw new Error('Gallery disposed');
        } catch (error) { assets.dispose(); throw error; }
      }
      const material = new GalleryMaterial(this.arrays, this.parameterTexture, layers, stars, exact);
      let geometry = this.geometries.get(geometryKey);
      const newGeometry = !geometry;
      if (!geometry) {
        const face = createGalleryCardGeometry(dimensions), edgeGeometry = face.clone();
        const groups = [...face.groups]; face.clearGroups(); edgeGeometry.clearGroups();
        for (const group of groups) {
          if (group.materialIndex === 2) edgeGeometry.addGroup(group.start, group.count, 0);
          else face.addGroup(group.start, group.count, group.materialIndex);
        }
        const edge = new InstancedMesh(edgeGeometry, this.edge, this.capacity);
        edge.name = `Gallery edges ${geometryKey}`; edge.instanceMatrix.setUsage(DynamicDrawUsage); edge.frustumCulled = false;
        this.clear(edge); this.mesh.add(edge);
        geometry = { face, edgeGeometry, edge, compilation: Promise.resolve() };
        this.geometries.set(geometryKey, geometry);
      }
      const mesh = new InstancedMesh(geometry.face, [material, material], this.capacity);
      mesh.name = `Gallery optics ${key}`; mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled = false;
      this.clear(mesh); this.mesh.add(mesh);
      const compilation = Promise.all([geometry.compilation, this.queueCompile(mesh, newGeometry ? geometry.edge : undefined)]).then(() => {});
      if (newGeometry) geometry.compilation = compilation;
      batch = { mesh, edge: geometry.edge, material, compilation, assets, bytes }; this.batches.set(key, batch);
      const created = batch;
      compilation.catch(() => {
        if (this.batches.get(key) === created) this.batches.delete(key);
        mesh.removeFromParent(); mesh.dispose(); material.dispose(); assets?.dispose();
      });
    }
    this.slots.set(slot, batch);
    await batch.compilation;
  }
  private queueCompile(mesh: InstancedMesh, edge?: InstancedMesh) {
    const compilation = this.compilation.then(async () => {
      if (this.disposed) throw new Error('Gallery disposed');
      const group = new Group(); group.name = 'Gallery compile';
      const meshes = edge ? [mesh, edge] : [mesh];
      for (const object of meshes) { object.visible = true; object.count = this.capacity; group.add(object); }
      try { await this.compile(group); }
      finally {
        for (const object of meshes) {
          object.visible = false; object.count = 0;
          if (!this.disposed) this.mesh.add(object);
        }
      }
    });
    this.compilation = compilation.catch(() => {});
    return compilation;
  }
  private clear(mesh: InstancedMesh) {
    this.transform.position.set(0, 0, 0); this.transform.rotation.set(0, 0, 0); this.transform.scale.setScalar(0); this.transform.updateMatrix();
    for (let slot = 0; slot < this.capacity; slot++) mesh.setMatrixAt(slot, this.transform.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = false; mesh.count = 0;
  }
  hideAll() {
    // Only previously drawn meshes need clearing. Inactive optical batches
    // stay out of the render list instead of drawing 48 zero-scale instances.
    for (const mesh of this.drawn) this.clear(mesh);
    this.drawn.clear();
    this.visible.clear();
  }
  place(slot: number, x: number, y: number, width: number, height: number, pitch: number, yaw: number, viewportWidth: number, viewportHeight: number, camera: PerspectiveCamera) {
    const scale = 2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360) / viewportHeight;
    this.transform.position.set((x - viewportWidth / 2) * scale, (viewportHeight / 2 - y) * scale, 0);
    this.transform.rotation.set(pitch, yaw, 0); this.transform.scale.set(width * scale, height * scale, height * scale); this.transform.updateMatrix();
    const batch = this.slots.get(slot)!;
    for (const mesh of [batch.mesh, batch.edge]) {
      mesh.setMatrixAt(slot, this.transform.matrix); mesh.count = Math.max(mesh.count, slot + 1);
      mesh.visible = true; mesh.instanceMatrix.needsUpdate = true; this.drawn.add(mesh);
    }
    this.visible.add(slot);
  }
  updateLighting(_lighting: StudioLighting, _camera: PerspectiveCamera) { /* Uses the scene's actual shared lights. */ }
  stats() { const bytes = this.capacity * PREVIEW_BYTES + this.opticalBytes + [...this.batches.values()].reduce((sum, batch) => sum + (batch.bytes ?? 0), 0);
    return { gpuBudgetBytes: bytes, gpuAllocatedBytes: bytes, capacity: this.capacity, visible: this.visible.size, uploads: this.uploads, materials: this.batches.size, textureArrays: this.arrays.length }; }
  dispose() { this.disposed = true; this.opticalAssets?.dispose(); this.mesh.removeFromParent(); for (const { mesh, material, assets } of this.batches.values()) { mesh.dispose(); material.dispose(); assets?.dispose(); } this.batches.clear(); this.slots.clear(); this.geometries.forEach(({ face, edgeGeometry, edge }) => { face.dispose(); edgeGeometry.dispose(); edge.dispose(); }); this.geometries.clear(); this.drawn.clear(); this.edge.dispose(); this.arrays.forEach(t => t.dispose()); this.parameterTexture.dispose(); }
}
