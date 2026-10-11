import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { tcglSmSurfaces } from '../src/pokemon/data/sm-tcgl.generated.ts';
import { isPrismStar, prismStarIds, prismStarMaps } from '../src/pokemon/PrismStarSurfaces.ts';
import { generatePokemonDirectionalField } from '../src/materials/patterns/PokemonDirectionalPatterns.ts';
import { prismStar } from '../src/materials/profiles/prismStar.ts';

test('every audited Prism Star resolves exact foil plus its own border, without inventing etch', () => {
  const audit = JSON.parse(readFileSync('docs/references/prism-star/tcgl-audit.json', 'utf8'));
  assert.equal(prismStarIds.size, audit.cards.length);
  for (const entry of audit.cards) {
    const id = entry.cardId.replace('_', '-');
    assert.ok(isPrismStar(id, 'holo'));
    assert.ok(!isPrismStar(id, 'normal') && !isPrismStar(id, 'reverse'));
    const surface = tcglSmSurfaces.find(s => s.cardId === id && s.variant === 'holo')!;
    assert.ok(surface.maps.foil && surface.maps.foilControls);
    assert.equal(surface.textured, false);
    assert.ok(!('normal' in surface.maps) && !('height' in surface.maps));
    for (const path of Object.values(prismStarMaps(id))) assert.ok(existsSync(`public${path}`), path);
  }
  assert.ok(!isPrismStar('sm5-1', 'holo'));
});

test('Prism Star has continuous optical inclinations, no raised lines or random grain', () => {
  const field = generatePokemonDirectionalField('sm-prism-star', 2023000, 63 / 88, 1, 1024);
  let maxStep = 0;
  for (let y = 0; y < field.height; y++) for (let x = 0; x < field.width; x++) {
    const i = (y * field.width + x) * 4;
    assert.equal(field.relief[i + 2], 128);
    assert.equal(field.relief[i + 3], 128);
    for (const j of [x + 1 < field.width ? i + 4 : -1, y + 1 < field.height ? i + field.width * 4 : -1]) {
      if (j < 0) continue;
      maxStep = Math.max(maxStep, Math.abs(field.relief[i] - field.relief[j]), Math.abs(field.relief[i + 1] - field.relief[j + 1]));
    }
  }
  assert.ok(maxStep <= 4, `discontinuous optical sheet: ${maxStep}/255`);
  assert.equal(prismStar.glints.strength, 0);
  assert.equal(prismStar.structure.relief, 0);
  assert.equal(prismStar.mapSettings?.embossStrength, 0);
  assert.equal(prismStar.secondary, undefined);
});
