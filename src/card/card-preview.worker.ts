/// <reference lib="webworker" />
import type { CardDefinition } from './CardDefinition';
import { prepareCardPreview, PREVIEW_ARRAY_SIZES } from './CardPreviewPreparation';
import { generateField } from '../materials/patterns/ManufacturingField';
import { generateMotifField } from '../materials/patterns/MotifField';
import { cardCacheRevision, persistentCards } from '../assets/PersistentCardCache';
import { assetCacheMetrics } from '../assets/CachedCardAssets';
import type { CardPreview } from './CardPreviewPreparation';
import { PREVIEW_PARAMETER_COLUMNS } from './PreviewOptics';
import { resolveCardProfile } from '../materials/profiles/resolveCardProfile';
import { resolveCoverageMaps } from '../assets/CardCoverage';

type Incoming =
  | { type: 'prepare'; id: number; card: CardDefinition }
  | { type: 'cancel'; id: number }
  | { type: 'svg-result'; id: number; svgId: number; pixels?: Uint8Array; error?: string };

const jobs = new Map<number, AbortController>();
const svgRequests = new Map<number, { resolve: (pixels: Uint8Array) => void; reject: (error: Error) => void }>();
let nextSvgId = 0;
let preparations = 0, persistentHits = 0, preparationMs = 0;

async function previewKey(card: CardDefinition) {
  // Mutable external/imported assets are not content-versioned by our build.
  const paths = [card.front, card.frontFallback, ...Object.values(resolveCoverageMaps(card)), ...Object.values(resolveCardProfile(card).maps ?? {})];
  if (card.imported || paths.some(path => path && /^(https?:|blob:|data:)/.test(path))) return undefined;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(card)));
  return `preview:${await cardCacheRevision()}:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
}

async function prepare(card: CardDefinition, signal: AbortSignal, decodeSvg: (blob: Blob, width: number, height: number) => Promise<Uint8Array>) {
  const key = await previewKey(card);
  const cached = key ? await persistentCards.get<CardPreview>(key) : undefined;
  signal.throwIfAborted();
  if (Array.isArray(cached?.images) && cached.images.length === PREVIEW_ARRAY_SIZES.length && cached.images.every((image, index) =>
    image instanceof Uint8Array && image.length === PREVIEW_ARRAY_SIZES[index][0] * PREVIEW_ARRAY_SIZES[index][1] * 4)
    && cached.parameters instanceof Float32Array && cached.parameters.length === PREVIEW_PARAMETER_COLUMNS * 4) {
    persistentHits++; return cached;
  }
  preparations++;
  const started = performance.now();
  const preview = await prepareCardPreview(card, signal, async (spec, height, motif) =>
    spec.kind === 'symbol-foil' && spec.motif
      ? generateMotifField(spec.seed, spec.aspect, spec.scale, height, spec.motif, motif)
      : generateField(spec, height, motif), decodeSvg);
  preparationMs += performance.now() - started;
  // Finish the structured clone before transferring buffers to the UI. Disk
  // eviction never disposes the independent RAM/GPU copies.
  if (key) await persistentCards.set(key, preview, preview.images.reduce((sum, image) => sum + image.byteLength, preview.parameters.byteLength));
  return preview;
}

self.onmessage = (event: MessageEvent<Incoming>) => {
  const message = event.data;
  if (message.type === 'cancel') { jobs.get(message.id)?.abort(); return; }
  if (message.type === 'svg-result') {
    const pending = svgRequests.get(message.svgId);
    if (!pending) return;
    svgRequests.delete(message.svgId);
    if (message.pixels) pending.resolve(message.pixels);
    else pending.reject(new Error(message.error ?? 'Unable to decode SVG preview'));
    return;
  }
  const controller = new AbortController();
  jobs.set(message.id, controller);
  const decodeSvg = (blob: Blob, width: number, height: number) => new Promise<Uint8Array>((resolve, reject) => {
    const svgId = ++nextSvgId;
    svgRequests.set(svgId, { resolve, reject });
    self.postMessage({ type: 'svg', id: message.id, svgId, blob, width, height });
  });
  void prepare(message.card, controller.signal, decodeSvg).then(preview => {
    if (!controller.signal.aborted) self.postMessage({ type: 'ready', id: message.id, preview,
      metrics: { preparations, persistentHits, preparationMs, persistent: persistentCards.stats(), assets: { ...assetCacheMetrics } } },
      { transfer: [...preview.images.map(image => image.buffer), preview.parameters.buffer] });
  }).catch(error => {
    if (!controller.signal.aborted) self.postMessage({ type: 'error', id: message.id, error: String(error) });
  }).finally(() => { jobs.delete(message.id); });
};
