import { encodeGratingAxis } from './Orientation.ts';

export type PokemonFacetKind = 'cracked-ice' | 'sequin' | 'confetti' | 'speckle';
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
function random(x: number, y: number, seed: number) {
  let h = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x), iy = Math.floor(y), u = smooth(0, 1, x - ix), v = smooth(0, 1, y - iy);
  const a = random(ix, iy, seed), b = random(ix + 1, iy, seed), c = random(ix, iy + 1, seed), d = random(ix + 1, iy + 1, seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
type Point = [number, number];

/** Fixed manufacturing data in card-height coordinates. Color and illumination
 * are evaluated by the optical material, never stored in these atlases. */
export function generatePokemonFacetField(kind: PokemonFacetKind, seed: number, aspect: number, scale: number, height: number) {
  const width = Math.round(height * aspect);
  const direction = new Uint8Array(width * height * 4), relief = new Uint8Array(width * height * 4);
  const put = (ix: number, iy: number, angle: number, spacing: number, amplitude: number, nx: number, ny: number, grain: number) => {
    const i = (iy * width + ix) * 4, axis = encodeGratingAxis(angle);
    direction[i] = Math.round(axis[0]); direction[i + 1] = Math.round(axis[1]);
    direction[i + 2] = Math.round(clamp((spacing - .5) / 1.5) * 255); direction[i + 3] = Math.round(clamp(amplitude) * 255);
    relief[i] = Math.round(clamp(nx + .5) * 255); relief[i + 1] = Math.round(clamp(ny + .5) * 255);
    relief[i + 2] = 128; relief[i + 3] = Math.round(clamp(grain) * 255);
  };
  if (kind === 'cracked-ice') {
    // A shared irregular mesh of broad acute triangles. Unlike the smaller
    // radial fracture cells, there are no rosette nuclei or polygon outlines.
    const vertex = (x: number, y: number): Point => [
      (x + .5 + (random(x, y, seed + 809) - .5) * .85 + y * .31) / scale,
      (y + .5 + (random(x, y, seed + 811) - .5) * .85) / scale,
    ];
    const triangle = (a: Point, b: Point, c: Point, cell: number, row: number) => {
      const cross = (p: Point, q: Point, r: Point) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
      const area = cross(a, b, c);
      if (Math.abs(area) < 1e-10) return;
      const phase = random(cell, row, seed + 821), normalAngle = random(cell, row, seed + 823) * TAU;
      const angle = phase * Math.PI, slope = .07 + random(cell, row, seed + 827) * .25;
      const nx = Math.cos(normalAngle) * slope, ny = Math.sin(normalAngle) * slope;
      const spacing = .89 + random(cell, row, seed + 829) * .23;
      const left = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]) * height));
      const right = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0]) * height));
      const top = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]) * height));
      const bottom = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1]) * height));
      for (let iy = top; iy <= bottom; iy++) for (let ix = left; ix <= right; ix++) {
        const p: Point = [(ix + .5) / height, (iy + .5) / height];
        if (cross(a, b, p) / area < -1e-9 || cross(b, c, p) / area < -1e-9 || cross(c, a, p) / area < -1e-9) continue;
        const micro = random(Math.floor(p[0] * 920), Math.floor(p[1] * 920), seed + 839);
        put(ix, iy, angle + (micro - .5) * .025, spacing, .52 + phase * .25 + (micro - .5) * .10, nx, ny, .44 + micro * .23);
      }
    };
    for (let y = -2; y <= Math.ceil(scale) + 1; y++) for (let x = -Math.ceil(scale * .31) - 2; x <= Math.ceil(scale * aspect) + 1; x++) {
      const a = vertex(x, y), b = vertex(x + 1, y), c = vertex(x + 1, y + 1), d = vertex(x, y + 1);
      if (random(x, y, seed + 853) > .5) {
        triangle(a, b, c, x * 2, y); triangle(a, c, d, x * 2 + 1, y);
      } else {
        triangle(a, b, d, x * 2, y); triangle(b, c, d, x * 2 + 1, y);
      }
    }
    return { width, height, direction, relief };
  }
  if (kind === 'sequin') {
    for (let iy = 0; iy < height; iy++) for (let ix = 0; ix < width; ix++) put(ix, iy, .7, 1, .016, 0, 0, .34);
    // Scatter independently inside each manufacturing region. Motifs can cross
    // region boundaries, and missing/doubled centers break any visible grid.
    const motif = (px: number, py: number, radius: number, phase: number, variation: number) => {
      const aa = Math.max(scale / height * .55, .015), extent = (radius + aa + .04) / scale;
      const left = Math.max(0, Math.floor((px - extent) * height)), right = Math.min(width - 1, Math.ceil((px + extent) * height));
      const top = Math.max(0, Math.floor((py - extent) * height)), bottom = Math.min(height - 1, Math.ceil((py + extent) * height));
      for (let iy = top; iy <= bottom; iy++) for (let ix = left; ix <= right; ix++) {
        const a = (Math.floor((ix + .5) / height * scale * 18) + .5) / 18 - px * scale;
        const b = (Math.floor((iy + .5) / height * scale * 18) + .5) / 18 - py * scale;
        const shape = variation < .25 ? Math.max(Math.abs(a), Math.abs(b))
          : Math.max(Math.abs(a), Math.abs(b), (Math.abs(a) + Math.abs(b)) * Math.SQRT1_2);
        const outer = 1 - smooth(radius - aa, radius + aa, shape);
        const hole = smooth(radius * .47 - aa, radius * .47 + aa, shape);
        const innerRing = (1 - smooth(radius * .30 - aa, radius * .30 + aa, shape)) * smooth(radius * .13 - aa, radius * .13 + aa, shape);
        const coverage = radius > .18 ? Math.max(outer * hole, innerRing * .60) : outer;
        const amplitude = .016 + coverage * (.69 + variation * .22);
        if (amplitude * 255 <= direction[(iy * width + ix) * 4 + 3]) continue;
        const theta = Math.round(Math.atan2(b, a) / (Math.PI / 4)) * Math.PI / 4;
        const slope = .11 + variation * .17;
        put(ix, iy, theta + phase * .11, .94 + phase * .14, amplitude,
          Math.cos(theta) * slope * coverage, Math.sin(theta) * slope * coverage, .33 + coverage * .47);
      }
    };
    for (let cy = -1; cy <= Math.ceil(scale); cy++) for (let cx = -1; cx <= Math.ceil(scale * aspect); cx++) {
      const phase = random(cx, cy, seed + 857), second = random(cx, cy, seed + 859);
      if (phase < .18) continue;
      motif((cx + random(cx, cy, seed + 887)) / scale, (cy + random(cx, cy, seed + 907)) / scale,
        .09 + Math.pow(second, 1.5) * .34, phase, random(cx, cy, seed + 911));
      if (phase > .61) motif((cx + random(cx, cy, seed + 919)) / scale, (cy + random(cx, cy, seed + 929)) / scale,
        .055 + second * .055, phase, second);
    }
    return { width, height, direction, relief };
  }
  for (let iy = 0; iy < height; iy++) for (let ix = 0; ix < width; ix++) {
    const x = (ix + .5) / height, y = (iy + .5) / height;
    const u = x * scale, v = y * scale, cx = Math.floor(u), cy = Math.floor(v);
    const phase = random(cx, cy, seed + 857), second = random(cx, cy, seed + 859);
    let angle: number, spacing: number, amplitude: number, nx: number, ny: number, grain: number;
    if (kind === 'confetti') {
      // Connected polyomino flakes, broken into small square optical cells.
      // Broad patches share an inclination so groups can light together.
      const patch = noise((cx + .5) * .34, (cy + .5) * .34, seed + 863);
      const selected = patch > .47 + (phase - .5) * .15 ? 1 : 0;
      const sheet = noise(x * 9, y * 9, seed + 877);
      angle = .58 + (phase - .5) * .09;
      spacing = .94 + sheet * .12 + (second - .5) * .02;
      nx = (sheet - .5) * .34 + (phase - .5) * .055;
      ny = (noise(x * 9, y * 9, seed + 881) - .5) * .38 + (second - .5) * .055;
      amplitude = .022 + selected * (.66 + second * .13);
      grain = .31 + selected * (.43 + phase * .06);
    } else {
      // Much finer isolated points than Confetti, with no large shaped motif.
      const a = u - cx - .5 - (phase - .5) * .44, b = v - cy - .5 - (second - .5) * .44;
      const radius = .16 + random(cx, cy, seed + 883) * .19;
      const aa = scale / height * .45;
      const dot = 1 - smooth(radius - aa, radius + aa, Math.hypot(a, b));
      angle = .55 + (phase - .5) * .90;
      spacing = .88 + second * .25;
      nx = (phase - .5) * .42; ny = (second - .5) * .42;
      amplitude = .028 + dot * (.48 + phase * .48);
      grain = .4 + dot * .43;
    }
    put(ix, iy, angle, spacing, amplitude, nx, ny, grain);
  }
  return { width, height, direction, relief };
}
