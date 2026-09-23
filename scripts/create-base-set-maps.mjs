import { access, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { contours } from './base-set/contours.mjs';

export const directory = c => c.number === 4 ? 'public/cards/charizard-base-set' : `public/cards/pokemon/base-set/${c.slug}`;
export const artwork = c => c.stage
  ? 'M132 100H537V423H64V147L73 141L82 145L95 134L104 133L113 117Z'
  : 'M64 100H537V423H64Z';
const wrap = content => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1650" viewBox="0 0 600 825">${content}</svg>\n`;
const paths = shapes => (shapes ?? []).map(d => `<path d="${d}"/>`).join('');
await mkdir('artifacts/base-set/drafts', { recursive: true });

for (const c of contours) {
  const root = directory(c);
  await mkdir(root, { recursive: true });
  const source = `artifacts/base-set/references/${String(c.number).padStart(2, '0')}.png`;
  // Source pixels stay byte-for-byte intact: all optics live in separate maps.
  try { await access(`${root}/front.png`); }
  catch { await copyFile(source, `${root}/front.png`); }
  const clip = `<defs><clipPath id="art"><path d="${artwork(c)}"/></clipPath></defs>`;
  const subjects = `<g fill="black" stroke="black" stroke-width=".7" stroke-linejoin="round">${paths(c.subject)}</g>`;
  const holes = `<g fill="white">${paths(c.holes)}</g>`;
  await writeFile(`artifacts/base-set/drafts/${c.number}.svg`, wrap(`${clip}<rect width="600" height="825" fill="black"/><g clip-path="url(#art)"><path d="${artwork(c)}" fill="white"/>${subjects}${holes}</g>`));
}
await mkdir('artifacts/base-set', { recursive: true });
await writeFile('artifacts/base-set/contours.json', JSON.stringify(contours));
console.log(`Prepared ${contours.length} authored contours. Next: render-masks.mjs, then refine-masks.py.`);
