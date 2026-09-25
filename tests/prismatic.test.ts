import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prismaticCards, prismaticCard, prismaticPrintings, prismaticPrinting, prismaticSet } from '../src/pokemon/PrismaticCatalog.ts';
import { prismaticRecipe, prismaticEnergyCards } from '../src/pokemon/PrismaticRecipe.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { recipeFor } from '../src/pokemon/recipes.ts';
import { pokemonDefinition, pokemonProfile } from '../src/pokemon/materials.ts';
import { PrismaticSurfaceUnavailable, prismaticSurfaceProgress, prismaticPickerCards } from '../src/pokemon/PrismaticSurfaces.ts';
import { prismaticProfiles } from '../src/materials/profiles/prismatic.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

const path = new URL('../public/cards/pokemon/prismatic-evolutions/', import.meta.url);
test('Umbreon SIR uses registered surface assets and user-authorized finish references', () => {
  const card = prismaticPickerCards().find(card => card.pokemon?.id === 'sv08.5-161')!;
  assert.ok(card);
  assert.equal(card.profile, 'prismatic_sir_texture');
  assert.equal(card.pickerHidden, false);
  assert.equal(card.mapSettings?.embossStrength, 0);
  const evidence = JSON.parse(readFileSync(new URL('maps/161-holo-evidence.json', path), 'utf8'));
  assert.equal(evidence.cardId, card.pokemon?.id);
  assert.equal(evidence.variant, 'holo');
  assert.equal(evidence.status, 'video-guided-reconstruction');
  assert.match(evidence.video.file, /2026-09-24 17-52-17/);
  assert.equal(evidence.references.length, 7);
  for (const reference of evidence.references) {
    const frame = readFileSync(new URL(`../research/prismatic-evolutions/umbreon-video/${reference.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(frame).digest('hex'), reference.sha256);
  }
  for (const channel of ['foil', 'protection', 'height', 'normal', 'roughness'] as const) {
    assert.ok(card.maps?.[channel]?.endsWith('.png'));
    const file = `161-holo-${channel}.png`;
    const bytes = readFileSync(new URL(`maps/${file}`, path));
    assert.equal(bytes.readUInt32BE(16), 1800);
    assert.equal(bytes.readUInt32BE(20), 2475);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), evidence.maps[file]);
  }
  const profile = prismaticProfiles.find(profile => profile.id === card.profile)!;
  assert.equal(profile.diffraction.followsAuthoredNormals, true);
  assert.equal(profile.glints.strength, 0);
  assert.equal(profile.secondary?.structure.field, 'diamond');
  assert.equal(profile.secondary?.glints.ordered, true);
  assert.equal(profile.secondary?.diffraction.crossing, .5);
  assert.ok(card.maps?.secondaryFoil?.endsWith('161-holo-secondary-foil.png'));
  const gemBytes = readFileSync(new URL('maps/161-holo-secondary-foil.png', path));
  assert.equal(gemBytes.readUInt32BE(16), 1800);
  assert.equal(gemBytes.readUInt32BE(20), 2475);
  assert.equal(createHash('sha256').update(gemBytes).digest('hex'), evidence.maps['161-holo-secondary-foil.png']);
  assert.equal(evidence.finishReferences.length, 2);
  for (const reference of evidence.finishReferences) {
    const bytes = readFileSync(new URL(`../research/prismatic-evolutions/umbreon-video/${reference.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), reference.sha256);
  }
  assert.throws(() => pokemonDefinition(prismaticCard('sv08.5-160'), 'holo', []), PrismaticSurfaceUnavailable);
});

test('complete English checklist and retail printings match the independent detailed source records', () => {
  const snapshot = JSON.parse(readFileSync(new URL('catalog.json', path), 'utf8'));
  assert.equal(prismaticCards.length, 180);
  assert.equal(new Set(prismaticCards.map(card => card.id)).size, 180);
  const counts: Record<string, number> = {};
  for (const [i, card] of prismaticCards.entries()) {
    assert.equal(Number(card.localId), i + 1);
    counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
    const source = snapshot.cards.find((entry: { id: string }) => entry.id === card.id);
    for (const [variant, foil] of [['pokeball-reverse', 'pokeball'], ['masterball-reverse', 'masterball']] as const) {
      assert.equal(card.variants.includes(variant), source.variantsDetailed.some((entry: { foil?: string; stamp?: unknown; subtype?: string }) => entry.foil === foil && !entry.stamp && !entry.subtype), card.id);
    }
    assert.ok(card.front && existsSync(new URL(`../public${card.front}`, import.meta.url)));
    assert.ok(!card.variants.includes('normal') || ['Common', 'Uncommon'].includes(card.rarity));
  }
  assert.deepEqual(counts, { Common: 46, Uncommon: 33, Rare: 21, 'Double Rare': 25, 'ACE SPEC Rare': 6, 'Ultra Rare': 12, 'Special Illustration Rare': 32, 'Hyper Rare': 5 });
  assert.equal(prismaticPrintings.filter(print => print.inScope).length, 347);
  assert.equal(prismaticPrintings.filter(print => print.variant === 'pokeball-reverse').length, 100);
  assert.equal(prismaticPrintings.filter(print => print.variant === 'masterball-reverse').length, 67);
  assert.equal(prismaticPrintings.filter(print => !print.inScope).length, 100);
  assert.equal(prismaticPrintings.filter(print => print.textured).length, 216);
  assert.ok(prismaticPrintings.filter(print => print.textured).every(print => print.inScope));
});

test('every downloaded front retains the source bytes and exact card identity', () => {
  const assets = JSON.parse(readFileSync(new URL('sources.json', path), 'utf8'));
  assert.equal(assets.length, 180);
  for (const asset of assets) {
    const bytes = readFileSync(new URL(asset.file, path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.cardId);
    assert.equal(prismaticCard(asset.cardId).front?.split('/').at(-1), asset.file);
    assert.equal(asset.role, 'printed-front-not-relief-evidence');
  }
});

test('invalid printings, promo finishes and fabricated rarity families never enter the retail set', () => {
  assert.throws(() => prismaticPrinting('sv08.5-093', 'masterball-reverse'), /Invalid/);
  assert.throws(() => prismaticPrinting('sv08.5-006', 'pokeball-reverse'), /Invalid/);
  assert.throws(() => prismaticPrinting('sv08.5-116', 'reverse'), /Invalid/);
  assert.throws(() => prismaticPrinting('sv08.5-161', 'normal'), /Invalid/);
  assert.throws(() => prismaticCard('sv08.5-181'), /Unknown/);
  assert.equal(prismaticPrinting('sv08.5-059', 'holo').textured, false);
  assert.equal(prismaticPrinting('sv08.5-132', 'holo').treatment, 'fullart-texture');
  assert.equal(prismaticPrinting('sv08.5-161', 'holo').treatment, 'sir-texture');
  assert.equal(prismaticPrinting('sv08.5-179', 'holo').treatment, 'gold');
  assert.equal(prismaticPrinting('sv08.5-059', 'reverse').profileId, undefined);
});

test('Prismatic metadata loads locally, remains abortable and rejects mismatched set identities', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request'); });
  const adapter = new TcgdexAdapter(), controller = new AbortController();
  const set = await adapter.set('sv08.5', controller.signal);
  const cards = await adapter.cards(set, controller.signal);
  assert.equal(cards.length, 180);
  assert.deepEqual(cards.find(card => card.id === 'sv08.5-059')?.variants, ['holo', 'reverse', 'pokeball-reverse', 'masterball-reverse']);
  await assert.rejects(adapter.card('sv08.5-001', { ...set, id: 'sv01' }, controller.signal), /does not belong/);
  controller.abort(); await assert.rejects(adapter.set('sv08.5', controller.signal), { name: 'AbortError' });
});

test('ordinary-pack collation preserves real slots, independent ball hits, all rarity pools and deterministic identity', () => {
  assert.equal(recipeFor('sv08.5'), prismaticRecipe);
  const counts: Record<string, number> = {}, reached = new Set<string>(); let doubleBall = 0, reverseEnergy = 0;
  for (let seed = 0; seed < 5000; seed++) {
    const pack = collatePokemon(prismaticSet.id, 'standard', seed, prismaticCards);
    assert.equal(pack.pulls.length, 11);
    assert.ok(pack.pulls.slice(0, 4).every(pull => pull.card.rarity === 'Common' && pull.variant === 'normal'));
    assert.ok(pack.pulls.slice(4, 7).every(pull => pull.card.rarity === 'Uncommon' && pull.variant === 'normal'));
    assert.ok(['holo', 'reverse', 'pokeball-reverse'].includes(pack.pulls[7].variant));
    assert.ok(['holo', 'reverse', 'masterball-reverse'].includes(pack.pulls[8].variant));
    assert.ok(['Rare', 'Double Rare', 'Ultra Rare'].includes(pack.pulls[9].card.rarity));
    assert.equal(pack.pulls[10].variant, 'normal'); assert.equal(pack.pulls[10].card.setId, 'sve');
    doubleBall += Number(pack.pulls[7].variant === 'pokeball-reverse' && pack.pulls[8].variant === 'masterball-reverse');
    for (const pull of pack.pulls) {
      assert.ok(pull.card.variants.includes(pull.variant)); reached.add(pull.card.id);
      if (pull.variant === 'masterball-reverse') assert.equal(pull.card.category, 'Pokemon');
      reverseEnergy += Number(pull.variant === 'reverse' && pull.card.setId === 'sve');
      const key = pull.variant.endsWith('-reverse') ? pull.variant : pull.card.rarity;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  for (const [key, rate] of [['pokeball-reverse', .3310], ['masterball-reverse', .0492], ['Double Rare', .1651], ['Ultra Rare', .0746], ['ACE SPEC Rare', .0468], ['Special Illustration Rare', .0222], ['Hyper Rare', .0056]] as const) {
    const expected = 5000 * rate;
    assert.ok(Math.abs(counts[key] - expected) < 5 * Math.sqrt(expected * (1 - rate)), `${key}: ${counts[key]}`);
  }
  assert.ok(doubleBall > 40); assert.ok(reverseEnergy > 100);
  assert.equal(reached.size, 188);
  const exact = collatePokemon('sv08.5', 'standard', 175, prismaticCards, prismaticRecipe);
  assert.deepEqual(exact, collatePokemon('sv08.5', 'standard', 175, [...prismaticCards].reverse(), prismaticRecipe));
  assert.throws(() => collatePokemon('sv08.5', 'standard', 1, prismaticCards.slice(1), prismaticRecipe), /Incomplete.*checklist/);
});

test('Prismatic never inherits generic materials or makes a missing surface look ready', () => {
  const progress = prismaticSurfaceProgress();
  assert.equal(progress.required, 268);
  assert.equal(progress.ready, 16);
  assert.equal(packAvailability('sv08.5').ready, false);
  assert.match(packAvailability('sv08.5').detail, /card-specific foil surfaces/);
  assert.equal(packAvailability('sv01').ready, true);
  for (const printing of progress.missing) {
    const card = prismaticCard(printing.cardId);
    assert.throws(() => pokemonProfile(card, printing.variant), PrismaticSurfaceUnavailable);
    assert.throws(() => pokemonDefinition(card, printing.variant, []), PrismaticSurfaceUnavailable);
  }
});

test('nonfoil cards remain pack-only and deferred reverses preserve their identities without substitute effects', () => {
  for (const card of prismaticCards) for (const variant of card.variants.filter(v => v === 'normal' || v === 'reverse')) {
    const definition = pokemonDefinition(card, variant, []);
    assert.equal(definition.pickerHidden, true);
    assert.equal(definition.profile, 'print-only');
    assert.equal(definition.maps, undefined);
    assert.equal(definition.proceduralFoil, undefined);
    assert.equal(definition.pokemon?.variant, variant);
    assert.equal(definition.pokemon?.treatmentStatus, variant === 'reverse' ? 'deferred' : undefined);
    if (variant === 'reverse') assert.match(definition.number, /foil pending/);
  }
  // A fabricated caller-side rarity/variant cannot bypass the local checklist.
  assert.throws(() => pokemonDefinition({ ...prismaticCard('sv08.5-161'), variants: ['normal'] }, 'normal', []), /Invalid/);
  for (const card of prismaticEnergyCards) {
    const reverse = pokemonDefinition(card, 'reverse', [], 'sv08.5');
    assert.equal(reverse.profile, 'print-only');
    assert.equal(reverse.pokemon?.variant, 'reverse');
    assert.equal(reverse.pokemon?.treatmentStatus, 'deferred');
    assert.equal(reverse.pickerHidden, true);
    assert.equal(pokemonDefinition(card, 'normal', [], 'sv08.5').pickerHidden, true);
    assert.equal(pokemonDefinition(card, 'normal', [], 'sv01').pickerHidden, undefined);
    assert.throws(() => pokemonDefinition({ ...card, variants: ['holo'] }, 'holo', [], 'sv08.5'), /Invalid/);
    assert.throws(() => pokemonDefinition({ ...card, variants: ['pokeball-reverse'] }, 'pokeball-reverse', [], 'sv08.5'), /Invalid/);
  }
});

test('authored regular holo resolves only its exact printing and preserves a foil-only picker', () => {
  const entries = prismaticPickerCards();
  assert.deepEqual(entries.map(card => card.id), ['005', '013', '022', '025', '029', '033', '040', '059', '116', '117', '119', '128', '129', '131', '133', '161'].map(n => `pokemon:sv08.5-${n}:holo`));
  const card = entries.find(card => card.id === 'pokemon:sv08.5-059:holo')!;
  assert.equal(card.pickerHidden, false);
  assert.equal(card.profile, 'prismatic_regular_holo');
  assert.equal(card.maps?.height, undefined);
  assert.equal(card.maps?.normal, undefined);
  assert.equal(card.mapSettings?.embossStrength, 0);
  for (const map of Object.values(card.maps ?? {})) assert.ok(existsSync(`public${map}`));
  const evidence = JSON.parse(readFileSync(new URL('maps/059-holo-evidence.json', path), 'utf8'));
  assert.equal(evidence.cardId, card.pokemon?.id);
  assert.equal(evidence.variant, card.pokemon?.variant);
  const profile = prismaticProfiles.find(profile => profile.id === card.profile)!;
  assert.equal(profile.structure.relief, 0);
  assert.equal(profile.glints.strength, 0);
  assert.throws(() => pokemonDefinition(prismaticCard('sv08.5-059'), 'masterball-reverse', entries), PrismaticSurfaceUnavailable);
  assert.throws(() => pokemonDefinition(prismaticCard('sv08.5-059'), 'pokeball-reverse', entries), PrismaticSurfaceUnavailable);
});

test('regular holo foreground windows and print protection stay specific to each card', () => {
  const hashes = new Set<string>();
  for (const number of ['005', '013', '022', '025', '029', '033', '040']) {
    const card = pokemonDefinition(prismaticCard(`sv08.5-${number}`), 'holo', []);
    const evidence = JSON.parse(readFileSync(new URL(`maps/${number}-holo-evidence.json`, path), 'utf8'));
    assert.equal(card.profile, 'prismatic_regular_holo');
    assert.equal(card.pickerHidden, false);
    assert.equal(card.maps?.height, undefined);
    assert.equal(card.maps?.normal, undefined);
    assert.equal(card.mapSettings?.embossStrength, 0);
    assert.equal(evidence.cardId, card.pokemon?.id);
    assert.ok(evidence.references.length > 0);
    for (const [file, hash] of Object.entries(evidence.maps)) {
      assert.equal(createHash('sha256').update(readFileSync(new URL(`maps/${file}`, path))).digest('hex'), hash);
    }
    hashes.add(evidence.maps[`${number}-holo-foil.png`]);
    assert.throws(() => pokemonDefinition(prismaticCard(`sv08.5-${number}`), 'masterball-reverse', []), PrismaticSurfaceUnavailable);
  }
  assert.equal(hashes.size, 7);
});

test('all six ACE SPEC printings use individual coverage and no invented relief', () => {
  const profilesById = new Map(prismaticProfiles.map(profile => [profile.id, profile]));
  const hashes = new Set<string>();
  for (const number of ['116', '117', '119', '128', '129', '131']) {
    const card = pokemonDefinition(prismaticCard(`sv08.5-${number}`), 'holo', []);
    assert.equal(card.profile, 'prismatic_ace_spec');
    assert.equal(card.pickerHidden, false);
    assert.equal(card.proceduralFoil, undefined);
    assert.equal(card.maps?.height, undefined);
    assert.equal(card.maps?.normal, undefined);
    const evidence = JSON.parse(readFileSync(new URL(`maps/${number}-holo-evidence.json`, path), 'utf8'));
    assert.equal(evidence.cardId, card.pokemon?.id);
    assert.equal(evidence.variant, card.pokemon?.variant);
    assert.equal(evidence.textured, false);
    assert.ok(evidence.references.length > 0);
    for (const [file, hash] of Object.entries(evidence.maps)) {
      assert.equal(createHash('sha256').update(readFileSync(new URL(`maps/${file}`, path))).digest('hex'), hash);
    }
    hashes.add(evidence.maps[`${number}-holo-foil.png`]);
    assert.equal(profilesById.get(card.profile)?.structure.relief, 0);
    assert.equal(profilesById.get(card.profile)?.glints.strength, 0);
    assert.throws(() => pokemonDefinition(prismaticCard(`sv08.5-${number}`), 'pokeball-reverse', []), /Invalid/);
  }
  assert.equal(hashes.size, 6, 'Different devices must not share a single foil mask');
});

test('Atticus has five authored PNG channels and only its exact printing is enabled', () => {
  const profile = prismaticProfiles.find(profile => profile.id === 'prismatic_fullart_texture')!;
  assert.ok(profile);
  assert.equal(profile.labOnly, true);
  assert.equal(profile.status, 'development');
  assert.equal(profile.structure.field, 'plain');
  assert.equal(profile.structure.engraving, 0);
  assert.equal(profile.structure.patternRelief, 0);
  assert.equal(profile.structure.relief, 0);
  assert.equal(profile.diffraction.facetCoupling, 0, 'Generic facets must not replace traced normals');
  assert.equal(profile.glints.strength, 0);
  assert.equal(profile.mapSettings?.embossStrength, 0, 'Do not differentiate full relief twice');
  const evidence = JSON.parse(readFileSync(new URL('maps/133-holo-evidence.json', path), 'utf8'));
  assert.equal(evidence.cardId, 'sv08.5-133');
  assert.equal(evidence.status, 'directional-reconstruction');
  assert.equal(evidence.rendererReady, true);
  assert.equal(evidence.references.length, 12);
  for (const [file, hash] of Object.entries(evidence.maps)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(`maps/${file}`, path))).digest('hex'), hash);
  }
  for (const reference of evidence.references) {
    const photo = new URL(`../research/prismatic-evolutions/photos/${reference.file}`, import.meta.url);
    assert.equal(createHash('sha256').update(readFileSync(photo)).digest('hex'), reference.sha256);
  }
  assert.deepEqual(Object.keys(evidence.maps).sort(), ['133-holo-foil.png', '133-holo-height.png', '133-holo-normal.png', '133-holo-protection.png', '133-holo-roughness.png']);
  assert.ok(!existsSync(new URL('maps/133-holo-foil.svg', path)), 'Full-art coverage must ship as a raster PNG');
  const atticus = pokemonDefinition(prismaticCard('sv08.5-133'), 'holo', []);
  assert.equal(atticus.mapSettings?.normalScale, 1.35);
  assert.equal(atticus.mapSettings?.embossStrength, 0);
  assert.equal(atticus.profile, 'prismatic_fullart_texture');
  assert.throws(() => pokemonDefinition(prismaticCard('sv08.5-132'), 'holo', []), PrismaticSurfaceUnavailable);
  assert.ok(prismaticPickerCards().some(card => card.pokemon?.id === 'sv08.5-133'));
  assert.match(evidence.limitations, /approximations/);
});
