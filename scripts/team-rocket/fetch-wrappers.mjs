/** Restore original wrapper photographs from the checked-in source manifest. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const path = 'scripts/team-rocket/wrapper-sources.json';
const assets = JSON.parse(await readFile(path, 'utf8'));
await mkdir('artifacts/team-rocket/wrapper-originals', { recursive: true });
for (const asset of assets) {
  const response = await fetch(asset.url);
  if (!response.ok) throw Error(`${response.status}: ${asset.url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== (asset.sourceSha256 ?? asset.sha256)) throw Error(`Source changed: ${asset.file}`);
  const target = asset.design ? `artifacts/team-rocket/wrapper-originals/${asset.file.split('/').at(-1)}` : asset.file;
  await writeFile(target, bytes);
}
execFileSync('python', ['scripts/team-rocket/prepare-wrappers.py'], { stdio: 'inherit' });
