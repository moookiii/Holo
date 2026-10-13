import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tcglMegaSets, tcglMegaSurfaces } from '../src/pokemon/data/mega-tcgl.generated.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';

const audit = JSON.parse(readFileSync('docs/ascended-reverse-audit.json', 'utf8'));
const digest = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const asc = tcglMegaSets.find(set => set.id === 'me02.5')!;

test('audit accounts for every exact ASC reverse printing without calling missing motifs complete', () => {
  const expected = asc.cards.flatMap(card => card.variants
    .filter(v => v === 'reverse' || v === 'special-reverse').map(v => `${card.id}:${v}`)).sort();
  assert.equal(expected.length, 318);
  assert.deepEqual(audit.printings.map((r: any) => `${r.cardId}:${r.variant}`).sort(), expected);
  assert.equal(new Set(audit.printings.map((r: any) => r.tcglVariantId)).size, 318);
  assert.equal(audit.standardReverses, 178);
  assert.equal(audit.specialReverses, 140);
  assert.equal(audit.downloadedFoilSources, 636);
  assert.equal(audit.unavailableSpecialPatterns, 140);
  assert.equal(audit.implementationReady, false);
  assert.equal(audit.visualValidationComplete, false);
});

test('explicit per-card special assignments include all six designs and Groudon Dusk Ball', () => {
  const counts: Record<string, number> = {};
  for (const row of audit.printings.filter((r: any) => r.variant === 'special-reverse')) {
    counts[row.expectedFinish.pattern] = (counts[row.expectedFinish.pattern] ?? 0) + 1;
    assert.match(row.expectedFinish.referenceUrl, /^https:\/\/www.tcgplayer.com\/product\//);
    assert.match(row.expectedFinish.referenceImageUrl, /^https:\/\/tcgplayer-cdn.tcgplayer.com\/product\//);
    assert.equal(row.matchesOrdinarySource, true);
    assert.equal(row.sourceStatus, 'incorrect-duplicate');
    const ordinary = audit.printings.find((r: any) => r.cardId === row.cardId && r.variant === 'reverse');
    for (const format of ['png', 'tex']) {
      assert.notEqual(row.sources[format].url, ordinary.sources[format].url);
      assert.equal(row.sources[format].sha256, ordinary.sources[format].sha256);
      assert.equal(row.sources[format].rgbaSha256, ordinary.sources[format].rgbaSha256);
    }
  }
  assert.deepEqual(counts, { 'poke-ball': 34, 'friend-ball': 23, 'love-ball': 25,
    'quick-ball': 22, 'team-rocket': 10, 'dusk-ball': 26 });
  assert.equal(audit.printings.find((r: any) => r.cardId === 'me02.5-108' && r.variant === 'special-reverse').expectedFinish.pattern, 'dusk-ball');
});

test('Energy/plain reverses retain their maps; special reverses replace only the known incorrect export mappings', () => {
  const energyTypes = new Set();
  for (const row of audit.printings) {
    const card = asc.cards.find(c => c.id === row.cardId)!;
    const definition = svTcglDefinition(row.cardId, row.variant);
    const surface = tcglMegaSurfaces.find(s => s.cardId === row.cardId && s.variant === row.variant)!;
    assert.equal(surface.tcglVariantId, row.tcglVariantId);
    assert.equal(digest('public' + definition.front), row.frontSha256);
    if (row.variant === 'special-reverse') {
      assert.equal(definition.profile, 'ascended-special-reverse');
      assert.match(definition.maps?.foil ?? '', /tcgl-ascended-original\/registered\/me02\.5-\d{3}-foil\.png$/);
      assert.match(definition.maps?.protection ?? '', /-protection\.png$/);
      assert.equal(definition.maps?.foilControls, undefined);
    } else assert.deepEqual(definition.maps, row.runtimeMaps);
    for (const [key, url] of Object.entries(row.runtimeMaps)) {
      assert.equal(digest('public' + url), row.runtimeMapHashes[key]);
    }
    assert.equal(definition.mapSettings?.embossStrength, 0);
    assert.equal(definition.mapSettings?.normalScale, 0);
    if (row.variant === 'reverse') {
      assert.equal(row.expectedFinish.pattern, card.category === 'Pokemon' ? 'energy-' + card.types![0].toLowerCase() : 'plain');
      if (card.category === 'Pokemon') energyTypes.add(row.expectedFinish.pattern);
    }
  }
  assert.equal(energyTypes.size, 10);
});

test('conversion rejects duplicate special sources before changing any existing assets', () => {
  const code = `import sys,json
sys.path.insert(0,'scripts/tcgl')
from mega_series import validate_special_reverse_sources
p=json.load(open('research/tcgl/mega-series/me2-5/sources.json'))['printings']
try:
 validate_special_reverse_sources(p)
except ValueError as e:
 assert '140 special reverse foil sources duplicate' in str(e),str(e)
else:
 raise AssertionError('Incorrect special sources were accepted')
validate_special_reverse_sources([r for r in p if r['variant'] != 'special-reverse'])
a={'cardId':'test','variant':'reverse','sources':{'foil':{'sha256':'ordinary'}}}
b={'cardId':'test','variant':'special-reverse','tcglVariantId':'test_ph2','sources':{'foil':{'sha256':'distinct'}}}
validate_special_reverse_sources([a,b])
`;
  const result = spawnSync('python', ['-c', code], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
