import { DataTexture, RGBAFormat, UnsignedByteType, SRGBColorSpace, type WebGPURenderer } from 'three/webgpu';
import { masterPrism } from '../materials/HolographicProfile';
import type { HolographicMaterial } from '../materials/HolographicMaterial';

/** Three separate regions for rendered regression checks: artwork, secondary foil, metal ink. */
export function configureOpticalFixture(material: HolographicMaterial, renderer: WebGPURenderer) {
  const print = new DataTexture(new Uint8Array([94, 101, 98, 255]), 1, 1, RGBAFormat, UnsignedByteType);
  print.colorSpace = SRGBColorSpace;
  const coverage = new DataTexture(new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]), 3, 1, RGBAFormat, UnsignedByteType);
  const surface = new DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, RGBAFormat, UnsignedByteType);
  for (const t of [print, coverage, surface]) { t.needsUpdate = true; renderer.initTexture(t); }
  material.printTextureNode.value = print; material.coverageTextureNode.value = coverage; material.surfaceTextureNode.value = surface;
  material.setProfile({
    ...masterPrism,
    diffraction: { ...masterPrism.diffraction, strength: 2, bandwidth: .08, crossWidth: .6 },
    secondary: { ...masterPrism, diffraction: { ...masterPrism.diffraction, strength: 2, bandwidth: .08, crossWidth: .6, direction: 1.2 } },
    metallicInk: { color: [.83, .51, .13], roughness: .2, metalness: .96 },
  });
  return { dispose: () => { print.dispose(); coverage.dispose(); surface.dispose(); } };
}
