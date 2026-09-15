import type { Node, TextureNode } from 'three/webgpu';
import { Fn, If, float, vec2, vec3, mix, uv, normalViewGeometry, tangentView, bitangentView, positionViewDirection, exp } from 'three/tsl';
import type { OpticalUniforms } from '../OpticalUniforms';

/** A reflected image reconstructed behind the card's opaque, stationary surface. */
export function hologramImage(art: TextureNode, data: TextureNode, u: OpticalUniforms) {
  return Fn(() => {
    const image = vec3(.5).toVar();
    If(u.imageHologram.greaterThan(0), () => {
      const n = normalViewGeometry as unknown as Node<'vec3'>;
      const b = bitangentView as unknown as Node<'vec3'>;
      // Bounded tangent-space ray: the virtual image has depth, the printed
      // window and laminate do not. At grazing views the displacement stays finite.
      const ray = vec2(tangentView.dot(positionViewDirection), b.dot(positionViewDirection))
        .div(n.dot(positionViewDirection).abs().max(.45))
        .mul(vec2(u.aspect.reciprocal(), 1), u.imageDepth.div(u.cardHeight));
      const depthAt = (p: Node<'vec2'>) => data.sample(p).level(float(3)).r.sub(.5);
      const p = uv().add(ray.mul(depthAt(uv()))).toVar();
      p.assign(uv().add(ray.mul(depthAt(p))));
      p.assign(uv().add(ray.mul(depthAt(p))));
      const source = art.sample(p).rgb;
      const luminance = source.dot(vec3(.2126, .7152, .0722));
      const pale = mix(vec3(luminance), source, .08).sub(.3).mul(u.imageContrast).add(.46).clamp(.025, 1);
      // Do not pull rules text or the frame into the reconstructed artwork.
      const inside = data.sample(p).g.smoothstep(.025, .2);
      image.assign(mix(vec3(.5), pale, inside));
    });
    return image;
  })();
}

/** Angular image visibility depends on both the illumination and observation ray. */
export function hologramReconstruction(light: Node<'vec3'>, image: Node<'vec3'>, depth: Node<'float'>, u: OpticalUniforms, angularVariance: Node<'float'>) {
  const momentum = light.add(positionViewDirection);
  const detuning = momentum.dot(tangentView).add(.22).add(depth.sub(.5).mul(.3));
  const width = u.imageWidth.pow2().add(angularVariance).sqrt();
  const visibility = exp(detuning.div(width).pow2().mul(-.5)).mul(u.imageWidth.div(width));
  // Intensity/contrast emerge in reflected light; neither card opacity nor the
  // position of its physical geometry changes. This is a rendering approximation,
  // not a simulation of the printing process or a measured holographic wavefront.
  return image.mul(visibility, u.imageHologram, .8);
}
