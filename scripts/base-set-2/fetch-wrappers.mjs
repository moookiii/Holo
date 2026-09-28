import { writeFile, readFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';
const assets = [
['pidgeot.jpg','https://archives.bulbagarden.net/media/upload/e/e7/Base_Set_2_Booster_Pidgeot.jpg'],
['raichu.jpg','https://archives.bulbagarden.net/media/upload/f/fe/Base_Set_2_Booster_Raichu.jpg'],
['gyarados.jpg','https://archives.bulbagarden.net/media/upload/9/9d/Base_Set_2_Booster_Gyarados.jpg'],
['mewtwo.jpg','https://archives.bulbagarden.net/media/upload/5/5f/Base_Set_2_Booster_Mewtwo.jpg'],
['logo.png','https://assets.tcgdex.net/en/base/base4/logo.png'],
['back.jpg','https://vancitycj.com/cdn/shop/files/1999BaseSet2_Mewtwo_E-2.jpg?v=1727992354&width=2379'],
['pidgeot-back.jpg','https://i.ebayimg.com/images/g/LMwAAOSwlQ9nYGPK/s-l1200.jpg'],
['raichu-back.jpg','https://cdn.shopify.com/s/files/1/0585/6690/1940/files/EC0B9B7A-C808-427A-BDF3-24AA7D4328D8.jpg?v=1737193196'],
['gyarados-back.jpg','https://tbcgames.com/cdn/shop/files/IMG_6656.jpg?v=1687962741&width=1445'],
];
const manifest=[];
for (const [name,url] of assets) {
 const file=`public/packs/pokemon/base4-${name}`;
 let bytes;
 if(process.argv.includes('--manifest-only'))bytes=await readFile(file);
 else {const res=await fetch(url);if(!res.ok)throw Error(`${res.status} ${url}`);bytes=Buffer.from(await res.arrayBuffer());await writeFile(file,bytes);}
 manifest.push({file,url,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile('scripts/base-set-2/wrapper-sources.json',JSON.stringify(manifest,null,2)+'\n');
