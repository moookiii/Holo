/** Download preserved evidence URLs; prepare-wrappers.py applies recorded crops. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const rows=JSON.parse(await readFile('scripts/neo-destiny/wrapper-sources.json','utf8'));
const dir='artifacts/neo-destiny/wrapper-originals';await mkdir(dir,{recursive:true});
for(const row of rows){
 const response=await fetch(row.url);if(!response.ok)throw new Error(`${response.status}: ${row.url}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 const target=row.crop||row.rectificationCorners?`${dir}/${row.file}`:`public/packs/pokemon/${row.file}`;
 await writeFile(target,bytes);
}
