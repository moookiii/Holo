import { Group, Mesh, MeshStandardNodeMaterial, MeshPhysicalNodeMaterial, PlaneGeometry,
  BoxGeometry, DoubleSide, BufferGeometry, Float32BufferAttribute, TextureLoader, RepeatWrapping, type Material } from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BINDER, pocket, sheetPoint } from './BinderLayout';
import type { CardInstance } from '../card/CardInstance';

interface Surface { mesh: Mesh; original: Float32Array; offset: number; }
export class BinderPage {
  readonly group = new Group();
  readonly cards = new Map<number, CardInstance>();
  private surfaces: Surface[] = [];
  private geometries = new Set<BufferGeometry>();
  constructor(readonly index: number, readonly side: -1 | 1, private materials: { backing: Material; plastic: Material; weld: Material }) {
    this.group.name = `binder-page:${index}`;
    this.surface(new PlaneGeometry(BINDER.pageWidth, BINDER.pageHeight, 96, 12), 0, 0, .42, materials.backing);
    // A separate physical film above the card, with a little tension at each lip.
    for (let i = 0; i < 12; i++) {
      const { u, y } = pocket(i, side);
      const geometry = new PlaneGeometry(6.8, 9.1, 10, 12);
      const pos = geometry.getAttribute('position');
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), yy = pos.getY(v);
        const lip = Math.exp(-(((yy - 4.2) / .27) ** 2)) * .028;
        pos.setZ(v, lip + .012 * Math.sin(x * 2.8 + i) * Math.sin(yy * 1.7) ** 2);
      }
      geometry.computeVertexNormals();
      this.surface(geometry, u - BINDER.pageWidth / 2, y, .555, materials.plastic);
      // Double welds and an open top lip distinguish sleeve film from glass.
      for (const dx of [-3.49, -3.42, 3.42, 3.49])
        this.surface(new PlaneGeometry(.035, 9.24, 1, 12), u - BINDER.pageWidth / 2 + dx, y, .54, materials.weld);
      for (const dy of [-4.64, -4.56, 4.58])
        this.surface(new PlaneGeometry(6.98, .035, 20, 1), u - BINDER.pageWidth / 2, y + dy, .54, materials.weld);
    }
    this.pose();
  }
  private surface(geometry: BufferGeometry, x: number, y: number, offset: number, material: Material) {
    geometry.translate(x + BINDER.pageWidth / 2, y, 0);
    const mesh = new Mesh(geometry, material); mesh.frustumCulled = false;
    this.surfaces.push({ mesh, original: new Float32Array(geometry.getAttribute('position').array), offset });
    this.geometries.add(geometry); this.group.add(mesh);
  }
  attach(slot: number, card: CardInstance) { this.cards.set(slot, card); this.group.add(card.mesh); this.pose(); }
  pose(progress?: number, turningSide: -1 | 1 = this.side, reverse = false) {
    const turning = progress !== undefined;
    const points = new Map<number, ReturnType<typeof sheetPoint>>();
    const at = (u: number) => {
      let point = points.get(u);
      if (!point) { point = turning ? sheetPoint(u, progress!, turningSide) : { x: this.side * (BINDER.hinge + u), z: .42 + .20 * Math.exp(-u / 1.1), angle: 0 }; points.set(u, point); }
      return point;
    };
    for (const surface of this.surfaces) {
      const pos = surface.mesh.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const u = surface.original[i * 3], y = surface.original[i * 3 + 1];
        const point = at(u), offset = (surface.offset - .42 + surface.original[i * 3 + 2]) * (reverse ? -1 : 1);
        pos.setXYZ(i, point.x + Math.sin(point.angle) * offset, y, point.z + Math.cos(point.angle) * offset);
      }
      pos.needsUpdate = true;
      surface.mesh.geometry.computeVertexNormals();
      // Reverse page owns the film on its back, while both share one backing.
      surface.mesh.visible = !reverse || surface.mesh.material !== this.materials.backing;
    }
    for (const [slot, card] of this.cards) {
      const { u, y } = pocket(slot, this.side), point = at(u);
      const offset = .09 * (reverse ? -1 : 1);
      card.mesh.position.set(point.x + Math.sin(point.angle) * offset, y, point.z + Math.cos(point.angle) * offset);
      card.mesh.rotation.set(0, point.angle + (reverse ? Math.PI : 0), 0);
      // Keep existing aspect ratios, including cards from other games.
      const d = card.definition.dimensions;
      const scale = Math.min(BINDER.cardWidth / d.width, BINDER.cardHeight / d.height);
      card.mesh.scale.setScalar(scale);
    }
  }
  dispose() { this.group.removeFromParent(); this.cards.forEach(card => card.dispose()); this.cards.clear(); this.geometries.forEach(g => g.dispose()); }
}

export class BinderScene {
  readonly group = new Group();
  readonly pages = new Map<number, BinderPage>();
  private geometries: BufferGeometry[] = [];
  private grain = new TextureLoader().load(`${import.meta.env.BASE_URL}binder/leather-grain.png`);
  private materials = {
    cover: new MeshStandardNodeMaterial({ color: '#29292c', roughness: .86, metalness: .03 }),
    piping: new MeshStandardNodeMaterial({ color: '#3a3a3e', roughness: .73 }),
    backing: new MeshStandardNodeMaterial({ color: '#17181a', roughness: .93, side: DoubleSide }),
    plastic: new MeshPhysicalNodeMaterial({ color: '#f3f5f8', transparent: true, opacity: .035,
      roughness: .23, metalness: 0, clearcoat: .36, clearcoatRoughness: .22, ior: 1.46,
      depthWrite: false, side: DoubleSide }),
    weld: new MeshStandardNodeMaterial({ color: '#51555a', roughness: .48, transparent: true, opacity: .27, depthWrite: false, side: DoubleSide }),
    stitch: new MeshStandardNodeMaterial({ color: '#555358', roughness: .9 }),
  };
  constructor() {
    this.group.name = 'favorites-binder';
    this.grain.wrapS = this.grain.wrapT = RepeatWrapping; this.grain.repeat.set(9, 9);
    this.materials.cover.bumpMap = this.grain; this.materials.cover.bumpScale = .024;
    for (const side of [-1, 1] as const) {
      const center = side * (BINDER.pageWidth / 2 + BINDER.hinge);
      this.solid(new RoundedBoxGeometry(31.2, 32, .58, 4, .32), center, 0, -.12, this.materials.cover);
      // Zipper track / padded piping run around the whole rounded cover.
      this.solid(new RoundedBoxGeometry(31.45, 32.25, .28, 4, .32), center, 0, -.31, this.materials.piping);
      for (let layer = 0; layer < 5; layer++)
        this.solid(new RoundedBoxGeometry(29.9 - layer * .035, 30.6 - layer * .025, .04, 2, .09), center, 0, .20 + layer * .042, this.materials.backing);
      const stitchPositions: number[] = [];
      for (let x = -14.6; x < 14.6; x += .28) for (const y of [-15.6, 15.6]) stitchPositions.push(center + x, y, .19);
      for (let y = -15.3; y < 15.3; y += .28) for (const x of [-15.18, 15.18]) stitchPositions.push(center + x, y, .19);
      // Tiny stitches / zipper teeth are merged into one geometry per cover.
      const vertices: number[] = [];
      for (let i = 0; i < stitchPositions.length; i += 3) {
        const [x, y, z] = stitchPositions.slice(i, i + 3);
        vertices.push(x - .06, y - .012, z, x + .06, y - .012, z, x + .06, y + .012, z,
          x - .06, y - .012, z, x + .06, y + .012, z, x - .06, y + .012, z);
      }
      const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
      this.solid(geometry, 0, 0, 0, this.materials.stitch);
    }
    this.solid(new RoundedBoxGeometry(1.35, 31.8, .62, 4, .30), 0, 0, -.15, this.materials.cover);
    this.solid(new BoxGeometry(.09, 30.3, .06), -.36, 0, .23, this.materials.piping);
    this.solid(new BoxGeometry(.09, 30.3, .06), .36, 0, .23, this.materials.piping);
    // A small zipper pull at the lower corner, with its own physical thickness.
    this.solid(new RoundedBoxGeometry(.45, 1.05, .10, 3, .12), 30.4, -15.8, -.08, this.materials.piping);
  }
  private solid(geometry: BufferGeometry, x: number, y: number, z: number, material: Material) {
    const mesh = new Mesh(geometry, material); mesh.position.set(x, y, z); this.geometries.push(geometry); this.group.add(mesh);
  }
  page(index: number) {
    let page = this.pages.get(index);
    if (!page) { page = new BinderPage(index, index % 2 ? 1 : -1, this.materials); this.pages.set(index, page); this.group.add(page.group); }
    return page;
  }
  retain(indices: Set<number>) { for (const [index, page] of this.pages) if (!indices.has(index)) { page.dispose(); this.pages.delete(index); } }
  dispose() { this.retain(new Set()); this.geometries.forEach(g => g.dispose()); Object.values(this.materials).forEach(m => m.dispose()); this.grain.dispose(); this.group.removeFromParent(); }
}
