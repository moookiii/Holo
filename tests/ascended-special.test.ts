import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ascendedSpecialReverses } from '../src/pokemon/data/ascended-special.generated.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { svTcglCards } from '../src/pokemon/SvTcglCatalog.ts';
import { resolveCardProfile } from '../src/materials/profiles/resolveCardProfile.ts';
import { previewOptics } from '../src/card/PreviewOptics.ts';
import { galleryOpticalLayers, galleryBatchKey } from '../src/gallery/GalleryBatch.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { megaRecipes } from '../src/pokemon/MegaRecipes.ts';
import { filterCards } from '../src/gallery/GalleryQuery.ts';
import { megaReverse } from '../src/materials/profiles/megaReverse.ts';
import { ascendedSpecialSurface } from '../src/pokemon/AscendedSpecialSurfaces.ts';

const manifest = JSON.parse(readFileSync('public/cards/pokemon/tcgl-ascended-original/manifest.json', 'utf8'));
const original = new Map(manifest.printings.filter((p: any) => p.variantSuffix === '2').map((p: any) => [p.cardId, p]));
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('every ASC special printing resolves to its own untouched native texture and correct family', () => {
  assert.equal(ascendedSpecialReverses.length, 140);
  assert.equal(original.size, 140);
  const counts: Record<string, number> = {};
  for (const row of ascendedSpecialReverses) {
    const source: any = original.get(row.cardId);
    const card = svTcglDefinition(row.cardId, 'special-reverse');
    assert.equal(row.pattern, source.pattern);
    assert.equal(row.tcglVariantId, source.tcglLongFormId);
    assert.equal(row.tcglCardId, source.tcglCardId);
    assert.equal(card.profile, 'ascended-special-reverse');
    assert.deepEqual(card.maps, ascendedSpecialSurface(row.cardId, 'special-reverse')!.maps);
    for (const path of Object.values(card.maps!)) {
      const mask = readFileSync('public' + path);
      assert.equal(mask.readUInt32BE(16), 600);
      assert.equal(mask.readUInt32BE(20), 825);
    }
    const png = readFileSync('public' + row.whiteplate);
    assert.equal(hash(png), source.resources.whiteplate.pngSha256);
    assert.equal(png.readUInt32BE(16), 512);
    assert.equal(png.readUInt32BE(20), 512);
    assert.equal(png[25], 6, 'Native RGBA must be preserved');
    assert.equal(card.pokemon?.variant, 'special-reverse');
    assert.equal(card.pokemon?.treatmentStatus, undefined);
    assert.equal(card.mapSettings?.normalScale, 0);
    assert.equal(card.mapSettings?.embossStrength, 0);
    counts[row.pattern] = (counts[row.pattern] ?? 0) + 1;
  }
  assert.deepEqual(counts, { 'poke-ball': 34, 'friend-ball': 23, 'love-ball': 25,
    'quick-ball': 22, 'team-rocket': 10, 'dusk-ball': 26 });
  assert.equal(ascendedSpecialReverses.find(p => p.cardId === 'me02.5-025')?.pattern, 'quick-ball');
});

test('special reverse optics match standard reverse in viewer and gallery without timed shine', () => {
  const standard = resolveCardProfile(svTcglDefinition('me02.5-025', 'reverse'));
  const expected = previewOptics(svTcglDefinition('me02.5-025', 'reverse'), standard);
  for (const row of ascendedSpecialReverses) {
    const card = svTcglDefinition(row.cardId, 'special-reverse');
    const profile = resolveCardProfile(card);
    assert.equal(profile.opticalModel, 'mega-reverse');
    assert.deepEqual(profile.surface, megaReverse.surface);
    assert.deepEqual(profile.diffraction, megaReverse.diffraction);
    assert.deepEqual(profile.structure, megaReverse.structure);
    assert.deepEqual(profile.glints, megaReverse.glints);
    assert.equal(profile.maps, undefined);
    assert.equal(card.profileOverrides, undefined);
    assert.equal(profile.secondary, undefined);
    const parameters = previewOptics(card, profile);
    assert.deepEqual(parameters, expected);
    assert.equal(galleryOpticalLayers(parameters)[0].tcglFlatSilver, undefined);
    assert.equal(galleryBatchKey(galleryOpticalLayers(parameters)), galleryBatchKey(galleryOpticalLayers(expected)));
  }
});

test('gallery selection and pack collation retain all 140 assigned special variants', () => {
  const definitions = ascendedSpecialReverses.map(p => svTcglDefinition(p.cardId, 'special-reverse'));
  assert.equal(filterCards(definitions, { search: '', finish: 'special-reverse', set: 'Ascended Heroes' }).length, 140);
  const recipe = megaRecipes.find(r => r.setId === 'me02.5')!;
  const slot = recipe.slots.find(s => s.id === 'reverse-replacement')!;
  for (const row of ascendedSpecialReverses) {
    const forced = { ...recipe, slots: [{ ...slot, outcomes: [{ ...slot.outcomes[0], weight: 1, cardIds: [row.cardId] }] }] };
    const pull = collatePokemon('me02.5', 'standard', 42, svTcglCards, forced).pulls[0];
    assert.equal(pull.card.id, row.cardId);
    assert.equal(pull.variant, 'special-reverse');
    assert.deepEqual(svTcglDefinition(pull.card.id, pull.variant).maps, ascendedSpecialSurface(row.cardId, 'special-reverse')!.maps);
    assert.notEqual(svTcglDefinition(row.cardId, 'reverse').profile, 'ascended-special-reverse');
  }
});
