import {writeFile,mkdir} from 'node:fs/promises';
import{createHash}from'node:crypto';
await mkdir('artifacts/gym-heroes/wrapper-originals',{recursive:true});
const response=await fetch('https://loosepacks.com/products/gym-heroes-1st-edition.js');
if(!response.ok)throw Error(`Wrapper metadata: ${response.status}`);
const product=await response.json();
await writeFile('artifacts/gym-heroes/wrapper-product.json',JSON.stringify(product,null,2)+'\n');
const assets=product.images.map((url,i)=>({url:'https:'+url,file:`artifacts/gym-heroes/wrapper-originals/${['lt-surge','erika','brock','misty'][i]}.png`,design:['lt-surge','erika','brock','misty'][i]}));
assets.push(...['logo','symbol'].map(type=>({url:`https://assets.tcgdex.net/en/gym/gym1/${type}.png`,file:`public/packs/pokemon/gym1-${type}.png`})),{url:'https://u-mercari-images.mercdn.net/photos/m17025025831_2.jpg',file:'artifacts/gym-heroes/wrapper-originals/back.jpg'});
for(const a of assets){const r=await fetch(a.url);if(!r.ok)throw Error(`${r.status}: ${a.url}`);const b=Buffer.from(await r.arrayBuffer());await writeFile(a.file,b);a.sha256=createHash('sha256').update(b).digest('hex');}
await writeFile('scripts/gym-heroes/wrapper-sources.json',JSON.stringify(assets,null,2)+'\n');
