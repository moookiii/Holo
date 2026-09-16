import { Mesh, type BufferGeometry, type Material } from 'three/webgpu';
import type { CardDefinition } from './CardDefinition';
import type { HolographicMaterial } from '../materials/HolographicMaterial';

/** A transferable physical card. Textures and geometry belong to the factory;
 * each instance owns its material uniforms, transform and lifetime. */
export class CardInstance {
  readonly mesh: Mesh<BufferGeometry, Material[]>;
  private released = false;
  constructor(readonly definition: CardDefinition, geometry: BufferGeometry,
    materials: Material[], private release: () => void) {
    this.mesh = new Mesh(geometry, materials);
    this.mesh.name = `card:${definition.id}`;
    this.mesh.userData.cardInstance = this;
  }
  get holo() { return this.mesh.material[0] as HolographicMaterial; }
  get disposed() { return this.released; }
  dispose() {
    if (this.released) return;
    this.released = true;
    this.mesh.removeFromParent();
    this.mesh.material.forEach(material => material.dispose());
    this.release();
  }
}
