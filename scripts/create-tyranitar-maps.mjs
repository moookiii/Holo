import { mkdir, writeFile } from 'node:fs/promises';

// Authored against the unmodified 734 x 1021 PokemonTCG front (PAL 135).
// Coverage is for the ordinary Mirage printing, not the reverse or Cosmos promo.
const root = new URL('../public/cards/tyranitar-paldea-evolved/', import.meta.url);
await mkdir(root, { recursive: true });
const wrap = s => `<svg xmlns="http://www.w3.org/2000/svg" width="1468" height="2042" viewBox="0 0 734 1021">${s}</svg>`;
// Follow the *inside* of the artwork frame. The teal rail at x29..57 is
// printed card body, and the picture rises above the evolution strip at right.
const art = '<path d="M132 116H486Q494 113 497 102H675V482H59V189Q111 192 124 153Z"/>';
const subject = [
  // Head, open mouth, torso and the foreshortened right arm.
  'M182 195Q188 163 253 146Q332 120 418 147Q474 156 501 198Q525 231 544 277Q585 284 599 327Q612 362 598 393L607 422L619 430L607 433L607 447L595 451L593 466L582 466L579 478L566 471L558 480L550 464L535 458Q508 478 446 487H284Q267 468 260 444Q249 421 267 389L252 391Q242 407 230 401L219 387Q210 370 233 336L253 310L267 302L253 298L239 283L215 273L240 275L235 254Q208 242 198 225L194 222L192 233L189 219Z',
  // Raised hand and sweeping forearm; small elbow spikes remain opaque ink.
  'M221 354Q195 345 173 315L173 303Q185 281 187 251L160 269L139 217L129 278Q109 274 94 280L124 315L144 338L180 392Q201 420 232 432L248 403L245 385L235 394L247 405L250 386L230 379L214 373L204 386L219 386L214 405L230 399Z',
  // Unequal dorsal crests, registered to the card print rather than a generic crown.
  'M242 145L241 117L254 134L307 109L326 109L311 138L343 140L339 123L350 112L358 133L377 112L413 110L411 145L433 151L438 113L467 111L465 166L496 146L501 144L496 158L522 131L514 197L544 166L544 204L503 207L477 185L446 166Z',
  // Rightward spike and its smaller pale tips.
  'M503 203Q546 198 584 207Q604 213 600 235L593 243L566 250L542 259L528 246Z M588 207L605 207L599 218Z M600 218L619 225L600 235Z M594 238L606 247L592 244Z',
].map(d => `<path d="${d}"/>`).join('');
const common = `<defs><clipPath id="art">${art}</clipPath></defs><rect width="734" height="1021" fill="black"/>`;
const artworkFoil = `<g clip-path="url(#art)"><g fill="#b8b8b8">${art}</g><g fill="black" stroke="black" stroke-width="2.2" stroke-linejoin="round">${subject}</g></g>`;
const border = '<path fill="#b8b8b8" fill-rule="evenodd" d="M0 0H734V1021H0Z M29 28H703V994H29Z"/>';
const foil = wrap(common + artworkFoil);
const extendedFoil = wrap(common + border + artworkFoil);
const laminate = wrap('<rect width="734" height="1021" fill="#777"/><g fill="#c0c0c0">' + art + '</g>');
for (const [name, data] of Object.entries({ foil, 'extended-foil': extendedFoil, laminate })) await writeFile(new URL(`${name}.svg`, root), data);
