import type { ArtifactDefinition } from './types';
export const artifacts: ArtifactDefinition[] = [{
  id: 'robotic-bird', name: 'Robotic bird', subtitle: '01 / Electromechanical specimen',
  description: 'A transparent anatomy of circuits, wire and precision mechanics. A procedural interpretation of the supplied reference; unseen construction is imagined.',
  thumbnail: `${import.meta.env?.BASE_URL ?? '/'}artifacts/robotic-bird-reference.png`,
  camera: { position: [3.1, 1.9, 12.8], target: [-.25, .25, 0] }, lighting: 'Studio',
  capabilities: { rotate: true, zoom: true, lighting: true, movableLight: true, fullscreen: true, exploded: true, inspection: true },
  inspection: ['clear', 'frosted', 'hidden'],
  explodedGroups: [
    { id: 'shell-front', label: 'Front shell', offset: [0, .15, 1.65] },
    { id: 'shell-back', label: 'Rear shell', offset: [0, .15, -1.65] },
    { id: 'head', label: 'Head & beak', offset: [.65, 1.1, 0] },
    { id: 'wing-front', label: 'Near wing', offset: [-.4, .4, 2.4] },
    { id: 'wing-back', label: 'Far wing', offset: [-.4, .4, -2.4] },
    { id: 'tail', label: 'Tail', offset: [-1.3, -.15, 0] },
    { id: 'boards', label: 'Circuit boards', offset: [.1, .65, .75] },
    { id: 'mechanics', label: 'Drive train', offset: [0, -.45, -.75] },
    { id: 'wires', label: 'Wire harness', offset: [-.4, 1.1, -.2] },
    { id: 'legs', label: 'Leg assemblies', offset: [.15, -1.15, .15] },
  ],
  load: async signal => { const { buildBird } = await import('./RoboticBird'); signal.throwIfAborted(); return buildBird(); },
}];
