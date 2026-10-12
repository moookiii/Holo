import type { Node } from 'three/webgpu';
import { float, vec2, uv, sin, cos, exp } from 'three/tsl';
import { spectrum } from './DiffractionLayer';

export interface IllustrationRareOptics {
  aspect: Node<'float'>; period: Node<'float'>; bandwidth: Node<'float'>;
  strength: Node<'float'>; secondary: Node<'float'>; angle: Node<'float'>; crossWidth: Node<'float'>;
}

/** Smooth SV151 IR foil. One graph for viewer and instanced gallery.
 * Sheet coordinates describe optical grating variation, never a colored texture
 * or embossed surface. No clock, screen position, artwork-derived normal or RNG.
 */
export function illustrationRareReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: IllustrationRareOptics, footprint?: [Node<'vec3'>, Node<'vec3'>], soft = false) {
  // Mirror the optical sheet and its tangent axis together so the diagonal
  // foil travels in the physical print's horizontal direction.
  const p = uv().sub(.5).mul(vec2(u.aspect.negate(), 1));
  const axis = vec2(cos(u.angle), sin(u.angle));
  const across = p.dot(axis), along = p.dot(vec2(axis.y.negate(), axis.x));
  // The original optical sheet is retained verbatim for the archived preset
  // and Ultra Rare. IR uses a two-axis rolled sheet: each diagonal domain has
  // a slightly different slant and transverse curvature. Changing light/view
  // selects different parts of those rolls, rather than translating a stripe.
  const phase = soft
    ? across.mul(12).add(sin(along.mul(4).add(.6)).mul(.8))
    : across.mul(17).add(sin(along.mul(5).add(.6)).mul(.27));
  const inclination = soft
    ? sin(phase).mul(.15).add(sin(across.mul(5).sub(along.mul(3)).add(1.3)).mul(.035))
    : sin(phase).mul(.17).add(sin(across.mul(7).sub(along.mul(2)).add(1.3)).mul(.065));
  const angle = u.angle.add(soft
    ? sin(across.mul(6).add(along.mul(4))).mul(.20)
    : sin(along.mul(6).add(across.mul(3))).mul(.035));
  const sheetAxis = tangent.mul(cos(angle).negate()).add(bitangent.mul(sin(angle)));
  const transverse = normal.cross(sheetAxis).normalize();
  // Optical curvature only; this does not perturb the ink/laminate normal.
  // Quadrature slopes make the response roll around each diagonal domain.
  const roll = soft ? cos(phase).mul(.11).add(sin(along.mul(5)).mul(.04)) : float(0);
  const n = normal.add(sheetAxis.mul(inclination)).add(transverse.mul(roll)).normalize();
  const grating = sheetAxis.sub(n.mul(sheetAxis.dot(n))).normalize();
  const groove = n.cross(grating).normalize();
  const momentum = light.add(view);
  const spacing = sin(across.mul(9).add(along.mul(3))).mul(.025).add(1);
  const path = momentum.dot(grating).abs().mul(u.period, spacing);
  const variance = (a: Node<'vec3'>) => footprint
    ? footprint[0].dot(a).pow2().add(footprint[1].dot(a).pow2()).div(3) : float(0);
  const width = u.crossWidth.pow2().add(variance(groove)).sqrt();
  const aperture = exp(momentum.dot(groove).div(width).pow2().mul(-.5)).mul(u.crossWidth.div(width));
  // Fine striae are energy modulation only, analytically filtered at distance.
  const microPhase = across.mul(2 * Math.PI * 920).add(sin(along.mul(73)).mul(.3));
  const micro = cos(microPhase).mul(exp(microPhase.fwidth().pow2().mul(-.5)), .025).add(.975);
  const incident = normal.dot(light).max(0), visible = normal.dot(view).max(0).sqrt();
  return spectrum(path, u.bandwidth, u.secondary, variance(grating).mul(u.period.mul(spacing).pow2()))
    .mul(aperture, micro, incident, visible, u.strength);
}
