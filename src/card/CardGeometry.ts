import { BufferGeometry, Float32BufferAttribute } from 'three/webgpu';
import type { CardDimensions } from './CardDefinition';

/** A closed manufactured solid. Faces, curved bevel and paper edge share a silhouette. */
export function createCardGeometry(d: CardDimensions): BufferGeometry {
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
  const cornerSteps = 20;
  const count = (cornerSteps + 1) * 4;
  const point = (i: number, inset: number) => {
    const corner = Math.floor(i / (cornerSteps + 1));
    const angle = corner * Math.PI / 2 + (i % (cornerSteps + 1)) / cornerSteps * Math.PI / 2;
    const cx = (corner === 0 || corner === 3 ? 1 : -1) * (d.width / 2 - d.cornerRadius);
    const cy = (corner < 2 ? 1 : -1) * (d.height / 2 - d.cornerRadius);
    return [cx + Math.cos(angle) * (d.cornerRadius - inset), cy + Math.sin(angle) * (d.cornerRadius - inset), Math.cos(angle), Math.sin(angle)];
  };
  function vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, back = false) {
    const index = positions.length / 3;
    positions.push(x, y, z); normals.push(nx, ny, nz);
    uvs.push((back ? -x : x) / d.width + 0.5, y / d.height + 0.5);
    return index;
  }
  const geometry = new BufferGeometry();
  for (const side of [1, -1]) {
    const start = indices.length;
    const center = vertex(0, 0, side * d.thickness / 2, 0, 0, side, side < 0);
    const ring = positions.length / 3;
    for (let i = 0; i < count; i++) {
      const [x, y] = point(i, d.bevel);
      vertex(x, y, side * d.thickness / 2, 0, 0, side, side < 0);
    }
    for (let i = 0; i < count; i++) {
      const a = ring + i, b = ring + (i + 1) % count;
      indices.push(center, side > 0 ? a : b, side > 0 ? b : a);
    }
    geometry.addGroup(start, indices.length - start, side > 0 ? 0 : 1);
  }
  const sideStart = indices.length;
  const rings: { z: number; inset: number; nz: number; nr: number }[] = [];
  for (let i = 0; i <= 4; i++) {
    const a = (1 - i / 4) * Math.PI / 2;
    rings.push({ z: d.thickness / 2 - d.bevel + Math.sin(a) * d.bevel, inset: d.bevel * (1 - Math.cos(a)), nz: Math.sin(a), nr: Math.cos(a) });
  }
  for (let i = 0; i <= 4; i++) {
    const a = i / 4 * Math.PI / 2;
    rings.push({ z: -d.thickness / 2 + d.bevel - Math.sin(a) * d.bevel, inset: d.bevel * (1 - Math.cos(a)), nz: -Math.sin(a), nr: Math.cos(a) });
  }
  const base = positions.length / 3;
  for (const ring of rings) for (let i = 0; i < count; i++) {
    const [x, y, nx, ny] = point(i, ring.inset);
    vertex(x, y, ring.z, nx * ring.nr, ny * ring.nr, ring.nz);
  }
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    const a = base + j * count + i, b = base + j * count + next;
    const c = base + (j + 1) * count + i, e = base + (j + 1) * count + next;
    indices.push(a, c, b, b, c, e);
  }
  geometry.addGroup(sideStart, indices.length - sideStart, 2);
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere(); geometry.computeTangents();
  return geometry;
}
