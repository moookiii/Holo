import { Group, Mesh, MeshStandardNodeMaterial, MeshPhysicalNodeMaterial, PlaneGeometry,
  BoxGeometry, DoubleSide, BufferGeometry, Float32BufferAttribute, TextureLoader, RepeatWrapping, Vector2, DataTexture, FloatType, RGBAFormat, LinearFilter,
  Shape, Path, ExtrudeGeometry, CatmullRomCurve3, CurvePath, LineCurve3, QuadraticBezierCurve3, Color, Vector3, TubeGeometry, InstancedMesh, Matrix4, Quaternion, type Material } from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { BINDER, pocket, sheetCurve, sheetPoint, restingPoint, faceSide, faceHeight } from './BinderLayout';
import type { CardInstance } from '../card/CardInstance';
import { float, normalView, positionViewDirection, texture, vec2, vec3, positionGeometry, normalLocal, Fn, uniform } from 'three/tsl';

/** Raised annular weld impressions: open centres expose the dark separator. */
function perforatedSeams() {
  const vertices: number[] = [];
  const add = (x: number, y: number, vertical: boolean) => {
    const point = (a: number, r: number, z: number) => [x + Math.cos(a) * r * (vertical ? .66 : 1), y + Math.sin(a) * r * (vertical ? 1 : .66), z];
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, b = (k + 1) * Math.PI / 4;
      const outerA = point(a, .068, 0), outerB = point(b, .068, 0), innerA = point(a, .035, -.027), innerB = point(b, .035, -.027);
      vertices.push(...outerA, ...outerB, ...innerA, ...outerB, ...innerB, ...innerA);
    }
  };
  for (let c = 0; c <= 4; c++) for (let y = -14.2; y < 14.3; y += .18) add(1.2 + c * 7.05, y, true);
  for (let r = 0; r <= 3; r++) for (let x = 1.3; x < 29.3; x += .18) add(x, -14.175 + r * 9.45, false);
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
  geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array(vertices.length / 3 * 2), 2));
  return geometry;
}

interface Surface { mesh: Mesh; original: Float32Array; offset: number; }
export class BinderPage {
  readonly group = new Group();
  readonly cards = new Map<number, CardInstance>();
  private surfaces: Surface[] = [];
  private geometries = new Set<BufferGeometry>();
  private lastPose = '';
  private hit!: Mesh;
  private poseData = new Float32Array(513 * 4);
  private poseTexture = new DataTexture(this.poseData, 513, 1, RGBAFormat, FloatType);
  private reverse = uniform(1);
  private orientation = uniform(1);
  private pageMaterials: Material[] = [];
  get hitMesh() { this.hit.matrixWorld.copy(this.group.matrixWorld); return this.hit; }
  constructor(readonly index: number, readonly side: -1 | 1, private materials: { backing: Material; plastic: Material; weld: Material }) {
    this.group.name = `binder-page:${index}`;
    this.poseTexture.minFilter = this.poseTexture.magFilter = LinearFilter; this.poseTexture.generateMipmaps = false;
    this.surface(new PlaneGeometry(BINDER.pageWidth, BINDER.pageHeight, 96, 12), 0, 0, .42, materials.backing);
    // A separate physical film above the card, with a little tension at each lip.
    for (let i = 0; i < 12; i++) {
      const { u, y } = pocket(i, side);
      const geometry = new PlaneGeometry(6.8, 9.1, 40, 52);
      const pos = geometry.getAttribute('position');
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), yy = pos.getY(v);
        const lip = Math.exp(-(((yy - 4.34) / .15) ** 2)) * .055;
        const margin = Math.exp(-Math.min(3.4 - Math.abs(x), 4.55 - Math.abs(yy)) * 5);
        pos.setZ(v, lip + .028 * margin * Math.sin(x * 2.2 + yy * 1.7 + i) + .014 * Math.sin(x * 1.4 + i) * Math.sin(yy * 1.1));
      }
      geometry.computeVertexNormals();
      this.surface(geometry, u - BINDER.pageWidth / 2, y, .555, materials.plastic);
      // Double welds and an open top lip distinguish sleeve film from glass.
      for (const dx of [-3.49, -3.42, 3.42, 3.49])
        this.surface(new PlaneGeometry(.035, 9.24, 1, 12), u - BINDER.pageWidth / 2 + dx, y, .54, materials.weld);
      for (const dy of [-4.64, -4.56, 4.58])
        this.surface(new PlaneGeometry(6.98, .035, 20, 1), u - BINDER.pageWidth / 2, y + dy, .54, materials.weld);
    }
    this.surface(perforatedSeams(), -BINDER.pageWidth / 2, 0, .57, materials.weld);
    const hitGeometry = new PlaneGeometry(BINDER.pageWidth, BINDER.pageHeight, 96, 4);
    this.geometries.add(hitGeometry); this.hit = new Mesh(hitGeometry, materials.backing); this.hit.matrixAutoUpdate = false;
    // Three draw calls per face. Dense film and weld geometry remains static;
    // a tiny sampled curve drives all vertices on the GPU during a drag.
    const grouped = new Map<Material, Surface[]>();
    for (const surface of this.surfaces) { const material = surface.mesh.material as Material; const group = grouped.get(material) ?? []; group.push(surface); grouped.set(material, group); }
    this.surfaces = [];
    for (const [source, surfaces] of grouped) {
      const inputs = surfaces.map(s => { const g = s.mesh.geometry; if (!g.index) return g; const plain = g.toNonIndexed(); this.geometries.add(plain); return plain; });
      const geometry = mergeGeometries(inputs, false)!;
      surfaces.forEach(s => s.mesh.removeFromParent()); this.geometries.add(geometry);
      const material = (source as MeshStandardNodeMaterial).clone();
      material.positionNode = Fn(() => {
        const sample = texture(this.poseTexture, vec2(positionGeometry.x.div(BINDER.pageWidth).mul(512).add(.5).div(513), .5)).level(float(0)).toVar();
        const angle = sample.z, sin = angle.sin(), cos = angle.cos(), offset = positionGeometry.z.mul(this.reverse);
        const n = normalLocal.toVar(), nx = n.x.mul(this.reverse), ny = n.y.mul(this.orientation).mul(this.reverse), nz = n.z.mul(this.orientation);
        normalLocal.assign(vec3(nx.mul(cos).add(nz.mul(sin)), ny, nz.mul(cos).sub(nx.mul(sin))));
        return vec3(sample.x.add(sin.mul(offset)), positionGeometry.y, sample.y.add(cos.mul(offset)));
      })();
      this.pageMaterials.push(material);
      const mesh = new Mesh(geometry, material); mesh.frustumCulled = false; this.group.add(mesh);
      this.surfaces.push({ mesh, original: new Float32Array(0), offset: source === materials.backing ? 0 : 1 });
    }
    this.pose();
  }
  private surface(geometry: BufferGeometry, x: number, y: number, offset: number, material: Material) {
    geometry.translate(x + BINDER.pageWidth / 2, y, offset - .42);
    const mesh = new Mesh(geometry, material); mesh.frustumCulled = false;
    this.surfaces.push({ mesh, original: new Float32Array(geometry.getAttribute('position').array), offset });
    this.geometries.add(geometry); this.group.add(mesh);
  }
  attach(slot: number, card: CardInstance) { this.cards.set(slot, card); this.group.add(card.mesh); this.lastPose = ''; this.pose(); }
  pose(progress?: number, turningSide: -1 | 1 = this.side, reverse = false, height = faceHeight(this.index)) {
    const key = `${progress}:${turningSide}:${reverse}:${height}`;
    if (key === this.lastPose) return;
    this.lastPose = key;
    const turning = progress !== undefined;
    const curve = turning ? sheetCurve(progress!, turningSide, height) : undefined;
    this.reverse.value = reverse ? -1 : 1; this.orientation.value = turning ? turningSide : this.side;
    const points = new Map<number, ReturnType<typeof sheetPoint>>();
    const at = (u: number) => {
      let point = points.get(u);
      if (!point) { point = curve ? curve(u) : restingPoint(u, this.side, height); points.set(u, point); }
      return point;
    };
    for (let i = 0; i <= 512; i++) { const p = at(i / 512 * BINDER.pageWidth); this.poseData.set([p.x, p.z, p.angle, 1], i * 4); }
    this.poseTexture.needsUpdate = true;
    for (const surface of this.surfaces) surface.mesh.visible = !reverse || surface.offset !== 0;
    // Raycasting needs only the low-resolution separator, never the dense film.
    const hitPosition = this.hit.geometry.getAttribute('position');
    for (let i = 0; i < hitPosition.count; i++) { const u = i % 97 / 96 * BINDER.pageWidth, p = at(u); hitPosition.setX(i, p.x); hitPosition.setZ(i, p.z); }
    hitPosition.needsUpdate = true; this.hit.geometry.computeBoundingSphere();
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
  dispose() { this.group.removeFromParent(); this.cards.forEach(card => card.dispose()); this.cards.clear(); this.geometries.forEach(g => g.dispose()); this.pageMaterials.forEach(m => m.dispose()); this.poseTexture.dispose(); }
}

function roundedShape(width: number, height: number, radius: number) {
  const x = width / 2, y = height / 2, r = radius, shape = new Shape();
  shape.moveTo(-x + r, -y); shape.lineTo(x - r, -y); shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r); shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y); shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r); shape.quadraticCurveTo(-x, -y, -x + r, -y); return shape;
}
function slab(width: number, height: number, depth: number, radius: number) {
  const geometry = new ExtrudeGeometry(roundedShape(width, height, radius), { depth, steps: 1, bevelEnabled: true, bevelSize: Math.min(depth * .3, .16), bevelThickness: Math.min(depth * .2, .14), bevelSegments: 4, curveSegments: 16 });
  geometry.translate(0, 0, -depth / 2);
  const pos = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / width + .5, pos.getY(i) / height + .5);
  return geometry;
}
function ring(width: number, height: number, inset: number) {
  const shape = roundedShape(width, height, .16), hole = roundedShape(width - inset * 2, height - inset * 2, .12);
  const path = new Path(hole.getPoints(12)); shape.holes.push(path);
  const geometry = new ExtrudeGeometry(shape, { depth: .006, bevelEnabled: false, curveSegments: 8 });
  return geometry;
}

export class BinderScene {
  readonly group = new Group();
  readonly pages = new Map<number, BinderPage>();
  private geometries: BufferGeometry[] = [];
  private sheets: { body: Mesh; edge: Mesh; bodyOriginal: Float32Array; edgeOriginal: Float32Array }[] = [];
  private stackPose = '';
  private grain = new TextureLoader().load(`${import.meta.env.BASE_URL}binder/leather-grain.png`);
  private weave = new TextureLoader().load(`${import.meta.env.BASE_URL}binder/nylon-weave.png`);
  private weaveNormal = new TextureLoader().load(`${import.meta.env.BASE_URL}binder/nylon-normal.png`);
  private sleeveNormal = new TextureLoader().load(`${import.meta.env.BASE_URL}binder/sleeve-normal.png`);
  private materials = {
    cover: new MeshStandardNodeMaterial({ color: '#4c4f55', roughness: .64, metalness: .03 }),
    piping: new MeshStandardNodeMaterial({ color: '#454950', roughness: .58 }),
    fabric: new MeshPhysicalNodeMaterial({ color: '#464a50', roughness: .72, sheen: .55, sheenRoughness: .65, sheenColor: '#8a8d91', side: DoubleSide }),
    teeth: new MeshPhysicalNodeMaterial({ color: '#80858d', roughness: .38, metalness: .82 }),
    edge: new MeshPhysicalNodeMaterial({ color: '#929da7', roughness: .31, transparent: true, opacity: .22, depthWrite: false, side: DoubleSide }),
    backing: new MeshStandardNodeMaterial({ color: '#34383e', roughness: .78, side: DoubleSide }),
    plastic: new MeshPhysicalNodeMaterial({ color: '#e5e9ee', transparent: true, opacity: .1,
      roughness: .14, metalness: .05, clearcoat: 1, clearcoatRoughness: .12, ior: 1.46,
      depthWrite: false, side: DoubleSide }),
    weld: new MeshPhysicalNodeMaterial({ color: '#777d83', roughness: .26, metalness: .15, clearcoat: 1, transparent: true, opacity: .54, depthWrite: false, side: DoubleSide }),
    stitch: new MeshStandardNodeMaterial({ color: '#555358', roughness: .9 }),
  };
  constructor() {
    this.group.name = 'favorites-binder';
    this.grain.wrapS = this.grain.wrapT = RepeatWrapping; this.grain.repeat.set(9, 9);
    this.materials.cover.bumpMap = this.grain; this.materials.cover.bumpScale = .024;
    for (const texture of [this.weave, this.weaveNormal]) { texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(6, 6); texture.anisotropy = 8; }
    this.materials.fabric.map = this.weave; this.materials.fabric.normalMap = this.weaveNormal; this.materials.fabric.normalScale = new Vector2(.65, .65);
    this.materials.plastic.normalMap = this.sleeveNormal; this.materials.plastic.normalScale = new Vector2(.7, .7);
    this.materials.plastic.clearcoatNormalMap = this.sleeveNormal;
    this.materials.plastic.opacityNode = float(.028).add(float(1).sub(normalView.dot(positionViewDirection).abs()).pow(3).mul(.55));
    for (const side of [-1, 1] as const) {
      const center = side * 16.2;
      this.solid(slab(32.05, 33.15, .72, 1.18), center, 0, -.4, this.materials.cover);
      this.solid(slab(31.55, 32.65, .07, .94), center, 0, .04, this.materials.fabric);
      // Soft padding crowns above the shell, with compression folds at the seam.
      const cushion = new PlaneGeometry(31.1, 32.1, 80, 80);
      const p = cushion.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i);
        const cx = Math.max(0, Math.abs(x) - 14.75), cy = Math.max(0, Math.abs(y) - 15.25);
        if (cx > 0 && cy > 0) { const length = Math.hypot(cx, cy); if (length > .8) { x = Math.sign(x) * (14.75 + cx / length * .8); y = Math.sign(y) * (15.25 + cy / length * .8); } }
        const edge = Math.max(0, Math.min(15.55 - Math.abs(x), 16.05 - Math.abs(y)));
        const crown = .25 * (1 - Math.exp(-edge * 3));
        const fold = .025 * Math.sin(x * 2.3 + y * 1.5) * edge * Math.exp(-edge * 3);
        p.setXYZ(i, x, y, crown + fold);
      }
      cushion.computeVertexNormals(); this.solid(cushion, center, 0, -.05, this.materials.fabric);
    }
    this.solid(slab(.72, 30.6, .45, .24), 0, 0, 2.48, this.materials.fabric);
    this.solid(new BoxGeometry(.06, 31.5, .045), -.32, 0, .28, this.materials.stitch);
    this.solid(new BoxGeometry(.06, 31.5, .045), .32, 0, .28, this.materials.stitch);
    this.zipper();
    for (let i = 0; i < BINDER.sheets; i++) {
      const bodyGeometry = new PlaneGeometry(BINDER.pageWidth, BINDER.pageHeight, 96, 2);
      bodyGeometry.translate(BINDER.pageWidth / 2, 0, 0);
      const edgeVertices: number[] = [];
      for (const y of [-BINDER.pageHeight / 2, BINDER.pageHeight / 2]) for (let j = 0; j < 96; j++) {
        const a = j * BINDER.pageWidth / 96, b = (j + 1) * BINDER.pageWidth / 96;
        edgeVertices.push(a,y,0,b,y,0,a,y+.045,0,b,y,0,b,y+.045,0,a,y+.045,0);
      }
      const edgeGeometry = new BufferGeometry(); edgeGeometry.setAttribute('position', new Float32BufferAttribute(edgeVertices, 3)); edgeGeometry.computeVertexNormals();
      const body = this.solid(bodyGeometry, 0, 0, 0, this.materials.backing), edge = this.solid(edgeGeometry, 0, 0, 0, this.materials.edge);
      body.name = `physical-sheet:${i}`; edge.name = `transparent-sheet-edge:${i}`;
      body.frustumCulled = edge.frustumCulled = false;
      this.sheets.push({ body, edge, bodyOriginal: new Float32Array(bodyGeometry.getAttribute('position').array), edgeOriginal: new Float32Array(edgeGeometry.getAttribute('position').array) });
    }
    this.stack(1);
  }
  private zipper() {
    const curve = new CurvePath<Vector3>(), x = 32.4, y = 16.9, r = 1.3;
    const v = (a: number, b: number) => new Vector3(a, b, .28);
    curve.add(new LineCurve3(v(-x+r,-y),v(x-r,-y))); curve.add(new QuadraticBezierCurve3(v(x-r,-y),v(x,-y),v(x,-y+r)));
    curve.add(new LineCurve3(v(x,-y+r),v(x,y-r))); curve.add(new QuadraticBezierCurve3(v(x,y-r),v(x,y),v(x-r,y)));
    curve.add(new LineCurve3(v(x-r,y),v(-x+r,y))); curve.add(new QuadraticBezierCurve3(v(-x+r,y),v(-x,y),v(-x,y-r)));
    curve.add(new LineCurve3(v(-x,y-r),v(-x,-y+r))); curve.add(new QuadraticBezierCurve3(v(-x,-y+r),v(-x,-y),v(-x+r,-y)));
    const count = Math.ceil(curve.getLength() / .22), samples = curve.getSpacedPoints(count);
    const ribbon: number[] = [], uv: number[] = [];
    const offsets = (i: number, offset: number, z: number) => {
      const t = Math.min(1, i / count), p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
      return new Vector3(p.x + tangent.y * offset, p.y - tangent.x * offset, z);
    };
    for (let i = 0; i < count; i++) {
      const a = offsets(i, -.36, .22), b = offsets(i, .36, .22), c = offsets(i + 1, -.36, .22), d = offsets(i + 1, .36, .22);
      for (const p of [a, b, c, b, d, c]) ribbon.push(p.x, p.y, p.z);
      uv.push(i / count, 0, i / count, 1, (i + 1) / count, 0, i / count, 1, (i + 1) / count, 1, (i + 1) / count, 0);
    }
    const tape = new BufferGeometry(); tape.setAttribute('position', new Float32BufferAttribute(ribbon, 3)); tape.setAttribute('uv', new Float32BufferAttribute(uv, 2)); tape.computeVertexNormals();
    this.solid(tape, 0, 0, 0, this.materials.fabric);
    for (const [offset, radius, material] of [[.53, .25, this.materials.cover], [-.11, .043, this.materials.piping], [.11, .043, this.materials.piping]] as const) {
      const path = new CatmullRomCurve3(samples.slice(0, -1).map((_, i) => offsets(i, offset, offset === .53 ? .04 : .29)), true);
      this.solid(new TubeGeometry(path, count, radius, 16, true), 0, 0, 0, material);
    }
    const tooth = new Shape();
    tooth.moveTo(-.052,-.105); tooth.lineTo(.052,-.105); tooth.lineTo(.052,-.025); tooth.lineTo(.079,.015);
    tooth.lineTo(.079,.08); tooth.lineTo(.026,.107); tooth.lineTo(-.026,.107); tooth.lineTo(-.079,.08); tooth.lineTo(-.079,.015); tooth.lineTo(-.052,-.025); tooth.closePath();
    const toothGeometry = new ExtrudeGeometry(tooth, { depth: .065, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 3 });
    // Smooth bevel facets so subpixel faces do not flash in otherwise dark metal.
    // Work at a larger scale to keep the normal welder's tolerance below the bevel size.
    toothGeometry.scale(100, 100, 100);
    toCreasedNormals(toothGeometry);
    toothGeometry.scale(.01, .01, .01);
    const stitchGeometry = new BoxGeometry(.115, .023, .015);
    this.geometries.push(toothGeometry, stitchGeometry);
    const teeth = new InstancedMesh(toothGeometry, this.materials.teeth, count * 2);
    const stitches = new InstancedMesh(stitchGeometry, this.materials.stitch, count * 2);
    const matrix = new Matrix4(), q = new Quaternion();
    for (let i = 0; i < count; i++) {
      const tangent = curve.getTangentAt(i / count), angle = Math.atan2(tangent.y, tangent.x);
      q.setFromAxisAngle(new Vector3(0, 0, 1), angle);
      for (let row = 0; row < 2; row++) {
        const sample = i + (row ? .5 : 0), rowAngle = angle + (row ? Math.PI : 0);
        q.setFromAxisAngle(new Vector3(0, 0, 1), rowAngle);
        matrix.compose(offsets(sample, row ? .12 : -.12, .33), q, new Vector3(1, 1, 1)); teeth.setMatrixAt(i * 2 + row, matrix);
        teeth.setColorAt(i * 2 + row, new Color().setScalar(.88 + .08 * Math.sin(i * 1.7)));
        q.setFromAxisAngle(new Vector3(0, 0, 1), angle);
        matrix.compose(offsets(i, row ? .34 : -.34, .255), q, new Vector3(1, 1, 1)); stitches.setMatrixAt(i * 2 + row, matrix);
      }
    }
    teeth.name = 'individual-zipper-teeth'; stitches.name = 'perimeter-stitching'; this.group.add(teeth, stitches);
    this.solid(slab(.49, .62, .11, .16), .18, -16.94, .36, this.materials.teeth);
    this.solid(slab(.23, .36, .1, .08), .18, -16.95, .48, this.materials.teeth);
    for (const dx of [-.18, .18]) this.solid(new RoundedBoxGeometry(.08, .38, .07, 3, .025), .18 + dx, -16.94, .45, this.materials.piping);
    const pullShape = roundedShape(.46, 1.35, .18); pullShape.holes.push(new Path(roundedShape(.23, .79, .09).getPoints(12)));
    const pull = new ExtrudeGeometry(pullShape, { depth: .065, bevelEnabled: true, bevelThickness: .02, bevelSize: .025, bevelSegments: 2 });
    const tab = this.solid(pull, .23, -17.9, .32, this.materials.teeth); tab.rotation.z = -.18;
  }
  stack(spread: number, turningSheet?: number) {
    const key = `${spread}:${turningSheet}`; if (key === this.stackPose) return; this.stackPose = key;
    for (let sheet = 0; sheet < BINDER.sheets; sheet++) {
      const side = sheet < spread ? -1 : 1;
      const z = .26 + (side === -1 ? sheet + 1 : BINDER.sheets - sheet) * BINDER.sheetThickness - .05;
      const layer = this.sheets[sheet]; layer.body.visible = layer.edge.visible = sheet !== turningSheet;
      for (const [mesh, original, offset] of [[layer.body, layer.bodyOriginal, 0], [layer.edge, layer.edgeOriginal, .025]] as const) {
        const pos = mesh.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) { const p = restingPoint(original[i * 3], side, z); pos.setXYZ(i, p.x, original[i * 3 + 1], p.z + offset); }
        pos.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
      }
    }
  }
  private solid(geometry: BufferGeometry, x: number, y: number, z: number, material: Material) {
    const mesh = new Mesh(geometry, material); mesh.position.set(x, y, z); this.geometries.push(geometry); this.group.add(mesh); return mesh;
  }
  page(index: number) {
    let page = this.pages.get(index);
    if (!page) { page = new BinderPage(index, faceSide(index), this.materials); this.pages.set(index, page); this.group.add(page.group); }
    return page;
  }
  retain(indices: Set<number>) { for (const [index, page] of this.pages) if (!indices.has(index)) { page.dispose(); this.pages.delete(index); } }
  dispose() { this.retain(new Set()); this.geometries.forEach(g => g.dispose()); Object.values(this.materials).forEach(m => m.dispose()); for (const t of [this.grain, this.weave, this.weaveNormal, this.sleeveNormal]) t.dispose(); this.group.removeFromParent(); }
}
