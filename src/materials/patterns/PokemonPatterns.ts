import { encodeGratingAxis } from './Orientation.ts';

export type PokemonPatternKind = 'fireworks' | 'crosshatch' | 'ace-spec';
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
function random(x: number, y: number, seed: number) {
  let h = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Manufacturing data only: RG axis/slope, B pitch/height, A cut coverage/grain.
 * Coordinates are in card-height units. No baked colors, illumination or time.
 */
export function generatePokemonField(kind: PokemonPatternKind, seed: number, aspect: number, scale: number, height: number) {
  const width = Math.round(height * aspect);
  const direction = new Uint8Array(width * height * 4), relief = new Uint8Array(width * height * 4);
  type Burst = { x: number; y: number; phase: number; rays: number; radius: number; cell: number };
  const centers = new Map<string, Burst>();
  const neighborhoods: Burst[][] = [], columns = Math.ceil(scale * aspect) + 1;
  if (kind === 'fireworks') {
    for (let gy = -1; gy <= Math.ceil(scale); gy++) for (let gx = -1; gx <= Math.ceil(scale * aspect); gx++) {
      const phase = random(gx, gy, seed + 601);
      centers.set(`${gx},${gy}`, { x: gx + .2 + random(gx, gy, seed + 607) * .6,
        y: gy + .2 + random(gx, gy, seed + 613) * .6, phase,
        rays: 38 + Math.floor(phase * 25), radius: .52 + random(gx, gy, seed + 617) * .31, cell: gx + gy * 71 });
    }
    for (let gy = 0; gy <= Math.floor(scale); gy++) for (let gx = 0; gx < columns; gx++) {
      const neighbors: Burst[] = [];
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) neighbors.push(centers.get(`${gx + ox},${gy + oy}`)!);
      neighborhoods[gy * columns + gx] = neighbors;
    }
  }
  for (let iy = 0; iy < height; iy++) for (let ix = 0; ix < width; ix++) {
    const x = (ix + .5) / height, y = (iy + .5) / height;
    let angle = 0, spacing = 1, amplitude = .02, nx = 0, ny = 0, grain = .5;
    if (kind === 'fireworks') {
      const u = x * scale, v = y * scale, gx = Math.floor(u), gy = Math.floor(v), aa = scale / height;
      // Whole neighboring bursts overlap; a cell boundary must never clip a ray.
      for (const c of neighborhoods[gy * columns + gx]) {
        const dx = u - c.x, dy = v - c.y, radius = Math.hypot(dx, dy);
        if (radius > c.radius || radius < .04) continue;
        const theta = Math.atan2(dy, dx);
        // Curved polar rays split into unequal pieces: tiny metal cuts, not a
        // solid star. Each segment has a persistent grating and inclination.
        const polar = ((theta / TAU + c.phase + 2 + radius * .045) % 1) * c.rays;
        const ray = Math.floor(polar), across = (polar - ray - .5) * radius * TAU / c.rays;
        const r = random(ray, c.cell, seed + 631);
        const along = radius * (14 + r * 17) + r * 9, segment = Math.floor(along);
        const chip = random(ray * 53 + segment, c.cell, seed + 641);
        const halfWidth = (.004 + radius * .013) * (.55 + r * .8);
        const stroke = 1 - smooth(halfWidth - aa * .55, halfWidth + aa * .55, Math.abs(across));
        const broken = smooth(.08, .19, along - segment) * (1 - smooth(.50 + chip * .31, .93, along - segment));
        const start = .05 + r * .17, end = c.radius * (.65 + r * .35);
        const envelope = smooth(start, start + .075, radius) * (1 - smooth(end * .77, end, radius));
        const cut = stroke * broken * envelope * (.28 + chip * .72) * (chip > .18 ? 1 : .08);
        if (cut > amplitude) {
          amplitude = cut;
          const sector = (ray + .5) / c.rays * TAU - c.phase * TAU;
          angle = sector + Math.PI / 2;
          spacing = .90 + c.phase * .22 + (chip - .5) * .055;
          const slope = .10 + radius * .22 + (chip - .5) * .21;
          nx = Math.cos(sector) * slope; ny = Math.sin(sector) * slope;
          grain = .48 + chip * .46;
        }
      }
    } else if (kind === 'crosshatch') {
      const u = (x + y) * Math.SQRT1_2, v = (y - x) * Math.SQRT1_2;
      const a = u * scale, b = v * scale, gx = Math.floor(a), gy = Math.floor(b);
      const phase = random(gx, gy, seed + 653), aa = scale / height * .6;
      const lineA = 1 - smooth(.085 - aa, .085 + aa, Math.abs(b - gy - .5));
      const lineB = 1 - smooth(.085 - aa, .085 + aa, Math.abs(a - gx - .5));
      const endA = smooth(.04, .20, a - gx) * (1 - smooth(.72, .96, a - gx));
      const endB = smooth(.04, .20, b - gy) * (1 - smooth(.72, .96, b - gy));
      const cut = Math.max(lineA * endA, lineB * endB);
      // Microcuts share larger sheet inclinations. Bright diagonal groups are
      // selected optically and exchange as the card tilts.
      const slopeA = Math.sin(u * TAU * 13) * .23, slopeB = Math.sin(v * TAU * 13) * .23;
      nx = (slopeA - slopeB) * Math.SQRT1_2 + (phase - .5) * .024;
      ny = (slopeA + slopeB) * Math.SQRT1_2;
      angle = Math.PI / 4;
      spacing = .98 + Math.sin(u * 29) * .075 + Math.sin(v * 19) * .05;
      amplitude = .016 + cut * (.25 + phase * .51) * (phase > .12 ? 1 : .16); grain = .42 + cut * .48;
    } else {
      // Modern S&V ACE SPEC: large soft diamond bands over horizontal fine
      // striations. Magenta belongs to the printed card, not the diffraction.
      const u = (x + y) * Math.SQRT1_2, v = (y - x) * Math.SQRT1_2;
      const a = u * 6.2, b = v * 6.2;
      const localA = a - Math.floor(a) - .5, localB = b - Math.floor(b) - .5;
      // A common grating inclination follows distance to the crossed bands.
      // Its level sets are continuous diamonds. Assigning separate pyramid
      // normals to their sides produced false triangular/square tile seams.
      const bandDistance = Math.min(Math.abs(localA), Math.abs(localB));
      const bandSlope = (bandDistance - .22) * 1.3;
      const row = Math.floor(y * scale), col = Math.floor(x * scale * .72);
      const phase = random(col, row, seed + 659), aa = scale / height * .55;
      const strand = 1 - smooth(.16 - aa, .16 + aa, Math.abs(y * scale - row - .5));
      const along = x * scale * .72 - col;
      const dash = strand * smooth(.02, .12, along) * (1 - smooth(.82, .98, along));
      nx = bandSlope * .32;
      ny = bandSlope + (phase - .5) * .018;
      angle = Math.PI / 2;
      spacing = .96 + .045 * Math.sin((x + y) * 17) + (phase - .5) * .025;
      amplitude = .10 + dash * (.61 + phase * .18); grain = .40 + dash * .51;
    }
    const i = (iy * width + ix) * 4, axis = encodeGratingAxis(angle);
    direction[i] = Math.round(axis[0]); direction[i + 1] = Math.round(axis[1]);
    direction[i + 2] = Math.round(clamp((spacing - .5) / 1.5) * 255);
    direction[i + 3] = Math.round(clamp(amplitude) * 255);
    relief[i] = Math.round(clamp(nx + .5) * 255); relief[i + 1] = Math.round(clamp(ny + .5) * 255);
    relief[i + 2] = 128; relief[i + 3] = Math.round(clamp(grain) * 255);
  }
  return { width, height, direction, relief };
}
