/** Refresh missing gallery metadata from exact English TCGdex card identities.
 * Does not import variants into local pack pools or alter authored materials. */
import { register } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (error) {
    if (specifier.startsWith('.') && !/\\.[a-z]+$/i.test(specifier)) {
      for (const extension of ['.ts', '.js']) {
        try { return await next(specifier + extension, context); } catch {}
      }
    }
    throw error;
  }
}`));

const directory = 'research/tcgdex/pokemon-metadata';
await mkdir(directory, { recursive: true });
const query = '{ cards { id localId name rarity category types stage suffix trainerType energyType evolveFrom set { id name } variants { normal reverse holo } variants_detailed { type size stamp subtype foil } } }';
const snapshotPath = `${directory}/cards.json`;
let snapshot;
if (process.argv.includes('--cached')) snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
else {
  const response = await fetch('https://api.tcgdex.net/v2/graphql', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }), signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`TCGdex: ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(JSON.stringify(result.errors.slice(0, 3)));
  if (result.data.cards.length < 20000) throw new Error('Incomplete TCGdex snapshot');
  snapshot = { source: 'https://api.tcgdex.net/v2/graphql', language: 'en', fetchedAt: new Date().toISOString(), query, cards: result.data.cards };
  await writeFile(snapshotPath, JSON.stringify(snapshot) + '\n');
}

// Only numeric padding is normalized. Set, collector number and name must agree.
const key = id => id.replace(/-0+(\d+)$/, '-$1');
const byId = new Map(snapshot.cards.map(card => [key(card.id), card]));
const nameKey = name => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9♀♂]/gi, '').toLowerCase();
const { nonHoloCards } = await import('../src/card/NonHoloCards.ts');
const { cards } = await import('../src/card/CardDefinition.ts');
let previousRecords = {};
let previousCorrections = {};
try {
  const previous = await import('../src/pokemon/data/gallery-metadata.generated.ts');
  previousRecords = previous.galleryPokemonMetadata;
  previousCorrections = previous.galleryPokemonCorrections;
} catch {}
const candidates = new Map([...nonHoloCards, ...cards].filter(card => card.franchise === 'Pokémon').map(card => [card.id, card]));
const archiveSources = new Map(JSON.parse(await readFile('public/cards/non-holo/sources.json', 'utf8'))
  .filter(record => record.franchise === 'Pokémon').map(record => [`common-pokemon-${record.slug}`, record]));
const setIds = {
  'Base Set': 'base1', Jungle: 'base2', Fossil: 'base3', 'Scarlet & Violet': 'sv01',
  'Neo Genesis': 'neo1', 'Sun & Moon Base': 'sm1', 'Vivid Voltage': 'swsh4',
  'Paldea Evolved': 'sv02', 'EX FireRed & LeafGreen': 'ex6',
};
const records = {}, corrections = { ...previousCorrections }, unresolved = [], audited = [], variantDiscrepancies = [];
for (const card of candidates.values()) {
  if (card.construction?.kind === 'metal') continue;
  const baseSet = card.set.split(' · ')[0];
  const collectorNumber = card.number.match(/^\d+/)?.[0];
  const archive = archiveSources.get(card.id);
  const archiveId = archive?.card?.replace('/', '-');
  const id = archiveId ?? card.pokemon?.id ?? (setIds[baseSet] && collectorNumber ? `${setIds[baseSet]}-${collectorNumber}` : undefined);
  const source = id ? byId.get(key(id)) : undefined;
  const exactArchivedAsset = archive && card.front === `/cards/non-holo/pokemon/${archive.slug}.png`
    && archive.source === `https://images.pokemontcg.io/${source?.set.id}/${source?.localId}_hires.png`;
  if (!source || nameKey(source.name) !== nameKey(card.title) && !exactArchivedAsset) {
    if (!card.pokemon?.rarity || !card.pokemon?.category) unresolved.push({ id: card.id, title: card.title, candidate: id });
    continue;
  }
  if (exactArchivedAsset && (nameKey(source.name) !== nameKey(card.title) || source.localId !== collectorNumber)) {
    corrections[card.id] = { title: source.name, number: `${source.localId}/${card.number.split('/')[1]}`, source: archive.source };
  }
  audited.push({ id: card.id, tcgdexId: source.id });
  if (card.pokemon?.rarity && card.pokemon?.category && !previousRecords[card.id]) continue;
  const variant = card.profile === 'print-only' ? 'normal' : /reverse/i.test(card.set + ' ' + card.number) ? 'reverse' : 'holo';
  const variants = ['normal', 'reverse', 'holo'].filter(v => source.variants?.[v]);
  if (!variants.includes(variant)) variantDiscrepancies.push({ id: card.id, tcgdexId: source.id, authoredVariant: variant, tcgdexVariants: variants, resolution: 'Keep the exact authored printing; TCGdex variant flags do not replace printing-specific source evidence.' });
  const foil = {};
  for (const v of source.variants_detailed ?? []) {
    if (v.size !== 'standard' || v.stamp?.length || v.subtype || !v.foil) continue;
    if (!foil[v.type]) foil[v.type] = v.foil;
  }
  const seriesId = source.id.startsWith('sv') ? 'sv' : source.id.startsWith('swsh') ? 'swsh' : source.id.startsWith('sm') ? 'sm' : source.id.startsWith('neo') ? 'neo' : source.id.startsWith('ex') ? 'ex' : 'base';
  const seriesName = { sv: 'Scarlet & Violet', swsh: 'Sword & Shield', sm: 'Sun & Moon', neo: 'Neo', ex: 'EX', base: 'Base' }[seriesId];
  records[card.id] = {
    id: source.id, localId: source.localId, name: source.name, setId: source.set.id, setName: source.set.name,
    seriesId, seriesName, era: seriesId,
    rarity: source.rarity === 'Rare' && variant === 'holo' && ['base', 'neo'].includes(seriesId) ? 'Holo Rare' : source.rarity,
    category: source.category, variants: [variant], variant, foil, materialProfile: card.profile,
    ...Object.fromEntries(['types', 'stage', 'suffix', 'trainerType', 'energyType', 'evolveFrom'].filter(field => source[field]).map(field => [field, source[field]])),
    ...(/1st Edition|First Edition/i.test(card.set + ' ' + card.number) ? { edition: 'first-edition' } : {}),
  };
}
// This unnumbered promo has no English TCGdex entry. Its existing exact-print
// catalog is authoritative; it must not be matched to numbered Mew 8 or 9.
const { wizardsPromoCard } = await import('../src/pokemon/WizardsPromoCatalog.ts');
const { front, thumbnail, ...ancientMew } = wizardsPromoCard('basep-ancient-mew');
records['ancient-mew'] = { ...ancientMew, variant: 'holo', materialProfile: 'pokemon-ancient-mew' };
const exceptions = [{ id: 'ancient-mew', title: 'Ancient Mew', resolution: 'Existing exact unnumbered promo catalog; no TCGdex identity fabricated.' }];
await writeFile('src/pokemon/data/gallery-metadata.generated.ts',
  '// Exact English TCGdex identities; generated by scripts/pokemon-metadata.mjs.\n' +
  "import type { PokemonCard, PrintVariant } from '../types.ts';\n" +
  'export const galleryPokemonMetadata: Readonly<Record<string, PokemonCard & { variant: PrintVariant; materialProfile: string }>> = ' + JSON.stringify(records, null, 2) + ';\n' +
  'export const galleryPokemonCorrections: Readonly<Record<string, { title: string; number: string; source: string }>> = ' + JSON.stringify(corrections, null, 2) + ';\n');
const { svTcglGalleryCards, svTcglPickerCards } = await import('../src/pokemon/SvTcglSurfaces.ts');
const { pokemon151GalleryCards, pokemon151PickerCards } = await import('../src/pokemon/Pokemon151Surfaces.ts');
const { prismaticGalleryCards, prismaticPickerCards } = await import('../src/pokemon/PrismaticSurfaces.ts');
const { celebrationGalleryCards } = await import('../src/pokemon/CelebrationSurfaces.ts');
const { dragonDiscoveryDefinitions } = await import('../src/pokemon/DragonDiscoveryCatalog.ts');
const { pokemonFinishTags } = await import('../src/pokemon/finishes.ts');
const registry = new Map([...cards, ...svTcglGalleryCards(), ...svTcglPickerCards(),
  ...pokemon151GalleryCards(), ...pokemon151PickerCards(), ...prismaticGalleryCards(), ...prismaticPickerCards(),
  ...celebrationGalleryCards(), ...dragonDiscoveryDefinitions].filter(card => card.franchise === 'Pokémon' && !card.construction)
  .map(card => [card.id, card]));
const setCoverage = {};
for (const card of registry.values()) {
  const setId = card.pokemon?.setId ?? 'unresolved';
  const set = setCoverage[setId] ??= { name: card.pokemon?.setName ?? card.set, printings: 0, missingRarity: 0, missingCategory: 0, missingFinish: 0, finishes: {} };
  set.printings++;
  set.missingRarity += !card.pokemon?.rarity;
  set.missingCategory += !card.pokemon?.category;
  const finishes = pokemonFinishTags(card);
  set.missingFinish += !finishes.length;
  for (const finish of finishes) set.finishes[finish] = (set.finishes[finish] ?? 0) + 1;
}
const report = { source: snapshot.source, fetchedAt: snapshot.fetchedAt, snapshotSha256: createHash('sha256').update(await readFile(snapshotPath)).digest('hex'), sourceCardCount: snapshot.cards.length, tagged: Object.keys(records).length, audited: audited.length, correctedArchiveLabels: corrections, unresolved: unresolved.filter(record => record.id !== 'ancient-mew'), exceptions, variantDiscrepancies, setCoverage, policy: 'Fill missing fields after exact set/number/name matching. Archive label corrections use the original image source identity; never match an image to a different card by its erroneous label. Preserve local variants, collation rarity and authored materials. Physical-copy foil placement and optical completion are independent.' };
await writeFile('docs/pokemon-metadata-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ tagged: report.tagged, correctedArchiveLabels: Object.keys(corrections).length,
  unresolved: report.unresolved, registeredSets: Object.keys(setCoverage).length, registeredPrintings: registry.size,
  missingRarity: Object.values(setCoverage).reduce((sum, set) => sum + set.missingRarity, 0),
  missingCategory: Object.values(setCoverage).reduce((sum, set) => sum + set.missingCategory, 0),
  missingFinish: Object.values(setCoverage).reduce((sum, set) => sum + set.missingFinish, 0) }, null, 2));
