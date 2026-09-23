import { DIMENSIONS, type CardDefinition, type CardDimensions, type CardMapPaths, type Franchise } from '../card/CardDefinition.ts';
import type { CardProfileOverrides, FoilOverrides, HolographicProfile } from '../materials/HolographicProfile';
import { resolveCoverageMaps } from './CardCoverage.ts';
import { MOTIF_SYMBOLS, type MotifSpec } from '../materials/patterns/MotifField.ts';

export type CardImportSpec = Omit<CardDefinition, 'id' | 'imported'>;
export const CARD_MAP_KEYS = ['coverage', 'surface', 'foil', 'reverseFoil', 'motif', 'secondaryMotif', 'stampMotif', 'extendedFoil', 'secondaryFoil', 'metallic', 'laminate', 'height', 'roughness', 'sparkle', 'stamp', 'pattern', 'secondaryPattern', 'stampPattern', 'protection', 'direction', 'secondaryDirection', 'stampDirection', 'normal', 'hologram'] as const satisfies ReadonlyArray<keyof CardMapPaths>;
const fields = new Set(['symbol-foil', 'legendary-fireworks', 'e-reader', 'cracked-ice', 'sequin', 'confetti', 'speckle', 'sheen', 'water-web', 'vertical-line', 'mirage', 'fireworks', 'crosshatch', 'ace-spec', 'mtg-halo', 'mtg-surge', 'mtg-fracture', 'radial', 'silk', 'crystal', 'diamond', 'starfield', 'galaxy-star', 'base-set-star', 'cosmos', 'cosmos-hd', 'tinsel', 'contour', 'liquid', 'fresnel', 'plain', 'satin', 'secret', 'prismatic-secret', 'platinum-secret', 'quarter-century', 'opal', 'cathedral', 'lattice', 'chrome', 'ultimate', 'varnish', 'starlight', 'collector', 'collector-prismatic']);
type Range = readonly [number, number];
const opticalRanges: Record<string, Record<string, Range>> = {
  diffraction: { period: [.3, 5], bandwidth: [.002, .3], strength: [0, 6], secondaryOrder: [0, 1], direction: [-Math.PI * 2, Math.PI * 2], crossWidth: [.04, 2], crossing: [0, 1], facetCoupling: [0, 1] },
  structure: { engraving: [0, 1], scale: [1, 1200], relief: [0, 2], facetTilt: [0, 2], reflectionCoupling: [0, 1], patternRelief: [0, 2], normalVariance: [0, 1], gridStrength: [0, 1], gridScale: [1, 40], gridTravel: [-40, 40], gridWidth: [.1, 2] },
  glints: { density: [0, 1], scale: [1, 1200], sharpness: [1, 1500], strength: [0, 60], spread: [0, 2] },
  surface: { patternRoughness: [-.3, .3], metalness: [0, 1], roughness: [.045, 1], laminate: [0, 1], laminateRoughness: [.045, 1], anisotropy: [0, 1], foilReflectance: [0, 1], sheen: [0, 2], iridescence: [0, 1], filmIOR: [1, 2.5], filmMin: [0, 2000], filmMax: [0, 2000], pearlBody: [0, 1], substrateDarkening: [0, 1], varnishRelief: [0, 2], frameVarnish: [0, 1], imageHologram: [0, 1], imageDepth: [0, .5], imageContrast: [.1, 4], imageWidth: [.04, 1] },
};
function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object.`);
  return value as Record<string, unknown>;
}
function string(value: unknown, name: string, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error(`${name} must be a nonempty string.`);
  return value.trim();
}
function number(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return value;
}
function onlyKeys(value: Record<string, unknown>, allowed: readonly string[], name: string) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unknown ${name} field: ${key}.`);
}
export function relativeAssetPath(value: unknown, name: string): string {
  const path = string(value, name).replaceAll('\\', '/').replace(/^\.\//, '');
  if (path.startsWith('/') || path.includes(':') || path.split('/').some(p => p === '..' || p === '' || p === '.')) throw new Error(`${name} must name a file inside the selected bundle.`);
  return path;
}
function foilOverrides(value: unknown, name: string): FoilOverrides {
  const source = record(value, name), result: Record<string, unknown> = {};
  for (const group of Object.keys(opticalRanges)) if (source[group] !== undefined) {
    const settings = record(source[group], `${name}.${group}`), parsed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (group === 'structure' && key === 'field') {
        if (typeof value !== 'string' || !fields.has(value)) throw new Error(`${name}.structure.field is not a supported manufacturing pattern.`);
        parsed[key] = value;
      } else if (group === 'structure' && key === 'motif') {
        const m = record(value, `${name}.structure.motif`);
        onlyKeys(m, ['symbols', 'arrangement', 'size', 'smallScale', 'rotation', 'curvature'], 'motif');
        if (!Array.isArray(m.symbols) || !m.symbols.length || m.symbols.length > 12 || !m.symbols.every(s => MOTIF_SYMBOLS.includes(s))) throw new Error('motif.symbols requires 1–12 supported symbols.');
        if (m.arrangement !== 'scattered' && m.arrangement !== 'staggered') throw new Error('motif.arrangement must be scattered or staggered.');
        parsed[key] = { symbols: [...m.symbols], arrangement: m.arrangement,
          size: number(m.size, 'motif.size', .08, .4), smallScale: number(m.smallScale, 'motif.smallScale', .2, 1),
          rotation: number(m.rotation, 'motif.rotation', -Math.PI*2, Math.PI*2), curvature: number(m.curvature, 'motif.curvature', 0, 1) } satisfies MotifSpec;
      } else if (group === 'glints' && key === 'ordered') {
        if (typeof value !== 'boolean') throw new Error(`${name}.glints.ordered must be true or false.`);
        parsed[key] = value;
      } else {
        if (!Object.hasOwn(opticalRanges[group], key)) throw new Error(`Unknown ${name}.${group} field: ${key}.`);
        const range = opticalRanges[group][key];
        parsed[key] = number(value, `${name}.${group}.${key}`, ...range);
      }
    }
    result[group] = parsed;
  }
  return result as FoilOverrides;
}
function profileOverrides(value: unknown, profiles: readonly HolographicProfile[], base: HolographicProfile): CardProfileOverrides {
  const source = record(value, 'profileOverrides');
  onlyKeys(source, [...Object.keys(opticalRanges), 'secondaryProfile', 'secondary', 'stampProfile', 'stamp', 'metallicInk'], 'profileOverrides');
  const result: CardProfileOverrides = foilOverrides(source, 'profileOverrides');
  for (const region of ['secondary', 'stamp'] as const) {
    const key = `${region}Profile` as const;
    if (source[key] !== undefined) {
      const id = string(source[key], `profileOverrides.${key}`);
      if (!profiles.some(p => p.id === id)) throw new Error(`Unknown ${region} profile: ${id}.`);
      result[key] = id;
    }
    if (source[region] !== undefined) {
      if (!result[key] && !base[region]) throw new Error(`Choose ${key} before tuning that foil region.`);
      const settings = record(source[region], `profileOverrides.${region}`);
      onlyKeys(settings, Object.keys(opticalRanges), `profileOverrides.${region}`);
      result[region] = foilOverrides(settings, `profileOverrides.${region}`);
    }
  }
  if (source.metallicInk !== undefined) {
    const ink = record(source.metallicInk, 'metallicInk'); onlyKeys(ink, ['color', 'roughness', 'metalness', 'environmentIntensity', 'recess', 'normalFiltering'], 'metallicInk');
    const color = ink.color;
    if (color !== undefined && (!Array.isArray(color) || color.length !== 3)) throw new Error('metallicInk.color needs three linear RGB components.');
    result.metallicInk = { roughness: number(ink.roughness, 'metallicInk.roughness', .045, 1), metalness: number(ink.metalness, 'metallicInk.metalness', 0, 1),
      ...(color ? { color: (color as unknown[]).map((n, i) => number(n, `metallicInk.color[${i}]`, 0, 1)) as [number, number, number] } : {}) };
    for (const key of ['environmentIntensity', 'recess', 'normalFiltering'] as const) if (ink[key] !== undefined) result.metallicInk[key] = number(ink[key], `metallicInk.${key}`, 0, key === 'environmentIntensity' ? 3 : 1);
  }
  return result;
}
function dimensions(value: unknown, franchise: Franchise, metal = false): CardDimensions {
  const result = { ...(franchise === 'Yu-Gi-Oh!' ? DIMENSIONS.yugioh : DIMENSIONS.standard) };
  if (value === undefined) return result;
  const source = record(value, 'dimensions'); onlyKeys(source, Object.keys(result), 'dimensions');
  const limits: Record<keyof CardDimensions, Range> = { width: [3, 12], height: [4, 18], thickness: [.008, metal ? .8 : .12], cornerRadius: [.05, 1], bevel: [.001, metal ? .15 : .03] };
  for (const key of Object.keys(result) as Array<keyof CardDimensions>) if (source[key] !== undefined) result[key] = number(source[key], `dimensions.${key}`, ...limits[key]);
  if (result.bevel >= result.thickness / 2 || result.bevel >= result.cornerRadius) throw new Error('The bevel must be smaller than half the thickness and smaller than the corner radius.');
  return result;
}

/** Parses data only; every asset must be resolved from files explicitly selected by the user. */
export function parseCardImportManifest(value: unknown, profiles: readonly HolographicProfile[]): CardImportSpec {
  const source = record(value, 'Card manifest');
  onlyKeys(source, ['version', 'id', 'title', 'franchise', 'set', 'number', 'dimensions', 'front', 'back', 'backCrop', 'profile', 'seed', 'coverageMode', 'maps', 'backMaps', 'construction', 'mapSettings', 'profileOverrides', 'substrate', 'layout'], 'card manifest');
  if (source.version !== undefined && source.version !== 1) throw new Error('This card manifest version is not supported.');
  const franchise = string(source.franchise, 'franchise', 'Original') as Franchise;
  if (!['Original', 'Pokémon', 'Yu-Gi-Oh!', 'Magic: The Gathering'].includes(franchise)) throw new Error('Choose Original, Pokémon, Yu-Gi-Oh!, or Magic: The Gathering as the franchise.');
  const profile = string(source.profile, 'profile', 'print-only'), base = profiles.find(p => p.id === profile);
  if (!base) throw new Error(`Unknown foil profile: ${profile}.`);
  if (profile !== 'print-only' && base.family !== franchise) throw new Error('The primary foil profile must belong to the selected franchise.');
  let construction: CardDefinition['construction'];
  if (source.construction !== undefined) {
    const c = record(source.construction, 'construction'); onlyKeys(c, ['kind', 'frontReliefCm', 'backReliefCm'], 'construction');
    if (c.kind !== 'metal') throw new Error('construction.kind must be metal.');
    if (!base.metallicInk || base.metallicInk.metalness < .8 || base.diffraction.strength !== 0) throw new Error('Metal construction requires a non-diffractive metallic profile.');
    construction = { kind: 'metal', frontReliefCm: number(c.frontReliefCm, 'frontReliefCm', 0, .15), backReliefCm: number(c.backReliefCm, 'backReliefCm', 0, .15) };
  }
  const result: CardImportSpec = {
    title: string(source.title, 'title'), franchise, set: source.set === '' ? '' : string(source.set, 'set', ''), number: source.number === '' ? '' : string(source.number, 'number', ''),
    dimensions: dimensions(source.dimensions, franchise, !!construction), front: relativeAssetPath(source.front, 'front'), back: relativeAssetPath(source.back, 'back'), profile,
    ...(construction ? { construction } : {}),
    seed: source.seed === undefined ? 2026 : Math.trunc(number(source.seed, 'seed', 0, 2147483647)),
  };
  if (source.backCrop !== undefined) {
    if (!Array.isArray(source.backCrop) || source.backCrop.length !== 4) throw new Error('backCrop needs left, top, right and bottom coordinates.');
    const crop = source.backCrop.map((n, i) => number(n, `backCrop[${i}]`, 0, 1)) as [number, number, number, number];
    if (crop[2] <= crop[0] || crop[3] <= crop[1]) throw new Error('backCrop must have positive width and height.');
    result.backCrop = crop;
  }
  if (source.maps !== undefined) {
    const maps = record(source.maps, 'maps'); onlyKeys(maps, CARD_MAP_KEYS, 'maps'); result.maps = {};
    for (const key of CARD_MAP_KEYS) if (maps[key] !== undefined) result.maps[key] = relativeAssetPath(maps[key], `maps.${key}`);
  }
  if (source.backMaps !== undefined) {
    if (!construction) throw new Error('backMaps require metal construction.');
    const maps = record(source.backMaps, 'backMaps'); onlyKeys(maps, CARD_MAP_KEYS, 'backMaps'); result.backMaps = {};
    for (const key of CARD_MAP_KEYS) if (maps[key] !== undefined) result.backMaps[key] = relativeAssetPath(maps[key], `backMaps.${key}`);
  }
  if (construction && (!result.maps?.height || !result.backMaps?.height || !result.maps?.metallic || !result.backMaps?.metallic)) throw new Error('Metal construction requires height and metallic maps on both faces.');
  if (construction && source.backCrop !== undefined) throw new Error('Metal back maps must be registered to the full die face, without backCrop.');
  if (source.coverageMode !== undefined) {
    if (source.coverageMode !== 'artwork' && source.coverageMode !== 'reverse') throw new Error('coverageMode must be artwork or reverse.');
    result.coverageMode = source.coverageMode;
  }
  resolveCoverageMaps(result);
  if (source.layout !== undefined) {
    const layout = record(source.layout, 'layout'); onlyKeys(layout, ['artwork', 'innerFrame'], 'layout');
    const rectangle = (key: string): [number, number, number, number] => {
      const value = layout[key];
      if (!Array.isArray(value) || value.length !== 4) throw new Error(`layout.${key} needs left, top, right and bottom.`);
      const r = value.map((n, i) => number(n, `layout.${key}[${i}]`, 0, 1)) as [number, number, number, number];
      if (r[2] <= r[0] || r[3] <= r[1]) throw new Error(`layout.${key} must have positive width and height.`);
      return r;
    };
    result.layout = { artwork: rectangle('artwork'), innerFrame: rectangle('innerFrame') };
    const { artwork: a, innerFrame: f } = result.layout;
    if (a[0] < f[0] || a[1] < f[1] || a[2] > f[2] || a[3] > f[3]) throw new Error('layout.artwork must be inside layout.innerFrame.');
  }
  if (source.profileOverrides !== undefined) result.profileOverrides = profileOverrides(source.profileOverrides, profiles, base);
  if (source.mapSettings !== undefined) {
    const settings = record(source.mapSettings, 'mapSettings'); onlyKeys(settings, ['roughnessMode', 'embossStrength', 'normalScale'], 'mapSettings');
    result.mapSettings = {};
    if (settings.roughnessMode !== undefined) {
      if (!['profile', 'absolute', 'offset'].includes(String(settings.roughnessMode))) throw new Error('roughnessMode must be profile, absolute, or offset.');
      result.mapSettings.roughnessMode = settings.roughnessMode as 'profile' | 'absolute' | 'offset';
    }
    if (settings.embossStrength !== undefined) result.mapSettings.embossStrength = number(settings.embossStrength, 'embossStrength', 0, 2);
    if (settings.normalScale !== undefined) result.mapSettings.normalScale = number(settings.normalScale, 'normalScale', 0, 2);
  }
  if (source.substrate !== undefined) {
    const substrate = record(source.substrate, 'substrate'); onlyKeys(substrate, ['color', 'printRetention', 'backgroundColor'], 'substrate');
    if (!Array.isArray(substrate.color) || substrate.color.length !== 3) throw new Error('substrate.color needs three linear RGB components.');
    result.substrate = { color: substrate.color.map((n, i) => number(n, `substrate.color[${i}]`, 0, 1)) as [number, number, number], printRetention: number(substrate.printRetention, 'printRetention', 0, 1) };
    if (substrate.backgroundColor !== undefined) {
      if (!Array.isArray(substrate.backgroundColor) || substrate.backgroundColor.length !== 3) throw new Error('substrate.backgroundColor needs three linear RGB components.');
      result.substrate.backgroundColor = substrate.backgroundColor.map((n, i) => number(n, `substrate.backgroundColor[${i}]`, 0, 1)) as [number, number, number];
    }
  }
  return result;
}
