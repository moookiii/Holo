/** A uniform RGBA image samples identically at every UV and mip level. */
export function compactConstantRgba(bytes: Uint8Array): Uint8Array {
  if (bytes.length <= 4 || bytes.length % 4 !== 0) return bytes;
  for (let i = 4; i < bytes.length; i++) {
    if (bytes[i] !== bytes[i % 4]) return bytes;
  }
  return bytes.slice(0, 4);
}
