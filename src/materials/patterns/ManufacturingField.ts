import { encodeGratingAxis } from './Orientation';
import { generatePokemonField, type PokemonPatternKind } from './PokemonPatterns';
import { DEFAULT_FOIL_LAYOUT, type CardLayout } from '../../card/CardDefinition';

export type PatternKind = PokemonPatternKind | 'silk' | 'crystal' | 'diamond' | 'starfield' | 'galaxy-star' | 'cosmos' | 'cosmos-hd' | 'tinsel' | 'contour' | 'liquid' | 'fresnel' | 'plain' | 'satin' | 'secret' | 'prismatic-secret' | 'platinum-secret' | 'quarter-century' | 'opal' | 'cathedral' | 'lattice' | 'chrome' | 'ultimate' | 'varnish' | 'starlight' | 'collector' | 'collector-prismatic' | 'mtg-halo' | 'mtg-surge' | 'mtg-fracture';
export interface PatternSpec { kind: PatternKind; seed: number; aspect: number; scale: number; layout?: CardLayout; }
export interface FieldData { width: number; height: number; direction: Uint8Array; relief: Uint8Array; }
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
function random(x: number, y: number, seed: number) {
  let h = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function smoothNoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x), iy = Math.floor(y), u = smooth(0, 1, x - ix), v = smooth(0, 1, y - iy);
  const a = random(ix, iy, seed), b = random(ix + 1, iy, seed), c = random(ix, iy + 1, seed), d = random(ix + 1, iy + 1, seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

/** Encodes manufacturing geometry only. Neither texture contains spectral colors or lighting. */
export function generateField(spec: PatternSpec, height = ['fireworks', 'crosshatch', 'ace-spec', 'diamond', 'fresnel', 'cathedral', 'lattice', 'chrome', 'ultimate', 'varnish', 'starlight', 'galaxy-star', 'tinsel', 'satin', 'collector', 'collector-prismatic', 'platinum-secret', 'quarter-century', 'mtg-halo', 'mtg-surge', 'mtg-fracture'].includes(spec.kind) ? 2048 : 1024): FieldData {
  if (spec.kind === 'fireworks' || spec.kind === 'crosshatch' || spec.kind === 'ace-spec') return generatePokemonField(spec.kind, spec.seed, spec.aspect, spec.scale, height);
  const width = Math.round(height * spec.aspect);
  const direction = new Uint8Array(width * height * 4), relief = new Uint8Array(width * height * 4);
  const seed = spec.seed;
  for (let iy = 0; iy < height; iy++) for (let ix = 0; ix < width; ix++) {
    let x = (ix + .5) / height, y = (iy + .5) / height;
    // The original Cosmos foil has small square optical elements inside each larger
    // symbol; smooth solid discs belong to the later HD sheet, a separate family.
    const pixelScale = 520, pixelX = Math.floor(x * pixelScale), pixelY = Math.floor(y * pixelScale);
    if (spec.kind === 'cosmos') { x = (pixelX + .5) / pixelScale; y = (pixelY + .5) / pixelScale; }
    let angle = 0, spacing = 1, amplitude = 1, nx = 0, ny = 0, depth = .5, grain = .5;
    if (spec.kind === 'mtg-halo') {
      // Curved, interrupted guilloche filaments. The local grating and its
      // inclination follow the same contour; illumination selects the strands.
      const a=x*13+Math.sin(y*7)*.75, b=y*16-Math.sin(x*8)*.65, c=x*29+y*11;
      const flow=Math.sin(a)+Math.cos(b)*.72+Math.sin(c)*.16;
      const dx=13*Math.cos(a)+3.744*Math.sin(b)*Math.cos(x*8)+4.64*Math.cos(c);
      const dy=5.25*Math.cos(a)*Math.cos(y*7)-11.52*Math.sin(b)+1.76*Math.cos(c);
      const gradient=Math.max(Math.hypot(dx,dy),.01), phase=flow*spec.scale;
      const variance=Math.pow(gradient*spec.scale/height*.40,2);
      const ridge=.3125+.46875*Math.cos(phase)*Math.exp(-.5*variance)
        +.1875*Math.cos(phase*2)*Math.exp(-2*variance)+.03125*Math.cos(phase*3)*Math.exp(-4.5*variance);
      const interrupted=smooth(.38,.73,smoothNoise(x*142,y*142,seed+503));
      const sheet=Math.sin(flow*2.3+y*4);
      const slope=Math.sin(phase)*.025+sheet*.22;
      angle=Math.atan2(dy,dx); spacing=.96+sheet*.10;
      amplitude=.012+ridge*(.045+interrupted*.68);
      nx=dx/gradient*slope; ny=dy/gradient*slope;
      depth=.5+ridge*.008; grain=.3+ridge*.55;
    } else if (spec.kind === 'mtg-surge') {
      // Unequal crests share a broad inclination, while narrow ragged edges
      // break the reflection into foil flecks rather than a smooth water normal.
      const a=x*37+y*10,b=x*83-y*23,c=x*149+y*29;
      const flow=y+x*.26+.008*Math.sin(a)+.003*Math.sin(b)+.0015*Math.sin(c);
      const dx=.26+.296*Math.cos(a)+.249*Math.cos(b)+.2235*Math.cos(c);
      const dy=1+.08*Math.cos(a)-.069*Math.cos(b)+.0435*Math.cos(c);
      const gradient=Math.max(Math.hypot(dx,dy),.01), phase=flow*TAU*7.5;
      const chip=smoothNoise(x*spec.scale,y*spec.scale*1.4,seed+509);
      const crest=smooth(.29,.74,.5+.5*Math.sin(flow*TAU*16+Math.sin(x*31)*.6));
      const slope=Math.sin(phase)*.29+(chip-.5)*.13;
      angle=Math.PI/2+dx*.14+(chip-.5)*.1; spacing=.98+.075*Math.sin(flow*22+x*6);
      amplitude=.04+crest*(.18+chip*.72);
      nx=dx/gradient*slope*.3; ny=dy/gradient*slope;
      depth=.5; grain=.40+chip*.45;
    } else if (spec.kind === 'mtg-fracture') {
      // Irregular polygon cells split into triangular slivers around off-centre
      // nuclei. Each sliver has a fixed facet normal and grating, unlike the
      // broad smooth crystal original. Narrow bevels remain silver at transitions.
      const scale=spec.scale, u=x*scale,v=y*scale,cx=Math.floor(u),cy=Math.floor(v);
      let nearest=100,second=100,cellX=0,cellY=0,lx=0,ly=0;
      for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++) {
        const tx=cx+i,ty=cy+j,dx=u-tx-.12-random(tx,ty,seed+521)*.76,dy=v-ty-.12-random(tx,ty,seed+523)*.76;
        const d=dx*dx+dy*dy;
        if(d<nearest){second=nearest;nearest=d;cellX=tx;cellY=ty;lx=dx;ly=dy;}else if(d<second)second=d;
      }
      const phase=random(cellX,cellY,seed+527), sectors=3+Math.floor(phase*3);
      const theta=Math.atan2(ly,lx)+Math.PI;
      const segment=Math.floor((theta/TAU+phase)*sectors);
      const facet=random(cellX*7+segment,cellY,seed+541);
      const boundary=Math.sqrt(second)-Math.sqrt(nearest), bevel=smooth(0,scale/height*1.3,boundary);
      angle=facet*TAU; spacing=.76+random(cellX,cellY*7+segment,seed+547)*.46;
      const normalAngle=random(cellX*7+segment,cellY,seed+557)*TAU;
      const slope=.09+random(cellX,cellY*7+segment,seed+563)*.31;
      nx=Math.cos(normalAngle)*slope*bevel; ny=Math.sin(normalAngle)*slope*bevel;
      amplitude=.15+bevel*(.32+facet*.43);
      depth=.5; grain=.52+facet*.32;
    } else if (spec.kind === 'collector' || spec.kind === 'collector-prismatic') {
      const prismatic = spec.kind === 'collector-prismatic', layout = spec.layout ?? DEFAULT_FOIL_LAYOUT;
      const px = x / spec.aspect, py = 1-y;
      const inside = (r: number[]) => px >= r[0] && py >= r[1] && px <= r[2] && py <= r[3];
      const art = inside(layout.artwork), frame = inside(layout.innerFrame);
      // Engraved whorls vary in orientation across the sheet. Their relief and
      // grating direction share a derivative, rather than an unrelated noise normal.
      const flow = Math.sin(x*87+y*43) + .7*Math.sin(y*97-x*36) + .13*Math.sin(x*151+y*123);
      const dx = 87*Math.cos(x*87+y*43) - 25.2*Math.cos(y*97-x*36) + 19.63*Math.cos(x*151+y*123);
      const dy = 43*Math.cos(x*87+y*43) + 67.9*Math.cos(y*97-x*36) + 15.99*Math.cos(x*151+y*123);
      const gradient = Math.max(Math.hypot(dx,dy),.001), frequency = spec.scale * (prismatic ? .13 : .11);
      const phase = flow * frequency, variance = Math.pow(gradient*frequency/height*.4,2);
      // Exact first three harmonics of a rounded ridge, filtered over a texel.
      const ridge = .3125 + .46875*Math.cos(phase)*Math.exp(-.5*variance)
        + .1875*Math.cos(phase*2)*Math.exp(-2*variance) + .03125*Math.cos(phase*3)*Math.exp(-4.5*variance);
      angle = Math.atan2(dy,dx);
      spacing = .91 + .10*Math.sin(x*8-y*5);
      amplitude = .10 + ridge*.13;
      const slope = -Math.sin(phase)*.13*Math.exp(-.5*variance);
      nx = slope*dx/gradient; ny = slope*dy/gradient;
      depth = .49 + ridge*.018; grain = .45+ridge*.22;
      if (!frame) {
        // Small engraved facets form the black border's dazzle, independent of
        // the artwork contours and the much finer colored-frame pixel flashes.
        const u=x*105,v=y*105,cx=Math.floor(u),cy=Math.floor(v);
        let nearest=10, cellX=cx,cellY=cy,localX=0,localY=0;
        for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++) {
          const tx=cx+i,ty=cy+j,dx=u-tx-.15-random(tx,ty,seed+397)*.7,dy=v-ty-.15-random(tx,ty,seed+399)*.7;
          const d=dx*dx+dy*dy;
          if(d<nearest){nearest=d;cellX=tx;cellY=ty;localX=dx;localY=dy;}
        }
        const r=random(cellX,cellY,seed+401),a=r*TAU;
        const line = .5+.5*Math.cos((localX*Math.cos(a)+localY*Math.sin(a))*25)*Math.exp(-.5*Math.pow(105*25/height*.4,2));
        angle = a; spacing = .84+r*.28; amplitude = .06+line*.33;
        nx = (r-.5)*.18; ny = (random(cellX,cellY,seed+409)-.5)*.18;
        depth = .49+line*.025; grain = .45+line*.35;
      } else if (prismatic && !art) {
        const scale = spec.scale*1.7, u=x*scale, v=y*scale, cx=Math.floor(u), cy=Math.floor(v);
        const a=u-cx,b=v-cy, r=random(cx,cy,seed+419), aa=scale/height*.55;
        const block = smooth(0,aa,a)*(1-smooth(1-aa,1,a))*smooth(0,aa,b)*(1-smooth(1-aa,1,b));
        const cluster = smooth(.40,.69,smoothNoise(x*37,y*37,seed+421));
        const selected = r < .48 ? 1 : 0;
        angle = .12+Math.sin(x*9+y*11)*.14;
        spacing = .93+.12*Math.sin(x*11-y*8)+(r-.5)*.035;
        amplitude = .004+block*cluster*selected*.48;
        nx = (smoothNoise(x*11,y*11,seed+431)-.5)*.17;
        ny = (smoothNoise(x*11,y*11,seed+433)-.5)*.17;
        depth = .5; grain = .8;
      }
    } else if (spec.kind === 'tinsel') {
      // Thin, unequal horizontal strands: most catch neutral silver, with longer
      // broken segments that flash spectrally. Coarse solid bands are not inked
      // into the sheet; groups emerge from their correlated facet inclinations.
      const v = y * spec.scale + .18 * Math.sin(y * 55), row = Math.floor(v), b = v - row;
      const phase = random(0, row, seed + 307), center = .36 + phase * .28;
      const halfWidth = .045 + random(0, row, seed + 311) * .055, aa = spec.scale / height * .55;
      const strand = 1 - smooth(halfWidth - aa, halfWidth + aa, Math.abs(b - center));
      const along = x * 4.1 + random(0, row, seed + 313), segment = Math.floor(along), s = along - segment;
      const phaseX = random(segment, row, seed + 317);
      const flash = smooth(.025, .13, s) * (1 - smooth(.44 + phaseX * .3, .93, s));
      const fiber = Math.pow(.5 + .5 * Math.cos(y * 740 * TAU + phase * 9), 7);
      const sheet = smoothNoise(x * 3, y * 12, seed + 331);
      angle = Math.PI / 2 + (phaseX - .5) * .016;
      spacing = .91 + sheet * .11 + (phase - .5) * .045;
      amplitude = .008 + strand * (.11 + flash * (.42 + phaseX * .37)) + fiber * .008;
      nx = (sheet - .5) * .025;
      ny = (phase - .5) * .22 + (sheet - .5) * .15 + (phaseX - .5) * .028;
      depth = .5; grain = .2 + strand * .65;
    } else if (spec.kind === 'ultimate') {
      // Fine pressed contours provide the local foil normal. The card's authored
      // height/normal maps supply the subject, symbols and larger emboss shapes.
      const flow = x + .028 * Math.sin(y * 19) + .015 * Math.sin(x * 25 + y * 11);
      const phase = flow * spec.scale * TAU + Math.sin(y * 120) * 1.6;
      const ridge = Math.pow(.5 + .5 * Math.cos(phase), 3);
      const slope = -Math.sin(phase) * .23;
      const dy = .532 * Math.cos(y * 19) + .165 * Math.cos(x * 25 + y * 11);
      const stipple = random(Math.floor(x * 650), Math.floor(y * 650), seed + 59);
      angle = Math.atan2(dy, 1 + .375 * Math.cos(x * 25 + y * 11));
      spacing = .9 + .16 * Math.sin(x * 13 + y * 9);
      amplitude = .32 + ridge * .54;
      nx = slope; ny = slope * dy;
      depth = .43 + ridge * .16 + stipple * .025; grain = .42 + ridge * .5;
    } else if (spec.kind === 'varnish') {
      // Modern fine prism facets beneath a separately raised clear varnish layer.
      const u = (x + .003 * Math.sin(y * 73)) * spec.scale, v = (y + .004 * Math.sin(x * 91)) * spec.scale;
      const gx = Math.floor(u), gy = Math.floor(v);
      const phase = random(gx, gy, seed + 61);
      const a = u - gx - .5 - (phase - .5) * .35, b = v - gy - .5 - (random(gx, gy, seed + 67) - .5) * .35;
      const dome = Math.max(0, 1 - (a * a + b * b) * 3.3);
      angle = .15 + .13 * Math.sin(x * 8 + y * 6);
      spacing = .9 + .17 * Math.sin(x * 9 - y * 7) + (phase - .5) * .04;
      amplitude = .65 + dome * .12; depth = .46 + dome * .035;
      nx = -a * .17; ny = -b * .17; grain = .55 + phase * .3;
    } else if (spec.kind === 'starlight' || spec.kind === 'quarter-century') {
      const anniversary = spec.kind === 'quarter-century';
      // Dense orthogonal cuts: both grating axes coexist, so store the same pair
      // throughout the sheet. Alternating 0/90 degree axes cancel in filtered mipmaps.
      const u = x * spec.scale, v = y * spec.scale;
      const gx = Math.floor(u), gy = Math.floor(v), a = u - gx, b = v - gy;
      const phase = random(gx, gy, seed + 83);
      const center = .5 + (phase - .5) * .15;
      const h = (1 - smooth(.04, .12, Math.abs(b - center))) * smooth(.015, .1, a) * (1 - smooth(.81, .99, a));
      const w = .03 + phase * .03;
      const vertical = (1 - smooth(w, w + .055, Math.abs(a - center))) * smooth(.05, .18, b) * (1 - smooth(.71, .94, b));
      const cut = Math.max(h * (anniversary ? .82 : 1), vertical * (anniversary ? .92 : .65));
      const fracture = .3 + .7 * random(Math.floor(u * 5), Math.floor(v * 3), seed + 139);
      // Broad sheet inclinations under the tiny cuts. The moving grid response
      // is selected by light/view angle in AngularGridLayer, not fixed bright
      // stripes stored in the atlas's amplitude channel.
      const sheetX = x * 7.4 + .06 * Math.sin(y * 8), sheetY = y * 6.4 + .045 * Math.sin(x * 11);
      const bx = Math.floor(sheetX), by = Math.floor(sheetY);
      const dx = sheetX - bx - .5, dy = sheetY - by - .5;
      const bandX = Math.exp(-Math.pow(dx / .10, 2)), bandY = Math.exp(-Math.pow(dy / .075, 2));
      const sheet = Math.sin(y * 29 + Math.sin(x * 12) * .7);
      angle = .016 * Math.sin(x * 15 + y * 4);
      spacing = .96 + sheet * .14 + .10 * Math.sin(x * 33) + (phase - .5) * .06;
      amplitude = .015 + cut * fracture * (anniversary ? .73 : .64);
      nx = (random(gx, gy, seed + 173) - .5) * .20 * cut + bandX * (random(bx, 0, seed + 181) - .5) * .22;
      ny = (random(gx, gy, seed + 179) - .5) * .20 * cut + bandY * (random(0, by, seed + 191) - .5) * .22;
      depth = .49 + cut * .035; grain = .7 + phase * .25;
    } else if (spec.kind === 'cathedral') {
      const a = x - spec.aspect * .5, b = y - .5, radius = Math.hypot(a, b), theta = Math.atan2(b, a);
      const sector = Math.floor((theta + Math.PI) / (Math.PI / 4));
      const local = (theta + Math.PI) / (Math.PI / 4) - sector - .5;
      const phase = theta * spec.scale + radius * 70;
      const resolved = 1 - smooth(.8, 2.4, spec.scale / Math.max(1, radius * height));
      const rays = .36 * (1 - resolved) + Math.pow(.5 + .5 * Math.cos(phase), 5) * resolved;
      const archRadius = .19 + .12 * (1 - Math.pow(Math.abs(local * 2), .7));
      const arch = Math.exp(-Math.pow((radius - archRadius) / .003, 2));
      const innerArch = Math.exp(-Math.pow((radius - archRadius * .76) / .002, 2));
      const ribs = Math.exp(-Math.pow((Math.abs(local) - .5) / .018, 2));
      angle = theta + .08 * Math.sin(radius * 28) + (random(sector, 0, seed) - .5) * .22;
      spacing = .78 + random(sector, 0, seed + 11) * .3 + radius * .12;
      amplitude = .22 + rays * .48 + arch * .5 + innerArch * .25 + ribs * .2;
      depth = .48 + rays * .035 + arch * .12 + innerArch * .06 + ribs * .07;
      nx = Math.cos(theta) * arch * .055; ny = Math.sin(theta) * arch * .055;
      grain = .38 + rays * .6;
    } else if (spec.kind === 'lattice') {
      const u = (x + y) * Math.SQRT1_2, v = (y - x) * Math.SQRT1_2;
      const a = Math.cos(u * spec.scale * TAU), b = Math.cos(v * spec.scale * TAU);
      const lineA = Math.pow(.5 + .5 * a, 9), lineB = Math.pow(.5 + .5 * b, 9);
      let node = 0;
      for (const [cx, cy] of [[.17, .23], [.5, .35], [.28, .69], [.57, .8], [.11, .88]]) {
        const dx = (x - cx * spec.aspect / .716), dy = y - cy;
        node = Math.max(node, Math.exp(-Math.pow((Math.abs(dx + dy) + Math.abs(dx - dy)) / .009, 2)));
      }
      angle = Math.PI / 4 + .1 * Math.sin(u * 8) * Math.cos(v * 5);
      spacing = .95 + .17 * Math.sin(u * 14) + .08 * Math.cos(v * 19);
      amplitude = .12 + Math.max(lineA, lineB) * .62 + node * .7;
      depth = .49 + (lineA + lineB) * .025 + node * .09;
      nx = Math.sin(u * 12) * .025; ny = Math.cos(v * 11) * .025;
      grain = .3 + Math.max(lineA, lineB) * .55 + node * .15;
    } else if (spec.kind === 'chrome') {
      const flow = x + .026 * Math.sin(y * 8) + .01 * Math.sin(y * 19 + x * 5);
      const lines = Math.pow(.5 + .5 * Math.cos(flow * spec.scale * TAU), 14);
      angle = -.55 + Math.sin(x * 7 + y * 4) * 1.15 + .3 * Math.cos(y * 9);
      spacing = .97 + .22 * Math.sin(y * 9 - x * 4);
      amplitude = .075 + lines * .9;
      depth = .49 + lines * .025; grain = .2 + lines * .75;
      nx = .018 * Math.sin(y * 11); ny = .016 * Math.cos(x * 14);
    } else if (spec.kind === 'opal') {
      // Broad nacre domains with a much smaller, gently inclined crystalline layer.
      // No spectral color is stored: film thickness and the live BRDF create it.
      const u = x + .12 * Math.sin(y * 8 + Math.sin(x * 11));
      const v = y + .06 * Math.sin(x * 13 - y * 4);
      const domains = smoothNoise(u * spec.scale, v * spec.scale, seed + 107);
      const layers = smoothNoise(u * spec.scale * 2.3, v * spec.scale * 2.3, seed + 211);
      const crystal = smoothNoise(x * 175, y * 175, seed + 307);
      depth = .13 + domains * .66 + layers * .2;
      nx = (smoothNoise(x * 95, y * 95, seed + 401) - .5) * .11;
      ny = (smoothNoise(x * 95, y * 95, seed + 409) - .5) * .11;
      angle = (domains - .5) * Math.PI;
      spacing = .9 + layers * .12; amplitude = .65 + domains * .3; grain = .35 + crystal * .45;
    } else if (spec.kind === 'liquid') {
      const phase = random(0, 0, seed) * TAU;
      const u = x + .055 * Math.sin(y * 12 + phase), v = y + .07 * Math.sin(x * 9 - phase);
      const a = u * spec.scale + Math.sin(v * 9) * 1.6, b = v * spec.scale * .73 - Math.cos(u * 13) * 1.4;
      const dx = Math.cos(a) * 1.2 + Math.sin(b) * .55, dy = Math.cos(b) - Math.sin(a) * .65;
      angle = Math.atan2(dy, dx);
      const pool = .5 + Math.sin(a * .52 + b * .28) * .5;
      spacing = .74 + pool * .48;
      depth = .48 + .12 * Math.sin(a + b * .6);
      nx = Math.cos(a + b * .6) * .07; ny = Math.sin(b - a * .4) * .07;
      amplitude = .58 + smooth(.35, 1.3, Math.hypot(dx, dy)) * .32;
      grain = .65 + .07 * Math.cos((u + v * .35) * 650);
    } else if (spec.kind === 'silk') {
      const slow = true;
      const flow = y + Math.sin(x * 9 + Math.sin(y * 5)) * .045 + Math.sin(y * 11 - x * 4) * .018;
      angle = (slow ? .6 : 1.2) + Math.sin(flow * (slow ? 9 : 16) + x * 3) * (slow ? .6 : 2.1) + Math.cos(x * 13 - y * 6) * .28;
      spacing = .88 + Math.sin(flow * 10) * .10;
      depth = .5 + .2 * Math.sin(flow * (slow ? 380 : 210));
      nx = Math.sin(flow * 21) * .05; ny = Math.cos(flow * 17 + x * 7) * .1;
      grain = .52 + .13 * Math.cos(flow * 580);
      amplitude = slow ? .65 : .8;
    } else if (spec.kind === 'crystal') {
      const sx = (x + y * .23) * spec.scale * 1.4, sy = (y - x * .12) * spec.scale * .65;
      const cx = Math.floor(sx), cy = Math.floor(sy);
      let first = 1e6, second = 1e6, cellX = 0, cellY = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const px = cx + dx, py = cy + dy;
        const ox = sx - px - random(px, py, seed), oy = sy - py - random(px, py, seed + 67);
        const distance = ox * ox + oy * oy;
        if (distance < first) { second = first; first = distance; cellX = px; cellY = py; } else if (distance < second) second = distance;
      }
      const phase = random(cellX, cellY, seed + 31);
      angle = phase * TAU;
      spacing = .7 + random(cellX, cellY, seed + 127) * .6;
      nx = (random(cellX, cellY, seed + 201) - .5) * .62;
      ny = (random(cellX, cellY, seed + 413) - .5) * .62;
      const edge = smooth(0, .025, second - first);
      depth = .4 + edge * .16; grain = .75;
      amplitude = .4 + phase * .55;
    } else if (spec.kind === 'diamond') {
      const u = (x + y) * spec.scale, v = (y - x) * spec.scale;
      const gx = Math.floor(u), gy = Math.floor(v), a = u - gx - .5, b = v - gy - .5;
      const facet = Math.abs(a) > Math.abs(b);
      const orient = ((gx + gy) % 2 + 2) % 2;
      // The shader evaluates both crossed gratings in every pyramid. Encoding the
      // same pair twice with opposite axes would cancel under texture filtering.
      angle = Math.PI / 4;
      nx = facet ? Math.sign(a) * .18 : Math.sign(b) * -.18;
      ny = facet ? Math.sign(a) * .18 : Math.sign(b) * .18;
      spacing = .96 + orient * .025 + Math.sin(x * 12 + y * 7) * .035;
      const edge = Math.min(.5 - Math.abs(a), .5 - Math.abs(b));
      depth = .38 + Math.max(0, edge) * .6;
      amplitude = .62 + random(gx, gy, seed) * .38;
      grain = .75;
    } else if (spec.kind === 'galaxy-star') {
      // Early Pokémon sheet: sparse unequal four/eight-point stars, coherent
      // facets in each motif, and pinpoints over a quieter continuous foil.
      const sx = x * spec.scale, sy = y * spec.scale;
      const gx = Math.floor(sx), gy = Math.floor(sy);
      const a = sx - gx - (.3 + random(gx, gy, seed) * .4);
      const b = sy - gy - (.3 + random(gx, gy, seed + 5) * .4);
      const r = random(gx, gy, seed + 17), large = r > .67;
      const radius = large ? .12 + (r - .67) * .34 : .013 + r * .023;
      const cross = (aa: number, bb: number, size: number) => Math.pow(Math.abs(aa) / size, .37) + Math.pow(Math.abs(bb) / size, .37);
      const shapeDistance = large ? Math.min(cross(a, b * .70, radius), cross((a + b) * Math.SQRT1_2, (b - a) * Math.SQRT1_2, radius * .52), Math.hypot(a, b) / (radius * .10)) : Math.hypot(a, b) / radius;
      const edge = spec.scale / height / radius * .9;
      const star = 1 - smooth(1 - edge, 1 + edge, shapeDistance);
      const orientation = random(gx, gy, seed + 35) * Math.PI;
      const my = y * 530 + .65 * Math.sin(x * 21 + Math.sin(y * 9)), row = Math.floor(my);
      const mx = x * 135 + random(0, row, seed + 97), column = Math.floor(mx);
      const microPhase = random(column, row, seed + 71);
      const stroke = (1 - smooth(.035, .16, Math.abs(my - row - (.35 + microPhase * .3))))
        * smooth(.02, .2, mx - column) * (1 - smooth(.48 + microPhase * .3, .99, mx - column));
      angle = star > .01 ? orientation + Math.sin(Math.atan2(b, a) * 4) * .08 : -.3 + Math.sin(x * 8 + y * 5) * .45 + (microPhase - .5) * .08;
      spacing = star > .01 ? .84 + r * .42 : .92 + Math.sin(x * 12 - y * 17) * .15 + (microPhase - .5) * .06;
      amplitude = .003 + stroke * .028 * smooth(.35, .8, microPhase) + star * (.64 + r * .25);
      nx = (random(gx, gy, seed + 41) - .5) * .65 * star;
      ny = (random(gx, gy, seed + 43) - .5) * .65 * star;
      depth = .5; grain = .25 + star * .65;
    } else if (spec.kind === 'starfield') {
      const scale = spec.scale, sx = x * scale, sy = y * scale;
      const gx = Math.floor(sx), gy = Math.floor(sy);
      const a = sx - gx - (.25 + random(gx, gy, seed) * .5);
      const b = sy - gy - (.25 + random(gx, gy, seed + 5) * .5);
      const r = random(gx, gy, seed + 17);
      const size = .025 + Math.pow(r, 14) * .25;
      const ellipse = Math.hypot(a / (size * 1.8), b / (size * 1.8));
      const star = Math.min(Math.hypot(a / (size * 3.4), b / (size * .28)), Math.hypot(b / (size * 3.4), a / (size * .28)));
      const shape = 1 - smooth(.45, 1, Math.min(ellipse, r > .90 ? star : 2));
      angle = random(gx, gy, seed + 35) * TAU;
      spacing = .8 + r * .8;
      amplitude = shape;
      nx = (random(gx, gy, seed + 41) - .5) * .6 * shape;
      ny = (random(gx, gy, seed + 43) - .5) * .6 * shape;
      depth = .45 + shape * .12; grain = .45 + shape * .5;
    } else if (spec.kind === 'cosmos' || spec.kind === 'cosmos-hd') {
      const classic = spec.kind === 'cosmos';
      amplitude = 0; grain = .7;
      for (const layer of (classic ? [0, 1] : [0])) {
      const scale = spec.scale * (layer ? 2.8 : 1), layerSeed = seed + layer * 101;
      const sx = x * scale, sy = y * scale, cx = Math.floor(sx), cy = Math.floor(sy);
      // Neighbor evaluation keeps circles and rosettes whole when they cross a manufacturing cell.
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const gx = cx + ox, gy = cy + oy;
        const a = sx - gx - random(gx, gy, layerSeed), b = sy - gy - random(gx, gy, layerSeed + 5);
        const r = random(gx, gy, layerSeed + 11), radial = Math.hypot(a, b), theta = Math.atan2(b, a);
        const size = layer ? .035 + r * .09 : .012 + Math.pow(r, 9) * .48;
        const ring = classic && !layer && r > .975;
        const rosette = classic && r > .78 && r < .91;
        const radius = size * (rosette ? .82 + .18 * Math.cos(theta * 8) : 1);
        const shape = ring ? 1 - smooth(.01, .035, Math.abs(radial - radius * .74)) : 1 - smooth(radius * .65, radius, radial);
        if (shape > amplitude) {
          amplitude = shape; angle = random(gx, gy, layerSeed + 21) * Math.PI + (ring ? theta * .12 : 0);
          spacing = .75 + random(gx, gy, layerSeed + 31) * .8;
          nx = (random(gx, gy, layerSeed + 41) - .5) * .7 * shape;
          ny = (random(gx, gy, layerSeed + 43) - .5) * .7 * shape;
          depth = .5 + shape * .08;
        }
      }
      }
      const a = x - spec.aspect * .24, b = y - .65;
      const radial = Math.hypot(a, b), theta = (Math.atan2(b, a) + TAU) % TAU;
      let spiralDistance = 1;
      for (let winding = 0; winding < 2; winding++) spiralDistance = Math.min(spiralDistance, Math.abs(radial - (.002 + .0032 * (theta + winding * TAU))));
      const spiral = (1 - smooth(.0004, .0017, spiralDistance)) * (1 - smooth(.035, .04, radial)) * (classic ? smooth(-.5, .6, Math.cos(theta * 29 + radial * 830)) : 1);
      if (spiral > amplitude) {
        amplitude = spiral; angle = theta + .35; spacing = .92 + radial * 3;
        nx = Math.cos(theta) * spiral * .08; ny = Math.sin(theta) * spiral * .08; depth = .5 + spiral * .07;
      }
      if (classic) {
      const pixelPhase = random(pixelX, pixelY, seed + 710);
      angle += (pixelPhase - .5) * .8;
      spacing *= .88 + random(pixelX, pixelY, seed + 713) * .24;
      amplitude *= .35 + pixelPhase * .65;
      nx += (random(pixelX, pixelY, seed + 719) - .5) * .32 * amplitude;
      ny += (random(pixelX, pixelY, seed + 727) - .5) * .32 * amplitude;
      }
    } else if (spec.kind === 'satin') {
      // Continuous foil with fine, irregular surface grain. Adjacent grains keep
      // the same grating family; color comes from light/view rather than pixels.
      const u=x*spec.scale,v=y*spec.scale;
      const a=smoothNoise(u,v,seed+449),b=smoothNoise(u+31.7,v-18.2,seed+457);
      angle=(a-.5)*.045;
      spacing=.98+(b-.5)*.055;
      amplitude=.68+a*.22;
      nx=(a-.5)*.045; ny=(b-.5)*.045;
      depth=.5; grain=.45+a*.5;
    } else if (spec.kind === 'plain') {
      // A continuous grating without invented visible emblems or a coarse facet grid.
      angle = Math.sin(y * 3.8 + x * 2.1) * .018;
      spacing = .96 + Math.sin(x * 11 + y * 7) * .018;
      amplitude = .72; grain = .8;
    } else if (spec.kind === 'platinum-secret') {
      // RA02's dense chains of clipped diamonds share diagonal optical bands.
      // Cuts, inclinations and white metal remain fixed to the manufactured sheet.
      const u=(x+y)*Math.SQRT1_2*spec.scale, v=(y-x)*Math.SQRT1_2*spec.scale;
      const row=Math.floor(v), along=u+(row%2)*.5, column=Math.floor(along);
      const a=along-column-.5, b=v-row-.5, r=random(column,row,seed+467);
      const aa=spec.scale/height*.55;
      const diamond=1-smooth(.40-aa,.40+aa,Math.abs(a)*.68+Math.abs(b)*1.3);
      const chipped=.62+.38*random(Math.floor(u*3),Math.floor(v*3),seed+479);
      const chain=.82+.18*Math.sin(u*.25+row*.7);
      angle=Math.PI/4+.012*Math.sin(x*17-y*9);
      spacing=.96+.14*Math.sin((y-x)*27)+.045*Math.sin((x+y)*13)+(r-.5)*.035;
      amplitude=.014+diamond*chipped*chain*.80;
      const inclination=(smoothNoise(x*8,y*8,seed+487)-.5)*.16;
      nx=inclination+(r-.5)*.12*diamond;
      ny=-inclination+(random(column,row,seed+491)-.5)*.12*diamond;
      depth=.5+diamond*.025; grain=.60+diamond*.3;
    } else if (spec.kind === 'secret' || spec.kind === 'prismatic-secret') {
      const prism = spec.kind === 'prismatic-secret';
      const u = (prism ? x : (x + y) * Math.SQRT1_2) * spec.scale;
      const v = (prism ? y : (y - x) * Math.SQRT1_2) * spec.scale;
      const gx = Math.floor(u), gy = Math.floor(v);
      const a = u - gx, b = v - gy;
      const phase = random(gx, gy, seed + 53);
      // Short reflective dashes, aligned on the sheet. Their angular phases vary by
      // cell while the repeated diagonal (or orthogonal) cutting remains fixed.
      const width = .055 + random(gx, gy, seed + 97) * .12;
      const center = .5 + (random(gx, gy, seed + 101) - .5) * .19;
      const start = .025 + phase * .25, end = .54 + random(gx, gy, seed + 107) * .44;
      const chips = .56 + .44 * Math.pow(Math.sin(a * (15 + phase * 12) + phase * TAU), 2);
      const dash = (1 - smooth(width * .5, width, Math.abs(b - center))) * smooth(start, start + .07, a) * (1 - smooth(end - .08, end, a)) * chips;
      const cross = prism ? (1 - smooth(.07, .14, Math.abs(a - .5))) * smooth(.02, .13, b) * (1 - smooth(.64, .95, b)) : 0;
      const vertical = cross > dash;
      amplitude = Math.max(dash, cross) * (.5 + phase * .5);
      angle = (prism ? (vertical ? Math.PI / 2 : 0) : Math.PI / 4) + (phase - .5) * .12;
      // Neighbouring cuts share a broad manufacturing phase, with fine local variation.
      // This yields bands of related spectral color rather than independent rainbow pixels.
      const sheetPhase = Math.sin(v * .21 + Math.sin(u * .018) * .55);
      spacing = .98 + sheetPhase * .24 + (random(gx, gy, seed + 67) - .5) * .10;
      nx = (random(gx, gy, seed + 79) - .5) * .42 * amplitude;
      ny = (random(gx, gy, seed + 83) - .5) * .42 * amplitude;
      depth = .5 + amplitude * .06; grain = .85;
    } else if (spec.kind === 'contour') {
      const elevation = Math.sin(x * 9 + Math.sin(y * 5)) + Math.cos(y * 8 - x * 3) * .75 + Math.sin(x * 21 + y * 13) * .13;
      const dx = Math.cos(x * 9 + Math.sin(y * 5)) * 9 + Math.sin(y * 8 - x * 3) * 2.25 + Math.cos(x * 21 + y * 13) * 2.73;
      const dy = Math.cos(x * 9 + Math.sin(y * 5)) * Math.cos(y * 5) * 5 - Math.sin(y * 8 - x * 3) * 6 + Math.cos(x * 21 + y * 13) * 1.69;
      angle = Math.atan2(dy, dx);
      const line = Math.pow((Math.cos(elevation * spec.scale) + 1) * .5, 12);
      depth = .4 + line * .22; amplitude = .10 + line * .9;
      nx = Math.sin(elevation * spec.scale) * dx * .009;
      ny = Math.sin(elevation * spec.scale) * dy * .009;
      spacing = .85 + .12 * Math.sin(elevation * 3); grain = .9;
    } else if (spec.kind === 'fresnel') {
      const a = (x - spec.aspect * .5) * 1.07, b = (y - .52) * .9, r = Math.hypot(a, b);
      angle = Math.atan2(b * .9, a * 1.07);
      const phase = r * spec.scale * TAU, rings = .5 + Math.cos(phase) * .5;
      depth = .47 + rings * .055; amplitude = .035 + .965 * Math.pow(rings, 4);
      nx = Math.cos(angle) * .065 * Math.sin(phase); ny = Math.sin(angle) * .065 * Math.sin(phase);
      spacing = .82 + r * .28 + .025 * Math.sin(r * 26); grain = .85;
    }
    const i = (iy * width + ix) * 4;
    const axis = encodeGratingAxis(angle);
    direction[i] = Math.round(axis[0]);
    direction[i + 1] = Math.round(axis[1]);
    direction[i + 2] = Math.round(clamp((spacing - .5) / 1.5) * 255);
    direction[i + 3] = Math.round(clamp(amplitude) * 255);
    relief[i] = Math.round(clamp(nx + .5) * 255); relief[i + 1] = Math.round(clamp(ny + .5) * 255);
    relief[i + 2] = Math.round(clamp(depth) * 255); relief[i + 3] = Math.round(clamp(grain) * 255);
  }
  return { width, height, direction, relief };
}
