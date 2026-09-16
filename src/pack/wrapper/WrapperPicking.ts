import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicNodeMaterial, type Raycaster } from 'three/webgpu';
import { ease } from '../PackMath';
import type { WrapperPose } from './PackWrapper';
import type { WrapperTearPath } from './WrapperTearPath';

/** A coarse, CPU-only collision skin follows the same continuous film pose.
 * It is never attached to the scene, uploaded, compiled or rendered. Updating
 * only when a pointer samples the object keeps animation entirely on the GPU. */
export class WrapperPicking {
  private material = new MeshBasicNodeMaterial({ side: DoubleSide });
  private skins: { source: Mesh; mesh: Mesh; rest: Float32Array; coordinates: Float32Array; seams: Float32Array; strip: boolean; side: number }[] = [];
  private lastPose = '';
  constructor(private tearHeight: number, private halfHeight: number, private path: WrapperTearPath) {}

  add(source: Mesh, strip: boolean, side: number, columns: number, rows: number) {
    const sourcePosition = source.geometry.getAttribute('position');
    const sourceCoordinates = source.geometry.getAttribute('filmCoordinates');
    const nx = 72, ny = strip ? 5 : 20;
    const rest: number[] = [], coordinates: number[] = [], seams: number[] = [], indices: number[] = [];
    for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
      const index = Math.round(y / ny * rows) * (columns + 1) + Math.round(x / nx * columns);
      rest.push(sourcePosition.getX(index), sourcePosition.getY(index), sourcePosition.getZ(index));
      coordinates.push(sourceCoordinates.getX(index), sourceCoordinates.getY(index));
      seams.push(source.geometry.getAttribute('filmSeam').getX(index));
    }
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const a = y * (nx + 1) + x, b = a + 1, c = a + nx + 1;
      indices.push(a, b, c, b, c + 1, c);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(rest, 3)); geometry.setIndex(indices);
    // Interpolated hit coordinates identify the original sheet even after a
    // freed strip has curled or moved sideways under the pointer.
    geometry.setAttribute('uv', new Float32BufferAttribute(coordinates, 2));
    this.skins.push({ source, mesh: new Mesh(geometry, this.material), rest: new Float32Array(rest), coordinates: new Float32Array(coordinates), seams: new Float32Array(seams), strip, side });
  }

  raycast(ray: Raycaster, pose: WrapperPose) {
    const key = [this.path.revision, this.path.gripU, this.path.tipU, pose.mouth, pose.grip, pose.collapse, pose.tension, pose.pullX, pose.pullY].join(':');
    const changed = key !== this.lastPose; this.lastPose = key;
    for (const skin of this.skins) {
      skin.mesh.matrixWorld.copy(skin.source.matrixWorld);
      if (!changed) continue;
      const positions = skin.mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const u = skin.coordinates[i * 2], y0 = skin.coordinates[i * 2 + 1];
        const edge = Math.max(0, 1 - u * u), top = ease((y0 - 2.4) / (this.tearHeight - 2.4));
        const free = this.path.sample(u, 1), peeled = this.path.sample(u, 2), seamY = skin.seams[i];
        const seamBand = skin.strip ? ease((this.halfHeight - y0) / (this.halfHeight - seamY)) : ease((y0 - seamY + 1.2) / 1.2);
        const gripWeight = Math.exp(-4 * (u - this.path.gripU) ** 2), tipWeight = Math.exp(-42 * (u - this.path.tipU) ** 2);
        const pinch = Math.exp(-65 * (u - this.path.gripU) ** 2) * pose.grip * top;
        let x = skin.rest[i * 3], y = skin.rest[i * 3 + 1], z = skin.rest[i * 3 + 2];
        const restZ = z;
        const lip = ease((y0 - this.tearHeight + .6) / .6) * edge * pose.mouth;
        const strain = tipWeight * Math.max(-1, Math.min(1, pose.tension)) * top * edge * .045;
        x += pose.tension * .025 * top * edge * tipWeight * Math.sin(y0 * 8 + (u - this.path.tipU) * 24);
        y += this.path.sample(u, 0) * seamBand;
        y -= pose.mouth * top * edge ** .65 * (skin.side > 0 ? 1.42 : .16) + lip * .055 + pose.collapse * .2 * edge * Math.sin(y0 * 2);
        z += skin.side * (pose.mouth * top * edge * .66 + free * top * edge * .045 - pinch * .055 * edge + lip * .12 + strain);
        z = z * (1 - pose.collapse * .74) + pose.collapse * .07 * edge * Math.sin(y0 * 3 + u * 6);
        if (skin.strip) {
          const curl = free * (.22 + peeled * .85 + pose.pullY * .18 * gripWeight), relativeY = y0 - seamY;
          x += free * (pose.pullX * .50 * gripWeight + peeled * .12 * this.path.direction);
          y += relativeY * (Math.cos(curl) - 1) - restZ * Math.sin(curl) + free * (.10 + peeled * .78 + pose.pullY * .7 * gripWeight);
          z += relativeY * Math.sin(curl) + restZ * (Math.cos(curl) - 1) + free * (.14 + peeled * .62 + Math.abs(pose.pullY) * .16 * gripWeight);
        }
        positions.setXYZ(i, x, y, z);
      }
      skin.mesh.geometry.computeBoundingSphere();
    }
    return ray.intersectObjects(this.skins.map(skin => skin.mesh), false)[0];
  }
  dispose() { this.skins.forEach(skin => skin.mesh.geometry.dispose()); this.material.dispose(); }
}
