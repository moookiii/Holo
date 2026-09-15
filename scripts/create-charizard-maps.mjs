import { mkdir, copyFile, writeFile } from 'node:fs/promises';

const root = new URL('../public/cards/charizard-base-set/', import.meta.url);
await mkdir(root, { recursive: true });
await copyFile(new URL('../artifacts/references/base1-4/front.png', import.meta.url), new URL('front.png', root));
const wrap = content => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1650" viewBox="0 0 600 825">${content}</svg>`;
const art = '<path d="M 126 98 H 538 V 426 H 64 V 145 L 91 140 L 104 125 Z"/>';
// Traced against the unchanged 600 x 825 scan. The foil is beneath the printed
// body, wing membranes, tongue, tail and flame; the rules and frame stay print.
const leftWing = 'M 334 222 Q 312 214 292 192 L 257 161 L 224 143 L 212 133 Q 204 129 209 138 L 224 151 L 229 178 L 228 238 Q 249 227 267 232 L 294 244 L 320 244 Z';
const rightWing = 'M 379 224 Q 401 201 407 164 L 416 127 L 404 111 Q 396 102 402 102 L 429 116 Q 454 123 475 145 L 506 176 Q 524 207 529 265 L 525 270 Q 518 244 505 233 Q 484 214 462 220 Q 437 219 414 240 Z';
const figure = 'M 329 223 Q 344 207 365 215 Q 379 221 390 228 L 408 240 L 436 258 L 444 271 L 438 281 L 444 287 L 434 295 L 422 288 L 412 290 Q 424 313 436 328 Q 463 334 471 355 L 475 377 L 459 392 L 466 399 L 454 401 L 445 398 L 441 414 L 433 406 L 429 418 L 421 411 L 416 396 L 405 382 Q 375 393 345 378 L 332 394 L 329 405 L 320 404 L 313 417 L 304 412 L 286 419 L 288 410 L 278 408 L 290 398 L 301 386 Q 276 378 270 356 Q 269 338 280 320 L 293 302 L 279 287 L 261 273 L 241 259 L 218 258 L 210 268 L 203 260 L 206 247 L 218 240 L 237 238 L 248 246 L 284 252 L 294 252 L 324 242 L 333 238 L 325 234 Z';
const jawTongue = 'M 303 276 Q 303 300 289 325 L 276 347 Q 258 365 238 356 L 229 350 L 230 339 L 241 346 L 257 345 L 277 328 Q 250 343 233 326 Q 216 318 201 333 L 192 331 L 193 320 Q 205 300 225 301 L 247 305 L 277 308 L 288 290 Z';
const mouth = 'M 218 258 Q 249 255 272 276 Q 286 288 283 304 L 263 304 L 244 300 L 237 282 Z';
const tail = 'M 282 360 Q 246 369 219 355 L 207 347 L 204 355 Q 223 375 293 385 L 300 376 Z';
const tailFlame = 'M 211 298 L 206 311 L 198 317 L 197 324 L 194 328 L 195 336 L 199 339 L 203 333 L 206 342 L 213 339 L 209 349 L 216 346 L 211 356 L 204 354 L 208 363 L 197 359 L 188 354 L 183 352 L 187 349 L 182 344 L 177 335 L 183 337 L 184 327 L 188 322 L 189 315 L 198 309 Z';
// This blue-edged flame is part of the artwork over the reflective background.
// Keep its tint while allowing foil to remain visible through the entire shape.
const breath = 'M 239 301 Q 222 284 211 272 Q 210 262 196 258 Q 178 251 175 239 Q 172 228 183 217 L 182 204 L 176 188 L 163 187 L 154 176 L 151 187 L 140 184 L 133 177 L 130 161 L 115 158 Q 101 154 102 140 L 96 133 L 89 139 L 79 137 L 72 145 L 64 143 L 64 278 L 75 279 L 82 285 Q 83 274 96 264 Q 107 256 115 261 Q 122 266 118 271 L 129 279 Q 144 280 153 274 L 166 269 L 178 272 L 199 280 L 216 286 Z';
const lowerFlame = 'M 236 303 Q 216 302 202 310 Q 190 317 185 332 L 181 346 Q 174 349 168 359 L 158 361 L 146 346 Q 137 338 122 342 L 108 352 L 99 367 Q 92 374 84 373 L 72 368 L 64 360 L 64 306 L 76 299 L 87 298 L 94 308 L 103 307 L 110 299 L 123 298 L 132 306 L 141 310 L 154 301 L 166 299 L 178 291 L 195 295 L 213 292 Z';
const shapes = [leftWing, rightWing, figure, jawTongue, mouth, tail, tailFlame];
const subject = shapes.map(d => `<path d="${d}"/>`).join('');
const coverage = wrap(`<defs><clipPath id="art">${art}</clipPath></defs><rect width="600" height="825" fill="#000"/><g clip-path="url(#art)"><g fill="#ff0000">${art}</g><g fill="#d80000" stroke="#700000" stroke-width="5" stroke-linejoin="round"><path d="${breath}"/><path d="${lowerFlame}"/></g><g fill="#000" stroke="#000" stroke-width="1.8" stroke-linejoin="round">${subject}</g></g>`);
const hologram = wrap(`<defs><clipPath id="art">${art}</clipPath><filter id="soft"><feGaussianBlur stdDeviation=".8"/></filter></defs><rect width="600" height="825" fill="#800080"/><g clip-path="url(#art)"><g fill="#50ff50">${art}</g><g fill="#a0ffa0" filter="url(#soft)"><path d="${leftWing}"/><path d="${rightWing}"/></g><g fill="#d8ffd8" filter="url(#soft)">${shapes.slice(2).map(d => `<path d="${d}"/>`).join('')}</g></g>`);
const laminate = wrap(`<rect width="600" height="825" fill="#606060"/><g fill="#fff">${art}</g>`);
for (const [name, content] of Object.entries({ coverage, hologram, laminate })) await writeFile(new URL(`${name}.svg`, root), content);
