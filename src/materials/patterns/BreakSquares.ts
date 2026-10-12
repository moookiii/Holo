import type { FieldData } from './ManufacturingField';

/** Four optical-domain area weights, not normals or painted brightness.
 * Mip filtering mixes reflected energy, not inclinations at cell edges.
 * Coordinates are in card-height units, shared by viewer and gallery. */
export function generateBreakSquares(aspect: number, scale: number, height: number): FieldData {
  const width = Math.round(height * aspect);
  const direction = new Uint8Array(width * height * 4), relief = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const weights = [0, 0, 0, 0];
    let junction = 0;
    for (const oy of [.25, .75]) for (const ox of [.25, .75]) {
      const px = (x + ox) / height, py = (y + oy) / height;
      const u = (px + py) * Math.SQRT1_2 * scale + .17;
      const v = (py - px) * Math.SQRT1_2 * scale + .31;
      const a = Math.floor(u), b = Math.floor(v);
      weights[(a & 1) + (b & 1) * 2] += .25;
      const du = Math.min(u - a, 1 - u + a), dv = Math.min(v - b, 1 - v + b);
      junction += Math.max(0, 1 - (du + dv) / .16) * .25;
    }
    const i = (y * width + x) * 4;
    let cumulative = 0, previous = 0;
    for (let c = 0; c < 4; c++) {
      cumulative += weights[c];
      const quantized = Math.round(cumulative * 255);
      direction[i + c] = quantized - previous; previous = quantized;
    }
    relief[i] = relief[i + 1] = relief[i + 2] = 128;
    relief[i + 3] = Math.round(junction * 255);
  }
  return { width, height, direction, relief };
}
