import {
  TextureLoader,
  SRGBColorSpace,
  NoColorSpace,
  LinearMipmapLinearFilter,
  LinearFilter,
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
  Texture,
} from 'three/webgpu';

function resolveAssetUrl(url: string): string {
  // Leave runtime/external URLs unchanged.
  if (
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    return url;
  }

  // Converts:
  // /cards/nocturne/front.svg
  //
  // Local dev:
  // /cards/nocturne/front.svg
  //
  // GitHub Pages:
  // /Holo/cards/nocturne/front.svg
  const relative = url.replace(/^\/+/, '');

  return `${import.meta.env.BASE_URL}${relative}`;
}

export class AssetManager {
  private cache = new Map<string, Promise<Texture>>();
  private owned = new Set<Texture>();
  private loader = new TextureLoader();

  readonly white = this.solid([255, 255, 255, 255]);
  readonly black = this.solid([0, 0, 0, 255]);
  readonly fullFoil = this.solid([255, 0, 0, 255]);
  readonly neutralSurface = this.solid([128, 128, 255, 255]);
  readonly flatNormal = this.solid([128, 128, 255, 255]);

  constructor(private anisotropy = 8) {}

  private solid(rgba: number[]) {
    const texture = new DataTexture(
      new Uint8Array(rgba),
      1,
      1,
      RGBAFormat,
      UnsignedByteType,
    );

    texture.needsUpdate = true;
    this.owned.add(texture);

    return texture;
  }

  load(url: string, color: boolean): Promise<Texture> {
    const resolvedUrl = resolveAssetUrl(url);
    const key = `${color ? 'srgb' : 'data'}:${resolvedUrl}`;

    if (!this.cache.has(key)) {
      this.cache.set(
        key,
        this.loader.loadAsync(resolvedUrl).then((texture) => {
          texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
          texture.anisotropy = this.anisotropy;
          texture.minFilter = LinearMipmapLinearFilter;
          texture.magFilter = LinearFilter;
          texture.generateMipmaps = true;

          this.owned.add(texture);

          return texture;
        }).catch((error) => {
          this.cache.delete(key);

          throw new Error(`Unable to load ${resolvedUrl}`, {
            cause: error,
          });
        }),
      );
    }

    return this.cache.get(key)!;
  }

  async optional(url: string | undefined, fallback: Texture) {
    if (!url) return fallback;

    try {
      return await this.load(url, false);
    } catch (error) {
      console.warn(error);
      return fallback;
    }
  }

  release(url: string) {
    const resolvedUrl = resolveAssetUrl(url);

    for (const prefix of ['srgb', 'data']) {
      const key = `${prefix}:${resolvedUrl}`;
      const pending = this.cache.get(key);

      this.cache.delete(key);

      if (pending) {
        void pending.then((texture) => {
          texture.dispose();
          this.owned.delete(texture);
        }).catch(() => {});
      }
    }
  }

  dispose() {
    for (const texture of this.owned) {
      texture.dispose();
    }

    this.owned.clear();
    this.cache.clear();
  }
}