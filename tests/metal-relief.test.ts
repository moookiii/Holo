import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetalReliefGeometry, sampleHeight } from '../src/card/MetalReliefGeometry.ts';
import { mintedGold } from '../src/materials/profiles/metal.ts';
import { metalCollectibles } from '../src/card/MetalCollectibles.ts';
import { parseCardImportManifest } from '../src/assets/CardImportManifest.ts';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { holographicCardIds } from '../src/pack/PackDefinition.ts';

test('metal height samples use top-origin images and bilinear registered UVs', () => {
  const f = { width: 2, height: 2, data: [0, 255, 128, 64] };
  assert.equal(sampleHeight(f, .25, .75), 0);
  assert.equal(sampleHeight(f, .75, .75), 1);
  assert.equal(sampleHeight(f, .25, .25), 128/255);
  assert.ok(Math.abs(sampleHeight(f, .5, .5) - 447/1020) < 1e-10);
});

test('cast collectible is closed, has two independently displaced faces and an outward edge', () => {
  const d = { width: 4.445, height: 6.985, thickness: .3, cornerRadius: .22, bevel: .045 };
  const front = { width: 2, height: 2, data: [255,255,255,255] }, back = { ...front, data: [128,128,128,128] };
  const g = createMetalReliefGeometry(d, front, back, .045, .03, 24);
  assert.ok(Math.abs(g.boundingBox!.max.z - (.15+.045)) < 1e-6);
  assert.ok(Math.abs(g.boundingBox!.min.z + (.15+.03*128/255)) < 1e-6);
  const p = g.getAttribute('position'), index = g.getIndex()!, edges = new Map<string, number>();
  const key = (i: number) => [p.getX(i),p.getY(i),p.getZ(i)].map(n => n.toFixed(5)).join(',');
  for (let i = 0; i < index.count; i += 3) {
    const tri = [0,1,2].map(j => key(index.getX(i+j)));
    for (let j = 0; j < 3; j++) { const k = [tri[j],tri[(j+1)%3]].sort().join('|'); edges.set(k,(edges.get(k)??0)+1); }
  }
  assert.ok([...edges.values()].every(n => n === 2), 'closed manifold including face/bevel seams');
  assert.deepEqual(g.groups.map(g => g.materialIndex), [0,1,2]);
  assert.ok([...g.getAttribute('normal').array].every(Number.isFinite));
  g.dispose();
});

test('minted gold uses a pure conductor with no prismatic, sparkle or film energy', () => {
  assert.equal(mintedGold.metallicInk?.metalness, 1);
  assert.equal(mintedGold.diffraction.strength, 0);
  assert.equal(mintedGold.glints.strength, 0);
  assert.equal(mintedGold.surface.iridescence, 0);
  assert.equal(mintedGold.surface.laminate, 0);
  assert.equal(mintedGold.structure.field, 'plain');
});

const metalManifest = () => ({
  title: 'Cast specimen', franchise: 'Pokémon', front: 'front.png', back: 'back.png', profile: 'minted-gold',
  dimensions: { width: 4.445, height: 6.985, thickness: .3, cornerRadius: .22, bevel: .045 },
  construction: { kind: 'metal', frontReliefCm: .09, backReliefCm: .04 },
  maps: { height: 'front-height.png', metallic: 'metal.png', normal: 'front-normal.png' },
  backMaps: { height: 'back-height.png', metallic: 'metal.png', normal: 'back-normal.png' },
});

test('metal import retains two independent die faces and centimetre depth', () => {
  const source = metalManifest();
  const result = parseCardImportManifest(source, [mintedGold]);
  assert.deepEqual(result.construction, source.construction);
  assert.deepEqual(result.backMaps, source.backMaps);
  assert.equal(result.dimensions.thickness, .3);
  assert.equal(result.dimensions.bevel, .045);
  assert.throws(() => parseCardImportManifest({ ...source, backMaps: {} }, [mintedGold]), /both faces/);
  assert.throws(() => parseCardImportManifest({ ...source, backMaps: { ...source.backMaps, height: '../outside.png' } }, [mintedGold]), /inside/);
  assert.throws(() => parseCardImportManifest({ ...source, construction: { ...source.construction, frontReliefCm: -.01 } }, [mintedGold]), /frontReliefCm/);
  assert.throws(() => parseCardImportManifest({ ...source, backCrop: [0,0,1,1] }, [mintedGold]), /without backCrop/);
  assert.throws(() => parseCardImportManifest({ ...source, construction: undefined }, [mintedGold]), /thickness/);
  assert.throws(() => parseCardImportManifest({ ...source, dimensions: { ...source.dimensions, bevel: .15 } }, [mintedGold]), /bevel/);
});

test('gold reference files stay unchanged, both registered map sets exist, and pack collation is unaffected', () => {
  const card = metalCollectibles[0];
  const meta = JSON.parse(readFileSync('public/cards/charizard-burger-king-1999/source.json','utf8'));
  for (const side of ['front','back'] as const) {
    const hash=createHash('sha256').update(readFileSync(`public${card[side]}`)).digest('hex');
    assert.equal(hash,meta.sources[side].sha256);
    const maps=side==='front'?card.maps!:card.backMaps!;
    for (const key of ['height','normal','roughness','metallic'] as const) {
      assert.ok(existsSync(`public${maps[key]}`), `${side} ${key}`);
      const bytes=readFileSync(`public${maps[key]}`);
      assert.equal(bytes.readUInt32BE(16),1008); assert.equal(bytes.readUInt32BE(20),1584);
    }
    assert.ok(meta[side].authoredPeakMm <= meta[side].heightRangeMm, 'no clipped die relief');
    assert.ok(meta[side].roughnessRange[1]-meta[side].roughnessRange[0]>.15, 'polished and satin finishes differ');
  }
  assert.ok(!holographicCardIds.includes(card.id), 'cast plaque does not enter cardboard booster packs');
  assert.ok(Math.abs(card.construction!.frontReliefCm*10-meta.front.heightRangeMm)<1e-8);
  assert.ok(Math.abs(card.construction!.backReliefCm*10-meta.back.heightRangeMm)<1e-8);
});
