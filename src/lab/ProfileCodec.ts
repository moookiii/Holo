import type { HolographicProfile } from '../materials/HolographicProfile.ts';

const families = ['Original', 'Pokémon', 'Yu-Gi-Oh!', 'Magic: The Gathering'];
const fields = new Set('radial symbol-foil silk crystal diamond starfield galaxy-star cosmos cosmos-hd tinsel contour liquid fresnel plain satin secret prismatic-secret platinum-secret quarter-century opal cathedral lattice chrome ultimate varnish starlight collector collector-prismatic mtg-halo mtg-surge mtg-fracture cracked-ice sequin confetti speckle e-reader sheen water-web vertical-line mirage legendary-fireworks fireworks crosshatch ace-spec'.split(' '));
const mechanisms = new Set(['diffraction', 'sparkle', 'relief', 'varnish', 'laminate', 'reflection', 'film', 'image']);
function object(value: unknown): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a profile object.');
}
function safeTree(value: unknown, depth = 0) {
  if (depth > 12) throw new Error('Profile nesting is too deep.');
  if (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > 1e6)) throw new Error('Invalid numeric value.');
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Unsafe profile key.');
    safeTree(child, depth + 1);
  }
}
function layer(value: unknown) {
  object(value);
  for (const [group, required] of Object.entries({ diffraction: ['period', 'bandwidth', 'strength', 'secondaryOrder', 'direction', 'crossWidth'], structure: ['engraving', 'scale', 'relief'], glints: ['density', 'scale', 'sharpness', 'strength', 'spread'], surface: ['metalness', 'roughness', 'laminate', 'laminateRoughness'] })) {
    object(value[group]);
    for (const key of required) if (typeof value[group][key] !== 'number') throw new Error(`Missing numeric ${group}.${key}.`);
    for (const [key, v] of Object.entries(value[group])) if (!['field', 'motif', 'ordered'].includes(key) && typeof v !== 'number') throw new Error(`Invalid ${group}.${key}.`);
  }
  if (!fields.has(value.structure.field)) throw new Error('Unsupported manufacturing field.');
  if (value.structure.field === 'symbol-foil' && !value.structure.motif) throw new Error('Symbol foil requires a motif.');
  if (value.structure.motif !== undefined) {
    const motif = value.structure.motif; object(motif);
    const symbols = 'colorless water fire grass lightning psychic fighting darkness metal ball star'.split(' ');
    if (!Array.isArray(motif.symbols) || !motif.symbols.length || motif.symbols.length > 32 || motif.symbols.some((s: string) => !symbols.includes(s)) || !['scattered','staggered'].includes(motif.arrangement)) throw new Error('Invalid motif symbols or arrangement.');
    for (const key of ['size','smallScale','rotation','curvature']) if (typeof motif[key] !== 'number') throw new Error(`Invalid motif ${key}.`);
    if (motif.size <= 0 || motif.size > 1 || motif.smallScale <= 0 || motif.smallScale > 1 || motif.curvature < 0 || motif.curvature > 1) throw new Error('Invalid motif dimensions.');
  }
  if (value.glints.ordered !== undefined && typeof value.glints.ordered !== 'boolean') throw new Error('Invalid sparkle ordering.');
  for (const key of ['metalness','roughness','laminate','laminateRoughness','iridescence','anisotropy']) if (value.surface[key] !== undefined && (value.surface[key] < 0 || value.surface[key] > 1)) throw new Error(`Surface ${key} must be between 0 and 1.`);
  if (value.surface.filmIOR !== undefined && value.surface.filmIOR < 1) throw new Error('Film IOR must be at least 1.');
  if ((value.surface.filmMin ?? 200) > (value.surface.filmMax ?? 600)) throw new Error('Minimum film thickness exceeds maximum.');
  for (const [group, keys] of Object.entries({ diffraction: ['strength','secondaryOrder','crossing','facetCoupling'], structure: ['relief','engraving'], glints: ['strength','density','spread'] })) for (const key of keys) if (value[group][key] !== undefined && value[group][key] < 0) throw new Error(`Negative ${group}.${key}.`);
  if (value.diffraction.period <= 0 || value.diffraction.bandwidth <= 0 || value.diffraction.crossWidth <= 0 || value.structure.scale <= 0 || value.glints.scale <= 0 || value.glints.sharpness <= 0) throw new Error('Optical widths, spacing and scales must be positive.');
  if (value.enabled !== undefined && typeof value.enabled !== 'boolean') throw new Error('Invalid layer switch.');
  if (value.disabledMechanisms !== undefined && (!Array.isArray(value.disabledMechanisms) || value.disabledMechanisms.some((v: unknown) => !mechanisms.has(v as string)))) throw new Error('Unknown mechanism.');
}
/** Plain HolographicProfile JSON: no parallel Lab material format. */
export function deserializeProfile(text: string): HolographicProfile {
  if (text.length > 256_000) throw new Error('Profile exceeds 256 KB.');
  const p: unknown = JSON.parse(text); object(p); safeTree(p); layer(p);
  for (const key of ['id', 'name', 'description']) if (typeof p[key] !== 'string' || p[key].length > 2000) throw new Error(`Invalid ${key}.`);
  if (!p.id.trim() || !p.name.trim() || !families.includes(p.family) || !['development', 'curated', 'reference-pending'].includes(p.status)) throw new Error('Invalid profile metadata.');
  if (p.secondary !== undefined) layer(p.secondary);
  if (p.stamp !== undefined) layer(p.stamp);
  for (const key of ['extendedCoverage','labOnly']) if (p[key] !== undefined && typeof p[key] !== 'boolean') throw new Error(`Invalid ${key}.`);
  if (p.watermark !== undefined && p.watermark !== 'quarter-century') throw new Error('Invalid watermark.');
  if (p.metallicInk !== undefined) {
    object(p.metallicInk);
    if (typeof p.metallicInk.roughness !== 'number' || typeof p.metallicInk.metalness !== 'number') throw new Error('Invalid metallic ink.');
    if (p.metallicInk.color && (!Array.isArray(p.metallicInk.color) || p.metallicInk.color.length !== 3 || p.metallicInk.color.some((n: unknown) => typeof n !== 'number'))) throw new Error('Invalid metallic color.');
    for (const key of ['environmentIntensity', 'recess', 'normalFiltering']) if (p.metallicInk[key] !== undefined && (typeof p.metallicInk[key] !== 'number' || p.metallicInk[key] < 0 || p.metallicInk[key] > (key === 'environmentIntensity' ? 3 : 1))) throw new Error(`Invalid metallic ${key}.`);
  }
  if (p.mapSettings !== undefined) {
    object(p.mapSettings);
    for (const key of ['normalScale', 'embossStrength']) if (p.mapSettings[key] !== undefined && (typeof p.mapSettings[key] !== 'number' || p.mapSettings[key] < 0 || p.mapSettings[key] > 4)) throw new Error(`Invalid ${key}.`);
    if (p.mapSettings.roughnessMode !== undefined && !['profile', 'absolute', 'offset'].includes(p.mapSettings.roughnessMode)) throw new Error('Invalid roughness mode.');
  }
  if (p.maps !== undefined) {
    object(p.maps);
    const keys = new Set('coverage surface foil reverseFoil motif secondaryMotif stampMotif extendedFoil secondaryFoil metallic laminate height roughness sparkle stamp pattern secondaryPattern stampPattern protection direction secondaryDirection stampDirection normal hologram'.split(' '));
    for (const [key, path] of Object.entries(p.maps)) if (!keys.has(key) || typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('..') || path.length > 2048) throw new Error('Map assignments must be project-relative paths beginning with /.');
  }
  return structuredClone(p) as HolographicProfile;
}
export const serializeProfile = (profile: HolographicProfile) => JSON.stringify(deserializeProfile(JSON.stringify(profile)), null, 2);

export const PROFILE_STORAGE_KEY = 'holo:user-profiles:v1';
export function readUserProfiles(storage: Pick<Storage, 'getItem'>): HolographicProfile[] {
  const text = storage.getItem(PROFILE_STORAGE_KEY); if (!text) return [];
  const values: unknown = JSON.parse(text); if (!Array.isArray(values) || values.length > 200) throw new Error('Invalid saved profile library.');
  return values.map(p => deserializeProfile(JSON.stringify(p))).filter(p => p.id.startsWith('user-'));
}
export function writeUserProfiles(storage: Pick<Storage, 'setItem'>, profiles: HolographicProfile[]) {
  storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles.filter(p => p.id.startsWith('user-')).map(p => deserializeProfile(JSON.stringify(p)))));
}
