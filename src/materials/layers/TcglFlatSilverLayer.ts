import type { Node, Texture } from 'three/webgpu';
import { mix, normalWorld, positionViewDirection, normalViewGeometry, sRGBTransferEOTF, sin, texture, time, vec2, vec3 } from 'three/tsl';
import { inspection } from '../../lighting/inspection';
import { TCGL_CARD_UV } from '../TcglFlatSilverResources';
export { TCGL_CARD_UV, TCGL_FLAT_SILVER_PATHS, type FlatSilverTextures } from '../TcglFlatSilverResources';

/** Original TCGL square-card UV domain, verified against the paired diffuse.
 * The unchanged Holo front is the 733px domain beginning at x=145 in 1024. */
function overlay(base: Node<'vec3'>, blend: Node<'vec3'>) {
  return base.greaterThanEqual(.5).select(
    base.oneMinus().mul(blend.oneMinus(), -2).add(1), base.mul(blend, 2)).clamp(0, 1);
}

/** Port of the installed FlatSilver ps_4_0 program, with _UseCCFoil=0 and
 * the manifest's empty _CardEtch (Unity's neutral gray) resolved offline.
 * Whiteplate, shine and spectrum retain their original sRGB import semantics.
 * No synthesized symbol, relief, noise, diffraction or extra foil response. */
export function tcglFlatSilverColor(print: Node<'vec3'>, centerGreen: Node<'float'>,
  whiteplate: Node<'vec3'>, cardUv: Node<'vec2'>, shineTexture: Texture, spectrumTexture: Texture, whiteplateLinear = false) {
  const wp = whiteplateLinear ? whiteplate : sRGBTransferEOTF(whiteplate) as Node<'vec3'>;
  const weight = vec3(.299, .587, .114);
  const printLimit = print.dot(weight).negate().add(1.7).min(1);
  let color = print.mul(mix(wp.negate().add(1.6).min(1), vec3(printLimit), wp)).min(1).toVar();
  // The source's per-card phase is a single sample of the paired diffuse at
  // (0.5,0.5), not a random per-pixel or generated optical field.
  const phase = sin(centerGreen.mul(12.9898 + 78.233002)).mul(43758.550781).fract().mul(9).add(1);
  const tilt = (normalWorld as Node<'vec3'>).dot(vec3(1));
  const travel = time.mul(.05); // _FoilAnimation=1, _FoilAnimationReduced=0
  const sampleSpectrum = (point: Node<'vec2'>) => texture(spectrumTexture, point.fract()).rgb;
  const sampleShine = (point: Node<'vec2'>) => texture(shineTexture, point.fract()).rgb;
  const first = sampleSpectrum(cardUv.mul(2).add(tilt, phase).add(vec2(travel.mul(-1.75), 0)));
  const second = sampleSpectrum(cardUv.add(phase).add(vec2(travel.mul(2.45), 0)));
  const spectrum = mix(second, first, .56);
  const silver = mix(spectrum, vec3(spectrum.dot(weight)), .75).add(.5).mul(.33).clamp(0, 1);
  color.assign(mix(color, color.add(silver.mul(.2)).min(1), wp));
  const facing = (normalViewGeometry as Node<'vec3'>).dot(positionViewDirection).clamp(0, 1);
  color.assign(mix(color, overlay(color, silver.add(.17).mul(facing).clamp(0, 1)), wp.r).clamp(0, 1));
  const shine = sampleShine(cardUv.add(tilt, phase).add(vec2(travel.mul(4), 0)));
  color.assign(mix(color, overlay(color, shine.mul(facing).clamp(0, 1).add(.22)), wp.r.mul(.5)));
  color.addAssign(shine.r.mul(facing.oneMinus().pow2(), facing, 2));
  // TCGL's independent edge-light multiplier; +Z adapts its front-facing
  // convention to Holo. Inspection sweep supplies the optional moving light.
  const light = mix(vec3(0, 0, 1), inspection.sweepDirection, inspection.holoSweep).normalize();
  return color.mul((normalViewGeometry as Node<'vec3'>).dot(light).max(.7).min(1)).clamp(0, 1);
}

export function tcglPackedUv(cardUv: Node<'vec2'>) {
  return vec2(cardUv.x.mul(TCGL_CARD_UV.width).add(TCGL_CARD_UV.left), cardUv.y);
}
