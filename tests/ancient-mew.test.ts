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
