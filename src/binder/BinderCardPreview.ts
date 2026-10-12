import { MeshStandardNodeMaterial, SRGBColorSpace, Texture } from 'three/webgpu';
import type { CardDefinition } from '../card/CardDefinition';
import { CardInstance } from '../card/CardInstance';
import { createCardGeometry } from '../card/CardGeometry';
import { cachedCardAsset } from '../assets/CachedCardAssets';

/** Printed fronts appear before full optical preparation. No viewer maps or
 * procedural fields are needed for this temporary binder representation. */
export async function prepareBinderFront(card: CardDefinition, signal: AbortSignal) {
  const url = (path: string) => /^(blob:|data:|https?:\/\/)/.test(path)
    ? path : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
  let blob: Blob;
  try { blob = await cachedCardAsset(url(card.front)); }
  catch (error) {
    signal.throwIfAborted();
    if (!card.frontFallback) throw error;
    blob = await cachedCardAsset(url(card.frontFallback));
  }
  signal.throwIfAborted();
  const bitmap = await createImageBitmap(blob, {
    resizeWidth: 360, resizeHeight: Math.round(360 * card.dimensions.height / card.dimensions.width),
    resizeQuality: 'high',
  });
  if (signal.aborted) { bitmap.close(); signal.throwIfAborted(); }
  return bitmap;
}

export function createBinderPreview(card: CardDefinition, bitmap: ImageBitmap) {
  const texture = new Texture(bitmap);
  // ImageBitmap upload cannot use Texture.flipY; invert the UV transform.
  texture.flipY = false; texture.repeat.y = -1; texture.offset.y = 1;
  texture.colorSpace = SRGBColorSpace; texture.needsUpdate = true;
  const front = new MeshStandardNodeMaterial({ map: texture, roughness: .48 });
  const stock = new MeshStandardNodeMaterial({ color: '#d8d4cc', roughness: .8 });
  const geometry = createCardGeometry(card.dimensions);
  const instance = new CardInstance(card, geometry, [front, stock, stock], () => {
    geometry.dispose(); texture.dispose(); bitmap.close();
  }, [front, stock]);
  instance.mesh.userData.binderPreview = true;
  instance.mesh.userData.resourceTextures = [texture];
  return instance;
}
