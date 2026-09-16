import type { Node, TextureNode } from 'three/webgpu';
import { Fn, float, mix, normalViewGeometry, positionViewDirection, tangentGeometry, tangentView, uniform, uv, vec2 } from 'three/tsl';

/** Hot-stamped name cavities. All distances are centimetres in the card frame. */
export class RecessedNameLayer {
  readonly strength = uniform(1);
  readonly parallax = uniform(1);
  readonly depth = uniform(.004);
  readonly normal: Node<'vec3'>;
  readonly occlusion: Node<'float'>;
  readonly wall: Node<'float'>;
  constructor(coverage: TextureNode, aspect: Node<'float'>, cardHeight: Node<'float'>) {
    const dimensions = vec2(aspect.mul(cardHeight), cardHeight);
    // Restrict the union to the title: stamps and anniversary marks stay flat.
    const glyph = (p: Node<'vec2'>) => {
      const mask = coverage.sample(p);
      return mask.g.max(mask.b).mul(p.y.smoothstep(.84, .86));
    };
    const n = normalViewGeometry as unknown as Node<'vec3'>;
    const b = n.cross(tangentView).mul(tangentGeometry.w).normalize();
    const facing = positionViewDirection.dot(n).max(0);
    const ray = vec2(positionViewDirection.dot(tangentView), positionViewDirection.dot(b))
      .div(facing.max(.22), dimensions).mul(this.depth, this.strength, this.parallax, facing.smoothstep(.05, .22));
    const mouth = glyph(uv());
    // Trace down into the indentation, stopping at either its bevel or floor.
    // Fixed unrolled steps keep derivatives/sampling coherent on both backends.
    const hit = Fn(() => {
      const depth = float(0).toVar();
      for (let i = 0; i < 12; i++) {
        const next = depth.add(1 / 12);
        const surface = glyph(uv().sub(ray.mul(next))).smoothstep(.06, .94);
        depth.addAssign(surface.sub(depth).clamp(0, 1 / 12));
      }
      return depth;
    })();
    const point = uv().sub(ray.mul(hit));
    // A physical bevel width, filtered by the coverage mip chain at a distance.
    const bevel = float(.0028), step = vec2(bevel).div(dimensions);
    const dx = glyph(point.add(vec2(step.x, 0))).sub(glyph(point.sub(vec2(step.x, 0))));
    const dy = glyph(point.add(vec2(0, step.y))).sub(glyph(point.sub(vec2(0, step.y))));
    const slope = vec2(dx, dy).mul(this.depth, this.strength).div(bevel.mul(2));
    // Negative height means inward-facing bevel normals, not raised text.
    this.normal = n.add(tangentView.mul(slope.x)).add(b.mul(slope.y)).normalize();
    this.wall = mouth.mul(hit.oneMinus(), this.strength).clamp(0, 1);
    const rim = vec2(dx, dy).length().clamp(0, 1).mul(mouth);
    this.occlusion = mix(float(1), float(.76), rim.mul(this.strength)).mul(this.wall.mul(.32).oneMinus());
  }
}
