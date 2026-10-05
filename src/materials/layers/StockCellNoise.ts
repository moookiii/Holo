import type { Node } from 'three/webgpu';
import { Fn, bitXor, bitOr, shiftLeft, shiftRight, ivec4, uint, uvec4, vec4 } from 'three/tsl';

// r186 supports vector integer operators; its declarations only list scalars.
type VectorBits = (a: Node<'uvec4'>, b: Node<'uvec4'>) => Node<'uvec4'>;
const xor = bitXor as unknown as VectorBits, or = bitOr as unknown as VectorBits;
const left = shiftLeft as unknown as VectorBits, right = shiftRight as unknown as VectorBits;

/** Four independent lanes of Three r186's MaterialX 2D cell hash. Keeping
 * corners together avoids four expanded scalar hash trees in cold shaders.
 * Signed cell conversion, uint overflow, rotations and float division match
 * mx_cell_noise_float exactly; this is the same noise, not an approximation. */
export const stockCellNoise = Fn(([cell]: [Node<'vec2'>]) => {
  const seed = uint(3735928580); // 0xdeadbeef + (2 << 2) + 13
  const a = uvec4(ivec4(vec4(cell.x, cell.x.add(1), cell.x, cell.x.add(1)))).add(seed).toVar();
  const b = uvec4(ivec4(vec4(cell.y, cell.y, cell.y.add(1), cell.y.add(1)))).add(seed).toVar();
  const c = uvec4(seed).toVar();
  const rotate = (value: Node<'uvec4'>, count: number) => or(left(value, uvec4(uint(count))), right(value, uvec4(uint(32 - count))));
  c.assign(xor(c, b)); c.subAssign(rotate(b, 14));
  a.assign(xor(a, c)); a.subAssign(rotate(c, 11));
  b.assign(xor(b, a)); b.subAssign(rotate(a, 25));
  c.assign(xor(c, b)); c.subAssign(rotate(b, 16));
  a.assign(xor(a, c)); a.subAssign(rotate(c, 4));
  b.assign(xor(b, a)); b.subAssign(rotate(a, 14));
  c.assign(xor(c, b)); c.subAssign(rotate(b, 24));
  return vec4(c).div(4294967295);
}).setLayout({ name: 'stockCellNoise', type: 'vec4', inputs: [{ name: 'cell', type: 'vec2' }] });
