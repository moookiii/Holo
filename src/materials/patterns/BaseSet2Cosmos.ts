import { encodeGratingAxis } from './Orientation.ts';
import { labelRegisteredStars, type StarImage } from './RegisteredStars.ts';
import type { FieldData, PatternSpec } from './ManufacturingField.ts';

/** Early English Base Set 2 optics on the exact scan's authored dot islands.
 * Source PNG defines all positions, sizes, outlines and gaps. Seed changes
 * optical orientation only; no generated circles, later-era swirl or relief.
 */
export function generateBaseSet2Cosmos(spec: PatternSpec, height: number, image?: StarImage): FieldData {
  const width = Math.round(height * spec.aspect);
  const direction = new Uint8Array(width * height * 4), relief = new Uint8Array(width * height * 4);
  const labels = image ? labelRegisteredStars(image) : undefined;
  const optical = new Map<number, number[]>();
  const random = (id: number, salt: number) => {
    let h = Math.imul(id ^ spec.seed ^ salt, 374761393);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  for (let iy = 0; iy < height; iy++) for (let ix = 0; ix < width; ix++) {
    const i = (iy * width + ix) * 4;
    let shape = 0, id = 0;
    if (image && labels) {
      const px = Math.min(image.width - 1, Math.floor((ix + .5) / width * image.width));
      // Manufacturing DataTextures are bottom-up, source PNGs are top-down.
      const py = Math.min(image.height - 1, Math.floor((1 - (iy + .5) / height) * image.height));
      const p = py * image.width + px;
      shape = image.data[p] / 255; id = labels[p];
    }
    let values = optical.get(id);
    if (!values) {
      const axis = encodeGratingAxis(random(id, 17) * Math.PI);
      values = [axis[0], axis[1], 76 + random(id, 29) * 46,
        (random(id, 41) - .5) * 42, (random(id, 53) - .5) * 42];
      optical.set(id, values);
    }
    // Fixed optical cells never change the measured silhouette or add sparkle.
    const cellX = Math.floor(ix / height * 720), cellY = Math.floor(iy / height * 720);
    const cell = (Math.imul(cellX ^ spec.seed, 374761393) ^ Math.imul(cellY, 668265263)) >>> 0;
    const grain = .72 + (cell % 101) / 360;
    direction[i] = shape ? Math.round(values[0]) : 255;
    direction[i + 1] = shape ? Math.round(values[1]) : 128;
    direction[i + 2] = shape ? Math.round(values[2]) : 85;
    direction[i + 3] = Math.round(5 * (1 - shape) + shape * grain * 235);
    relief[i] = Math.round(128 + values[3] * shape); relief[i + 1] = Math.round(128 + values[4] * shape);
    relief[i + 2] = 128; relief[i + 3] = Math.round(178 + shape * grain * 35);
  }
  return { width, height, direction, relief };
}
