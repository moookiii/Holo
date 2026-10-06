import type { FieldData, PatternSpec } from './ManufacturingField';
import { labelRegisteredStars, type StarImage } from './RegisteredStars.ts';
import { encodeGratingAxis } from './Orientation.ts';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
function random(x: number, y: number, seed: number) {
  let h = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Cache lattice corners, not sampled pixels. Float64 preserves the original
 * expression's arithmetic; no filtering, approximation or resolution change. */
function noiseRows(width: number, height: number, sx: number, sy: number, seed: number) {
  const cells = new Int32Array(width), weights = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    const u = (x + .5) / height * sx;
    cells[x] = Math.floor(u); weights[x] = smooth(0, 1, u - cells[x]);
  }
  const count = cells[width - 1] + 2;
  let row = -1, top = new Float64Array(count), bottom = new Float64Array(count);
  const result = new Float64Array(width);
  return (y: number) => {
    const v = (y + .5) / height * sy, iy = Math.floor(v), weight = smooth(0, 1, v - iy);
    if (iy !== row) {
      for (let x = 0; x < count; x++) { top[x] = random(x, iy, seed); bottom[x] = random(x, iy + 1, seed); }
      row = iy;
    }
    for (let x = 0; x < width; x++) {
      const i = cells[x], u = weights[x], a = top[i], b = top[i + 1], c = bottom[i], d = bottom[i + 1];
      result[x] = (a + (b - a) * u) * (1 - weight) + (c + (d - c) * u) * weight;
    }
    return result;
  };
}

/** Exact registered Base Set field. Invariants are evaluated once per star,
 * lattice row and stroke cell instead of millions of times per card. */
export function generateRegisteredStarField(spec: PatternSpec, height: number, registered: StarImage): FieldData {
  const width = Math.round(height * spec.aspect), seed = spec.seed;
  const direction = new Uint8Array(width * height * 4), relief = new Uint8Array(direction.length);
  const labels = labelRegisteredStars(registered);
  let maxLabel = 0;
  for (const label of labels) maxLabel = Math.max(maxLabel, label);
  const stars = Array.from({ length: maxLabel + 1 }, (_, label) => ({
    axis: encodeGratingAxis(random(label, 0, seed + 35) * Math.PI),
    spacing: .90 + random(label, 0, seed + 17) * .22,
    nx: (random(label, 0, seed + 41) - .5) * .22,
    ny: (random(label, 0, seed + 43) - .5) * .22,
  }));
  const ribbonRow = noiseRows(width, height, 12, 48, seed + 71);
  const broadRow = noiseRows(width, height, 2.5, 16, seed + 79);
  const microRow = noiseRows(width, height, 100, 440, seed + 97);
  const grainRow = noiseRows(width, height, 440, 370, seed + 139);
  const px = Int32Array.from({ length: width }, (_, ix) => Math.min(registered.width - 1, Math.floor((ix + .5) / height / spec.aspect * registered.width)));
  // A stroke's horizontal shape is unchanged throughout its lattice row.
  // Retain doubles so reuse does not change the encoded pattern bytes.
  const columns = new Int32Array(width), horizontal = new Float64Array(width);
  let cachedRow = -1;
  let cells: { center: number; halfWidth: number; phase: number; phaseWeight: number; axis: number[]; spacing: number; vertical: number }[] = [];
  for (let iy = 0; iy < height; iy++) {
    const y = (iy + .5) / height, vy = y * 132, row = Math.floor(vy);
    const py = Math.min(registered.height - 1, Math.floor((1 - y) * registered.height));
    const ribbon = ribbonRow(iy), broad = broadRow(iy), micro = microRow(iy), grainBreak = grainRow(iy);
    if (row !== cachedRow) {
      cachedRow = row; cells = [];
      const shift = random(0, row, seed + 111);
      let lastColumn = -1, alongCenter = 0, alongWidth = 0;
      for (let ix = 0; ix < width; ix++) {
        const x = (ix + .5) / height, vx = x * 26 + shift, column = Math.floor(vx);
        columns[ix] = column;
        if (column !== lastColumn) {
          lastColumn = column;
          const phase = random(column, row, seed + 113);
          cells[column] = { center: .22 + phase * .56, halfWidth: .09 + random(column, row, seed + 127) * .20,
            phase, phaseWeight: smooth(.18, .70, phase), axis: encodeGratingAxis(Math.PI / 2 + (phase - .5) * .10),
            spacing: .88 + phase * .25, vertical: 0 };
          alongCenter = .22 + random(column, row, seed + 131) * .56;
          alongWidth = .08 + random(column, row, seed + 137) * .29;
        }
        horizontal[ix] = Math.exp(-Math.pow((vx - column - alongCenter) / alongWidth, 2) * 2);
      }
    }
    for (const cell of cells) if (cell) cell.vertical = Math.exp(-Math.pow((vy - row - cell.center) / cell.halfWidth, 2) * 2);
    for (let ix = 0; ix < width; ix++) {
      const { vertical, phase, phaseWeight, axis, spacing } = cells[columns[ix]];
      const p = py * registered.width + px[ix], star = registered.data[p] / 255, identity = stars[labels[p]];
      const stroke = vertical * horizontal[ix]
        * (.25 + grainBreak[ix] * .75) * phaseWeight;
      const sheetY = (broad[ix] - .5) * .08 + (phase - .5) * .24 * stroke;
      const amplitude = (.007 + smooth(.40, .83, ribbon[ix]) * .012 + micro[ix] * .002 + stroke * (.055 + phase * .14)) * (1 - star) + star * .86;
      const nx = (broad[ix] - .5) * .012 * (1 - star) + identity.nx * star;
      const ny = sheetY * (1 - star) + identity.ny * star;
      const selected = star > .01 ? identity.axis : axis, period = star > .01 ? identity.spacing : spacing;
      const i = (iy * width + ix) * 4;
      direction[i] = Math.round(selected[0]); direction[i + 1] = Math.round(selected[1]);
      direction[i + 2] = Math.round(clamp((period - .5) / 1.5) * 255); direction[i + 3] = Math.round(clamp(amplitude) * 255);
      relief[i] = Math.round(clamp(nx + .5) * 255); relief[i + 1] = Math.round(clamp(ny + .5) * 255);
      relief[i + 2] = 128; relief[i + 3] = Math.round(clamp(.3 + star * .5) * 255);
    }
  }
  return { width, height, direction, relief };
}
