import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const page = 'https://loosepacks.com/products/expedition-unlimited-short-crimp';
const product = await (await fetch(`${page}.js`)).json();
const designs = ['charizard', 'blastoise', 'feraligatr', 'venusaur'];
await mkdir('research/expedition/wrappers', { recursive: true });
const records = [];
async function download(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (attempt === 4) throw new Error(`${response.status}: ${url}`);
    await new Promise(resolve => setTimeout(resolve, 400 * 2 ** attempt));
  }
}
for (const [i, design] of designs.entries()) {
  const url = `https:${product.images[i]}`;
  const bytes = await download(url);
  const file = `ecard1-${design}.png`;
  await writeFile(`research/expedition/wrappers/${file}`, bytes);
  records.push({ design, file, url, sourcePage: page, sourceSha256: createHash('sha256').update(bytes).digest('hex') });
}
for (const role of ['logo', 'symbol']) {
  const url = role === 'logo' ? 'https://images.pokemontcg.io/ecard1/logo.png'
    : `https://assets.tcgdex.net/en/ecard/ecard1/${role}.png`;
  const bytes = await download(url);
  const file = `ecard1-${role}.png`;
  await writeFile(`public/packs/pokemon/${file}`, bytes);
  records.push({ file, url, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const backUrl = 'https://pokemonboosterpack.com/images/packart/expeditionbaseback.jpg';
const backBytes = await download(backUrl);
await writeFile('public/packs/pokemon/ecard1-back.jpg', backBytes);
records.push({ file: 'ecard1-back.jpg', url: backUrl, sourcePage: 'https://pokemonboosterpack.com/archive/pages/ecardseriesmobile', sha256: createHash('sha256').update(backBytes).digest('hex') });
await writeFile('scripts/expedition/wrapper-sources.json', JSON.stringify(records, null, 2) + '\n');
