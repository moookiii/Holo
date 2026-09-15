import type { CardMapPaths } from '../card/CardDefinition';

export const PACKED_MAP_KEYS = ['coverage', 'surface', 'foil', 'extendedFoil', 'secondaryFoil', 'metallic', 'laminate', 'height', 'roughness', 'sparkle', 'stamp', 'pattern', 'secondaryPattern', 'stampPattern', 'protection', 'hologram'] as const satisfies ReadonlyArray<keyof CardMapPaths>;
export type PackedMapKey = typeof PACKED_MAP_KEYS[number];
export interface PackedMaps { width: number; height: number; coverage: Uint8Array; surface: Uint8Array; pattern: Uint8Array; hologram?: Uint8Array; }

/** Inputs are already registered/resampled to the same UV grid. Grayscale maps use red. */
export function packMapChannels(width: number, height: number, inputs: Partial<Record<PackedMapKey, ArrayLike<number>>>, defaultPrimary = 0): PackedMaps {
  const length = width * height * 4;
  const coverage = new Uint8Array(length), surface = new Uint8Array(length), pattern = new Uint8Array(length);
  const hologram = inputs.hologram ? new Uint8Array(length) : undefined;
  for (let i = 0; i < length; i += 4) {
    const protection = 1 - (inputs.protection?.[i] ?? 0) / 255;
    coverage[i] = Math.round((inputs.foil?.[i] ?? inputs.coverage?.[i] ?? defaultPrimary) * protection);
    coverage[i + 1] = Math.round((inputs.secondaryFoil?.[i] ?? inputs.coverage?.[i + 1] ?? 0) * protection);
    coverage[i + 2] = Math.round((inputs.metallic?.[i] ?? inputs.coverage?.[i + 2] ?? 0) * protection);
    coverage[i + 3] = inputs.laminate?.[i] ?? inputs.coverage?.[i + 3] ?? 255;
    surface[i] = inputs.height?.[i] ?? inputs.surface?.[i] ?? 128;
    surface[i + 1] = inputs.roughness?.[i] ?? inputs.surface?.[i + 1] ?? 128;
    surface[i + 2] = inputs.sparkle?.[i] ?? inputs.surface?.[i + 2] ?? 255;
    surface[i + 3] = Math.round((inputs.stamp?.[i] ?? 0) * protection);
    pattern[i] = inputs.pattern?.[i] ?? 255;
    pattern[i + 1] = inputs.secondaryPattern?.[i] ?? 255;
    pattern[i + 2] = inputs.stampPattern?.[i] ?? 255;
    pattern[i + 3] = Math.round((inputs.extendedFoil?.[i] ?? 0) * protection);
    if (hologram) {
      hologram[i] = inputs.hologram![i];
      hologram[i + 1] = Math.round(inputs.hologram![i + 1] * protection);
      hologram[i + 2] = inputs.hologram![i + 2];
      hologram[i + 3] = 255;
    }
  }
  return { width, height, coverage, surface, pattern, hologram };
}
