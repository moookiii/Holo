import type { Node } from 'three/webgpu';
import { uniform, uv, vec2, vec3, smoothstep, mix, float, tangentView, bitangentView, normalView, positionViewDirection } from 'three/tsl';
import { spectrum } from './DiffractionLayer';
import { stableHash } from './PatternLayer';

export interface GlintUniforms {
  density: Node<'float'>;
  scale: Node<'float'>;
  sharpness: Node<'float'>;
  strength: Node<'float'>;
  spread: Node<'float'>;
  aspect?: Node<'float'>;
  ordered?: Node<'float'>;
  microdiamond?: boolean;
  metallicGrain?: boolean;
  spectralGrain?: boolean;
  filterMetallicGrain?: boolean;
}

export function glints(lightDirection: Node<'vec3'>, settings: GlintUniforms, seed: number | Node<'float'>) {
  if (settings.microdiamond) return microdiamondGlints(lightDirection, settings, seed);
  const first = grainGlints(lightDirection, settings, seed);
  if (!settings.spectralGrain) return first;
  // Three interleaved populations triple gold grain count without shrinking
  // their footprints or changing the existing per-grain spectral response.
  const secondSeed = typeof seed === 'number' ? seed + 193.7 : seed.add(193.7);
  const thirdSeed = typeof seed === 'number' ? seed + 389.3 : seed.add(389.3);
  return first.add(grainGlints(lightDirection, settings, secondSeed, .5))
    .add(grainGlints(lightDirection, settings, thirdSeed, .25));
}

function grainGlints(lightDirection: Node<'vec3'>, settings: GlintUniforms, seed: number | Node<'float'>, offset = 0) {
  const ordered = settings.ordered ?? float(0);
  const point = uv().mul(vec2(settings.aspect ?? float(.716), 1));
  const lattice = mix(point, vec2(point.x.add(point.y), point.y.sub(point.x)), ordered).mul(settings.scale).add(offset);
  const cell = lattice.floor();
  const offsetSeed = (offset: number) => typeof seed === 'number' ? uniform(seed + offset) : seed.add(offset);
  const r1 = stableHash(cell, offsetSeed(0)), r2 = stableHash(cell, offsetSeed(17.3)), r3 = stableHash(cell, offsetSeed(76.1));
  const center = mix(vec2(mix(float(.25), float(.75), r1), mix(float(.25), float(.75), r2)), vec2(.5), ordered);
  const local = lattice.fract().sub(center);
  const radius = settings.metallicGrain
    ? mix(float(.30), float(.56), r3)
    : mix(mix(float(.055), float(.19), r3.pow(4)), float(.11), ordered);
  const footprint = lattice.fwidth().length().mul(0.5).max(0.025);
  const width = footprint.max(radius);
  const spot = smoothstep(width.mul(0.28), width, local.length()).oneMinus();
  // A subpixel facet converges toward its integrated energy, not a random on/off pixel.
  const integratedArea = radius.div(width).pow2();
  const occupied = mix(smoothstep(settings.density, settings.density.add(0.008), r3).oneMinus(), float(1), ordered);
  const normal = normalView.add(tangentView.mul(r1.sub(0.5).mul(settings.spread.mul(2))))
    .add((bitangentView as unknown as Node<'vec3'>).mul(r2.sub(0.5).mul(settings.spread.mul(2)))).normalize();
  const half = lightDirection.add(positionViewDirection).normalize();
  const angular = normal.dot(half).max(0).pow(settings.sharpness);
  // Each fixed grain has its own grating orientation and pitch. Its spectral
  // flash moves with light/view; it is not a static rainbow painted on the die.
  const angle = r3.mul(Math.PI * 2);
  const grating = tangentView.mul(angle.cos())
    .add((bitangentView as unknown as Node<'vec3'>).mul(angle.sin()));
  const path = float(.40).add(r2.mul(.26))
    .add(lightDirection.add(positionViewDirection).dot(grating).mul(.32));
  const color = settings.spectralGrain
    ? spectrum(path, float(.025), float(0)).mul(2.4)
    : settings.metallicGrain ? vec3(1, .99, .98) : vec3(1, .97, .91);
  if (settings.metallicGrain && settings.filterMetallicGrain) {
    // Dense rounded grains integrate to an aggregate lobe once a pixel covers
    // multiple grains. Fading only the stochastic residual avoids crawling
    // cell IDs and sparkling aliases during distant/grazing motion.
    const resolved = lattice.fwidth().max(.001).x.max(lattice.fwidth().y).smoothstep(.7, 1.7).oneMinus();
    const averageArea = float(.29);
    const broadening = settings.sharpness.mul(settings.spread.pow2()).add(1);
    const aggregate = normalView.dot(half).max(0).pow(settings.sharpness.div(broadening)).div(broadening);
    // Unresolved grains integrate to a neutral ensemble, not aliased hue specks.
    const averageColor = settings.spectralGrain ? vec3(.42, .40, .30) : color;
    return mix(averageColor.mul(aggregate, averageArea),
      color.mul(spot, integratedArea, occupied, angular), resolved).mul(settings.strength);
  }
  return color.mul(spot, integratedArea, occupied, angular, settings.strength);
}

/** Registered microscopic square cuts: their positions and inclinations are
 * fixed in card space. Light selects individual flashes. Pixel-area integration
 * preserves tiny facets without aliasing them into a coarse diamond grid. */
export function microdiamondGlints(lightDirection: Node<'vec3'>, settings: GlintUniforms, seed: number | Node<'float'>) {
  const offsetSeed = (offset: number) => typeof seed === 'number' ? uniform(seed + offset) : seed.add(offset);
  const p = uv().mul(vec2(settings.aspect ?? float(.716), 1)).mul(settings.scale);
  const row = p.y.floor();
  const lattice = p.add(vec2(stableHash(vec2(row, 7), offsetSeed(311)).mul(.8), 0));
  const cell = lattice.floor();
  const r = stableHash(cell, typeof seed === 'number' ? uniform(seed) : seed), s = stableHash(cell, offsetSeed(31));
  const t = stableHash(cell, offsetSeed(83));
  const center = vec2(r, s).sub(.5).mul(.24).add(.5);
  const local = lattice.fract().sub(center);
  const size = vec2(t.mul(.10).add(.16), r.mul(.09).add(.15));
  const pixel = lattice.fwidth().max(.001);
  const overlap = local.add(pixel.mul(.5)).min(size)
    .sub(local.sub(pixel.mul(.5)).max(size.negate())).max(0).div(pixel);
  const resolved = pixel.x.max(pixel.y).smoothstep(.7, 1.7).oneMinus();
  const shape = mix(size.x.mul(size.y, 4), overlap.x.mul(overlap.y), resolved);
  const normal = normalView.add(tangentView.mul(r.sub(.5).mul(settings.spread, 2)))
    .add((bitangentView as unknown as Node<'vec3'>).mul(s.sub(.5).mul(settings.spread, 2))).normalize();
  const half = lightDirection.add(positionViewDirection).normalize();
  const angular = normal.dot(half).max(0).pow(settings.sharpness);
  const occupied = smoothstep(settings.density, settings.density.add(.008), t).oneMinus();
  // Broad low-energy metal remains between isolated bright microcut flashes.
  return vec3(1, .99, .96).mul(shape, occupied, angular, settings.strength);
}
