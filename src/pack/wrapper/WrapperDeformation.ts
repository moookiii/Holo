import type { MeshPhysicalNodeMaterial, Node } from 'three/webgpu';
import { attribute, float, Fn, mix, normalFlat, positionGeometry, transformNormalToView, uniform, vec3, vec4, varying, faceDirection } from 'three/tsl';
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
  readonly normal: Node<'vec3'>;
  constructor(tearHeight: number) {
    const eased = (value: Node<'float'>) => { const t = value.clamp(0, 1); return t.pow3().mul(t.mul(t.mul(6).sub(15)).add(10)); };
    const deform = Fn(([point, coordinates]: [Node<'vec3'>, Node<'vec4'>]) => {
      const u = coordinates.x, y0 = coordinates.y, side = coordinates.z;
      const strip = attribute('filmType', 'vec2').x;
      const edge = float(1).sub(u.pow2()).max(0);
      const top = eased(y0.sub(2.4).div(tearHeight - 2.4));
      const behind = this.tear.mul(2.2).sub(1).sub(u);
      const free = eased(behind.div(.2));
      const peeled = behind.mul(.5).clamp(0, 1);
      const lift = free.mul(this.tear);
      const lip = eased(y0.sub(tearHeight - .6).div(.6)).mul(edge, this.mouth);
      const strain = behind.div(.25).pow2().negate().exp().mul(this.tension.clamp(-1, 1), top, edge, .032);
      const bodyZ = point.z.add(side.mul(this.mouth, top, edge, .66)).add(side.mul(free, top, edge, .045))
        .add(side.mul(this.grip, .11, u.add(.83).pow2().mul(-24).exp(), top, edge))
        .add(side.mul(lip, .12)).add(side.mul(strain))
        .mul(float(1).sub(this.collapse.mul(.74))).add(this.collapse.mul(.07, edge, y0.mul(3).add(u.mul(6)).sin()));
      const bodyY = point.y.sub(this.mouth.mul(top, edge.pow(.65), mix(.16, 1.42, float(side.greaterThan(0)))))
        .sub(lip.mul(.055)).sub(this.collapse.mul(.2, edge, y0.mul(2).sin()));
      // Lift builds behind the tear front. Rotate the strip's cross-section as
      // it peels, exposing its lining and giving the freed end a continuous curl.
      const curl = lift.mul(peeled.mul(.7).add(.28));
      const stripY = point.y.mul(curl.cos()).sub(point.z.mul(curl.sin())).add(lift.mul(peeled.mul(.9).add(.16)));
      const stripZ = point.y.mul(curl.sin()).add(point.z.mul(curl.cos())).add(lift.mul(peeled.mul(2.4).sin().mul(.85).add(.10)));
      return vec3(
        point.x.add(mix(this.tension.mul(.038, top, edge, y0.mul(8).add(u.mul(12)).sin()), lift.mul(peeled.mul(.12).add(.05)), strip)),
        mix(bodyY, stripY, strip),
        mix(bodyZ, stripZ, strip),
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
    const normal = varying(transformNormalToView(surfaceNormal), 'v_wrapperNormal').normalize().mul(faceDirection);
    // The tiny cut walls turn with the film too. Their rest-pose normals would
    // leave the highlight pointing the wrong way once the strip has curled.
    this.normal = mix(normal, normalFlat, rim);
  }
  apply(material: MeshPhysicalNodeMaterial) {
    material.positionNode = this.position;
    // Preserve microscopic finishes composed over the shared film normal.
    material.normalNode ??= this.normal;
    material.clearcoatNormalNode ??= this.normal;
  }
  update(pose: WrapperPose) {
    this.tear.value = pose.tear; this.mouth.value = pose.mouth; this.grip.value = pose.grip;
    this.collapse.value = pose.collapse; this.tension.value = pose.tension;
  }
}
