import { BufferGeometry, Float32BufferAttribute, Group, Mesh, type Material, type Raycaster } from 'three/webgpu';
import type { AssetManager } from '../../assets/AssetManager';
import type { PackDefinition } from '../PackDefinition';
import { clamp, ease, orientation } from '../PackMath';
import { WrapperDeformation } from './WrapperDeformation';
import { WrapperPicking } from './WrapperPicking';
import { createLiningMaterial, createWrapperMaterial } from './PackWrapperMaterial';

export interface WrapperPose { tear: number; mouth: number; grip: number; collapse: number; tension: number; release: number; }
interface Film { mesh: Mesh; side: number; inner: boolean; strip: boolean; }
interface CutRim { mesh: Mesh; outer: Film; inner: Film; start: number; count: number; }
/** Two film skins with folded sides, metalized inner faces and welded end seals.
 * The tear is a shared jagged boundary. Its separated region curls continuously
 * behind the moving tear front; it becomes a free piece only at full separation. */
export class PackWrapper {
  readonly root = new Group();
  readonly body = new Group();
  readonly strip = new Group();
  readonly tearHeight: number;
  private films: Film[] = [];
  private rims: CutRim[] = [];
  private materials: Material[] = [];
  private deformation: WrapperDeformation;
  private picking: WrapperPicking;
  private currentPose: WrapperPose = { tear: 0, mouth: 0, grip: 0, collapse: 0, tension: 0, release: 0 };
  private constructor(readonly dimensions: PackDefinition['wrapper']) {
    this.tearHeight = dimensions.height / 2 - .92;
    this.deformation = new WrapperDeformation(this.tearHeight);
    this.picking = new WrapperPicking(this.tearHeight);
    this.root.name = 'Metalized foil wrapper'; this.root.add(this.body, this.strip);
  }
  static async create(definition: PackDefinition, assets: AssetManager) {
    const wrapper = new PackWrapper(definition.wrapper);
    const [front, back, ink, backInk] = await Promise.all([
      assets.load(definition.wrapper.front, true), assets.load(definition.wrapper.back, true),
      assets.load(definition.wrapper.ink, false),
      definition.wrapper.backInk ? assets.load(definition.wrapper.backInk, false) : assets.white,
    ]);
    const surface = { width: definition.wrapper.width, height: definition.wrapper.height, normal: wrapper.deformation.normal };
    const frontMaterial = createWrapperMaterial(front, ink, surface), backMaterial = createWrapperMaterial(back, backInk, surface), inside = createLiningMaterial(surface);
    wrapper.materials = [frontMaterial, backMaterial, inside];
    [frontMaterial, backMaterial, inside].forEach(material => wrapper.deformation.apply(material));
    for (const strip of [false, true]) for (const side of [1, -1]) for (const inner of [false, true]) {
      wrapper.addFilm(strip, side, inner, inner ? inside : side === 1 ? frontMaterial : backMaterial);
    }
    wrapper.addCutRims(inside);
    wrapper.deform({ tear: 0, mouth: 0, grip: 0, collapse: 0, tension: 0, release: 0 });
    return wrapper;
  }
  private jagged(u: number) { return .019 * Math.sin(u * 127) + .012 * Math.sin(u * 291) + .009 * Math.sin(u * 67); }
  private addCutRims(material: Material) {
    for (const outer of this.films.filter(film => !film.inner)) {
      const inner = this.films.find(film => film.inner && film.side === outer.side && film.strip === outer.strip)!;
      const count = 145, start = outer.strip ? 0 : outer.mesh.geometry.getAttribute('position').count - count;
      const geometry = new BufferGeometry(), indices: number[] = [];
      geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 6), 3));
      for (let i = 0; i < count - 1; i++) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      geometry.setIndex(indices);
      for (const name of ['uv', 'filmCoordinates', 'filmTangentU', 'filmTangentV', 'filmType']) {
        const source = outer.mesh.geometry.getAttribute(name), values: number[] = [];
        for (let i = 0; i < count; i++) for (const film of [outer, inner]) {
          const attr = film.mesh.geometry.getAttribute(name);
          for (let k = 0; k < attr.itemSize; k++) values.push(name === 'filmType' && k === 1 ? 1 : attr.array[(start + i) * attr.itemSize + k]);
        }
        geometry.setAttribute(name, new Float32BufferAttribute(values, source.itemSize));
      }
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < count; i++) for (const [layer, film] of [outer, inner].entries()) {
        const source = film.mesh.geometry.getAttribute('position');
        positions.setXYZ(i * 2 + layer, source.getX(start + i), source.getY(start + i), source.getZ(start + i));
      }
      geometry.computeVertexNormals();
      const mesh = new Mesh(geometry, material); mesh.frustumCulled = false;
      (outer.strip ? this.strip : this.body).add(mesh);
      this.rims.push({ mesh, outer, inner, start, count });
    }
  }
  private addFilm(strip: boolean, side: number, inner: boolean, material: Material) {
    const nx = 144, ny = strip ? 10 : 80;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [], coordinates: number[] = [], tangentU: number[] = [], tangentV: number[] = [], types: number[] = [];
    for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) {
      const u = ix / nx * 2 - 1, v = iy / ny;
      const tear = this.tearHeight + this.jagged(u);
      const y = strip ? tear + (this.dimensions.height / 2 - tear) * v : -this.dimensions.height / 2 + (tear + this.dimensions.height / 2) * v;
      const point = this.manufacturedPoint(u, y, side, inner, strip);
      positions.push(...point); coordinates.push(u, y, side, inner ? 1 : 0); types.push(strip ? 1 : 0, 0);
      const step = .0005;
      const a = this.manufacturedPoint(u + step, y, side, inner, strip), b = this.manufacturedPoint(u - step, y, side, inner, strip);
      const c = this.manufacturedPoint(u, y + step, side, inner, strip), d = this.manufacturedPoint(u, y - step, side, inner, strip);
      for (let k = 0; k < 3; k++) { tangentU.push((a[k] - b[k]) / (2 * step)); tangentV.push((c[k] - d[k]) / (2 * step)); }
      uvs.push(side === 1 ? ix / nx : 1 - ix / nx, y / this.dimensions.height + .5);
    }
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const a = iy * (nx + 1) + ix, b = a + 1, c = a + nx + 1, d = c + 1;
      if ((side > 0) !== inner) indices.push(a, b, c, b, d, c); else indices.push(a, c, b, b, c, d);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
    geometry.setAttribute('filmCoordinates', new Float32BufferAttribute(coordinates, 4));
    geometry.setAttribute('filmTangentU', new Float32BufferAttribute(tangentU, 3));
    geometry.setAttribute('filmTangentV', new Float32BufferAttribute(tangentV, 3));
    geometry.setAttribute('filmType', new Float32BufferAttribute(types, 2));
    geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material); mesh.frustumCulled = false;
    (strip ? this.strip : this.body).add(mesh);
    this.films.push({ mesh, side, inner, strip });
    if (!inner) this.picking.add(mesh, strip, side);
  }
  private manufacturedPoint(u: number, y: number, side: number, inner: boolean, strip: boolean) {
    const { width, height, depth } = this.dimensions;
    const edge = Math.max(.000001, 1 - u * u), x = u * width / 2;
    const end = height / 2 - Math.abs(y), seal = 1 - ease((end - .48) / .52), sideDepth = edge ** .24;
    const crease = Math.sin(u * 33 + y * 2.1) * .013 * Math.abs(u) ** 5
      + Math.sin(u * 64 - y * 3.6) * .026 * Math.exp(-end * 1.8) + Math.sin(u * 14 + y * 1.8) * .008 * edge;
    const crimp = seal * (.008 + .006 * Math.cos(x * 40));
    const fin = side < 0 && !inner ? .045 * Math.exp(-((u / .048) ** 2)) * (1 - seal) : 0;
    const z = side * (sideDepth * (depth / 2 * (1 - seal) + .014 + crimp + crease - (inner ? .007 : 0)) + fin) * ease(end / .055);
    return [x, strip ? y - this.tearHeight : y, z];
  }
  deform(p: WrapperPose) {
    this.currentPose = p;
    this.deformation.update(p);
    for (const rim of this.rims) {
      rim.mesh.visible = p.tear > 0;
      rim.mesh.geometry.setDrawRange(0, Math.max(6, Math.floor(p.tear * (rim.count - 1)) * 6));
    }
    const r = clamp(p.release);
    this.strip.position.set(r * 6.6, this.tearHeight + r * .65 - r * r * 2.8, -r * .4);
    this.strip.quaternion.copy(orientation(r * .32, r * -.25, r * -.42));
  }
  raycast(ray: Raycaster) { return this.root.visible ? this.picking.raycast(ray, this.currentPose) : undefined; }
  dispose() { this.root.removeFromParent(); this.picking.dispose(); this.films.forEach(f => f.mesh.geometry.dispose()); this.rims.forEach(rim => rim.mesh.geometry.dispose()); this.materials.forEach(m => m.dispose()); }
}
