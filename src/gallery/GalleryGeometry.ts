import { createCardGeometry } from '../card/CardGeometry.ts';
import { DIMENSIONS, type CardDimensions } from '../card/CardDefinition.ts';

/** Normalize to card height before instancing. A square mesh with a scalar
 * radius stretches circular corners into ellipses when placed in the gallery. */
export function galleryGeometryDimensions(dimensions: CardDimensions = DIMENSIONS.standard): CardDimensions {
  const { width, height, thickness, cornerRadius, bevel } = dimensions;
  return { width: width / height, height: 1, thickness: thickness / height,
    cornerRadius: cornerRadius / height, bevel: bevel / height };
}

export function createGalleryCardGeometry(dimensions: CardDimensions) {
  const geometry = createCardGeometry(dimensions);
  // Gallery placement supplies width and height independently; undo aspect
  // here so the final transform restores the original circular corner cuts.
  geometry.scale(1 / dimensions.width, 1, 1);
  return geometry;
}
