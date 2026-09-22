import { DoubleSide, MeshPhysicalNodeMaterial, type Node, type Texture } from 'three/webgpu';
import { attribute, float, Fn, mix, mx_noise_float, positionView, texture, uv, vec2, vec3 } from 'three/tsl';

interface FilmSurface {
  width: number;
  height: number;
  /** Smooth normal of the currently deformed film, already in view space. */
  normal: Node<'vec3'>;
}

/** Relief follows the deformed film. Heights are in centimetres, so tilting or
 * changing resolution cannot change their physical scale. */
function surfaceNormal(base: Node<'vec3'>, height: Node<'float'>) {
  return Fn(() => {
    const dx = positionView.dFdx(), dy = positionView.dFdy();
    const r1 = dy.cross(base), r2 = base.cross(dx), determinant = dx.dot(r1);
    const gradient = r1.mul(height.dFdx()).add(r2.mul(height.dFdy())).mul(determinant.sign());
    return base.mul(determinant.abs().max(1e-8)).sub(gradient).normalize();
  })();
}

/** Fields are fixed to the manufactured sheet. Unresolved grain integrates
 * into roughness instead of crawling at grazing angles. */
function filmFields(surface: FilmSurface) {
  const p = uv().sub(.5).mul(vec2(surface.width, surface.height));
  const end = float(surface.height / 2).sub(p.y.abs());
  const seal = end.smoothstep(.48, .76).oneMinus();
  const shoulder = end.smoothstep(.6, 1.65).oneMinus();
  const edge = uv().x.sub(.5).abs().smoothstep(.30, .49);
  const rim = attribute('filmType', 'vec2').y;
  const reliefWeight = rim.oneMinus().mul(seal.mul(.78).oneMinus());
  const broad = mx_noise_float(p.mul(vec2(.85, 1.7)));
  const wrinklePoint = p.mul(vec2(4.8, 2.1));
  const wrinkle = mx_noise_float(wrinklePoint.add(vec2(broad.mul(.65), 0)));
  const finePoint = p.mul(vec2(105, 67));
  const footprint = finePoint.fwidth();
  const resolved = footprint.dot(footprint).mul(-.7).exp();
  const fine = mx_noise_float(finePoint).mul(resolved);
  const rollingPoint = p.x.mul(360).add(broad.mul(2));
  const rollingResolved = rollingPoint.fwidth().pow2().mul(-.65).exp();
  const rolling = rollingPoint.sin().mul(rollingResolved);
  const folds = broad.mul(.005).add(wrinkle.mul(.0035, edge.max(shoulder).mul(.85).add(.15)));
  const substrateHeight = folds.add(fine.mul(.00022)).add(rolling.mul(.00010)).mul(reliefWeight);
  // The polymer smooths the substrate's fine rolling marks. Both interfaces
  // still follow the same larger creases and physical deformation.
  const coatingHeight = folds.mul(.78).add(fine.mul(.000065)).mul(reliefWeight);
  return { seal, broad, fine, resolved, rim, substrateHeight, coatingHeight };
}

/** Printed ink and metalized foil beneath a separate dielectric film lobe. */
export function createWrapperMaterial(print: Texture, inkMask: Texture, surface: FilmSurface, printedSeals = false) {
  const material = new MeshPhysicalNodeMaterial({ side: DoubleSide, clearcoat: 1,
    clearcoatRoughness: .21, roughness: .34, metalness: 0, envMapIntensity: .7 });
  const f = filmFields(surface);
  const ink = texture(inkMask).r.mul(f.seal.oneMinus());
  const foil = ink.oneMinus();
  // Product photography already includes the crimp print. Keep its color on
  // the folded seals while the manufactured relief still shapes reflections.
  material.colorNode = printedSeals ? texture(print).rgb : mix(texture(print).rgb, vec3(.55, .58, .61), f.seal.mul(.85));
  material.metalnessNode = foil.mul(.94);
  material.roughnessNode = mix(float(.29), float(.43), ink)
    .add(f.seal.mul(.09), f.broad.mul(.025), f.fine.mul(.018), f.resolved.oneMinus().mul(.008));
  material.clearcoatNode = mix(float(.88), float(.55), f.seal);
  material.clearcoatRoughnessNode = float(.205).add(f.seal.mul(.10), f.broad.mul(.018), f.fine.mul(.009));
  // Modest machine-direction stretch in the foil lobe; ink stays isotropic.
  // The tangent follows deformed positions and manufacturing UV derivatives.
  material.anisotropyNode = vec2(foil.mul(f.seal.mul(.12).add(.24)), 0);
  material.normalNode = surfaceNormal(surface.normal, f.substrateHeight);
  material.clearcoatNormalNode = surfaceNormal(surface.normal, f.coatingHeight);
  material.name = 'Printed metalized film';
  return material;
}

export function createLiningMaterial(surface: FilmSurface) {
  const material = new MeshPhysicalNodeMaterial({ color: 0xb9bdc1, metalness: .94,
    roughness: .34, side: DoubleSide, clearcoat: .22, clearcoatRoughness: .32, envMapIntensity: .7 });
  const f = filmFields(surface);
  material.roughnessNode = float(.34).add(f.seal.mul(.09), f.broad.mul(.035), f.fine.mul(.025));
  material.anisotropyNode = vec2(f.rim.oneMinus().mul(.30), 0);
  material.normalNode = surfaceNormal(surface.normal, f.substrateHeight);
  material.clearcoatNormalNode = surfaceNormal(surface.normal, f.coatingHeight);
  material.name = 'Inner aluminum laminate';
  return material;
}
