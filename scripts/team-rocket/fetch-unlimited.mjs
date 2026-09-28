/** Restore authentic Unlimited fronts; never synthesize a stamp removal. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const assets = JSON.parse(await readFile('scripts/team-rocket/unlimited-sources.json', 'utf8'));
await mkdir('public/cards/pokemon/team-rocket/unlimited', { recursive: true });
for (const asset of assets) {
  const response = await fetch(asset.url);
  if (!response.ok) throw Error(`${response.status}: ${asset.url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw Error(`Source changed: ${asset.cardId}`);
  await writeFile(asset.file, bytes);
}
