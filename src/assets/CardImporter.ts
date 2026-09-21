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

const ZIP_LOCAL_HEADER = 0x04034b50;
const ZIP_CENTRAL_HEADER = 0x02014b50;
const ZIP_END_HEADER = 0x06054b50;

async function unzip(file: File): Promise<File[]> {
  const bytes = await file.arrayBuffer();
  const view = new DataView(bytes);
  const minimumEnd = Math.max(0, bytes.byteLength - 0xffff - 22);
  let end = -1;
  for (let offset = bytes.byteLength - 22; offset >= minimumEnd; offset--) {
    if (view.getUint32(offset, true) === ZIP_END_HEADER) { end = offset; break; }
  }
  if (end < 0) throw new Error('The ZIP archive is missing its end record.');
  const entryCount = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true), directoryOffset = view.getUint32(end + 16, true);
  if (directoryOffset + directorySize > bytes.byteLength) throw new Error('The ZIP archive has an invalid central directory.');
  const output: File[] = [];
  let cursor = directoryOffset;
  let totalSize = 0;
  for (let index = 0; index < entryCount; index++) {
    if (cursor + 46 > bytes.byteLength || view.getUint32(cursor, true) !== ZIP_CENTRAL_HEADER) throw new Error('The ZIP archive contains an invalid entry.');
    const flags = view.getUint16(cursor + 8, true), compression = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true), uncompressedSize = view.getUint32(cursor + 24, true);
    const nameSize = view.getUint16(cursor + 28, true), extraSize = view.getUint16(cursor + 30, true), commentSize = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const nameBytes = new Uint8Array(bytes, cursor + 46, nameSize);
    const name = new TextDecoder(flags & 0x800 ? 'utf-8' : 'utf-8').decode(nameBytes);
    cursor += 46 + nameSize + extraSize + commentSize;
    if (name.endsWith('/')) continue;
    if (!name || name.includes('\0')) throw new Error('The ZIP archive contains an invalid filename.');
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) throw new Error('ZIP64 archives are not supported.');
    if (localOffset + 30 > bytes.byteLength || view.getUint32(localOffset, true) !== ZIP_LOCAL_HEADER) throw new Error(`The ZIP entry ${name} has an invalid local header.`);
    const localNameSize = view.getUint16(localOffset + 26, true), localExtraSize = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameSize + localExtraSize, finish = start + compressedSize;
    if (finish > bytes.byteLength) throw new Error(`The ZIP entry ${name} is truncated.`);
    totalSize += uncompressedSize;
    if (totalSize > 128 * 1024 * 1024) throw new Error('The ZIP archive expands beyond the 128 MB import limit.');
    const compressed = new Blob([bytes.slice(start, finish)]);
    let content: ArrayBuffer;
    if (compression === 0) content = await compressed.arrayBuffer();
    else if (compression === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress deflated ZIP archives.');
      content = await new Response(compressed.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    } else throw new Error(`The ZIP entry ${name} uses an unsupported compression method.`);
    if (content.byteLength !== uncompressedSize) throw new Error(`The ZIP entry ${name} failed decompression.`);
    output.push(new File([content], name));
  }
  if (!output.length) throw new Error('The ZIP archive does not contain any files.');
  return output;
}

/** Folder selection preserves relative paths; a flat bundle or ZIP archive can also be selected as multiple files. */
export async function importCardBundle(selected: readonly File[], profiles: readonly HolographicProfile[]): Promise<ImportedCard> {
  const bundleEntries = selected.length === 1 && /\.zip$/i.test(selected[0].name) ? await unzip(selected[0]) : [...selected];
  const manifests = bundleEntries.filter(file => /\.json$/i.test(file.name));
  if (manifests.length !== 1) throw new Error('Select one card manifest (.json) together with its image files.');
  const manifest = manifests[0];
  if (manifest.size > 1024 * 1024) throw new Error('The card manifest must be smaller than 1 MB.');
  let data: unknown;
  try { data = JSON.parse(await manifest.text()); } catch { throw new Error('The card manifest is not valid JSON.'); }
  const spec = parseCardImportManifest(data, profiles);
  const fullPath = manifest.webkitRelativePath || manifest.name;
  const parent = fullPath.slice(0, fullPath.lastIndexOf('/') + 1);
  const assets = new Map<string, File>();
  for (const file of bundleEntries) {
    if (file === manifest) continue;
    const path = file.webkitRelativePath || file.name;
    if (parent && !path.startsWith(parent)) continue;
    const relative = parent ? path.slice(parent.length) : path;
    if (assets.has(relative)) throw new Error(`More than one selected file is named ${relative}.`);
    assets.set(relative, file);
  }
  return prepareImportedCard(spec, assets);
}
