import { BufferGeometry } from 'three/webgpu';
import type { CardDefinition } from '../card/CardDefinition';
import { CardInstance } from '../card/CardInstance';

/** Transform anchor only. The shared gallery renderer draws the holo preview. */
export function createBinderPreview(card: CardDefinition, slot: number) {
  const geometry = new BufferGeometry();
  const instance = new CardInstance(card, geometry, [], () => geometry.dispose());
  instance.mesh.visible = false;
  instance.mesh.userData.previewSlot = slot;
  return instance;
}
