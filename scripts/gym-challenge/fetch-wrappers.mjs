import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='artifacts/gym-challenge/wrapper-originals';await mkdir(dir,{recursive:true});
const product=await(await fetch('https://loosepacks.com/products/gym-challenge-1st-edition.js')).json();
const rows=[];
for(let i=0;i<product.images.length;i++){
 const url='https:'+product.images[i],b=Buffer.from(await(await fetch(url)).arrayBuffer());const file=`${dir}/${i}.png`;await writeFile(file,b);rows.push({url,file,sha256:createHash('sha256').update(b).digest('hex')});
}
for(const type of ['logo','symbol']){const url=`https://assets.tcgdex.net/en/gym/gym2/${type}.png`,b=Buffer.from(await(await fetch(url)).arrayBuffer()),file=`public/packs/pokemon/gym2-${type}.png`;await writeFile(file,b);rows.push({url,file,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile('scripts/gym-challenge/wrapper-sources.json',JSON.stringify(rows,null,2)+'\n');
