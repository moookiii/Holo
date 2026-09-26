import { uniform } from 'three/tsl';
import { Vector3 } from 'three/webgpu';

/** Viewer-only optical controls, independent of saved card profiles. */
export const inspection = {
  holoSweep: uniform(0),
  sweepDirection: uniform(new Vector3(0, .12, .3).normalize()),
  polarizer: uniform(1),
};
