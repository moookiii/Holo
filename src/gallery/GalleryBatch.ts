export interface GalleryOpticalLayer { enabled: boolean; secret: boolean; glints: boolean; }

/** Select shader mechanisms from the same packed controls used for rendering.
 * Cards in a batch still retain their individual masks and optical values. */
export function galleryOpticalLayers(parameters: Float32Array): GalleryOpticalLayer[] {
  return Array.from({ length: 3 }, (_, index) => {
    const enabled = parameters[index * 32 + 31] > 0;
    const secret = enabled && parameters[(37 + index) * 4] > 0;
    return { enabled, secret, glints: enabled && !secret && parameters[(28 + index * 2) * 4 + 3] > 0 };
  });
}

export function galleryBatchKey(layers: GalleryOpticalLayer[]) {
  return layers.map(layer => !layer.enabled ? '-' : layer.secret ? 's' : layer.glints ? 'g' : 'f').join('');
}
