import thumbnails from './thumbnails.json';
import type { VendingArtwork } from './types';

export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string) {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function button(text: string, action: () => void, className = '') {
  const node = element('button', className, text); node.type = 'button'; node.onclick = action; return node;
}
export function thumbnail(artwork?: VendingArtwork) {
  if (!artwork?.front) return;
  const path = artwork.front.replace(import.meta.env.BASE_URL, '/');
  const key = `${path}|${artwork.frontBounds?.join(',') ?? ''}`;
  const file = (thumbnails as Record<string, string>)[key];
  return file ? `${import.meta.env.BASE_URL}${file}` : undefined;
}
export function artwork(art: VendingArtwork | undefined, highQuality = false) {
  const frame = element('span', 'vm-art');
  const url = highQuality ? art?.front : thumbnail(art);
  if (!url) { frame.classList.add('vm-art-missing'); frame.append(element('span', '', 'Artwork unavailable')); return frame; }
  const img = element('img'); img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.src = url;
  img.onerror = () => { img.remove(); frame.classList.add('vm-art-missing'); frame.textContent = 'Artwork unavailable'; };
  if (highQuality && art?.frontBounds) {
    const [left, top, right, bottom] = art.frontBounds;
    frame.classList.add('vm-art-crop');
    Object.assign(img.style, { width: `${100 / (right - left)}%`, height: `${100 / (bottom - top)}%`,
      left: `${-left * 100 / (right - left)}%`, top: `${-top * 100 / (bottom - top)}%` });
  }
  frame.append(img); return frame;
}
