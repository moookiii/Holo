import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tcglSvSurfaces } from '../src/pokemon/data/sv-tcgl-surfaces.generated.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
test('TCGL ACE SPEC cards use the completed shared shader with their own masks', () => {
  assert.equal(readFileSync(new URL('../src/materials/profiles/svTcgl.ts', import.meta.url), 'utf8').includes('sv_tcgl_ace_spec'), false);
  // The newly imported Shrouded Fable etches follow the required single-normal
  // Sylveon material; the 24 previously authored ACE surfaces stay unchanged.
  const surfaces = tcglSvSurfaces.filter(s => s.foilType === 'ACE_FOIL' && !s.cardId.startsWith('sv06.5-'));
  assert.equal(surfaces.length, 24);
  for (const surface of surfaces) {
    const card = svTcglDefinition(surface.cardId, 'holo');
    assert.equal(card.profile, 'pokemon-ace-spec');
    assert.equal(card.pokemon?.materialProfile, 'pokemon-ace-spec');
    assert.equal(card.profileOverrides, undefined);
    assert.equal(card.mapSettings?.normalScale, 0);
    assert.equal(card.mapSettings?.embossStrength, 0);
    assert.equal(card.mapSettings?.roughnessMode, 'profile');
    assert.deepEqual(card.maps, surface.maps);
    assert.ok(card.maps?.foil);
    assert.ok(card.maps?.protection);
  }
});
