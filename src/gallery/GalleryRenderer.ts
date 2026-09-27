import { DataArrayTexture, DynamicDrawUsage, InstancedMesh, LinearFilter, MeshPhysicalNodeMaterial, Object3D, PlaneGeometry, SRGBColorSpace, Vector3, type PerspectiveCamera, type Scene } from 'three/webgpu';
import { float, instanceIndex, normalMap, normalViewGeometry, positionViewDirection, texture, uniform, uv, varying, vec2, vec3 } from 'three/tsl';
import type { Node } from 'three/webgpu';
import type { StudioLighting } from '../lighting/StudioLighting';
import { inspection } from '../lighting/inspection';
import { PREVIEW_BYTES, PREVIEW_HEIGHT, PREVIEW_WIDTH, type CardPreview } from '../card/CardPreviewPreparation';
import { GALLERY_CAPACITY } from './GalleryLayout';

/** One instanced draw, one material graph and three fixed-size texture arrays.
 * Array layers update independently; scrolling never uploads the whole atlas. */
export class GalleryRenderer {
  readonly capacity = GALLERY_CAPACITY;
  private arrays = Array.from({ length: 3 }, () => {
    const texture = new DataArrayTexture(new Uint8Array(PREVIEW_WIDTH * PREVIEW_HEIGHT * 4 * GALLERY_CAPACITY), PREVIEW_WIDTH, PREVIEW_HEIGHT, GALLERY_CAPACITY);
    texture.minFilter = texture.magFilter = LinearFilter; texture.generateMipmaps = false; texture.needsUpdate = true;
    return texture;
  });
  readonly mesh: InstancedMesh;
  private material = new MeshPhysicalNodeMaterial({ roughness: .38, metalness: .05, clearcoat: .25, clearcoatRoughness: .3, alphaTest: .5 });
  private transform = new Object3D();
  private lightDirection = uniform(new Vector3(-.4, .5, 1).normalize());
  private foilGain = uniform(.2);
  private visible = new Set<number>();
  uploads = 0;
  constructor(scene: Scene) {
    this.arrays[0].colorSpace = SRGBColorSpace;
    const coord = vec2(uv().x, uv().y.oneMinus()), layer = varying(float(instanceIndex));
    const art = texture(this.arrays[0], coord).depth(layer);
    const optical = texture(this.arrays[1], coord).depth(layer);
    const authored = normalMap(texture(this.arrays[2], coord).depth(layer).rgb) as unknown as Node<'vec3'>;
    this.material.normalNode = authored;
    // Shared direct-light angle and real 3D surface normal drive spectral color.
    // Deliberately no generated engraving, glitter or per-card light rigs.
    const half = this.lightDirection.add(positionViewDirection).normalize();
    const phase = authored.dot(half).mul(22).add(uv().x.mul(1.3));
    const spectrum = vec3(phase.sin(), phase.add(2.094).sin(), phase.add(4.189).sin()).mul(.5).add(.5);
    const grazing = normalViewGeometry.dot(half).clamp(0, 1).pow(18);
    const foil = optical.r.mul(optical.b).mul(this.foilGain).mul(inspection.polarizer);
    this.material.colorNode = art.rgb.add(spectrum.mul(foil).mul(grazing.mul(.7).add(.3)));
    this.material.metalnessNode = optical.r.mul(.45).add(.025);
    this.material.roughnessNode = optical.g.clamp(.2, .85);
    const edge = uv().sub(.5).abs().sub(vec2(.47, .479)).max(0).length();
    this.material.opacityNode = edge.lessThan(.021).select(1, 0);
    this.material.name = 'Gallery shared preview';
    this.mesh = new InstancedMesh(new PlaneGeometry(1, 1), this.material, this.capacity);
    this.mesh.name = 'Gallery visible cards'; this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.visible = false; scene.add(this.mesh);
    this.hideAll();
  }
  upload(slot: number, preview: CardPreview) {
    [preview.front, preview.optical, preview.normal].forEach((bytes, index) => {
      const array = this.arrays[index]; (array.image.data as Uint8Array).set(bytes, slot * bytes.length);
      array.addLayerUpdate(slot); array.needsUpdate = true;
    });
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
  updateLighting(lighting: StudioLighting, camera: PerspectiveCamera) {
    this.lightDirection.value.copy(lighting.preset === 'Holo skim' ? inspection.sweepDirection.value : lighting.key.position).normalize().transformDirection(camera.matrixWorldInverse);
    this.foilGain.value = .24 * lighting.intensity * (lighting.preset === 'Blacklight' ? .5 : 1);
  }
  stats() { return { gpuBudgetBytes: this.capacity * PREVIEW_BYTES, gpuAllocatedBytes: this.capacity * PREVIEW_BYTES, capacity: this.capacity, visible: this.visible.size, uploads: this.uploads, materials: 1, textureArrays: 3 }; }
  dispose() { this.mesh.removeFromParent(); this.mesh.dispose(); this.mesh.geometry.dispose(); this.material.dispose(); this.arrays.forEach(t => t.dispose()); }
}
