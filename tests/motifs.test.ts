import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMotifField, motifDistance, type MotifSpec } from '../src/materials/patterns/MotifField.ts';

const motif: MotifSpec = { symbols: ['water', 'lightning'], arrangement: 'scattered', size: .36, smallScale: .55, rotation: 0, curvature: .2 };

test('symbol silhouettes preserve Poké Ball holes and the different energy outlines', () => {
  assert.ok(motifDistance('ball', 0, .81) < 0, 'outer rim');
  assert.ok(motifDistance('ball', .81, 0) < 0, 'equatorial rim');
  assert.ok(motifDistance('ball', 0, 0) > 0, 'button remains a ring');
  assert.ok(motifDistance('ball', 0, .5) > 0, 'quiet hemisphere');
  assert.ok(motifDistance('water', 0, 0) < 0);
  assert.ok(motifDistance('water', .8, .8) > 0);
  assert.notEqual(motifDistance('water', .5, .2), motifDistance('lightning', .5, .2));
});

test('motifs stay at the same physical scale and seeded locations on wider cards', () => {
  const a = generateMotifField(2004, .70, 16, 256, motif), b = generateMotifField(2004, .82, 16, 256, motif);
  for (let y=0;y<a.height;y++) for (const channel of ['direction', 'relief'] as const) {
    assert.deepEqual(a[channel].subarray(y*a.width*4,(y+1)*a.width*4),b[channel].subarray(y*b.width*4,(y*b.width+a.width)*4));
  }
});

test('an imported symbol controls optical shape, grating and relief without a colored decal', () => {
  const image = {width: 16, height: 16, data: new Uint8Array(256)};
  const empty = generateMotifField(2004,.716,12,256,motif,image);
  for(let y=3;y<13;y++)for(let x=5;x<11;x++)image.data[y*16+x]=255;
  const bar = generateMotifField(2004,.716,12,256,motif,image);
  let visible=0, quiet=0, slopeChanged=0, heightChanged=0;
  for(let i=0;i<bar.direction.length;i+=4){
    if(bar.direction[i+3]>100)visible++;else quiet++;
    if(bar.relief[i]!==empty.relief[i]||bar.relief[i+1]!==empty.relief[i+1])slopeChanged++;
    if(bar.relief[i+2]!==empty.relief[i+2])heightChanged++;
  }
  assert.ok(visible>400 && quiet>visible*4, 'shape has bounded, repeated optical coverage');
  assert.ok(slopeChanged>visible && heightChanged>visible, 'shape affects local physical geometry');
  assert.deepEqual(generateMotifField(2004,.716,12,256,motif,image),bar, 'same seed is exactly reproducible');
});
