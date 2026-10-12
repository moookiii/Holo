import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewOptics } from '../src/card/PreviewOptics.ts';
import { galleryBatchKey, galleryOpticalLayers } from '../src/gallery/GalleryBatch.ts';
import { bwRadiantProfiles } from '../src/materials/profiles/bwRadiant.ts';
import { goldEtchedFinish } from '../src/materials/profiles/goldEtchedFinish.ts';
import { bwDefinition } from '../src/pokemon/BwSurfaces.ts';

test('BW flake specialization reaches both preview layers and cannot share the gold grain shader', () => {
 const card=bwDefinition('bw11r-7','holo'), profile=bwRadiantProfiles[0];
 const packed=previewOptics(card,profile), flakes=galleryOpticalLayers(packed);
 for(const layer of flakes.slice(0,2)) {
  assert.equal(layer.foilFlakes,true);
  assert.equal(layer.metallicGrain,true);
  assert.equal(layer.spectralGrain,true);
  assert.equal(layer.glints,true);
 }
 const grains=packed.slice();
 grains[29*4+3]=-5;grains[31*4+3]=-5;
 assert.notEqual(galleryBatchKey(flakes),galleryBatchKey(galleryOpticalLayers(grains)));
 assert.ok(galleryOpticalLayers(grains).every(l=>!l.foilFlakes));
 assert.ok(galleryOpticalLayers(previewOptics(card,bwRadiantProfiles[1])).every(l=>!l.foilFlakes));
 assert.equal(goldEtchedFinish.glints!.foilFlakes,undefined);
 assert.equal(goldEtchedFinish.glints!.spectralGrain,true);
 assert.equal(profile.mapSettings!.normalScale,0);
 assert.equal(profile.mapSettings!.embossStrength,0);
});
