import { Group } from 'three/webgpu';
import type { ArtifactInstance } from './types';
import { BirdParts } from './bird/BirdParts.ts';
import { buildShells } from './bird/BirdShells.ts';
import { buildElectronics } from './bird/BirdElectronics.ts';
import { buildMechanics, buildLegs } from './bird/BirdMechanics.ts';
import { buildHarness } from './bird/BirdHarness.ts';

/** Complete dimensional specimen. The two supplied photographs guide visible
 * forms; opposite-side structure and cross-section depths are authored estimates. */
export function buildBird(): ArtifactInstance {
  const root = new Group(); root.name = 'Robotic bird';
  const parts = new BirdParts();
  const groups = new Map<string, Group>();
  for (const id of [
    'shell-front', 'shell-back', 'shell-dorsal', 'shell-belly', 'head',
    'head-electronics', 'wing-front', 'wing-back', 'tail', 'boards',
    'boards-back', 'boards-core', 'mechanics', 'wires', 'wires-back', 'legs',
  ]) {
    const group = new Group(); group.name = id;
    groups.set(id, group); root.add(group);
  }
  try {
    buildShells(parts, groups);
    const electronics = buildElectronics(parts, groups);
    buildMechanics(parts, groups);
    buildLegs(parts, groups.get('legs')!);
    buildHarness(parts, groups, electronics);
    parts.batch(root, groups);
    return {
      root, groups,
      inspect: mode => parts.inspect(root, mode),
      dispose() { root.removeFromParent(); parts.dispose(); },
    };
  } catch (error) {
    parts.dispose(); throw error;
  }
}
