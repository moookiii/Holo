import type { Node } from 'three/webgpu';
import { Fn, positionLocal, positionViewDirection, vec2, vec3, uniform, normalViewGeometry, tangentView, tangentGeometry, mx_cell_noise_float } from 'three/tsl';

/** Continuous height and its analytic derivatives; all three describe one surface. */
const relief = Fn(([point]: [Node<'vec2'>]) => {
  const cell = point.floor(), f = point.fract();
  const blend = f.pow3().mul(f.mul(f.mul(6).sub(15)).add(10));
  const derivative = f.pow2().mul(f.sub(1).pow2()).mul(30);
  const a = mx_cell_noise_float(cell).toVar(), b = mx_cell_noise_float(cell.add(vec2(1, 0))).toVar();
  const c = mx_cell_noise_float(cell.add(vec2(0, 1))).toVar(), d = mx_cell_noise_float(cell.add(1)).toVar();
  const cross = a.sub(b).sub(c).add(d);
  return vec3(a.add(b.sub(a).mul(blend.x)).add(c.sub(a).mul(blend.y)).add(cross.mul(blend.x, blend.y)),
    b.sub(a).add(cross.mul(blend.y)).mul(derivative.x), c.sub(a).add(cross.mul(blend.x)).mul(derivative.y));
}).setLayout({ name: 'coatedStockRelief', type: 'vec3', inputs: [{ name: 'point', type: 'vec2' }] });

/** Coated-paper microfacets, independent of foil rarity and print resolution. */
export class StockSurfaceLayer {
  readonly strength = uniform(1);
  /** Full relief range in cm; the actual grain is a small fraction of this range. */
  readonly depth = uniform(.0024);
  readonly parallax = uniform(1);
  readonly slope;
  readonly roughness;
  readonly variance;
  constructor(seed: number, seedOffset?: Node<'vec2'>) {
    // Continuous fields in physical centimetres; no screen coordinates, time,
    // source-image resampling, or extra GPU samplers (foil already uses sixteen).
    // Match the tangent direction on both faces (the reverse has mirrored U).
    const point = vec2(positionLocal.x.mul(tangentGeometry.x), positionLocal.y).add(seedOffset ?? vec2((seed % 97) / 7, (seed % 71) / 11));
    const grainUV = (p: Node<'vec2'>) => vec2(p.x.mul(.8).sub(p.y.mul(.6)), p.x.mul(.6).add(p.y.mul(.8))).mul(52);
    const fineUV = (p: Node<'vec2'>) => vec2(p.x.mul(.36).add(p.y.mul(.93295)), p.y.mul(.36).sub(p.x.mul(.93295))).mul(125);
    // Integrate away subpixel grains rather than sampling them into glitter.
    // Their slope variance becomes a broader lobe when zoomed out or edge-on.
    const visible = grainUV(point).fwidth().dot(grainUV(point).fwidth()).mul(-.65).exp();
    const fineVisible = fineUV(point).fwidth().dot(fineUV(point).fwidth()).mul(-.65).exp();
    const geometric = normalViewGeometry as unknown as Node<'vec3'>;
    const bitangent = geometric.cross(tangentView).mul(tangentGeometry.w).normalize();
    const facing = positionViewDirection.dot(geometric).max(0);
    const ray = vec2(positionViewDirection.dot(tangentView), positionViewDirection.dot(bitangent))
      .div(facing.max(.2)).mul(facing.smoothstep(.06, .2), this.depth, this.parallax, this.strength);
    const displaced = Fn(() => {
      const samplePoint = point.toVar();
      // Two fixed-point ray/height intersections are enough for microscopic
      // relief. Only coating coordinates move; print, masks and names never do.
      for (let i = 0; i < 2; i++) {
        const height = relief(grainUV(samplePoint)).x.sub(.5).mul(.72, visible)
          .add(relief(fineUV(samplePoint)).x.sub(.5).mul(.28, fineVisible));
        samplePoint.assign(point.add(ray.mul(height)));
      }
      return samplePoint;
    })();
    const grain = relief(grainUV(displaced)), fine = relief(fineUV(displaced));
    const grainSlope = vec2(grain.y.mul(.8).add(grain.z.mul(.6)), grain.z.mul(.8).sub(grain.y.mul(.6))).mul(52 * .72, visible);
    const fineSlope = vec2(fine.y.mul(.36).sub(fine.z.mul(.93295)), fine.y.mul(.93295).add(fine.z.mul(.36))).mul(125 * .28, fineVisible);
    this.slope = grainSlope.add(fineSlope).mul(this.depth, this.strength, -1);
    this.roughness = grain.x.sub(.5).mul(.12, visible, this.strength);
    this.variance = visible.pow2().oneMinus().mul(.0008).add(fineVisible.pow2().oneMinus().mul(.0006))
      .mul(this.strength.pow2(), this.depth.div(.0012).pow2());
  }
  normal(base: Node<'vec3'>, amount: number | Node<'float'> = 1) {
    const geometric = normalViewGeometry as unknown as Node<'vec3'>;
    const bitangent = geometric.cross(tangentView).mul(tangentGeometry.w).normalize();
    return base.add(tangentView.mul(this.slope.x, amount)).add(bitangent.mul(this.slope.y, amount)).normalize();
  }
}
