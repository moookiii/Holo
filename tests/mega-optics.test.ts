import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { tcglMegaSurfaces } from '../src/pokemon/data/mega-tcgl.generated.ts';
import { megaAttackRare, megaHyperRare } from '../src/materials/profiles/megaRarity.ts';
import { getProfile } from '../src/materials/profiles/index.ts';
import { resolveCardProfile } from '../src/materials/profiles/resolveCardProfile.ts';
import { packMapChannels } from '../src/assets/MapPacking.ts';

const evidence = JSON.parse(readFileSync('research/mega-optics/optical-regions.json','utf8')) as {
  cardId: string; rarity: string; tcglVariantId: string; mask: string; sha256: string;
  dimensions: number[]; cropOrOffset: boolean; verticalFlip: boolean; approvedAssets: Record<string,string>;
}[];
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('all fifteen exact Mega printings use independent optics without rewriting approved assets', () => {
  assert.equal(evidence.length,15);
  assert.equal(evidence.filter(e=>e.rarity==='Mega Attack Rare').length,7);
  assert.equal(new Set(evidence.map(e=>e.cardId)).size,15);
  for(const e of evidence){
    const card = svTcglDefinition(e.cardId,'holo'), profile=resolveCardProfile(card);
    const source=tcglMegaSurfaces.find(s=>s.cardId===e.cardId&&s.variant==='holo')!;
    assert.equal(source.tcglVariantId,e.tcglVariantId);
    assert.equal(profile.id,e.rarity==='Mega Attack Rare'?megaAttackRare.id:megaHyperRare.id);
    assert.equal(card.pokemon?.treatmentStatus,undefined);
    assert.equal(card.maps?.secondaryFoil,'/'+e.mask.replace(/^public\//,''));
    assert.deepEqual(Object.keys(card.maps!).sort(),[...Object.keys(source.maps),'secondaryFoil'].sort());
    for(const [key,path] of Object.entries(source.maps))assert.equal(card.maps![key as keyof typeof card.maps],path);
    assert.equal(hash(e.mask),e.sha256);
    const png=readFileSync(e.mask);assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],e.dimensions);
    assert.deepEqual(e.dimensions,[733,1024]);assert.equal(e.cropOrOffset,false);assert.equal(e.verticalFlip,false);
    for(const [path,expected] of Object.entries(e.approvedAssets))assert.equal(hash(path),expected,path);
    assert.equal(profile.mapSettings?.normalScale,1);assert.equal(card.mapSettings?.normalScale,1);
    assert.equal(profile.mapSettings?.embossStrength,0);assert.equal(card.maps?.height,undefined);
    assert.equal(profile.mapSettings?.embossMaskFromNormalAlpha,false);
    assert.equal(card.mapSettings?.roughnessMode,'absolute');
    for(const layer of [profile,profile.secondary!]){
      assert.equal(layer.diffraction.followsAuthoredNormals,true);
      for(const property of ['engraving','relief','patternRelief','facetTilt','reflectionCoupling','normalVariance'] as const)assert.equal(layer.structure[property],0);
    }
  }
});

test('region controls stay independent and reuse the packed protection channel',()=>{
  assert.equal(megaAttackRare.glints.strength,0);
  assert.equal(megaAttackRare.secondary?.glints.microdiamond,true);
  assert.equal(megaHyperRare.glints.metallicGrain,true);
  assert.ok(megaHyperRare.secondary!.diffraction.strength>megaHyperRare.diffraction.strength*4);
  assert.ok(megaHyperRare.secondary!.surface.inkTransmission!<megaHyperRare.surface.inkTransmission!);
  const packed=packMapChannels(2,1,{foil:[255,255,255,255,255,255,255,255],secondaryFoil:[255,255,255,255,255,255,255,255],protection:[255,255,255,255,0,0,0,255]});
  assert.deepEqual([...packed.coverage.slice(0,2)],[0,0]);
  assert.deepEqual([...packed.coverage.slice(4,6)],[255,255]);
  assert.notEqual(megaHyperRare,getProfile('gold-etched'));
  assert.notEqual(megaHyperRare.diffraction,getProfile('gold-etched').diffraction);
  assert.notEqual(megaAttackRare.surface,getProfile('prismatic_sir_texture').surface);
});
