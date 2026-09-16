import { BufferGeometry, Float32BufferAttribute, Group, Mesh, type Material } from 'three/webgpu';
import type { AssetManager } from '../../assets/AssetManager';
import type { PackDefinition } from '../PackDefinition';
import { clamp, ease, orientation } from '../PackMath';
import { createLiningMaterial, createWrapperMaterial } from './PackWrapperMaterial';

export interface WrapperPose { tear: number; mouth: number; grip: number; collapse: number; tension: number; release: number; }
interface Film { mesh: Mesh; rest: Float32Array; side: number; inner: boolean; strip: boolean; }
/** Two film skins with folded sides, metalized inner faces and welded end seals.
 * The tear is a shared jagged boundary. Its separated region curls continuously
 * behind the moving tear front; it becomes a free piece only at full separation. */
export class PackWrapper {
  readonly root = new Group();
  readonly body = new Group();
  readonly strip = new Group();
  readonly tearHeight: number;
  private films: Film[] = [];
  private materials: Material[] = [];
  private lastPose = '';
  private constructor(readonly dimensions: PackDefinition['wrapper']) {
    this.tearHeight = dimensions.height / 2 - .92;
    this.root.name = 'Metalized foil wrapper'; this.root.add(this.body, this.strip);
  }
  static async create(definition: PackDefinition, assets: AssetManager) {
    const wrapper = new PackWrapper(definition.wrapper);
    const [front, back, ink] = await Promise.all([assets.load(definition.wrapper.front, true), assets.load(definition.wrapper.back, true), assets.load(definition.wrapper.ink, false)]);
    const frontMaterial = createWrapperMaterial(front, ink), backMaterial = createWrapperMaterial(back, ink), inside = createLiningMaterial();
    wrapper.materials = [frontMaterial, backMaterial, inside];
    for (const strip of [false, true]) for (const side of [1, -1]) for (const inner of [false, true]) {
      wrapper.addFilm(strip, side, inner, inner ? inside : side === 1 ? frontMaterial : backMaterial);
    }
    wrapper.deform({ tear: 0, mouth: 0, grip: 0, collapse: 0, tension: 0, release: 0 });
    return wrapper;
  }
  private jagged(u: number) { return .019 * Math.sin(u * 127) + .012 * Math.sin(u * 291) + .009 * Math.sin(u * 67); }
  private addFilm(strip: boolean, side: number, inner: boolean, material: Material) {
    const nx = 100, ny = strip ? 10 : 80;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) {
      const u = ix / nx * 2 - 1, v = iy / ny;
      const tear = this.tearHeight + this.jagged(u);
      const y = strip ? tear + (this.dimensions.height / 2 - tear) * v : -this.dimensions.height / 2 + (tear + this.dimensions.height / 2) * v;
      positions.push(u, y, 0);
      uvs.push(side === 1 ? ix / nx : 1 - ix / nx, y / this.dimensions.height + .5);
    }
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const a = iy * (nx + 1) + ix, b = a + 1, c = a + nx + 1, d = c + 1;
      if ((side > 0) !== inner) indices.push(a, b, c, b, d, c); else indices.push(a, c, b, b, c, d);
    }
    const geometry = new BufferGeometry();
    const rest = new Float32Array(positions);
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
    const mesh = new Mesh(geometry, material); mesh.frustumCulled = false;
    (strip ? this.strip : this.body).add(mesh);
    this.films.push({ mesh, rest, side, inner, strip });
  }
  deform(p: WrapperPose) {
    const key = Object.values(p).map(v => v.toFixed(5)).join(':'); if (key === this.lastPose) return; this.lastPose = key;
    const { width, height, depth } = this.dimensions;
    for (const film of this.films) {
      const positions = film.mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const u = film.rest[i * 3], y0 = film.rest[i * 3 + 1], x0 = u * width / 2;
        const edge = Math.max(0, 1 - u * u), innerOffset = film.inner ? .007 : 0;
        const endDistance = height / 2 - Math.abs(y0);
        const seal = 1 - ease((endDistance - .48) / .52);
        // Radius at the side folds joins both faces; longitudinal and diagonal
        // wrinkles emerge from welded boundaries, leaving the print legible.
        const sideDepth = Math.pow(edge, .24);
        const crease = Math.sin(u * 33 + y0 * 2.1) * .013 * Math.pow(Math.abs(u), 5)
          + Math.sin(u * 64 - y0 * 3.6) * .026 * Math.exp(-endDistance * 1.8)
          + Math.sin(u * 14 + y0 * 1.8) * .008 * edge;
        const crimp = seal * (.008 + .006 * Math.cos(x0 * 70));
        const weld = ease(endDistance / .055);
        let z = film.side * (sideDepth * (depth / 2 * (1 - seal) + .014 + crimp) + crease - innerOffset * sideDepth) * weld;
        let y = y0, x = x0;
        const top = ease((y0 - 2.4) / (this.tearHeight - 2.4));
        const free = ease((p.tear * 2 - 1 - u) / .2) * (p.tear > 0 ? 1 : 0);
        if (film.strip) {
          const lift = free * p.tear;
          y += lift * (.40 + (1 - u) * .23);
          z += lift * (.48 + Math.sin(u * 2.4) * .40);
          x += lift * .18;
        } else {
          z += film.side * p.mouth * top * edge * .66;
          y -= p.mouth * top * Math.pow(edge, .65) * (film.side > 0 ? 1.42 : .16);
          z += film.side * free * top * .045;
          z += film.side * p.grip * .11 * Math.exp(-((u + .83) ** 2) * 24) * top;
          x += p.tension * .038 * top * Math.sin(y0 * 8 + u * 12);
          z *= 1 - p.collapse * .74;
          y -= p.collapse * .2 * edge * Math.sin(y0 * 2);
          z += p.collapse * .07 * edge * Math.sin(y0 * 3 + u * 6);
        }
        positions.setXYZ(i, x, film.strip ? y - this.tearHeight : y, z);
      }
      positions.needsUpdate = true;
      film.mesh.geometry.computeVertexNormals();
      film.mesh.geometry.computeBoundingSphere();
    }
    const r = clamp(p.release);
    this.strip.position.set(r * 6.6, this.tearHeight + r * .65 - r * r * 2.8, -r * .4);
    this.strip.quaternion.copy(orientation(r * .32, r * -.25, r * -.42));
  }
  dispose() { this.root.removeFromParent(); this.films.forEach(f => f.mesh.geometry.dispose()); this.materials.forEach(m => m.dispose()); }
}
