import assert from 'node:assert/strict';
import { galleryBatchKey, galleryPreviewOpticalLayers, galleryShaderLayers } from '../src/gallery/GalleryBatch.ts';

function fixture() {
  const parameters = new Float32Array(44 * 4);
  for(let layer=0;layer<3;layer++)parameters[layer*32+31]=1;
  parameters[30*4+3]=10; // Reference secondary microdiamond strength.
  return {parameters, images:[new Uint8Array(16),new Uint8Array(16)]};
}
const empty=fixture();
assert.equal(galleryBatchKey(galleryShaderLayers(galleryPreviewOpticalLayers(empty.parameters,empty.images))),'f--');
empty.parameters[37*4]=112;empty.parameters[26]=.8;
assert.equal(galleryBatchKey(galleryShaderLayers(galleryPreviewOpticalLayers(empty.parameters,empty.images))),'f--',
  'Zero-coverage secret and film declarations canonicalize to the basic shared print shader');
const primary=fixture();primary.images[1][0]=255;
assert.equal(galleryBatchKey(galleryPreviewOpticalLayers(primary.parameters,primary.images)),'f--',
  'SIR material without any secondary coverage does not compile a microdiamond kernel');
const secondary=fixture();secondary.images[1][0]=255;secondary.images[1][13]=1;
assert.equal(galleryBatchKey(galleryPreviewOpticalLayers(secondary.parameters,secondary.images)),'fg-',
  'One low-opacity secondary pixel retains the exact secondary response');
const stamp=fixture();stamp.images[1][14]=1;
assert.equal(galleryBatchKey(galleryPreviewOpticalLayers(stamp.parameters,stamp.images)),'--f');

const reverse=fixture();reverse.parameters[34*4]=1;reverse.images[0][15]=1;
assert.equal(galleryPreviewOpticalLayers(reverse.parameters,reverse.images)[0].enabled,true,
  'Sharp reverse coverage remains active through high-resolution artwork alpha');
reverse.images[0].fill(0);reverse.images[1][0]=255;
assert.equal(galleryPreviewOpticalLayers(reverse.parameters,reverse.images)[0].enabled,false,
  'Reverse primary ignores the inactive low-resolution mask');

const title=fixture();title.parameters[34*4+2]=1;title.images[0][3]=200;
assert.equal(galleryPreviewOpticalLayers(title.parameters,title.images)[1].enabled,true,
  'Secret secondary name coverage remains active through artwork alpha');
title.images[0].fill(0);title.images[1][1]=255;
assert.equal(galleryPreviewOpticalLayers(title.parameters,title.images)[1].enabled,false);

const opaque=fixture();opaque.images[0].fill(255);
assert.deepEqual(galleryPreviewOpticalLayers(opaque.parameters,opaque.images).map(layer=>layer.enabled),[false,false,false],
  'Artwork alpha alone does not create coverage when neither reverse override is enabled');
for(let mask=0;mask<8;mask++){
  const current=fixture();for(let layer=0;layer<3;layer++)if(mask&(1<<layer))current.images[1][layer]=1;
  assert.deepEqual(galleryPreviewOpticalLayers(current.parameters,current.images).map(layer=>layer.enabled),
    [0,1,2].map(layer=>!!(mask&(1<<layer))));
}
console.log('Exact zero coverage: independent regions, tiny coverage, reverse artwork and secret name alpha passed');
