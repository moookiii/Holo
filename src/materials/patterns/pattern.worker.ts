/// <reference lib="webworker" />
import { generateField, type PatternSpec } from './ManufacturingField';
self.onmessage = (event: MessageEvent<{ id: number; spec: PatternSpec }>) => {
  const { id, spec } = event.data;
  try {
    const field = generateField(spec);
    self.postMessage({ id, field }, { transfer: [field.direction.buffer, field.relief.buffer] });
  } catch (error) { self.postMessage({ id, error: String(error) }); }
};
