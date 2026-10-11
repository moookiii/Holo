/** Two-channel tangent normals, four quadrants in existing RGBA channels.
 * This is texture packing of the completed authored PNG, never height/relief
 * generation. Z is the positive hemisphere, as in standard two-channel normal
 * compression. Keep the averaged RGB first moment separately for filtering.
 */
export const PACKED_PREVIEW_ETCH = -2;
// One shared edge texel per quadrant lets hardware filtering cross the center
// continuously. The complete UV domain is resized here, with no crop/offset.
export const PREVIEW_ETCH_WIDTH = 510, PREVIEW_ETCH_HEIGHT = 718;
export function packPreviewEtch(source: Uint8Array, width: number, height: number) {
  if (width % 2 || height % 2 || source.length !== width * height * 4)
    throw new Error('Packed preview etching requires even dimensions and RGBA pixels');
  const halfWidth = width / 2, halfHeight = height / 2;
  const x = new Uint8Array((halfWidth + 1) * (halfHeight + 1) * 4), y = new Uint8Array(x.length);
  for (let row = 0; row <= halfHeight; row++) for (let column = 0; column <= halfWidth; column++) {
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      const sx = Math.min(width - 1, column + (quadrant % 2) * halfWidth);
      const sy = Math.min(height - 1, row + Math.floor(quadrant / 2) * halfHeight);
      const from = (sy * width + sx) * 4, to = (row * (halfWidth + 1) + column) * 4 + quadrant;
      x[to] = source[from]; y[to] = source[from + 1];
    }
  }
  return { x, y };
}
