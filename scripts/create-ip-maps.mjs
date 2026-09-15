import { mkdir, copyFile, writeFile } from 'node:fs/promises';
const root = new URL('../public/cards/ip-masquerena/', import.meta.url);
await mkdir(root, { recursive: true });
// User-selected image: retain the raster byte-for-byte, with separate optical data.
await copyFile('C:/Users/jpall/AppData/Local/Temp/codex-clipboard-ab4d5092-52a1-46f9-bb3b-2181f2e3d6e9.png', new URL('front.png', root));
const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2199" viewBox="0 0 500 733">${body}</svg>`;
const art = '<rect x="60" y="136" width="382" height="382"/>';
// Printed character and foreground equipment remain readable through the sheet.
const figure = 'M255 197 L301 210 L338 182 L363 210 L379 230 L401 245 Q452 245 478 266 L473 287 L447 308 L441 340 Q478 376 480 414 Q477 445 457 456 L441 449 L432 485 L421 523 L428 576 L437 615 Q440 637 422 647 L393 647 L371 625 L341 668 Q319 692 296 679 L272 659 L250 644 L226 613 L211 584 L180 554 Q164 537 173 517 Q182 490 210 501 L230 510 L257 510 L286 521 L307 540 L312 512 L322 485 L302 471 L278 450 Q259 423 264 399 L272 364 L258 386 Q237 401 217 399 L209 386 L215 353 L228 315 L240 295 L253 277 L259 249 Z';
const cable = 'M237 335 Q154 349 133 405 Q111 457 173 501 M462 454 Q515 462 460 506 L438 515';
const traced = body => `<g transform="scale(.7451565 .750256)">${body}</g>`;
const subject = color => traced(`<path d="${figure}" fill="${color}"/>`);
const equipment = color => traced(`<path d="${cable}" fill="none" stroke="${color}" stroke-width="18"/>`);
const rules = '<rect x="33" y="552" width="433" height="140" fill="#000"/>';
const maps = {
  coverage: `<rect width="500" height="733" fill="#000"/><g fill="#b00000">${art}</g>${subject('#390000')}${equipment('#500000')}`,
  'extended-foil': `<rect width="500" height="733" fill="#000"/><rect x="16" y="15" width="469" height="706" fill="#b0b0b0"/>${rules}${subject('#393939')}${equipment('#505050')}`,
  height: `<defs><filter id="s"><feGaussianBlur stdDeviation=".75"/></filter></defs><rect width="500" height="733" fill="#404040"/><g filter="url(#s)">${subject('#aaa')}${equipment('#777')}</g>`,
  hologram: `<rect width="500" height="733" fill="#800080"/><g fill="#50ff50">${art}</g>${subject('#d8ffd8')}`,
  laminate: `<rect width="500" height="733" fill="#606060"/><g fill="#d0d0d0">${art}</g><rect x="33" y="552" width="433" height="140" fill="#202020"/>`,
  stamp: '<rect width="500" height="733" fill="#000"/><rect x="464" y="697" width="22" height="22" fill="#fff"/>',
};
for (const [name, body] of Object.entries(maps)) await writeFile(new URL(`${name}.svg`, root), wrap(body));
