import { DataArrayTexture, DataTexture, FloatType, RGBAFormat, NearestFilter, DynamicDrawUsage, Group, InstancedMesh, LinearFilter, Object3D, PlaneGeometry, SRGBColorSpace, type PerspectiveCamera, type Scene } from 'three/webgpu';
import type { StudioLighting } from '../lighting/StudioLighting';
import { PREVIEW_BYTES, PREVIEW_ARRAY_SIZES, type CardPreview } from '../card/CardPreviewPreparation';
import { PREVIEW_PARAMETER_COLUMNS } from '../card/PreviewOptics';
import { GalleryMaterial } from './GalleryMaterial';
import { GALLERY_CAPACITY } from './GalleryLayout';
import { galleryBatchKey, galleryOpticalLayers } from './GalleryBatch';

interface Batch { mesh: InstancedMesh; material: GalleryMaterial; compilation: Promise<void>; }

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
  private geometry = new PlaneGeometry(1, 1);
  private batches = new Map<string, Batch>();
  private slots = new Map<number, Batch>();
  private compilation = Promise.resolve();
  private disposed = false;
  private transform = new Object3D();
  private visible = new Set<number>();
  uploads = 0;
  constructor(scene: Scene, private compile: (mesh: InstancedMesh) => Promise<void>) {
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
    const layers = galleryOpticalLayers(preview.parameters), key = galleryBatchKey(layers);
    let batch = this.batches.get(key);
    if (!batch) {
      const material = new GalleryMaterial(this.arrays, this.parameterTexture, layers);
      const mesh = new InstancedMesh(this.geometry, material, this.capacity);
      mesh.name = `Gallery optics ${key}`; mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled = false;
      this.clear(mesh); this.mesh.add(mesh);
      // Compile before presentation in the HDR beauty-pass context. On browsers
      // with parallel compilation, preview work continues while the driver runs.
      mesh.visible = false;
      const compilation = this.compilation.then(() => {
        if (this.disposed) throw new Error('Gallery disposed');
        mesh.visible = true;
        try { return this.compile(mesh); }
        finally { mesh.visible = false; }
      });
      this.compilation = compilation.catch(() => {});
      batch = { mesh, material, compilation }; this.batches.set(key, batch);
      const created = batch;
      compilation.then(() => { mesh.visible = !this.disposed; }, () => {
        if (this.batches.get(key) === created) this.batches.delete(key);
        mesh.removeFromParent(); mesh.dispose(); material.dispose();
      });
    }
    this.slots.set(slot, batch);
    await batch.compilation;
  }
  private clear(mesh: InstancedMesh) {
    this.transform.position.set(0, 0, 0); this.transform.rotation.set(0, 0, 0); this.transform.scale.setScalar(0); this.transform.updateMatrix();
    for (let slot = 0; slot < this.capacity; slot++) mesh.setMatrixAt(slot, this.transform.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }
  hideAll() {
    for (const batch of this.batches.values()) this.clear(batch.mesh);
    this.visible.clear();
  }
  place(slot: number, x: number, y: number, width: number, height: number, pitch: number, yaw: number, viewportWidth: number, viewportHeight: number, camera: PerspectiveCamera) {
    const scale = 2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360) / viewportHeight;
    this.transform.position.set((x - viewportWidth / 2) * scale, (viewportHeight / 2 - y) * scale, 0);
    this.transform.rotation.set(pitch, yaw, 0); this.transform.scale.set(width * scale, height * scale, 1); this.transform.updateMatrix();
    const mesh = this.slots.get(slot)!.mesh;
    mesh.setMatrixAt(slot, this.transform.matrix); this.visible.add(slot); mesh.instanceMatrix.needsUpdate = true;
  }
  updateLighting(_lighting: StudioLighting, _camera: PerspectiveCamera) { /* Uses the scene's actual shared lights. */ }
  stats() { return { gpuBudgetBytes: this.capacity * PREVIEW_BYTES, gpuAllocatedBytes: this.capacity * PREVIEW_BYTES, capacity: this.capacity, visible: this.visible.size, uploads: this.uploads, materials: this.batches.size, textureArrays: this.arrays.length }; }
  dispose() { this.disposed = true; this.mesh.removeFromParent(); for (const { mesh, material } of this.batches.values()) { mesh.dispose(); material.dispose(); } this.batches.clear(); this.slots.clear(); this.geometry.dispose(); this.arrays.forEach(t => t.dispose()); this.parameterTexture.dispose(); }
}
