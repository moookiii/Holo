import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, CylinderGeometry, DoubleSide,
  ExtrudeGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, MeshPhysicalMaterial,
  MeshStandardMaterial, Path, Shape, SphereGeometry, TorusGeometry, TubeGeometry, Vector3,
  type Material,
} from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Inspection } from '../types.ts';

export type P = [number, number, number];
export type XY = [number, number];
export const ref = (x: number, y: number, z = 0): P => [(x - 800) / 220, (500 - y) / 220, z];

/** Small component library; flattened to material batches only after assembly. */
export class BirdParts {
  readonly geometries = new Set<BufferGeometry>();
  readonly materials = new Set<Material>();
  readonly shellMaterials: MeshPhysicalMaterial[] = [];
  private readonly unitBox = new BoxGeometry(1, 1, 1);
  private readonly unitSphere = new SphereGeometry(1, 14, 10);
  private readonly unitRod = new CylinderGeometry(1, 1, 1, 12);
  readonly m = {
    aluminium: this.material('#9caaa9', .82, .3),
    steel: this.material('#74837f', .93, .21),
    solder: this.material('#bfc5ba', .76, .28),
    brass: this.material('#aa8850', .78, .3),
    copper: this.material('#996c48', .76, .4),
    pcb: this.material('#15553d', .12, .51),
    pcbDark: this.material('#164631', .08, .58),
    trace: this.material('#438364', .35, .46),
    silk: this.material('#aab79e', .02, .68),
    black: this.material('#161b19', .05, .49),
    rubber: this.material('#242b26', .0, .8),
    ceramic: this.material('#aa9b78', .05, .58),
    pink: this.material('#cc507b', .02, .37),
    pinkLight: this.material('#e0809a', .02, .41),
    greenWire: this.material('#3b8777', .02, .45),
    whiteWire: this.material('#d0c8ad', .02, .48),
    acrylic: this.acrylic(.075),
    acrylicSatin: this.acrylic(.12),
    acrylicEdge: this.acrylic(.16, .42),
    lens: this.material('#071514', .52, .12),
  };

  material(color: string, metalness: number, roughness: number) {
    const material = new MeshStandardMaterial({ color, metalness, roughness });
    this.materials.add(material);
    return material;
  }

  private acrylic(roughness: number, transmission = .96) {
    const material = new MeshPhysicalMaterial({
      color: '#f0f5ef', roughness, metalness: 0, transmission,
      thickness: .024, ior: 1.46, transparent: true, opacity: .96,
      depthWrite: false, side: DoubleSide, clearcoat: 1, clearcoatRoughness: .1,
      envMapIntensity: 1.7,
      attenuationColor: '#d9ede0', attenuationDistance: 12,
    });
    material.userData.clearRoughness = roughness;
    material.userData.clearTransmission = transmission;
    this.shellMaterials.push(material); this.materials.add(material);
    return material;
  }

  mesh(parent: Group, geometry: BufferGeometry, material: Material, at: P = [0, 0, 0]) {
    this.geometries.add(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.fromArray(at);
    mesh.userData.inspectionShell = this.shellMaterials.includes(material as MeshPhysicalMaterial);
    parent.add(mesh);
    return mesh;
  }

  group(parent: Group, name: string, at: P = [0, 0, 0], rotation: P = [0, 0, 0]) {
    const group = new Group(); group.name = name;
    group.position.fromArray(at); group.rotation.set(...rotation); parent.add(group);
    return group;
  }

  box(parent: Group, at: P, size: P, material: Material) {
    const mesh = this.mesh(parent, this.unitBox, material, at); mesh.scale.fromArray(size); return mesh;
  }

  ball(parent: Group, at: P, size: P, material: Material) {
    const mesh = this.mesh(parent, this.unitSphere, material, at); mesh.scale.fromArray(size); return mesh;
  }

  rod(parent: Group, start: P, end: P, radius: number, material: Material) {
    const a = new Vector3(...start), b = new Vector3(...end), delta = b.clone().sub(a);
    const mesh = this.mesh(parent, this.unitRod, material);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.scale.set(radius, delta.length(), radius);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize()); return mesh;
  }

  cylinder(parent: Group, at: P, radius: number, depth: number, material: Material, sides = 24) {
    const mesh = this.mesh(parent, new CylinderGeometry(radius, radius, depth, sides), material, at);
    mesh.rotation.x = Math.PI / 2; return mesh;
  }

  ring(parent: Group, at: P, radius: number, tube: number, material: Material) {
    return this.mesh(parent, new TorusGeometry(radius, tube, 6, 32), material, at);
  }

  tube(parent: Group, points: P[], radius: number, material: Material, segments = 40) {
    const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p)), false, 'centripetal');
    return this.mesh(parent, new TubeGeometry(curve, segments, radius, 6, false), material);
  }

  /** Fine etched/silk lines lie on board surfaces; all are eventually one batch. */
  line(parent: Group, start: XY, end: XY, z: number, width: number, material: Material) {
    const dx = end[0] - start[0], dy = end[1] - start[1];
    const line = this.box(parent, [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, z], [Math.hypot(dx, dy), width, .001], material);
    line.rotation.z = Math.atan2(dy, dx);
  }

  plate(parent: Group, outline: XY[], z: number, depth: number, material: Material, holes: [number, number, number][] = [], bevel = .005) {
    const shape = new Shape(); shape.moveTo(...outline[0]);
    for (const point of outline.slice(1)) shape.lineTo(...point); shape.closePath();
    for (const [x, y, radius] of holes) { const hole = new Path(); hole.absarc(x, y, radius, 0, Math.PI * 2, true); shape.holes.push(hole); }
    return this.mesh(parent, new ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 16 }), material, [0, 0, z]);
  }

  screw(parent: Group, at: P, radius = .031, length = .055, direction = 1) {
    this.cylinder(parent, [at[0], at[1], at[2] - direction * length / 2], radius * .54, length, this.m.steel, 12);
    this.ring(parent, at, radius * .92, radius * .16, this.m.solder);
    this.cylinder(parent, [at[0], at[1], at[2] + direction * .009], radius * .75, .015, this.m.brass, 16);
    const z = at[2] + direction * .018;
    this.box(parent, [at[0], at[1], z], [radius, radius * .15, .002], this.m.black);
    this.box(parent, [at[0], at[1], z], [radius * .15, radius, .002], this.m.black);
  }

  /** Double surface with real edge walls for a pressed acrylic panel. */
  surface(parent: Group, sample: (u: number, v: number) => Vector3, nu: number, nv: number, thickness = .018, satin = false, material?: Material) {
    const positions: number[] = [], indices: number[] = [], count = (nu + 1) * (nv + 1);
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = j / nv, p = sample(u, v);
      const a = sample(Math.min(1, u + .0001), v).sub(sample(Math.max(0, u - .0001), v));
      const b = sample(u, Math.min(1, v + .0001)).sub(sample(u, Math.max(0, v - .0001)));
      p.addScaledVector(a.cross(b).normalize(), (layer ? -.5 : .5) * thickness);
      positions.push(p.x, p.y, p.z);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + nv + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1, a + count, a + count + 1, b + count, a + count + 1, b + count + 1, b + count);
    }
    const wall = (a: number, b: number) => indices.push(a, a + count, b, b, a + count, b + count);
    for (let i = 0; i < nu; i++) { wall(i * (nv + 1), (i + 1) * (nv + 1)); wall(i * (nv + 1) + nv, (i + 1) * (nv + 1) + nv); }
    for (let j = 0; j < nv; j++) { wall(j, j + 1); wall(nu * (nv + 1) + j, nu * (nv + 1) + j + 1); }
    const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    this.mesh(parent, geometry, material ?? (satin ? this.m.acrylicSatin : this.m.acrylic));
  }

  batch(root: Group, groups: Map<string, Group>) {
    root.updateMatrixWorld(true);
    let meshCount = 0, triangles = 0;
    for (const group of groups.values()) {
      const batches = new Map<Material, Mesh[]>();
      group.traverse(object => { if (object instanceof Mesh) { const mat = object.material as Material; const batch = batches.get(mat) ?? []; batch.push(object); batches.set(mat, batch); } });
      const inverse = new Matrix4().copy(group.matrixWorld).invert();
      for (const [material, objects] of batches) {
        const copies = objects.map(object => {
          const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
          geometry.applyMatrix4(new Matrix4().multiplyMatrices(inverse, object.matrixWorld));
          // Some authored surfaces have no UVs; this model uses material colors.
          geometry.deleteAttribute('uv'); return geometry;
        });
        const merged = mergeGeometries(copies)!;
        for (const copy of copies) copy.dispose();
        for (const object of objects) object.removeFromParent();
        this.mesh(group, merged, material); meshCount++; triangles += merged.attributes.position.count / 3;
      }
      // Empty component transform groups no longer have a rendering role.
      for (const child of [...group.children]) if (child instanceof Group) group.remove(child);
    }
    root.userData.geometryStats = { meshes: meshCount, triangles };
    const rendered = new Set<BufferGeometry>(); root.traverse(o => { if (o instanceof Mesh) rendered.add(o.geometry); });
    for (const geometry of this.geometries) if (!rendered.has(geometry)) { geometry.dispose(); this.geometries.delete(geometry); }
  }

  inspect(root: Group, mode: Inspection) {
    root.traverse(object => { if (object instanceof Mesh && object.userData.inspectionShell) object.visible = mode !== 'hidden'; });
    for (const material of this.shellMaterials) {
      material.roughness = mode === 'frosted' ? .48 : material.userData.clearRoughness;
      material.transmission = mode === 'frosted' ? .86 : material.userData.clearTransmission;
      material.opacity = .96; // Frosting is a rough transmission response, not opacity.
      material.clearcoat = mode === 'frosted' ? .05 : 1;
    }
  }

  dispose() { for (const geometry of this.geometries) geometry.dispose(); for (const material of this.materials) material.dispose(); }
}
