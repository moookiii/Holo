import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicNodeMaterial, type Raycaster } from 'three/webgpu';
import { ease } from '../PackMath';
import type { WrapperPose } from './PackWrapper';

/** A coarse, CPU-only collision skin follows the same continuous film pose.
 * It is never attached to the scene, uploaded, compiled or rendered. Updating
 * only when a pointer samples the object keeps animation entirely on the GPU. */
export class WrapperPicking {
  private material = new MeshBasicNodeMaterial({ side: DoubleSide });
  private skins: { source: Mesh; mesh: Mesh; rest: Float32Array; coordinates: Float32Array; strip: boolean; side: number }[] = [];
  private lastPose = '';
  constructor(private tearHeight: number) {}

  add(source: Mesh, strip: boolean, side: number, columns: number, rows: number) {
    const sourcePosition = source.geometry.getAttribute('position');
    const sourceCoordinates = source.geometry.getAttribute('filmCoordinates');
    const nx = 24, ny = strip ? 5 : 20;
    const rest: number[] = [], coordinates: number[] = [], indices: number[] = [];
    for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
      const index = Math.round(y / ny * rows) * (columns + 1) + Math.round(x / nx * columns);
      rest.push(sourcePosition.getX(index), sourcePosition.getY(index), sourcePosition.getZ(index));
      coordinates.push(sourceCoordinates.getX(index), sourceCoordinates.getY(index));
    }
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const a = y * (nx + 1) + x, b = a + 1, c = a + nx + 1;
      indices.push(a, b, c, b, c + 1, c);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(rest, 3)); geometry.setIndex(indices);
    this.skins.push({ source, mesh: new Mesh(geometry, this.material), rest: new Float32Array(rest), coordinates: new Float32Array(coordinates), strip, side });
  }

  raycast(ray: Raycaster, pose: WrapperPose) {
    const key = [pose.tear, pose.mouth, pose.grip, pose.collapse, pose.tension].join(':');
    const changed = key !== this.lastPose; this.lastPose = key;
    for (const skin of this.skins) {
      skin.mesh.matrixWorld.copy(skin.source.matrixWorld);
      if (!changed) continue;
      const positions = skin.mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const u = skin.coordinates[i * 2], y0 = skin.coordinates[i * 2 + 1];
        const edge = Math.max(0, 1 - u * u), top = ease((y0 - 2.4) / (this.tearHeight - 2.4));
        const behind = pose.tear * 2.2 - 1 - u;
        const free = ease(behind / .2), peeled = Math.max(0, Math.min(1, behind * .5));
        let x = skin.rest[i * 3], y = skin.rest[i * 3 + 1], z = skin.rest[i * 3 + 2];
        if (skin.strip) {
          const lift = free * pose.tear, curl = lift * (.28 + peeled * .7);
          x += lift * (.05 + peeled * .12);
          const restY = y, restZ = z;
          y = restY * Math.cos(curl) - restZ * Math.sin(curl) + lift * (.16 + peeled * .9);
          z = restY * Math.sin(curl) + restZ * Math.cos(curl) + lift * (.10 + Math.sin(peeled * 2.4) * .85);
        } else {
          const lip = ease((y0 - this.tearHeight + .6) / .6) * edge * pose.mouth;
          const strain = Math.exp(-((behind / .25) ** 2)) * Math.max(-1, Math.min(1, pose.tension)) * top * edge * .032;
          x += pose.tension * .038 * top * edge * Math.sin(y0 * 8 + u * 12);
          y -= pose.mouth * top * edge ** .65 * (skin.side > 0 ? 1.42 : .16) + lip * .055 + pose.collapse * .2 * edge * Math.sin(y0 * 2);
          z += skin.side * (pose.mouth * top * edge * .66 + free * top * edge * .045
            + pose.grip * .11 * Math.exp(-24 * (u + .83) ** 2) * top * edge + lip * .12 + strain);
          z = z * (1 - pose.collapse * .74) + pose.collapse * .07 * edge * Math.sin(y0 * 3 + u * 6);
        }
        positions.setXYZ(i, x, y, z);
      }
      skin.mesh.geometry.computeBoundingSphere();
    }
    return ray.intersectObjects(this.skins.map(skin => skin.mesh), false)[0];
  }
  dispose() { this.skins.forEach(skin => skin.mesh.geometry.dispose()); this.material.dispose(); }
}
