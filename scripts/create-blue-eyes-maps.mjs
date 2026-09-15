import { mkdir, copyFile, writeFile } from 'node:fs/promises';
const root = new URL('../public/cards/blue-eyes/', import.meta.url);
await mkdir(root, { recursive: true });
await copyFile('C:/Users/jpall/AppData/Local/Temp/codex-clipboard-465e6b33-4f12-4ad7-9331-0cb6326a40d8.png', new URL('front.png', root));
// Registered in the displayed 1312 × 1911 coordinate system, preserving the
// full-resolution 1854 × 2700 front unchanged. These are optical maps only.
const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1854" height="2700" viewBox="0 0 1312 1911">${body}</svg>`;
const art = '<rect x="167" y="352" width="994" height="992"/>';
const maps = {
  'extended-foil': '<rect width="1312" height="1911" fill="#999"/><rect x="102" y="1435" width="1120" height="361" fill="#000"/>',
  hologram: `<rect width="1312" height="1911" fill="#800080"/><g fill="#80ff80">${art}</g>`,
  laminate: `<rect width="1312" height="1911" fill="#444"/><g fill="#777">${art}</g><rect x="102" y="1435" width="1120" height="361" fill="#222"/>`,
  stamp: '<rect width="1312" height="1911" fill="#000"/><rect x="1218" y="1802" width="61" height="63" rx="4" fill="#fff"/>',
};
for (const [name, body] of Object.entries(maps)) await writeFile(new URL(`${name}.svg`, root), wrap(body));
