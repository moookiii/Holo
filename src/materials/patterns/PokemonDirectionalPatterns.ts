import { encodeGratingAxis } from './Orientation.ts';

export type PokemonDirectionalKind = 'e-reader' | 'sheen' | 'water-web' | 'vertical-line' | 'mirage';
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function random(x: number, y: number, seed: number) {
  let h = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth optical sheets and cut-line foil need different manufacturing fields.
 * RG encodes grating axis / facet inclination, B spacing / height, A coverage / grain.
 * Broad inclinations select reflected bands; no color or illumination is baked in.
 */
export function generatePokemonDirectionalField(kind: PokemonDirectionalKind, seed: number, aspect: number, scale: number, height: number) {
  const width = Math.round(height * aspect);
  const direction = new Uint8Array(width * height * 4), relief = new Uint8Array(width * height * 4);
  const sheetPhase = random(0, 0, seed + 701) * TAU;
  for (let iy = 0; iy < height; iy++) for (let ix = 0; ix < width; ix++) {
    const x = (ix + .5) / height, y = (iy + .5) / height;
    const micro = random(Math.floor(x * scale), Math.floor(y * scale), seed + 709);
    let angle: number, nx: number, ny: number, spacing: number, amplitude: number, grain: number;
    if (kind === 'e-reader') {
      // Broad near-planar early reverse sheet: no repeated macro waves or motifs.
      // Shallow continuous curl and fine parallel grain select broad reflections.
      const u = x * .94 + y * .34, v = y * .94 - x * .34;
      angle = .35 + .006 * Math.sin(v * 5 + sheetPhase);
      const slope = (u - .48) * .11 + .018 * Math.sin(v * 4 + sheetPhase);
      nx = slope * .94; ny = slope * .34;
      spacing = 1 + .015 * Math.sin(u * 5 + sheetPhase);
      const stria = Math.cos(u * scale * TAU) * Math.exp(-.5 * Math.pow(scale * TAU / height * .4, 2));
      amplitude = .64 + stria * .018 + (micro - .5) * .012;
      grain = .51 + micro * .07;
    } else if (kind === 'sheen') {
      const u = (x + y) * Math.SQRT1_2, v = (y - x) * Math.SQRT1_2;
      // Continuous inclined diagonal sheet, with almost invisible fine striae.
      const sweep = u * TAU * 2.8 + .16 * Math.sin(v * 8) + sheetPhase;
      const slope = .25 * Math.sin(sweep) + .045 * Math.sin(u * 17 + sheetPhase);
      angle = Math.PI / 4 + .012 * Math.sin(v * 13);
      nx = slope * Math.SQRT1_2; ny = slope * Math.SQRT1_2;
      spacing = .98 + .055 * Math.sin(u * 11);
      const stria = .5 + .5 * Math.cos(u * scale * TAU) * Math.exp(-.5 * Math.pow(scale * TAU / height * .4, 2));
      amplitude = .65 + stria * .11 + (micro - .5) * .025;
      grain = .50 + micro * .13;
    } else if (kind === 'water-web') {
      // The contour derivatives transport the grating into the curved sheet.
      // These are broad wave turns, with no embossed contour-line graphic.
      const a = x * 12 + .7 * Math.sin(y * 11), b = x * 27 - y * 8;
      const flow = y + .067 * Math.sin(a) + .019 * Math.sin(b);
      const dx = .804 * Math.cos(a) + .513 * Math.cos(b);
      const dy = 1 + .5159 * Math.cos(a) * Math.cos(y * 11) - .152 * Math.cos(b);
      const length = Math.hypot(dx, dy);
      const slope = .27 * Math.sin(flow * TAU * 3.6 + sheetPhase);
      angle = Math.atan2(dy, dx);
      nx = dx / length * slope; ny = dy / length * slope;
      spacing = .94 + .085 * Math.sin(flow * 14 + x * 3);
      amplitude = .68 + (micro - .5) * .055;
      grain = .50 + micro * .15;
    } else if (kind === 'vertical-line') {
      // Long unequal vertical cuts, optically segmented down their length.
      // The grating runs vertically too, giving longitudinal spectral travel.
      const columnCoordinate = x * scale + .12 * Math.sin(x * 49);
      const column = Math.floor(columnCoordinate), across = columnCoordinate - column;
      const phase = random(column, 0, seed + 719), aa = scale / height * .55;
      const center = .40 + phase * .20, halfWidth = .08 + phase * .075;
      const cut = 1 - smooth(halfWidth - aa, halfWidth + aa, Math.abs(across - center));
      const lengthwise = y * TAU * 4.8 + sheetPhase + (phase - .5) * .42;
      const slope = Math.sin(lengthwise) * .26;
      angle = Math.PI / 2 + (phase - .5) * .025;
      nx = (phase - .5) * .09;
      ny = slope + (phase - .5) * .055;
      spacing = .96 + (phase - .5) * .055 + .045 * Math.sin(y * 14);
      amplitude = .035 + cut * (.60 + phase * .23);
      grain = .36 + cut * .49;
    } else {
      // Mirage's continuous polished sheet has fine grain, without the
      // persistent separated strands that characterize the older Tinsel.
      const sweep = y * TAU * 2.6 + .28 * Math.sin(y * 19 + sheetPhase) + sheetPhase;
      const slope = .245 * Math.sin(sweep) + .025 * Math.sin(y * 29);
      angle = Math.PI / 2;
      nx = .009 * Math.sin(x * 11 + y * 4); ny = slope;
      spacing = 1 + .037 * Math.sin(y * 23);
      const stria = .5 + .5 * Math.cos(y * scale * TAU) * Math.exp(-.5 * Math.pow(scale * TAU / height * .4, 2));
      amplitude = .77 + stria * .07 + (micro - .5) * .018;
      grain = .53 + micro * .10;
    }
    const i = (iy * width + ix) * 4, axis = encodeGratingAxis(angle);
    direction[i] = Math.round(axis[0]); direction[i + 1] = Math.round(axis[1]);
    direction[i + 2] = Math.round(clamp((spacing - .5) / 1.5) * 255); direction[i + 3] = Math.round(clamp(amplitude) * 255);
    relief[i] = Math.round(clamp(nx + .5) * 255); relief[i + 1] = Math.round(clamp(ny + .5) * 255);
    relief[i + 2] = 128; relief[i + 3] = Math.round(clamp(grain) * 255);
  }
  return { width, height, direction, relief };
}
