import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Quaternion, Vector3, type Material, type Object3D, type Raycaster } from 'three/webgpu';
import type { AssetManager } from '../../assets/AssetManager';
import type { PackDefinition } from '../PackDefinition';
import { ease } from '../PackMath';
import { WrapperDeformation } from './WrapperDeformation';
import { WrapperPicking } from './WrapperPicking';
import { WrapperTearPath } from './WrapperTearPath';
import { createLiningMaterial, createWrapperMaterial } from './PackWrapperMaterial';

export interface WrapperPose { tear: number; mouth: number; grip: number; extract: number; collapse: number; tension: number; pullX: number; pullY: number; }
interface Film { mesh: Mesh; side: number; inner: boolean; strip: boolean; nx: number; ny: number; }
interface CutRim { mesh: Mesh; count: number; torn: boolean; }
/** Two film skins with folded sides, metalized inner faces and welded end seals.
 * The tear is a shared jagged boundary. Its separated region curls continuously
 * behind the moving tear front; it becomes a free piece only at full separation. */
export class PackWrapper {
  readonly root = new Group();
  readonly body = new Group();
  readonly strip = new Group();
  readonly tearHeight: number;
  readonly tearPath: WrapperTearPath;
  private films: Film[] = [];
  private rims: CutRim[] = [];
  private materials: Material[] = [];
  private deformation: WrapperDeformation;
  private picking: WrapperPicking;
  private currentPose: WrapperPose = { tear: 0, mouth: 0, grip: 0, extract: 0, collapse: 0, tension: 0, pullX: 0, pullY: 0 };
  private detached = false;
  private detachedOrigin?: { position: Vector3; quaternion: Quaternion };
  private constructor(readonly dimensions: PackDefinition['wrapper']) {
    this.tearHeight = dimensions.height / 2 - .92;
    this.tearPath = new WrapperTearPath(dimensions.width, this.tearHeight);
    this.deformation = new WrapperDeformation(this.tearHeight, dimensions.height / 2, this.tearPath);
    this.picking = new WrapperPicking(this.tearHeight, dimensions.height / 2, this.tearPath);
    this.root.name = 'Metalized foil wrapper'; this.strip.name = 'Detached tear strip'; this.root.add(this.body, this.strip);
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
    wrapper.deform(wrapper.currentPose);
    return wrapper;
  }
  private jagged(u: number) {
    // A shallow wandering fracture with small irregular burrs, shared exactly
    // by body and strip. No repeated scallops or independently jittered faces.
    return .018 * Math.sin(u * 7.1 + .8) + .009 * Math.sin(u * 137 + Math.sin(u * 23))
      + .006 * Math.sin(u * 281 + .9) + .008 * Math.sin(u * 49 + 2.4);
  }
  private addCutRims(material: Material) {
    for (const outer of this.films.filter(film => !film.inner)) {
      const inner = this.films.find(film => film.inner && film.side === outer.side && film.strip === outer.strip)!;
      const { nx, ny } = outer, row = nx + 1;
      const across = Array.from({ length: row }, (_, x) => x);
      const down = Array.from({ length: ny + 1 }, (_, y) => y * row);
      this.addRim(outer, inner, across.map(x => x + (outer.strip ? 0 : ny * row)), material, true);
      // Close the film laminate around the remaining perimeter. These rims
      // remain visible while sealed, including in a true edge-on view.
      this.addRim(outer, inner, across.map(x => x + (outer.strip ? ny * row : 0)), material, false);
      this.addRim(outer, inner, down, material, false);
      this.addRim(outer, inner, down.map(i => i + nx), material, false);
    }
  }
  private addRim(outer: Film, inner: Film, boundary: number[], material: Material, torn: boolean) {
    const count = boundary.length;
    const geometry = new BufferGeometry(), indices: number[] = [];
    geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 6), 3));
    for (let i = 0; i < count - 1; i++) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geometry.setIndex(indices);
    for (const name of ['uv', 'filmCoordinates', 'filmSeam', 'filmTangentU', 'filmTangentV', 'filmType']) {
      const source = outer.mesh.geometry.getAttribute(name), values: number[] = [];
      for (let i = 0; i < count; i++) for (const film of [outer, inner]) {
        const attr = film.mesh.geometry.getAttribute(name);
        for (let k = 0; k < attr.itemSize; k++) values.push(name === 'filmType' && k === 1 ? 1 : attr.array[boundary[i] * attr.itemSize + k]);
      }
      geometry.setAttribute(name, new Float32BufferAttribute(values, source.itemSize));
    }
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < count; i++) for (const [layer, film] of [outer, inner].entries()) {
      const source = film.mesh.geometry.getAttribute('position');
      positions.setXYZ(i * 2 + layer, source.getX(boundary[i]), source.getY(boundary[i]), source.getZ(boundary[i]));
    }
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, material); mesh.frustumCulled = false;
    (outer.strip ? this.strip : this.body).add(mesh);
    mesh.name = torn ? 'Torn laminate edge' : 'Sealed laminate edge';
    this.rims.push({ mesh, count, torn });
  }
  private addFilm(strip: boolean, side: number, inner: boolean, material: Material) {
    const nx = 144, ny = strip ? 10 : 80;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [], coordinates: number[] = [], tangentU: number[] = [], tangentV: number[] = [], types: number[] = [];
    const seams: number[] = [];
    for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) {
      const u = ix / nx * 2 - 1, v = iy / ny;
      const tear = this.tearHeight + this.jagged(u);
      // Concentrate body rows near the end folds without increasing its mesh
      // budget. This gives heat-seal shoulders a smooth rolled transition.
      const bodyV = v - .11 * Math.sin(v * Math.PI * 2);
      const y = strip ? tear + (this.dimensions.height / 2 - tear) * v : -this.dimensions.height / 2 + (tear + this.dimensions.height / 2) * bodyV;
      const point = this.manufacturedPoint(u, y, side, inner, strip);
      positions.push(...point); coordinates.push(u, y, side, inner ? 1 : 0); types.push(strip ? 1 : 0, 0); seams.push(tear);
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
    geometry.setAttribute('filmSeam', new Float32BufferAttribute(seams, 1));
    geometry.setAttribute('filmTangentU', new Float32BufferAttribute(tangentU, 3));
    geometry.setAttribute('filmTangentV', new Float32BufferAttribute(tangentV, 3));
    geometry.setAttribute('filmType', new Float32BufferAttribute(types, 2));
    geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material); mesh.frustumCulled = false;
    (strip ? this.strip : this.body).add(mesh);
    mesh.name = `${strip ? 'Tear strip' : 'Wrapper'} ${side > 0 ? 'front' : 'back'} ${inner ? 'lining' : 'print'}`;
    this.films.push({ mesh, side, inner, strip, nx, ny });
    if (!inner) this.picking.add(mesh, strip, side, nx, ny);
  }
  private manufacturedPoint(u: number, y: number, side: number, inner: boolean, strip: boolean) {
    const { width, height, depth } = this.dimensions;
    const edge = Math.max(0, 1 - u * u), x = u * width / 2;
    const end = height / 2 - Math.abs(y), seal = 1 - ease((end - .48) / .52);
    // Smoothly close the side fold instead of clamping it to a nonzero gap.
    // This also avoids an infinite tangent at the edge of the fractional power.
    const sideDepth = ((edge + .008) ** .24 - .008 ** .24) / (1.008 ** .24 - .008 ** .24);
    const shoulder = (1 - seal) * Math.exp(-Math.max(0, end - .65) * 1.9);
    const phase = u * 53 + Math.sin(u * 8 + side * 1.6) * 1.8 + y * (1.3 + u * .4);
    const crease = Math.sin(u * 31 + y * 2.1 + side) * .010 * Math.abs(u) ** 5
      + Math.sin(phase) * .018 * shoulder + Math.sin(u * 14 + y * 1.8) * .008 * edge;
    // Fine parallel jaw impressions retain a pressed flat land at either end.
    const crimp = seal * (.007 + .004 * Math.cos(x * 34 + .16 * Math.sin(y * 12))) * ease(end / .065);
    // A folded lap has one raised land and a distinct closing lip. It is not
    // a round bead down the middle of the reverse print.
    const lap = ease((x + .23) / .10) * (1 - ease((x - .16) / .045));
    const fin = side < 0 ? .035 * lap * (1 - seal) : 0;
    const cavity = Math.max(0, depth / 2 * (1 - seal) + crimp + crease);
    const z = side * (sideDepth * cavity * ease(end / .065) + fin + (inner ? 0 : .007));
    return [x, strip ? y - this.tearHeight : y, z];
  }
  deform(p: WrapperPose, detachedParent?: Object3D) {
    if (this.tearPath.progress < 1 && this.detached) {
      this.root.add(this.strip); this.detached = false; this.deformation.resetStrip();
    }
    this.currentPose = p;
    this.deformation.update(p);
    for (const rim of this.rims) {
      // Cut walls follow the sampled boundary, including interior and reverse
      // tears. Intact walls coincide inside the welded laminate.
      rim.mesh.visible = !rim.torn || this.tearPath.progress > 0;
    }
    if (!this.detached) {
      this.strip.position.set(0, this.tearHeight, 0); this.strip.quaternion.identity();
      if (this.tearPath.progress === 1 && detachedParent) {
        // Preserve the strip's world pose at release, but keep it alive as a
        // loose piece: it continues curling and drifting while the pack opens.
        this.root.updateWorldMatrix(true, true); detachedParent.attach(this.strip);
        this.detachedOrigin = { position: this.strip.position.clone(), quaternion: this.strip.quaternion.clone() };
        this.detached = true;
      }
    }
    if (this.detached && this.detachedOrigin) {
      const drift = p.mouth * .35 + p.collapse * 1.9;
      // The wrapper travels left as the cards extract; send the loose tear
      // strip decisively to the opposite side so it clears the reveal.
      const right = p.mouth * 1.2 + p.extract * 7 + p.collapse * 1.2;
      this.strip.position.copy(this.detachedOrigin.position).add(new Vector3(right, -drift, -p.mouth * .16));
      this.strip.quaternion.copy(this.detachedOrigin.quaternion).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), p.mouth * .24 + p.collapse * .38));
    }
    this.strip.visible = this.root.visible;
  }
  resetTear() {
    this.tearPath.reset(); this.root.add(this.strip); this.detached = false; this.detachedOrigin = undefined;
    this.strip.position.set(0, this.tearHeight, 0); this.strip.quaternion.identity(); this.strip.scale.setScalar(1);
    this.deformation.resetStrip();
  }
  raycast(ray: Raycaster) { return this.root.visible ? this.picking.raycast(ray, this.currentPose, this.detached) : undefined; }
  dispose() { this.strip.removeFromParent(); this.root.removeFromParent(); this.picking.dispose(); this.deformation.dispose(); this.films.forEach(f => f.mesh.geometry.dispose()); this.rims.forEach(rim => rim.mesh.geometry.dispose()); this.materials.forEach(m => m.dispose()); }
}
