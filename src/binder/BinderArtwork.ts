import { DataTexture, RGBAFormat, SRGBColorSpace, LinearFilter, MeshBasicNodeMaterial, PlaneGeometry } from 'three/webgpu';
import { CardInstance } from '../card/CardInstance';
import type { CardDefinition } from '../card/CardDefinition';
import type { CardCpuPreparation } from '../card/CardCpuPreparation';
import { cachedCardAsset } from '../assets/CachedCardAssets';
import { PREVIEW_WIDTH, PREVIEW_HEIGHT } from '../card/CardPreviewPreparation';

/** Show the clean front without waiting for manufacturing fields or optical pipelines. */
export async function binderArtwork(card: CardDefinition, cpu: CardCpuPreparation, signal: AbortSignal) {
  let pixels = cpu.cachedPreview(card)?.images[0];
  if (!pixels) {
    const blob = await cachedCardAsset(card.front).catch(error => {
      if (!card.frontFallback) throw error;
      return cachedCardAsset(card.frontFallback);
    });
    signal.throwIfAborted();
    const image = new Image();
    const url = URL.createObjectURL(blob);
    try {
      image.src = url; await image.decode(); signal.throwIfAborted();
      const canvas = new OffscreenCanvas(PREVIEW_WIDTH, PREVIEW_HEIGHT);
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      pixels = new Uint8Array(context.getImageData(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT).data);
    } finally { URL.revokeObjectURL(url); }
  }
  signal.throwIfAborted();
  // Gallery stores foil coverage in artwork alpha; the interim front is opaque.
  const opaque = pixels.slice();
  for (let i = 3; i < opaque.length; i += 4) opaque[i] = 255;
  const map = new DataTexture(opaque, PREVIEW_WIDTH, PREVIEW_HEIGHT, RGBAFormat);
  map.colorSpace = SRGBColorSpace; map.flipY = true;
  map.minFilter = map.magFilter = LinearFilter; map.needsUpdate = true;
  const material = new MeshBasicNodeMaterial({ map });
  const geometry = new PlaneGeometry(card.dimensions.width, card.dimensions.height);
  geometry.addGroup(0, geometry.index!.count, 0);
  geometry.translate(0, 0, card.dimensions.thickness / 2);
  return new CardInstance(card, geometry, [material], () => { geometry.dispose(); map.dispose(); });
}
