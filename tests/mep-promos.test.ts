import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tcglMepSets, tcglMepSurfaces } from '../src/pokemon/data/mep-tcgl.generated.ts';
import { svTcglSet, svTcglCard } from '../src/pokemon/SvTcglCatalog.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { resolveCardProfile } from '../src/materials/profiles/resolveCardProfile.ts';
import { compareGallerySetNames, filterCards } from '../src/gallery/GalleryQuery.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

const file = (url: string) => new URL('../public'+url, import.meta.url);
const hash = (url: string) => createHash('sha256').update(readFileSync(file(url))).digest('hex');

test('MEP preserves 100 exact promo identities and full-card originals without inventing #093', () => {
  const set = svTcglSet('mep');
  assert.equal(set.cardIds.length,100); assert.equal(set.era,'me');
  assert.equal(set.boosters.length,0); assert.equal(packAvailability('mep').ready,false);
  assert.match(packAvailability('mep').detail,/no randomized MEP booster/);
  assert.equal(set.cardIds.includes('mep-093'),false);
  const definitions=set.cardIds.map(id => svTcglDefinition(id,'holo'));
  assert.equal(filterCards(definitions,{search:'MEP Black Star Promos'}).length,100);
  assert.ok(compareGallerySetNames('Prismatic Evolutions',set.name)<0);
  assert.ok(compareGallerySetNames(set.name,'Phantasmal Flames')<0);
  for (const id of set.cardIds) {
    const card=svTcglCard(id), def=svTcglDefinition(id,'holo');
    assert.equal(card.rarity,'Promo');assert.deepEqual(card.variants,['holo']);
    const surface=tcglMepSurfaces.find(s=>s.cardId===id)!;assert.ok(surface);
    const evidence=JSON.parse(readFileSync(file(surface.evidence),'utf8'));
    assert.equal(evidence.tcglCardId,`mebsp_${Number(card.localId)}`);
    assert.equal(evidence.tcglVariantId,surface.tcglVariantId);
    assert.equal(evidence.exportEntry.name,card.name);
    assert.equal(evidence.exportEntry.collector_number.numerator,card.localId);
    assert.equal(hash(def.front),evidence.sources.front.sha256);
    assert.equal(evidence.alignmentReview.verticalFlip,false);
    assert.equal(evidence.alignmentReview.cropOrOffset,false);
    for (const [name,digest] of Object.entries(evidence.maps)) {
      assert.equal(hash(`/cards/pokemon/tcgl-me/mep/tcgl/${name}`),digest);
    }
    for (const url of Object.values(surface.maps)) assert.ok(url.endsWith('.png')&&existsSync(file(url)));
  }
  assert.equal(tcglMepSets[0].releaseDate,'2025-09-26');
});

test('all 20 MEP etches resolve to the sole Sylveon/Espeon normal response', () => {
  const etched=tcglMepSurfaces.filter(s=>s.textured);assert.equal(etched.length,20);
  for (const surface of etched) {
    const def=svTcglDefinition(surface.cardId,'holo'),profile=resolveCardProfile(def);
    const evidence=JSON.parse(readFileSync(file(surface.evidence),'utf8'));
    assert.equal(def.profile,'prismatic_sir_texture');
    assert.equal(def.mapSettings?.normalScale,1);assert.equal(def.mapSettings?.embossStrength,0);
    assert.equal(profile.mapSettings?.embossMaskFromNormalAlpha,false);
    assert.equal(profile.mapSettings?.roughnessMode,'absolute');
    assert.equal(profile.surface.metalness,.5);assert.equal(profile.surface.etchedInkSheen,.85);
    assert.equal(profile.diffraction.followsAuthoredNormals,true);
    assert.equal(profile.diffraction.strength,.48);assert.equal(profile.structure.engraving,0);
    assert.equal(profile.structure.normalVariance,0);assert.equal(profile.glints.strength,0);
    assert.equal(surface.maps.height,undefined);
    assert.deepEqual(evidence.sources.etch.dimensions,[733,1024]);
    assert.deepEqual(evidence.mapDimensions[surface.maps.normal!.split('/').at(-1)!],[1800,2475]);
    assert.match(evidence.normalMethod,/Scharr scale 1\/32; gain 1.03/);
  }
});

test('unreviewed Cosmos placements and stamps retain the exact front without replacement optics', () => {
  const deferred=tcglMepSurfaces.filter(s=>s.treatmentStatus==='deferred');assert.equal(deferred.length,21);
  for (const surface of deferred) {
    const def=svTcglDefinition(surface.cardId,'holo');
    assert.equal(def.profile,'print-only');assert.equal(def.pokemon?.treatmentStatus,'deferred');
    assert.equal(surface.textured,false);assert.equal(surface.maps.normal,undefined);
  }
});
