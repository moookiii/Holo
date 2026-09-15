from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]/'public/cards/squirtle-frlg-reverse'
wrap=lambda s: '<svg xmlns="http://www.w3.org/2000/svg" width="1468" height="2048" viewBox="0 0 734 1024">'+s+'</svg>'
# Registered to the unchanged ex6-83 print. Water highlights receive a separate
# transmission mask; the opaque Squirtle silhouette is not a rectangular hole.
subject='M259 274Q257 229 283 198Q312 155 368 151Q424 145 459 180Q487 212 489 263L480 296Q468 330 430 348Q389 367 342 354Q303 350 279 327Z M279 308Q244 297 233 273L213 269L202 290L186 310Q176 342 201 361Q230 384 285 375L300 389L299 413Q305 450 347 466Q386 482 448 463Q508 450 536 427Q557 397 569 365L545 330L515 317L485 298L459 332Q415 368 348 354L304 339Z M485 298Q480 266 486 233Q497 202 528 181L552 176L573 168L594 173L585 215L579 257Q568 309 552 333Q533 353 508 336Q487 324 485 298Z'
base='<rect width="734" height="1024" fill="black"/><rect x="65" y="107" width="604" height="370" fill="#c8c8c8"/>'
(root/'reverse-foil.svg').write_text(wrap(base+f'<path d="{subject}" fill="black" stroke="black" stroke-width="2" stroke-linejoin="round"/>'))
(root/'laminate.svg').write_text(wrap('<rect width="734" height="1024" fill="#666"/><rect x="65" y="107" width="604" height="370" fill="#999"/>'))
front=Image.open(root/'front.png').convert('RGB');mask=Image.new('L',front.size,0);src=front.load();out=mask.load()
for y in range(107,478):
    for x in range(65,670):
        r,g,b=src[x,y]
        t=max(0,min(1,(min(r,g,b)-176)/62));t=t*t*(3-2*t)
        out[x,y]=round(t*255)
mask.save(root/'protection.png')
