import { Mesh, type BufferGeometry, type Material } from 'three/webgpu';
import type { CardDefinition } from './CardDefinition';
import type { HolographicMaterial } from '../materials/HolographicMaterial';

/** A transferable physical card. Textures and geometry belong to the factory;
 * each instance owns its face uniforms, transform and lifetime. Immutable
 * materials may belong to the resource domain instead of an individual card. */
export class CardInstance {
  readonly mesh: Mesh<BufferGeometry, Material[]>;
  readonly definition: CardDefinition;
  private release: () => void;
  private ownedMaterials: readonly Material[];
  private released = false;
  constructor(definition: CardDefinition, geometry: BufferGeometry,
    materials: Material[], release: () => void, ownedMaterials: readonly Material[] = materials) {
    this.definition = definition; this.release = release; this.ownedMaterials = ownedMaterials;
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
    this.ownedMaterials.forEach(material => material.dispose());
    this.release();
  }
}
