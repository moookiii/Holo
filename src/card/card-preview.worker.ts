/// <reference lib="webworker" />
import type { CardDefinition } from './CardDefinition';
import { prepareCardPreview } from './CardPreviewPreparation';
import { generateField } from '../materials/patterns/ManufacturingField';
import { generateMotifField } from '../materials/patterns/MotifField';

type Incoming =
  | { type: 'prepare'; id: number; card: CardDefinition }
  | { type: 'cancel'; id: number }
  | { type: 'svg-result'; id: number; svgId: number; pixels?: Uint8Array; error?: string };

const jobs = new Map<number, AbortController>();
const svgRequests = new Map<number, { resolve: (pixels: Uint8Array) => void; reject: (error: Error) => void }>();
let nextSvgId = 0;

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
  void prepareCardPreview(message.card, controller.signal, async (spec, height, motif) =>
    spec.kind === 'symbol-foil' && spec.motif
      ? generateMotifField(spec.seed, spec.aspect, spec.scale, height, spec.motif, motif)
      : generateField(spec, height, motif), decodeSvg).then(preview => {
    if (!controller.signal.aborted) self.postMessage({ type: 'ready', id: message.id, preview },
      { transfer: [...preview.images.map(image => image.buffer), preview.parameters.buffer] });
  }).catch(error => {
    if (!controller.signal.aborted) self.postMessage({ type: 'error', id: message.id, error: String(error) });
  }).finally(() => { jobs.delete(message.id); });
};
