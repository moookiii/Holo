import type { Node } from 'three/webgpu';
import { vec3, float, exp } from 'three/tsl';

/** Approximate visible wavelength response in linear RGB, deliberately not an HSV palette. */
const SPECTRAL_BANDS = [
  { wavelength: 0.410, rgb: [0.18, 0.012, 0.56] },
  { wavelength: 0.450, rgb: [0.045, 0.10, 1.0] },
  { wavelength: 0.490, rgb: [0.012, 0.64, 0.62] },
  { wavelength: 0.535, rgb: [0.10, 0.92, 0.035] },
  { wavelength: 0.575, rgb: [0.94, 0.78, 0.012] },
  { wavelength: 0.610, rgb: [1.0, 0.18, 0.006] },
  { wavelength: 0.660, rgb: [0.58, 0.018, 0.006] },
];

export function spectrum(opticalPath: Node<'float'>, bandwidth: Node<'float'>, secondary: Node<'float'>, pathVariance: Node<'float'> = float(0)) {
  const firstWidth = bandwidth.pow2().add(pathVariance).sqrt();
  const secondBase = bandwidth.mul(.85), secondWidth = secondBase.pow2().add(pathVariance.mul(.25)).sqrt();
  let result: Node<'vec3'> = vec3(0);
  for (const band of SPECTRAL_BANDS) {
    const firstMismatch = opticalPath.sub(band.wavelength).div(firstWidth);
    const secondMismatch = opticalPath.mul(0.5).sub(band.wavelength).div(secondWidth);
    const energy = exp(firstMismatch.pow2().mul(-0.5)).mul(bandwidth.div(firstWidth))
      .add(exp(secondMismatch.pow2().mul(-0.5)).mul(secondary, secondBase.div(secondWidth)));
    result = result.add(vec3(...band.rgb as [number, number, number]).mul(energy));
  }
  return result.mul(float(0.57));
}
