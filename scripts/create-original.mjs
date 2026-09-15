import { mkdir, writeFile } from 'node:fs/promises';

const dir = new URL('../public/cards/nocturne/', import.meta.url);
await mkdir(dir, { recursive: true });
const W = 1512, H = 2112;
const wrap = inner => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 756 1056">${inner}</svg>`;
const wing = 'M 377 510 C 332 355 196 304 94 329 C 111 458 143 533 232 564 C 166 597 148 686 191 757 C 293 724 341 626 378 555 Z';
const lower = 'M 372 540 C 301 542 229 625 212 712 C 290 677 338 615 372 540 Z';
let engraved = '';
for (let i = 0; i < 26; i++) {
  const s = i / 25;
  engraved += `<path d="M 374 ${510 + s * 40} C ${320 - s * 75} ${360 + s * 85},${175 + s * 48} ${354 + s * 185},${109 + s * 145} ${349 + s * 204}"/>`;
}
for (let i = 0; i < 20; i++) {
  const s = i / 19;
  engraved += `<path d="M ${371 - s * 35} 556 Q ${262 + s * 33} ${597 + s * 29},${199 + s * 109} ${739 - s * 70}"/>`;
}
const eye = `<path d="M 181 432 Q 244 382 290 457 Q 233 484 181 432Z" fill="#0e1418" stroke-width="2"/><ellipse cx="240" cy="442" rx="21" ry="28" fill="#b8b8a3"/><ellipse cx="240" cy="442" rx="11" ry="18" fill="#182329"/><ellipse cx="240" cy="442" rx="4" ry="9" fill="#b9c1bb"/>`;
const mothHalf = `<path d="${wing}" fill="#677975" stroke="#c0c5b0" stroke-width="1.4"/><path d="${lower}" fill="#32453f"/><g stroke="#c7c8ac" fill="none" stroke-width=".75" opacity=".7">${engraved}</g>${eye}`;
const moth = `<g>${mothHalf}</g><g transform="translate(756 0) scale(-1 1)">${mothHalf}</g><path d="M 378 446 C 392 464 393 499 386 532 L 383 640 Q 378 674 373 640 L 369 532 C 362 499 364 464 378 446Z" fill="#c0c0a7" stroke="#9fafa1"/><g stroke="#cad1c0" fill="none" stroke-width="1.6"><path d="M 373 458 Q 342 419 344 395 M 383 458 Q 414 419 412 395"/></g>`;
let halo = '';
for (let i = 0; i < 144; i++) {
  const a = i / 144 * Math.PI * 2;
  const r = i % 12 === 0 ? 298 : i % 3 === 0 ? 288 : 283;
  halo += `<path d="M ${378 + Math.sin(a) * 278} ${525 + Math.cos(a) * 278} L ${378 + Math.sin(a) * r} ${525 + Math.cos(a) * r}"/>`;
}
let field = '';
for (let i = 0; i < 44; i++) {
  const r = 100 + i * 4.1;
  field += `<ellipse cx="378" cy="512" rx="${r}" ry="${r * 1.36}" transform="rotate(${i * 2.9} 378 512)"/>`;
}
const typography = `<g text-anchor="middle" fill="#c5c9bf" font-family="Georgia, serif"><text x="378" y="141" font-size="15" letter-spacing="8">A T E L I E R</text><text x="378" y="885" font-size="39" letter-spacing="9">NOCTURNE</text><text x="378" y="923" font-family="Arial, sans-serif" font-size="10" letter-spacing="4.5" fill="#798984">L U N A   ·   A C T I A S</text></g><g fill="#7f8b82" font-family="Arial, sans-serif" font-size="9" letter-spacing="2"><text x="67" y="990">I / XII</text><text x="689" y="990" text-anchor="end">EDITION 001</text></g>`;
const border = `<rect x="37" y="37" width="682" height="982" rx="18" fill="none" stroke="#718276" stroke-width="1.3"/><rect x="44" y="44" width="668" height="968" rx="14" fill="none" stroke="#465d50" stroke-width=".6"/>`;
const front = wrap(`<defs><radialGradient id="bg"><stop stop-color="#293b3a"/><stop offset="1" stop-color="#0c1419"/></radialGradient></defs><rect width="756" height="1056" fill="#11191c"/><rect x="25" y="25" width="706" height="1006" rx="24" fill="url(#bg)"/>${border}<g stroke="#597568" fill="none" stroke-width=".48" opacity=".55">${field}</g><g stroke="#8c9c83" fill="none" stroke-width=".75">${halo}<circle cx="378" cy="525" r="267"/><circle cx="378" cy="525" r="270"/><circle cx="378" cy="273" r="35"/><path d="M 357 245 A 32 32 0 1 0 398 245 A 25 25 0 0 1 357 245Z" fill="#a6ad91"/></g>${moth}${typography}`);
const coverage = wrap(`<defs><radialGradient id="foil"><stop offset="0" stop-color="#800018"/><stop offset=".73" stop-color="#c00020"/><stop offset="1" stop-color="#200008"/></radialGradient></defs><rect width="756" height="1056" fill="#000000"/><circle cx="378" cy="525" r="270" fill="url(#foil)"/><g stroke="#d03050" fill="none" stroke-width="1.4">${field}</g><g fill="none" stroke="#00c8f0" stroke-width="3"><rect x="37" y="37" width="682" height="982" rx="18"/><circle cx="378" cy="525" r="267"/></g><g fill="#381058"><path d="${wing}"/><path d="${wing}" transform="translate(756 0) scale(-1 1)"/></g><g stroke="#e860b0" stroke-width="2" fill="none">${engraved}<g transform="translate(756 0) scale(-1 1)">${engraved}</g></g>`);
const surface = wrap(`<rect width="756" height="1056" fill="#4070ff"/><g stroke="#c080ff" fill="none" stroke-width="1.5">${field}${engraved}<g transform="translate(756 0) scale(-1 1)">${engraved}</g></g>`);
const back = wrap(`<rect width="756" height="1056" fill="#111919"/>${border}<g stroke="#536656" fill="none" stroke-width=".5" opacity=".55">${field}</g><circle cx="378" cy="512" r="102" fill="#111919" stroke="#90957b" stroke-width="1"/><g fill="none" stroke="#b9b89b" stroke-width="1.4"><path d="M 317 567 L 378 439 L 439 567 M 339 523 L 417 523"/><circle cx="378" cy="512" r="93"/></g><g text-anchor="middle" fill="#adb099" font-family="Georgia, serif"><text x="378" y="177" font-size="19" letter-spacing="10">ATELIER</text><text x="378" y="896" font-size="13" letter-spacing="5">STUDIES IN LIGHT</text></g>`);
for (const [name, value] of Object.entries({front, back, coverage, surface})) await writeFile(new URL(`${name}.svg`, dir), value);

// Full-card experimental treatments get an authored extension; print text is protected.
const extended = wrap(`<rect width="756" height="1056" fill="#000"/><rect x="37" y="37" width="682" height="982" rx="18" fill="#909090"/><circle cx="378" cy="525" r="275" fill="#bbb"/><g fill="#252525"><path d="${wing}"/><path d="${wing}" transform="translate(756 0) scale(-1 1)"/></g>${typography.replace(/#[0-9a-fA-F]{6}/g, "#000000")}`);
await writeFile(new URL('extended-foil.svg', dir), extended);
const hologram = wrap(`<rect width="756" height="1056" fill="#800080"/><circle cx="378" cy="525" r="270" fill="#50ff50"/><g fill="#c8ffb0"><path d="${wing}"/><path d="${wing}" transform="translate(756 0) scale(-1 1)"/></g><ellipse cx="378" cy="541" rx="14" ry="100" fill="#efffdd"/>`);
await writeFile(new URL('hologram.svg', dir), hologram);
