import test from 'node:test';
import assert from 'node:assert/strict';
import { tcglMegaSurfaces } from '../src/pokemon/data/mega-tcgl.generated.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { resolveCardProfile } from '../src/materials/profiles/resolveCardProfile.ts';
import { pokemon151Definition } from '../src/pokemon/Pokemon151Surfaces.ts';

test('ordinary ME reverses use dedicated optics while keeping their exact source maps', () => {
  const reverses = tcglMegaSurfaces.filter(s => s.variant === 'reverse');
  assert.ok(reverses.length > 500);
  for (const source of reverses) {
    const card = svTcglDefinition(source.cardId, 'reverse');
    assert.equal(card.profile, 'mega-standard-reverse');
    assert.deepEqual(card.maps, source.maps);
    const profile = resolveCardProfile(card);
    assert.equal(profile.opticalModel, 'mega-reverse');
    assert.equal(profile.structure.relief, 0);
    assert.equal(profile.glints.strength, 0);
    assert.equal(card.mapSettings?.normalScale, 0);
    assert.equal(card.mapSettings?.embossStrength, 0);
  }
});

test('ME reverse routing leaves normal, holo, special reverse and SV surfaces unchanged', () => {
  for (const source of tcglMegaSurfaces.filter(s => ['me03-063', 'me01-001', 'me02.5-001'].includes(s.cardId) && s.variant !== 'reverse')) {
    assert.equal(svTcglDefinition(source.cardId, source.variant).profile, source.profile);
  }
  assert.equal(pokemon151Definition('sv03.5-143', 'reverse').profile, 'pokemon151_standard_reverse');
});
