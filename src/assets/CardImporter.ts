import type { CardDefinition } from '../card/CardDefinition';
import type { HolographicProfile } from '../materials/HolographicProfile';
import { CARD_MAP_KEYS, parseCardImportManifest, relativeAssetPath, type CardImportSpec } from './CardImportManifest';

export interface ImportedCard { definition: CardDefinition; assetUrls: string[]; dispose: () => void; }
export type SelectedFiles = ReadonlyMap<string, File>;

function imageFile(file: File) {
  if (!/\.(png|jpe?g|webp|svg|avif)$/i.test(file.name)) throw new Error(`${file.name}: choose a PNG, JPEG, WebP, SVG, or AVIF image.`);
  if (file.size > 64 * 1024 * 1024) throw new Error(`${file.name} is larger than the 64 MB image limit.`);
}

/** Object URLs are local to this browser. No file is uploaded or written back. */
export async function prepareImportedCard(spec: CardImportSpec, files: SelectedFiles): Promise<ImportedCard> {
  const normalized = new Map<string, File>();
  for (const [path, file] of files) {
    const key = relativeAssetPath(path, 'Selected filename').toLowerCase();
    if (normalized.has(key)) throw new Error(`More than one selected file is named ${path}.`);
    normalized.set(key, file);
  }
  const urls = new Map<File, string>(), dimensions = new Map<File, { width: number; height: number }>();
  let decodedPixels = 0;
  const resolve = async (path: string, map: boolean) => {
    const file = normalized.get(path.toLowerCase());
    if (!file) throw new Error(`The bundle is missing ${path}.`);
    imageFile(file);
    if (!urls.has(file)) {
      const url = URL.createObjectURL(file); urls.set(file, url);
      const image = new Image(); image.src = url;
      try { await image.decode(); } catch { throw new Error(`${file.name} could not be decoded as an image.`); }
      if (!image.naturalWidth || !image.naturalHeight) throw new Error(`${file.name} has no usable image dimensions.`);
      dimensions.set(file, { width: image.naturalWidth, height: image.naturalHeight });
      decodedPixels += image.naturalWidth * image.naturalHeight;
      if (decodedPixels > 64 * 1024 * 1024) throw new Error('The selected images exceed the 64-megapixel import limit. Reduce the size of the material maps.');
    }
    const size = dimensions.get(file)!, limit = map ? 4096 : 8192;
    if (size.width > limit || size.height > limit) throw new Error(`${file.name} exceeds the ${limit}-pixel ${map ? 'material-map' : 'card-image'} limit.`);
    return urls.get(file)!;
  };
  try {
    const front = await resolve(spec.front, false), back = await resolve(spec.back, false);
    const maps: NonNullable<CardDefinition['maps']> = {};
    for (const name of CARD_MAP_KEYS) if (spec.maps?.[name]) maps[name] = await resolve(spec.maps[name]!, true);
    const backMaps: NonNullable<CardDefinition['backMaps']> = {};
    for (const name of CARD_MAP_KEYS) if (spec.backMaps?.[name]) backMaps[name] = await resolve(spec.backMaps[name]!, true);
    const definition: CardDefinition = { ...spec, id: `import-${crypto.randomUUID()}`, imported: true, front, back, maps, ...(spec.backMaps ? { backMaps } : {}),
      source: { image: spec.front, metadata: 'Local card import', notes: 'Selected source files are unmodified. Imported images and material maps stay in this browser session.' } };
    return { definition, assetUrls: [...urls.values()], dispose: () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); } };
  } catch (error) { urls.forEach(url => URL.revokeObjectURL(url)); throw error; }
}

/** Folder selection preserves relative paths; a flat bundle can also be selected as multiple files. */
export async function importCardBundle(selected: readonly File[], profiles: readonly HolographicProfile[]): Promise<ImportedCard> {
  const manifests = selected.filter(file => /\.json$/i.test(file.name));
  if (manifests.length !== 1) throw new Error('Select one card manifest (.json) together with its image files.');
  const manifest = manifests[0];
  if (manifest.size > 1024 * 1024) throw new Error('The card manifest must be smaller than 1 MB.');
  let data: unknown;
  try { data = JSON.parse(await manifest.text()); } catch { throw new Error('The card manifest is not valid JSON.'); }
  const spec = parseCardImportManifest(data, profiles);
  const fullPath = manifest.webkitRelativePath || manifest.name;
  const parent = fullPath.slice(0, fullPath.lastIndexOf('/') + 1);
  const files = new Map<string, File>();
  for (const file of selected) {
    if (file === manifest) continue;
    const path = file.webkitRelativePath || file.name;
    if (parent && !path.startsWith(parent)) continue;
    const relative = parent ? path.slice(parent.length) : path;
    if (files.has(relative)) throw new Error(`More than one selected file is named ${relative}.`);
    files.set(relative, file);
  }
  return prepareImportedCard(spec, files);
}
