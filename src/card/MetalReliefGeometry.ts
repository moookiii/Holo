import { BufferGeometry, Float32BufferAttribute } from 'three/webgpu';
import type { CardDimensions } from './CardDefinition';

export interface HeightField { width: number; height: number; data: ArrayLike<number>; }
/** Data rows start at the image top. Bilinear sampling keeps displacement registered with GPU maps. */
export function sampleHeight(field: HeightField, u: number, v: number) {
  const x = Math.max(0, Math.min(field.width - 1, u * field.width - .5));
  const y = Math.max(0, Math.min(field.height - 1, (1 - v) * field.height - .5));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, field.width - 1), y1 = Math.min(y0 + 1, field.height - 1);
  const a = x - x0, b = y - y0;
  const at = (xx: number, yy: number) => field.data[yy * field.width + xx] / 255;
  return (at(x0, y0) * (1 - a) + at(x1, y0) * a) * (1 - b) + (at(x0, y1) * (1 - a) + at(x1, y1) * a) * b;
}

/** Dense, closed relief solid. The boundary is shared by faces and bevel, including rounded corners.
 * Face normals remain the nominal die plane: the registered height shader supplies the full
 * smooth slope once (computing displaced normals here as well would double the emboss).
 */
export function createMetalReliefGeometry(d: CardDimensions, front: HeightField, back: HeightField,
  frontDepth: number, backDepth: number, segments = 192): BufferGeometry {
  const p: number[] = [], n: number[] = [], t: number[] = [], ix: number[] = [];
  const rows = Math.round(segments * d.height / d.width), cols = segments;
  const radius = d.cornerRadius - d.bevel, hw = d.width / 2 - d.bevel, hh = d.height / 2 - d.bevel;
  const boundaries: number[][] = [];
  const add = (x: number, y: number, z: number, nx: number, ny: number, nz: number, reverse = false) => {
    const i = p.length / 3; p.push(x, y, z); n.push(nx, ny, nz); t.push(.5 + (reverse ? -x : x) / d.width, .5 + y / d.height); return i;
  };
  const geo = new BufferGeometry();
  for (const side of [1, -1]) {
    const start = ix.length, base = p.length / 3;
    for (let row = 0; row <= rows; row++) {
      const y = -hh + 2 * hh * row / rows;
      const dy = Math.max(0, Math.abs(y) - (hh - radius));
      const halfWidth = hw - radius + Math.sqrt(Math.max(0, radius * radius - dy * dy));
      for (let col = 0; col <= cols; col++) {
        const x = -halfWidth + 2 * halfWidth * col / cols;
        const u = .5 + (side < 0 ? -x : x) / d.width, v = .5 + y / d.height;
        // Flat seam matches the bevel exactly. Authored borders live inside this narrow transition.
        const rim = Math.min(row, rows - row, col, cols - col, 1);
        const height = sampleHeight(side > 0 ? front : back, u, v) * (side > 0 ? frontDepth : backDepth) * rim;
        add(x, y, side * (d.thickness / 2 + height), 0, 0, side, side < 0);
      }
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const a = base + row * (cols + 1) + col, b = a + 1, c = a + cols + 1, e = c + 1;
      if (side > 0) ix.push(a, b, c, b, e, c); else ix.push(a, c, b, b, c, e);
    }
    geo.addGroup(start, ix.length - start, side > 0 ? 0 : 1);
    const boundary: number[] = [];
    for (let col = 0; col < cols; col++) boundary.push(base + col);
    for (let row = 0; row < rows; row++) boundary.push(base + row * (cols + 1) + cols);
    for (let col = cols; col > 0; col--) boundary.push(base + rows * (cols + 1) + col);
    for (let row = rows; row > 0; row--) boundary.push(base + row * (cols + 1));
    boundaries.push(boundary);
  }
  const start = ix.length, count = boundaries[0].length, rings: number[][] = [];
  for (let k = 0; k <= 8; k++) {
    const top = k <= 4, angle = (top ? k : 8 - k) / 4 * Math.PI / 2;
    const outward = Math.sin(angle) * d.bevel;
    const z = (top ? 1 : -1) * (d.thickness / 2 - d.bevel + Math.cos(angle) * d.bevel);
    const ring: number[] = [];
    for (const source of boundaries[0]) {
      const x = p[source * 3], y = p[source * 3 + 1];
      const cx = Math.max(-hw + radius, Math.min(hw - radius, x)), cy = Math.max(-hh + radius, Math.min(hh - radius, y));
      const len = Math.hypot(x - cx, y - cy), nx = (x - cx) / len, ny = (y - cy) / len;
      ring.push(add(x + nx * outward, y + ny * outward, z, nx * Math.sin(angle), ny * Math.sin(angle), (top ? 1 : -1) * Math.cos(angle)));
    }
    rings.push(ring);
    // Separate vertical wall between the two equators, for substantial cast thickness.
    if (k === 4) {
      const lower = ring.map(i => add(p[3*i], p[3*i+1], -d.thickness/2+d.bevel, n[3*i], n[3*i+1], 0));
      rings.push(lower);
    }
  }
  for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < count; j++) {
    const next = (j + 1) % count, a = rings[k][j], b = rings[k][next], c = rings[k+1][j], e = rings[k+1][next];
    ix.push(a, c, b, b, c, e);
  }
  geo.addGroup(start, ix.length - start, 2);
  geo.setAttribute('position', new Float32BufferAttribute(p, 3)); geo.setAttribute('normal', new Float32BufferAttribute(n, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(t, 2)); geo.setIndex(ix);
  geo.computeBoundingBox(); geo.computeBoundingSphere(); geo.computeTangents(); return geo;
}
