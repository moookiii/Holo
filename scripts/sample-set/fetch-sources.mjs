import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Exact English New York demonstration prints; never Expedition substitutes.
const checklist = [['002','Hoppip'],['004','Koffing'],['016','Pikachu'],['019','Gastly'],['021','Machop'],['042','Machoke'],['048','Chansey'],['074','Rapidash'],['083','Pichu'],['088','Machamp']];
const directory = 'research/sample-set';
await mkdir(directory, { recursive: true });
const sources = [];
for (const [number, name] of checklist) {
  const page = `https://www.pokepedia.fr/Fichier:Carte_Sample_Set_${number}.png`;
  const html = await (await fetch(page)).text();
  const url = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  if (!url?.endsWith(`Carte_Sample_Set_${number}.png`)) throw new Error(`Missing exact front: ${name}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const file = `${number}-pokepedia.png`;
  await writeFile(`${directory}/${file}`, bytes);
  const evidencePage = `https://pokumon.com/card/sample-${name.toLowerCase()}-${number}-093-new-york-pokemon-center-press-event-special-print/`;
  const evidence = await (await fetch(evidencePage)).text();
  const alternate = evidence.match(/https:\/\/[^"\s]+\/EN_S\d+SampleSpecial-Print\.jpg/)?.[0];
  if (!evidence.includes('holofoil/non-holo/')) throw new Error(`Non-holo evidence missing: ${name}`);
  if (alternate) await writeFile(`${directory}/${number}-pokumon.jpg`, Buffer.from(await (await fetch(alternate)).arrayBuffer()));
  sources.push({ number, name, page, url, file, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: createHash('sha256').update(bytes).digest('hex'), evidencePage, alternate, finish: 'non-holo' });
  console.log(name, sources.at(-1).width, sources.at(-1).height);
}
await writeFile(`${directory}/candidates.json`, JSON.stringify(sources, null, 2) + '\n');
const tcgdex = await (await fetch('https://api.tcgdex.net/v2/en/sets/sp')).text();
await writeFile(`${directory}/tcgdex.json`, tcgdex);
for (const [file, url] of [
  ['symbol.png', 'https://www.pokepedia.fr/images/7/71/Symbole_Sample_Set_JCC.png'],
  ['thumbnail_Image-2.jpg', 'https://sleevenocardbehind.com/wp-content/uploads/2022/04/thumbnail_Image-2.jpg'],
]) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Missing support asset: ${url}`);
  await writeFile(`${directory}/${file}`, Buffer.from(await response.arrayBuffer()));
}
