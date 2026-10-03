import type { Group, Object3D, Vector3 } from 'three/webgpu';
export type Inspection = 'clear' | 'frosted' | 'hidden';
export interface ArtifactInstance {
  root: Group;
  groups: Map<string, Object3D>;
  inspect: (mode: Inspection) => void;
  dispose: () => void;
  updateLighting?: (direction: Vector3, intensity: number, broad: boolean) => void;
}
export interface ArtifactDefinition {
  id: string; name: string; subtitle: string; description: string; thumbnail: string;
  camera: { position: [number, number, number]; target: [number, number, number] };
  lighting: 'Studio' | 'Soft' | 'Rim';
  capabilities: { rotate: boolean; zoom: boolean; lighting: boolean; movableLight: boolean; fullscreen: boolean; exploded: boolean; inspection: boolean };
  inspection: Inspection[];
  explodedGroups: { id: string; label: string; offset: [number, number, number] }[];
  load: (signal: AbortSignal) => Promise<ArtifactInstance>;
}
