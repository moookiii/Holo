/// <reference lib="webworker" />
import { generateField, type PatternSpec } from './ManufacturingField';
import { generateMotifField, type MotifImage } from './MotifField';
self.onmessage = (event: MessageEvent<{ id: number; spec: PatternSpec; motifImage?: MotifImage; height?: number }>) => {
  const { id, spec, motifImage, height } = event.data;
  try {
    const field = spec.kind === 'symbol-foil' && spec.motif
      ? generateMotifField(spec.seed, spec.aspect, spec.scale, height ?? 2048, spec.motif, motifImage) : generateField(spec, height, motifImage);
    self.postMessage({ id, field }, { transfer: [field.direction.buffer, field.relief.buffer] });
  } catch (error) { self.postMessage({ id, error: String(error) }); }
};
