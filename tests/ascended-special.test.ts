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
import { TCGL_CARD_UV, TCGL_FLAT_SILVER_PATHS } from '../src/materials/TcglFlatSilverResources.ts';

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
    assert.deepEqual(card.maps, { foilControls: row.whiteplate });
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

test('native resources and UV registration use one isolated shared gallery/focus finish', () => {
  const batches = new Set<string>();
  for (const row of ascendedSpecialReverses) {
    const card = svTcglDefinition(row.cardId, 'special-reverse');
    const profile = resolveCardProfile(card);
    assert.equal(profile.opticalModel, 'tcgl-flat-silver');
    assert.equal(profile.mapSettings?.tcglCenterGreen, row.centerGreen);
    assert.ok(row.centerGreen >= 0 && row.centerGreen <= 1);
    assert.deepEqual(profile.maps, { direction: TCGL_FLAT_SILVER_PATHS.shine, secondaryDirection: TCGL_FLAT_SILVER_PATHS.spectrum });
    assert.equal(profile.secondary, undefined);
    assert.equal(profile.diffraction.strength, 0);
    assert.equal(profile.glints.strength, 0);
    assert.equal(profile.structure.relief, 0);
    const parameters = previewOptics(card, profile);
    assert.equal(parameters[34 * 4 + 3], 10);
    assert.ok(Math.abs(parameters[37 * 4] - row.centerGreen) < 1e-7);
    const layers = galleryOpticalLayers(parameters);
    assert.equal(layers[0].tcglFlatSilver, true);
    batches.add(galleryBatchKey(layers));
  }
  assert.deepEqual([...batches], ['tcgl-flat-silver']);
  assert.deepEqual(TCGL_CARD_UV, { left: 145 / 1024, width: 733 / 1024 });
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
    assert.equal(svTcglDefinition(pull.card.id, pull.variant).maps?.foilControls, row.whiteplate);
    assert.notEqual(svTcglDefinition(row.cardId, 'reverse').profile, 'ascended-special-reverse');
  }
});
