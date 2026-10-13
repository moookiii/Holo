import { LinearFilter, LinearMipmapNearestFilter, RepeatWrapping, SRGBColorSpace, type Texture } from 'three/webgpu';

/** Original Unity GLTextureSettings: bilinear filtering, repeat U/V, aniso 1,
 * colorSpace 1. Only the native ASC resource paths receive these settings. */
export function configureTcglFlatSilverSampling(...textures: (Texture | undefined)[]) {
  for (const texture of textures) if (texture) {
    if (texture.wrapS === RepeatWrapping && texture.wrapT === RepeatWrapping
      && texture.minFilter === LinearMipmapNearestFilter && texture.anisotropy === 1) continue;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.minFilter = LinearMipmapNearestFilter; texture.magFilter = LinearFilter;
    texture.anisotropy = 1; texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }
}
