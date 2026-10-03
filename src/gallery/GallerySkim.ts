export const galleryElevationRange = { min: 5, max: 80 };

/** Place the flat-card reflection at the requested pixel row, rather than
 * treating the gallery's elevation slider as an unbounded orbit angle. */
export function gallerySkimLightY(elevation: number, top: number, bottom: number, viewportHeight: number, cameraZ: number, cameraFov: number, lightZ: number) {
  const progress = Math.max(0, Math.min(1, (elevation - galleryElevationRange.min) / (galleryElevationRange.max - galleryElevationRange.min)));
  const row = top + (bottom - top) * progress;
  const scale = 2 * cameraZ * Math.tan(cameraFov * Math.PI / 360) / viewportHeight;
  const reflectionY = (viewportHeight / 2 - row) * scale;
  return reflectionY * (cameraZ + lightZ) / cameraZ;
}
