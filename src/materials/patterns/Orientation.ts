/** Gratings are axes: θ and θ + π are the same physical orientation.
 * Double-angle encoding preserves that equivalence when textures are filtered. */
export function encodeGratingAxis(angle: number): [number, number] {
  return [(Math.cos(2 * angle) * .5 + .5) * 255, (Math.sin(2 * angle) * .5 + .5) * 255];
}
