import { DataArrayTexture, DataTexture, FloatType, RGBAFormat, NearestFilter, DynamicDrawUsage, InstancedMesh, LinearFilter, Object3D, PlaneGeometry, SRGBColorSpace, type PerspectiveCamera, type Scene } from 'three/webgpu';
import type { StudioLighting } from '../lighting/StudioLighting';
import { PREVIEW_BYTES, PREVIEW_ARRAY_SIZES, type CardPreview } from '../card/CardPreviewPreparation';
import { PREVIEW_PARAMETER_COLUMNS } from '../card/PreviewOptics';
import { GalleryMaterial } from './GalleryMaterial';
import { GALLERY_CAPACITY } from './GalleryLayout';

/** One instanced draw, one material graph and three fixed-size texture arrays.
 * Array layers update independently; scrolling never uploads the whole atlas. */
export class GalleryRenderer {
  readonly capacity = GALLERY_CAPACITY;
  private arrays = PREVIEW_ARRAY_SIZES.map(([width, height]) => {
    const texture = new DataArrayTexture(new Uint8Array(width * height * 4 * GALLERY_CAPACITY), width, height, GALLERY_CAPACITY);
    texture.minFilter = texture.magFilter = LinearFilter; texture.generateMipmaps = false; texture.needsUpdate = true;
    return texture;
  });
  readonly mesh: InstancedMesh;
  private parameterTexture = new DataTexture(new Float32Array(PREVIEW_PARAMETER_COLUMNS * 4 * GALLERY_CAPACITY), PREVIEW_PARAMETER_COLUMNS, GALLERY_CAPACITY, RGBAFormat, FloatType);
  private material: GalleryMaterial;
  private transform = new Object3D();
  private visible = new Set<number>();
  uploads = 0;
  constructor(scene: Scene) {
    this.arrays[0].colorSpace = SRGBColorSpace;
    this.parameterTexture.minFilter = this.parameterTexture.magFilter = NearestFilter;
    this.parameterTexture.needsUpdate = true;
    this.material = new GalleryMaterial(this.arrays, this.parameterTexture, this.capacity);
    this.mesh = new InstancedMesh(new PlaneGeometry(1, 1), this.material, this.capacity);
    this.mesh.name = 'Gallery visible cards'; this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.visible = false; scene.add(this.mesh);
    this.hideAll();
  }
  upload(slot: number, preview: CardPreview) {
    preview.images.forEach((bytes, index) => {
      const array = this.arrays[index]; (array.image.data as Uint8Array).set(bytes, slot * bytes.length);
      array.addLayerUpdate(slot); array.needsUpdate = true;
    });
    (this.parameterTexture.image.data as Float32Array).set(preview.parameters, slot * PREVIEW_PARAMETER_COLUMNS * 4);
    this.parameterTexture.needsUpdate = true;
    this.uploads++;
  }
  hideAll() {
    this.transform.position.set(0, 0, 0); this.transform.rotation.set(0, 0, 0); this.transform.scale.setScalar(0); this.transform.updateMatrix();
    for (let slot = 0; slot < this.capacity; slot++) this.mesh.setMatrixAt(slot, this.transform.matrix);
    this.visible.clear(); this.mesh.instanceMatrix.needsUpdate = true;
  }
  place(slot: number, x: number, y: number, width: number, height: number, pitch: number, yaw: number, viewportWidth: number, viewportHeight: number, camera: PerspectiveCamera) {
    const scale = 2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360) / viewportHeight;
    this.transform.position.set((x - viewportWidth / 2) * scale, (viewportHeight / 2 - y) * scale, 0);
    this.transform.rotation.set(pitch, yaw, 0); this.transform.scale.set(width * scale, height * scale, 1); this.transform.updateMatrix();
    this.mesh.setMatrixAt(slot, this.transform.matrix); this.visible.add(slot); this.mesh.instanceMatrix.needsUpdate = true;
  }
  updateLighting(_lighting: StudioLighting, _camera: PerspectiveCamera) { /* Uses the scene's actual shared lights. */ }
  stats() { return { gpuBudgetBytes: this.capacity * PREVIEW_BYTES, gpuAllocatedBytes: this.capacity * PREVIEW_BYTES, capacity: this.capacity, visible: this.visible.size, uploads: this.uploads, materials: 1, textureArrays: this.arrays.length }; }
  dispose() { this.mesh.removeFromParent(); this.mesh.dispose(); this.mesh.geometry.dispose(); this.material.dispose(); this.arrays.forEach(t => t.dispose()); this.parameterTexture.dispose(); }
}
