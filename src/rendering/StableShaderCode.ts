interface Code { code: string; }
/** r186's cached TSL functions can emit the independent LTC_Uv helper before
 * or after the other LTC helpers. Identical lighting then gets distinct shader
 * source keys and Firefox links it again. This helper calls only GLSL builtins;
 * placing it first preserves every instruction and all dependency ordering. */
export function stabilizeLtcOrder(codes: Code[] | undefined) {
  if (!codes) return;
  const index = codes.findIndex(entry => /^\s*vec2 LTC_Uv\s*\(/.test(entry.code));
  if (index > 0) codes.unshift(...codes.splice(index, 1));
}
