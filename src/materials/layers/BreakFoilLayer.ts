import type { Node } from 'three/webgpu';
import { vec3, exp } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import type { IllustrationRareOptics } from './IllustrationRareLayer';

/** A flat fan grating, with square stamp boundaries fixed in card UVs.
 * L+V selects opposing sectors inside each tile; changing its azimuth turns
 * those sectors without rotating the lattice or modifying the surface normal.
 * The two angular moments allow mipmaps to integrate unresolved sectors. */
export function breakFoilReflection(light: Node<'vec3'>, view: Node<'vec3'>,
  tangent: Node<'vec3'>, bitangent: Node<'vec3'>, normal: Node<'vec3'>,
  u: IllustrationRareOptics & { neutralGain: Node<'float'>; spectralGain: Node<'float'> }, field: Node<'vec4'>, details: Node<'vec4'>,
  footprint?: [Node<'vec3'>, Node<'vec3'>]) {
  const momentum = light.add(view);
  const x = momentum.dot(tangent), y = momentum.dot(bitangent);
  const radius2 = x.pow2().add(y.pow2());
  const variance = (axis: Node<'vec3'>) => {
    const pixel = momentum.dot(axis).fwidth().pow2().div(12);
    return footprint ? pixel.add(footprint[0].dot(axis).pow2().add(footprint[1].dot(axis).pow2()).div(3)) : pixel;
  };
  const spread = variance(tangent).add(variance(bitangent));
  const denominator = radius2.add(spread, .0001);
  const cos2 = x.pow2().sub(y.pow2()).div(denominator);
  const sin2 = x.mul(y, 2).div(denominator);
  const cos4 = cos2.pow2().sub(sin2.pow2()), sin4 = cos2.mul(sin2, 2);
  const moments = field.mul(2).sub(1);
  // Narrow opposing sectors, rather than broad shaded quadrants that would
  // resemble raised pyramids. The dominant two harmonics are filtered exactly;
  // smaller harmonics use products of their filtered complex moments.
  // No static checkerboard brightness, animation clock or facet normal.
  const re1 = moments.r.mul(cos2).add(moments.g.mul(sin2));
  const im1 = moments.g.mul(cos2).sub(moments.r.mul(sin2));
  const re2 = moments.b.mul(cos4).add(moments.a.mul(sin4));
  const im2 = moments.a.mul(cos4).sub(moments.b.mul(sin4));
  const re3 = re1.mul(re2).sub(im1.mul(im2));
  const re4 = re2.pow2().sub(im2.pow2()), im4 = re2.mul(im2, 2);
  const re5 = re1.mul(re4).sub(im1.mul(im4));
  const re6 = re2.mul(re4).sub(im2.mul(im4));
  const fan = re1.mul(.38671875).add(re2.mul(.24169921875),
    re3.mul(.107421875), re4.mul(.0322265625), re5.mul(.005859375),
    re6.mul(.00048828125), .2255859375).max(0);
  const radialVariance = spread.add(.26 ** 2);
  const envelope = exp(radius2.add(.0001).sqrt().sub(.36).pow2().div(radialVariance).mul(-.5))
    .mul(.26).div(radialVariance.sqrt());
  const silver = fan.mul(envelope);
  const junction = details.a.sub(.88).max(0).div(.12).pow2();
  const fine = exp(radius2.div(spread.add(.18 ** 2)).mul(-.5)).mul(junction, .16);
  const neutral = silver.mul(.065).add(fine.mul(.22)).mul(u.neutralGain);
  // The chirped in-plane grating separates wavelengths inside a lit sector.
  // It never colors an unlit tile or the protected printed gold.
  const spacing = details.a.mul(.8).add(.8).mul(u.period);
  const projection = radius2.mul(re1.add(1).mul(.5).max(0)).add(.0001).sqrt();
  const path = projection.mul(spacing);
  const spectral = spectrum(path, u.bandwidth, u.secondary,
    spread.mul(spacing.pow2()).add(path.fwidth().pow2().div(12))).mul(silver, u.strength, u.spectralGain);
  return vec3(neutral).add(spectral).mul(normal.dot(light).max(0), normal.dot(view).max(0).sqrt());
}
