import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ancientMewCard} from '../src/card/AncientMewCard.ts';
import {generateAncientMew} from '../src/materials/patterns/AncientMew.ts';

test('Ancient Mew preserves both source images and full-front authored PNG coverage',()=>{
 const sources=JSON.parse(readFileSync('public/cards/ancient-mew/sources.json','utf8'));
 for(const name of ['front.jpeg','back.jpeg'])assert.equal(createHash('sha256').update(readFileSync(`public/cards/ancient-mew/${name}`)).digest('hex'),sources[name].sha256);
 assert.deepEqual(ancientMewCard.layout?.artwork,[0,0,1,1]);
 assert.equal(ancientMewCard.profile,'pokemon-ancient-mew');
 assert.equal(ancientMewCard.backProfile,'pokemon-ancient-mew-back');
 for(const path of Object.values(ancientMewCard.backMaps!)) {
  const png=readFileSync(`public${path}`);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),1501);assert.equal(png.readUInt32BE(20),2095);
 }
 assert.equal(ancientMewCard.mapSettings?.embossStrength,0);
 for(const path of Object.values(ancientMewCard.maps!)){
  const png=readFileSync(`public${path}`);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),1510);assert.equal(png.readUInt32BE(20),2110);
 }
});

test('registered flake support is top-down, deterministic, and independent of pattern scale',()=>{
 const data=new Uint8Array(64);data[1*8+2]=255;data[1*8+3]=255;data[2*8+2]=255;
 const spec={kind:'ancient-mew' as const,seed:2000,aspect:1,scale:1};
 const image={width:8,height:8,data};
 const a=generateAncientMew(spec,8,image),b=generateAncientMew({...spec,scale:35},8,image);
 assert.deepEqual(a,b);
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  assert.equal(a.direction[(y*8+x)*4+3],data[(7-y)*8+x]?255:8);
  assert.equal(a.relief[(y*8+x)*4+2],128);
 }
 assert.throws(()=>generateAncientMew(spec,8),/requires/);
});

test('cached island optics preserve the original bytes, including soft edges and seed changes', () => {
 const data = new Uint8Array(31 * 43);
 for (let y = 0; y < 43; y++) for (let x = 0; x < 31; x++) {
  if (x % 4 === 1 && y % 5 <= 2) data[y * 31 + x] = [1, 7, 8, 64, 128, 254, 255][(x + y) % 7];
 }
 // Golden SHA-256 values captured from the original generator before optimization.
 const cases = [
  [2000, 6.3 / 8.8, 360, 'fdcb69b58b22ebf5c3579230ba5198fb17ec0b4f1fe10224a222a777f07b4248', '5390a50e4bb9000f71c13849b2a72cb15e1761561c7659d21002e73d6571431f'],
  [8191, 1, 53, 'f8fca49be0f61690894a412ada41b59e3860d6d31e71011bb2bf6e789c03b9e6', '87f5a87665516acfdf05acdc5cedd83f06692fb6a9c67c51faea4056356621a2'],
  [-17, .73, 89, '63d653b4a0310b536fa2516eab8594180527a31793226e83c0a532a7eb816a4e', 'e3263788d5e295b289dc53f9994d0465d0910e83cafa6ac73542828ee462be33'],
 ] as const;
 for (const [seed, aspect, height, directionHash, reliefHash] of cases) {
  const field = generateAncientMew({ kind: 'ancient-mew', seed, aspect, scale: 1 }, height, { width: 31, height: 43, data });
  assert.equal(createHash('sha256').update(field.direction).digest('hex'), directionHash);
  assert.equal(createHash('sha256').update(field.relief).digest('hex'), reliefHash);
 }
});
