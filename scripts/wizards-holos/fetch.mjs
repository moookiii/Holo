import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const records=[],sources=[];
for(const n of [9,10,11,13,15,17,24,34,35]){
 const url=`https://api.tcgdex.net/v2/en/cards/basep-${n}`;
 const r=await fetch(url);if(!r.ok)throw Error(url);const m=await r.json();
 const image=`https://assets.tcgdex.net/en/base/basep/${n}/high.png`;const res=await fetch(image);if(!res.ok)throw Error(image);const b=Buffer.from(await res.arrayBuffer());
 await writeFile(`public/cards/pokemon/wizards-promos/${n}.png`,b);
 records.push({id:m.id,localId:String(n),name:m.name,category:m.category,types:m.types,stage:m.stage,front:`${n}.png`});
 sources.push({id:m.id,metadata:url,image,sha256:createHash('sha256').update(b).digest('hex')});console.log(n,m.name);
}
await writeFile('src/pokemon/data/wizards-holo-promos.generated.ts',`export const wizardsHoloPromoRecords = ${JSON.stringify(records,null,2)} as const;\n`);
await writeFile('public/cards/pokemon/wizards-promos/holo-sources.json',JSON.stringify(sources,null,2)+'\n');
