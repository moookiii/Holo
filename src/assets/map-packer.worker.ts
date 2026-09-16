/// <reference lib="webworker" />
import { packMapChannels, type PackedMapKey } from './MapPacking';

self.onmessage = (event: MessageEvent<{ id: number; aspect: number; defaultPrimary: number; anniversary?: ImageBitmap; images: Partial<Record<PackedMapKey, ImageBitmap>> }>) => {
  const { id, aspect, images, defaultPrimary, anniversary } = event.data;
  try {
    const height = Math.max(1024, ...Object.values(images).map(image => image.height));
    const width = Math.max(1, Math.round(height * aspect));
    if (width > 4096 || height > 4096) throw new Error('Material maps must fit within 4096 × 4096 pixels.');
    const canvas = new OffscreenCanvas(width, height), context = canvas.getContext('2d', { willReadFrequently: true })!;
    const inputs: Partial<Record<PackedMapKey, Uint8ClampedArray>> = {};
    for (const [key, bitmap] of Object.entries(images)) {
      context.clearRect(0, 0, width, height); context.drawImage(bitmap, 0, 0, width, height);
      inputs[key as PackedMapKey] = context.getImageData(0, 0, width, height).data;
    }
    const maps = packMapChannels(width, height, inputs, defaultPrimary);
    // Alpha of the image-reconstruction map was unused. Pack anniversary
    // geometry only for the quarter-century treatment, retaining the texture
    // sampler budget without decoding this asset for every card.
    if (anniversary) {
      const hasHologram = !!maps.hologram;
      maps.hologram ??= new Uint8Array(width * height * 4);
      context.clearRect(0, 0, width, height);
      context.drawImage(anniversary, .17*anniversary.width, .13*anniversary.height, .74*anniversary.width, .77*anniversary.height,
        .38*width, .765*height, .24*width, .16*height);
      const logo = context.getImageData(0, 0, width, height).data;
      const smooth = (a: number, b: number, v: number) => { const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t); };
      for(let i=0;i<logo.length;i+=4) {
        const white=smooth(.45,.85,Math.min(logo[i],logo[i+1],logo[i+2])/255);
        const outline=1-smooth(.08,.24,Math.max(logo[i],logo[i+1],logo[i+2])/255);
        const protection=1-(inputs.protection?.[i] ?? 0)/255;
        if(!hasHologram) {maps.hologram[i]=128;maps.hologram[i+2]=128;}
        maps.hologram[i+3]=Math.round(logo[i+3]*(white*.38+outline*.62+.07)*protection);
      }
    }
    self.postMessage({ id, maps }, [maps.coverage.buffer, maps.surface.buffer, maps.pattern.buffer, ...(maps.hologram ? [maps.hologram.buffer] : [])]);
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : String(error) }); }
  finally { Object.values(images).forEach(image => image.close()); anniversary?.close(); }
};
