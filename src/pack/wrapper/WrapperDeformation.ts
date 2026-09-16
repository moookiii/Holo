import { DataTexture, FloatType, RGBAFormat, Vector2, type MeshPhysicalNodeMaterial, type Node } from 'three/webgpu';
import { attribute, float, Fn, ivec2, mix, normalFlat, positionGeometry, textureLoad, transformNormalToView, uniform, vec3, vec4, varying, faceDirection } from 'three/tsl';
import type { WrapperPose } from './PackWrapper';
import type { WrapperTearPath } from './WrapperTearPath';

/** A small material-space fracture field drives both skins. Surface positions
 * and differential normals stay on the GPU; only changed seam samples upload. */
export class WrapperDeformation {
  readonly mouth = uniform(0);
  readonly grip = uniform(0);
  readonly collapse = uniform(0);
  readonly tension = uniform(0);
  readonly gripU = uniform(-.82);
  readonly tipU = uniform(-.82);
  readonly direction = uniform(1);
  readonly pull = uniform(new Vector2());
  private field: DataTexture;
  private revision = -1;
  private position;
  readonly normal: Node<'vec3'>;
  constructor(tearHeight: number, halfHeight: number, private path: WrapperTearPath) {
    this.field = new DataTexture(path.field, path.count, 1, RGBAFormat, FloatType);
    this.field.generateMipmaps = false; this.field.needsUpdate = true;
    const eased = (value: Node<'float'>) => { const t = value.clamp(0, 1); return t.pow3().mul(t.mul(t.mul(6).sub(15)).add(10)); };
    const deform = Fn(([point, coordinates]: [Node<'vec3'>, Node<'vec4'>]) => {
      const u = coordinates.x, y0 = coordinates.y, side = coordinates.z;
      const strip = attribute('filmType', 'vec2').x;
      const seamY = attribute('filmSeam', 'float');
      const sample = u.add(1).mul(.5 * (path.count - 1)).clamp(0, path.count - 1);
      const first = sample.floor();
      const field = mix(textureLoad(this.field, ivec2(first.toInt(), 0)), textureLoad(this.field, ivec2(first.add(1).min(path.count - 1).toInt(), 0)), sample.sub(first));
      const edge = float(1).sub(u.pow2()).max(0);
      const top = eased(y0.sub(2.4).div(tearHeight - 2.4));
      const free = field.g, peeled = field.b;
      const seamBand = mix(eased(y0.sub(seamY).add(1.2).div(1.2)), eased(float(halfHeight).sub(y0).div(float(halfHeight).sub(seamY))), strip);
      const gripWeight = u.sub(this.gripU).pow2().mul(-4).exp();
      const tipWeight = u.sub(this.tipU).pow2().mul(-42).exp();
      const pinch = u.sub(this.gripU).pow2().mul(-65).exp().mul(this.grip, top);
      const lip = eased(y0.sub(tearHeight - .6).div(.6)).mul(edge, this.mouth);
      const strain = tipWeight.mul(this.tension.clamp(-1, 1), top, edge, .045);
      const bodyZ = point.z.add(side.mul(this.mouth, top, edge, .66)).add(side.mul(free, top, edge, .045))
        .sub(side.mul(pinch, .055, edge))
        .add(side.mul(lip, .12)).add(side.mul(strain))
        .mul(float(1).sub(this.collapse.mul(.74))).add(this.collapse.mul(.07, edge, y0.mul(3).add(u.mul(6)).sin()));
      const bodyY = point.y.add(field.r.mul(seamBand)).sub(this.mouth.mul(top, edge.pow(.65), mix(.16, 1.42, float(side.greaterThan(0)))))
        .sub(lip.mul(.055)).sub(this.collapse.mul(.2, edge, y0.mul(2).sin()));
      // Both surfaces share the pinch and boundary displacement. Only actually
      // fractured columns peel away; untouched spans remain welded exactly.
      const curl = free.mul(peeled.mul(.85).add(.22).add(this.pull.y.mul(.18, gripWeight)));
      const relativeY = y0.sub(seamY);
      const stripY = bodyY.add(relativeY.mul(curl.cos().sub(1))).sub(point.z.mul(curl.sin()))
        .add(free.mul(peeled.mul(.78).add(.10).add(this.pull.y.mul(.7, gripWeight))));
      const stripZ = bodyZ.add(relativeY.mul(curl.sin())).add(point.z.mul(curl.cos().sub(1)))
        .add(free.mul(peeled.mul(.62).add(.14).add(this.pull.y.abs().mul(.16, gripWeight))));
      const strainX = this.tension.mul(.025, top, edge, tipWeight, y0.mul(8).add(u.sub(this.tipU).mul(24)).sin());
      return vec3(
        point.x.add(strainX).add(strip.mul(free, this.pull.x.mul(.50, gripWeight).add(peeled.mul(.12, this.direction)))),
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
    if (this.revision !== this.path.revision) { this.field.needsUpdate = true; this.revision = this.path.revision; }
    this.gripU.value = this.path.gripU; this.tipU.value = this.path.tipU; this.direction.value = this.path.direction;
    this.pull.value.set(pose.pullX, pose.pullY);
    this.mouth.value = pose.mouth; this.grip.value = pose.grip;
    this.collapse.value = pose.collapse; this.tension.value = pose.tension;
  }
  dispose() { this.field.dispose(); }
}
