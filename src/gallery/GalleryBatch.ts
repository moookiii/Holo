export interface GalleryOpticalLayer { enabled: boolean; secret: boolean; glints: boolean; iridescence: boolean; illustrationRare?: boolean; doubleRare?: boolean; ballReverse?: boolean; ultraRare?: boolean; specialIllustration?: boolean; normalFiltering?: boolean; metallicGrain?: boolean; }

/** Select shader mechanisms from the same packed controls used for rendering.
 * Cards in a batch still retain their individual masks and optical values. */
export function galleryOpticalLayers(parameters: Float32Array): GalleryOpticalLayer[] {
  return Array.from({ length: 3 }, (_, index) => {
    const enabled = parameters[index * 32 + 31] > 0;
    const secret = enabled && parameters[(37 + index) * 4] > 0;
    return { enabled, secret, ...(index === 0 && parameters[34 * 4 + 3] === 1 ? { illustrationRare: true } : {}),
      ...(parameters[(29 + index * 2) * 4 + 3] === -1 ? { metallicGrain: true } : {}),
      ...(!secret && parameters[34 * 4 + 3] === 0 && parameters[(37 + index) * 4 + 2] > 0 ? { normalFiltering: true } : {}),
      ...(index === 0 && parameters[34 * 4 + 3] === 2 ? { doubleRare: true } : {}),
      ...(index === 0 && parameters[34 * 4 + 3] === 5 ? { ballReverse: true } : {}),
      ...(index === 0 && parameters[34 * 4 + 3] === 4 ? { specialIllustration: true } : {}),
      ...(index === 0 && parameters[34 * 4 + 3] === 3 ? { ultraRare: true } : {}), glints: enabled && !secret && parameters[(28 + index * 2) * 4 + 3] > 0,
      iridescence: enabled && parameters[index * 32 + 26] > 0 };
  });
}

/** Prune a mechanism only when its effective prepared mask is exactly zero
 * everywhere. A declared secondary finish does not imply secondary coverage.
 * Reverse foil and secret names may take coverage from the artwork alpha. */
export function galleryPreviewOpticalLayers(parameters: Float32Array, images: readonly Uint8Array[]) {
  const layers = galleryOpticalLayers(parameters);
  const coverage = images[1], artwork = images[0];
  const present = [false, false, false];
  for (let i = 0; i < coverage.length && !present.every(Boolean); i += 4)
    for (let layer = 0; layer < 3; layer++) present[layer] ||= coverage[i + layer] !== 0;
  const reverse = parameters[34 * 4], secret = parameters[34 * 4 + 2];
  let artworkCoverage = false;
  if (reverse !== 0 || secret !== 0)
    for (let i = 3; i < artwork.length && !artworkCoverage; i += 4) artworkCoverage = artwork[i] !== 0;
  const effective = [
    !Number.isFinite(reverse) || (reverse !== 1 && present[0]) || (reverse !== 0 && artworkCoverage),
    !Number.isFinite(secret) || (secret !== 1 && present[1]) || (secret !== 0 && artworkCoverage),
    present[2],
  ];
  return layers.map((layer, index) => {
    const enabled = layer.enabled && effective[index];
    return { ...layer, enabled, secret: enabled && layer.secret,
      glints: enabled && layer.glints, iridescence: enabled && layer.iridescence };
  });
}

export function galleryBatchKey(layers: GalleryOpticalLayer[]) {
  return layers.map(layer => !layer.enabled ? '-' : layer.ballReverse ? 'b' : layer.specialIllustration ? 'p' : layer.ultraRare ? 'u' : layer.doubleRare ? 'd' : layer.illustrationRare ? 'a' : layer.secret ? 's' : layer.glints ? 'g' : 'f').join('')
    + (layers.some(layer => layer.iridescence) ? ':i' : '')
    + (layers.some(layer => layer.enabled && layer.normalFiltering) ? ':filtered-' + layers.map(layer => +(layer.enabled && !!layer.normalFiltering)).join('') : '')
    + (layers.some(layer => layer.enabled && layer.metallicGrain) ? ':grain-' + layers.map(layer => +(layer.enabled && !!layer.metallicGrain)).join('') : '');
}

/** A nonfoil card can use the basic foil program with a zero layer mask.
 * Sharing that program avoids a second driver compilation on first opening. */
export function galleryShaderLayers(layers: GalleryOpticalLayer[]) {
  return layers.every(layer => !layer.enabled)
    ? layers.map((layer, index) => index === 0 ? { ...layer, enabled: true } : layer)
    : layers;
}
