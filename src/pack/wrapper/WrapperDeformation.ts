import type { MeshPhysicalNodeMaterial, Node } from 'three/webgpu';
import { attribute, float, Fn, mix, positionGeometry, transformNormalToView, uniform, vec3, vec4, varying, faceDirection } from 'three/tsl';
import type { WrapperPose } from './PackWrapper';

/** Constant-size CPU updates. Both the surface and its smooth differential
 * normal are evaluated on the GPU; no vertex upload occurs during interaction. */
export class WrapperDeformation {
  readonly tear = uniform(0);
  readonly mouth = uniform(0);
  readonly grip = uniform(0);
  readonly collapse = uniform(0);
  readonly tension = uniform(0);
  private position;
  private normal;
  constructor(tearHeight: number) {
    const eased = (value: Node<'float'>) => { const t = value.clamp(0, 1); return t.pow3().mul(t.mul(t.mul(6).sub(15)).add(10)); };
    const deform = Fn(([point, coordinates]: [Node<'vec3'>, Node<'vec4'>]) => {
      const u = coordinates.x, y0 = coordinates.y, side = coordinates.z;
      const strip = attribute('filmType', 'vec2').x;
      const edge = float(1).sub(u.pow2()).max(.00001);
      const top = eased(y0.sub(2.4).div(tearHeight - 2.4));
      const free = mix(eased(this.tear.mul(2).sub(1).sub(u).div(.2)).mul(float(this.tear.greaterThan(0))), float(1), float(this.tear.greaterThanEqual(1)));
      const lift = free.mul(this.tear);
      const bodyZ = point.z.add(side.mul(this.mouth, top, edge, .66)).add(side.mul(free, top, .045))
        .add(side.mul(this.grip, .11, u.add(.83).pow2().mul(-24).exp(), top))
        .mul(float(1).sub(this.collapse.mul(.74))).add(this.collapse.mul(.07, edge, y0.mul(3).add(u.mul(6)).sin()));
      const bodyY = point.y.sub(this.mouth.mul(top, edge.pow(.65), mix(.16, 1.42, float(side.greaterThan(0)))))
        .sub(this.collapse.mul(.2, edge, y0.mul(2).sin()));
      return vec3(
        point.x.add(mix(this.tension.mul(.038, top, y0.mul(8).add(u.mul(12)).sin()), lift.mul(.18), strip)),
        mix(bodyY, point.y.add(lift.mul(float(1).sub(u).mul(.23).add(.40))), strip),
        mix(bodyZ, point.z.add(lift.mul(u.mul(2.4).sin().mul(.40).add(.48))), strip),
      );
    });
    const coordinates = attribute('filmCoordinates', 'vec4');
    const tangentU = attribute('filmTangentU', 'vec3'), tangentV = attribute('filmTangentV', 'vec3');
    const position = deform(positionGeometry, coordinates);
    this.position = position;
    const epsilon = .0005;
    const du = deform(positionGeometry.add(tangentU.mul(epsilon)), coordinates.add(vec4(epsilon, 0, 0, 0))).sub(position);
    const dv = deform(positionGeometry.add(tangentV.mul(epsilon)), coordinates.add(vec4(0, epsilon, 0, 0))).sub(position);
    const sign = coordinates.z.mul(float(1).sub(coordinates.w.mul(2)));
    const surfaceNormal = du.cross(dv).normalize().mul(sign);
    const rim = attribute('filmType', 'vec2').y;
    const normal = mix(surfaceNormal, attribute('normal', 'vec3'), rim);
    this.normal = varying(transformNormalToView(normal), 'v_wrapperNormal').normalize().mul(faceDirection);
  }
  apply(material: MeshPhysicalNodeMaterial) {
    material.positionNode = this.position;
    material.normalNode = this.normal;
    material.clearcoatNormalNode = this.normal;
  }
  update(pose: WrapperPose) {
    this.tear.value = pose.tear; this.mouth.value = pose.mouth; this.grip.value = pose.grip;
    this.collapse.value = pose.collapse; this.tension.value = pose.tension;
  }
}
