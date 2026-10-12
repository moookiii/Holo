import type { FieldData } from './ManufacturingField';

/** Angular moments of a fan grating inside card-aligned square tiles.
 * RG store cos/sin(2 theta), BA cos/sin(4 theta). Filtering these moments
 * averages optical energy across tile boundaries and fan centres.
 * These are in-plane grating directions, never surface normals or heights. */
export function generateBreakSquares(aspect: number, scale: number, height: number): FieldData {
  const width = Math.round(height * aspect);
  const direction = new Uint8Array(width * height * 4), relief = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const moments = [0, 0, 0, 0];
    let radialPeriod = 0;
    for (const oy of [.25, .75]) for (const ox of [.25, .75]) {
      const px = (x + ox) / height, py = (y + oy) / height;
      const u = px * scale + .17;
      const v = py * scale + .31;
      const a = Math.floor(u), b = Math.floor(v);
      // Adjacent stamps reverse the fan's handedness. The boundaries stay
      // horizontal/vertical; only the in-plane grating orientation differs.
      const theta = Math.atan2(v - b - .5, u - a - .5) * (((a + b) & 1) ? -1 : 1)
        + (((a + b) & 1) ? Math.PI / 4 : 0);
      moments[0] += Math.cos(2 * theta) * .25;
      moments[1] += Math.sin(2 * theta) * .25;
      moments[2] += Math.cos(4 * theta) * .25;
      moments[3] += Math.sin(4 * theta) * .25;
      // A radial grating chirp produces wavelength bands within each fan.
      // Alpha is optical spacing data; RGB remain a completely flat laminate.
      radialPeriod += Math.min(1, Math.hypot(u - a - .5, v - b - .5) * Math.SQRT2) * .25;
    }
    const i = (y * width + x) * 4;
    for (let c = 0; c < 4; c++) {
      direction[i + c] = Math.round((moments[c] * .5 + .5) * 255);
    }
    relief[i] = relief[i + 1] = relief[i + 2] = 128;
    relief[i + 3] = Math.round(radialPeriod * 255);
  }
  return { width, height, direction, relief };
}
