import type { PokemonBooster, PokemonSet } from './types.ts';
import { pause } from './requests.ts';

const escaped = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
export function fallbackWrapper(set: Pick<PokemonSet, 'name'>, back = false, aspect = 512 / 800) {
  const lines = set.name.match(/.{1,22}(?:\s|$)|.{1,22}/g) ?? [set.name];
  const width = Math.round(800 * aspect), center = width / 2;
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="800" viewBox="0 0 ${width} 800"><defs><linearGradient id="s" x2="1" y2="1"><stop stop-color="#222c39"/><stop offset=".6" stop-color="#10151d"/><stop offset="1" stop-color="#303b49"/></linearGradient></defs><rect width="${width}" height="800" fill="url(#s)"/><path d="M25 52H${width - 25}M25 748H${width - 25}" stroke="#8b98aa"/><rect x="40" y="90" width="${width - 80}" height="620" rx="4" fill="none" stroke="#606e82"/><g fill="#e6e8ed" text-anchor="middle" font-family="Arial,sans-serif"><text x="${center}" y="190" font-size="21" letter-spacing="5">POKÉMON</text>${lines.map((line, i) => `<text x="${center}" y="${350 + i * 40}" font-size="29">${escaped(line.trim())}</text>`).join('')}<text x="${center}" y="600" font-size="13" letter-spacing="3">${back ? 'HOLO · COLLECTION' : 'BOOSTER PACK'}</text><text x="${center}" y="658" font-size="12" fill="#a7b1c0">SET ARTWORK · HOLO EDITION</text></g></svg>`);
}
export const wrapperInk = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><path fill="#bbb" d="M0 0h1v1H0z"/></svg>');
interface PreparedWrapperSide { image: string; aspect: number; loaded: boolean; }
const artworkCache = new Map<string, PreparedWrapperSide>();
const cardImageCache = new Map<string, string>();
/** TCGdex currently serves some card images with duplicate CORS headers. The
 * image proxy preserves the exact card image while supplying usable CORS. */
export async function usableCardFront(url: string, signal: AbortSignal, thumbnail?: string): Promise<string> {
  signal.throwIfAborted();
  if (cardImageCache.has(url)) return cardImageCache.get(url)!;
  const originals = [url, url.replace(/\/high\.png$/, '/high.webp'), thumbnail ?? url.replace(/\/high\.png$/, '/low.webp')];
  const candidates = [url, ...new Set(originals.map(candidate => `https://wsrv.nl/?url=${encodeURIComponent(candidate)}`))];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
      if (!response.ok) continue;
      const bitmap = await createImageBitmap(await response.blob()); bitmap.close();
      signal.throwIfAborted(); cardImageCache.set(url, candidate); return candidate;
    } catch { signal.throwIfAborted(); }
  }
  throw new Error(`Card image unavailable: ${url}. Retry preparation.`);
}
async function decoded(url: string, signal: AbortSignal) {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
      if (!response.ok) throw new Error(`Image unavailable (${response.status})`);
      const blob = await response.blob(); signal.throwIfAborted();
      if (blob.type.includes('svg')) {
        const objectURL = URL.createObjectURL(blob), img = new Image();
        try { img.src = objectURL; await img.decode(); return await createImageBitmap(img); }
        finally { URL.revokeObjectURL(objectURL); }
      }
      return await createImageBitmap(blob);
    } catch (error) { if (signal.aborted || attempt === 2) throw error; await pause(200 * 2 ** attempt, signal); }
  }
}
/** Preserve every edge of the product shot, then match the physical film to it. */
async function wrapperSide(url: string | undefined, fallback: string, signal: AbortSignal, aspect?: number): Promise<PreparedWrapperSide> {
  if (!url) return { image: fallback, aspect: aspect ?? 512 / 800, loaded: false };
  const key = `${url}:${aspect ?? 'native'}`;
  if (artworkCache.has(key)) return artworkCache.get(key)!;
  try {
    const bitmap = await decoded(url, signal);
    try {
      signal.throwIfAborted();
      const fittedAspect = aspect ?? bitmap.width / bitmap.height;
      const canvas = document.createElement('canvas'); canvas.width = Math.round(800 * fittedAspect); canvas.height = 800;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#151c26'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
      const w = bitmap.width * scale, h = bitmap.height * scale;
      ctx.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      const result = { image: canvas.toDataURL('image/png'), aspect: fittedAspect, loaded: true };
      artworkCache.set(key, result);
      if (artworkCache.size > 16) artworkCache.delete(artworkCache.keys().next().value!);
      return result;
    } finally { bitmap.close(); }
  } catch (error) { signal.throwIfAborted(); console.warn('Using set wrapper fallback', error); return { image: fallback, aspect: aspect ?? 512 / 800, loaded: false }; }
}
export async function prepareWrapper(set: PokemonSet, booster: PokemonBooster, signal: AbortSignal) {
  const front = await wrapperSide(booster.front, fallbackWrapper(set), signal);
  const back = await wrapperSide(booster.back, fallbackWrapper(set, true, front.aspect), signal, front.aspect);
  signal.throwIfAborted();
  const height = front.loaded ? 13 : 11.8;
  return { front: front.image, back: back.image, ink: wrapperInk, backInk: wrapperInk,
    width: front.loaded ? height * front.aspect : 7.55, height, depth: .66, printedSeals: front.loaded };
}
