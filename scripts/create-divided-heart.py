"""Photo-guided, authored contour relief for Divided Heart (original study).

Run: python scripts/create-divided-heart.py
Coordinates are in the supplied 736 x 716 photograph. No image intensity is
used to generate heights. Interpolated ridge spacing and depth are estimates.
"""
from pathlib import Path
import hashlib
import json
import re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/cards/divided-heart'
S = 2
W, H = 736, 716
SIZE = (W*S, H*S)
front = Image.open(OUT/'front.png').convert('RGB')
cutout = Image.open(OUT/'subject-cutout.png').convert('L')
assert front.size == cutout.size == (W, H)


def path_mask(path):
    """Rasterize authored cubic boundaries; vector data is never served."""
    tokens = re.findall(r'[MLCZ]|-?\d+(?:\.\d+)?', path)
    points, i, p = [], 0, np.zeros(2)
    while i < len(tokens):
        cmd = tokens[i]; i += 1
        if cmd == 'Z':
            break
        if cmd in ('M', 'L'):
            p = np.array([float(tokens[i]), float(tokens[i+1])]); i += 2
            points.append(tuple(p*S))
        elif cmd == 'C':
            a, b, c = np.array(list(map(float, tokens[i:i+6]))).reshape(3, 2); i += 6
            for t in np.linspace(0, 1, 80)[1:]:
                q = (1-t)**3*p + 3*(1-t)**2*t*a + 3*(1-t)*t*t*b + t**3*c
                points.append(tuple(q*S))
            p = c
        else:
            raise ValueError(cmd)
    canvas = Image.new('L', SIZE)
    ImageDraw.Draw(canvas).polygon(points, fill=255)
    return np.asarray(canvas.filter(ImageFilter.GaussianBlur(.45)), dtype=np.float32)/255


# Boundaries follow ink edges, not the width of photographed foil highlights.
subject = path_mask('M 183 716 L 191 624 C 197 611 198 602 195 596 C 188 580 194 569 204 558 C 216 548 202 540 213 522 C 222 514 212 509 208 506 L 211 467 L 226 411 C 234 392 256 388 268 380 C 278 350 275 318 286 279 C 292 207 316 156 356 141 C 388 128 427 152 446 176 C 466 206 467 271 474 313 L 504 410 L 523 513 L 538 568 C 537 579 533 585 536 591 L 548 602 L 544 637 L 537 716 Z')
hair = path_mask('M 240 391 C 265 364 276 335 282 289 C 290 217 313 155 355 141 C 367 137 372 137 376 139 L 372 203 L 366 245 C 353 258 352 306 349 348 L 349 453 L 321 451 L 319 376 C 288 380 266 391 240 401 Z')
gold = path_mask('M 372 139 C 404 137 432 157 446 179 C 464 211 464 267 475 314 C 484 348 497 385 505 420 L 531 515 L 521 519 C 511 475 505 439 493 401 L 478 385 L 450 375 L 426 382 L 420 461 L 383 463 L 389 328 C 406 317 419 302 427 278 L 432 245 C 410 251 390 251 368 245 L 371 199 Z')
face = path_mask('M 312 247 C 326 253 349 253 367 247 C 389 251 411 249 431 245 L 426 278 C 421 301 402 321 384 330 L 380 392 L 348 394 L 350 338 C 332 326 319 305 316 289 Z')
# Individually curved wrist/finger contours preserve narrow gaps at the clasp.
hands = path_mask('M 237 611 C 247 597 260 590 272 586 C 289 581 298 574 308 573 C 326 572 336 580 345 586 C 351 591 357 597 362 602 L 365 609 C 377 603 381 594 384 586 C 391 577 403 570 414 570 C 425 569 433 577 440 584 C 449 588 462 593 474 601 C 488 611 499 625 499 642 L 494 664 C 479 657 466 642 453 631 L 437 617 C 429 627 419 639 405 642 C 392 648 381 648 369 645 C 355 642 344 633 333 626 C 319 621 308 614 299 608 C 284 612 275 623 267 636 L 255 664 L 246 686 L 240 672 C 235 650 232 627 237 611 Z')
heart = path_mask('M 330 488 C 337 474 351 476 365 484 L 374 492 C 386 479 401 477 410 489 C 419 506 397 530 377 549 C 363 541 330 521 328 503 Z')
cloth = np.clip(subject - np.maximum.reduce([hair, gold, face, hands, heart]), 0, 1)
protection = np.maximum.reduce([gold, face, hands])
user = np.asarray(cutout.resize(SIZE, Image.Resampling.LANCZOS), dtype=np.float32)/255
halo_shape = path_mask('M 126 0 L 611 0 C 589 40 550 65 531 88 C 510 118 543 137 544 171 C 550 228 510 304 480 335 C 467 305 458 236 447 180 C 426 145 389 131 358 142 C 309 155 285 221 276 280 L 260 335 C 220 303 196 252 196 208 C 193 160 218 113 271 92 C 254 80 243 76 232 77 C 189 73 149 45 126 0 Z')
halo = halo_shape*(1-user)*(1-subject)
left_lower = path_mask('M 0 655 C 68 566 150 470 209 466 L 211 508 C 221 516 217 524 211 533 C 205 542 210 553 207 561 C 192 575 190 585 197 599 L 189 625 L 183 716 L 0 716 Z')*(1-user)
right_lower = path_mask('M 521 515 L 535 522 L 538 510 L 556 533 L 560 515 L 576 536 L 575 510 L 596 536 L 594 512 L 620 537 L 617 516 L 643 531 L 642 518 L 664 533 L 666 520 C 685 537 707 541 736 557 L 736 716 L 539 716 L 544 631 L 536 613 L 539 592 L 527 576 L 532 563 Z')*(1-user)
right_wing = path_mask('M 612 0 L 736 0 L 736 557 C 698 540 670 533 646 521 L 622 516 L 621 530 L 595 511 L 597 535 L 576 510 L 576 534 L 560 514 L 555 530 L 538 510 L 534 521 L 521 513 L 505 422 L 479 340 C 513 310 529 261 540 223 C 553 179 524 140 526 113 C 526 88 562 67 580 46 Z')
left_wing = np.clip(1-np.maximum.reduce([subject,halo_shape,right_wing,left_lower,right_lower]),0,1)

height = np.full((H*S,W*S), .5, dtype=np.float32)
normal = np.zeros((H*S,W*S,3), dtype=np.float32); normal[:,:,2] = 1
labels = np.zeros((H*S,W*S), dtype=np.uint8)
roughness = np.full((H*S,W*S), .35, dtype=np.float32)
region_stats = []


def curve(points):
    a = np.asarray(points, dtype=float)
    t = np.r_[0,np.cumsum(np.linalg.norm(np.diff(a,axis=0),axis=1))]
    return CubicSpline(t,a)(np.linspace(0,t[-1],max(100,int(t[-1]*2))))


def apply_ridges(name, mask, lines, amplitude=.15, width=.48, rough=.31):
    # Draw continuous line surfaces across the boundaries FIRST. The silhouette
    # never enters the differentiation; this prevents invented edge embossing.
    ink = Image.new('L', SIZE)
    draw = ImageDraw.Draw(ink)
    for points in lines:
        line = curve(points)*S
        draw.line([tuple(p) for p in line],fill=255,width=1)
    field = gaussian_filter(np.asarray(ink,dtype=np.float32)/255,width*S)
    field *= amplitude / max(float(field.max()),.001)
    gy,gx = np.gradient(field,1/S,1/S)
    n = np.stack([-gx*7.0,gy*7.0,np.ones_like(gx)],axis=2)
    n /= np.linalg.norm(n,axis=2,keepdims=True)
    a = mask[:,:,None]
    normal[:] = normal*(1-a)+n*a
    height[:] = height*(1-mask)+(.5+field)*mask
    roughness[:] = roughness*(1-mask)+rough*mask
    labels[mask>.5] = len(region_stats)+1
    region_stats.append(dict(name=name,lines=len(lines),heightAmplitude=amplitude,
                             ridgeWidthSourcePixels=width,roughness=rough))


# Dark wing: measured bowed transverse line flow. 4.1px pitch is inferred
# between clearly visible groups; the unlit upper-left is a continuation.
lines=[]
for y in np.arange(-200,970,4.2):
    lines.append([(-70,y+28),(0,y+22),(65,y+1),(130,y-38),(180,y-90),(232,y-120),(285,y-100)])
apply_ridges('shadow-wing-transverse',left_wing,lines,.105,.43,.35)

# Halo: a fan with a measured bend around the head, without random striation.
# Rays are kept distinct from the sheet-wide diffraction axis.
lines=[]
for theta in np.linspace(-2.99, .22,178):
    d=np.array([np.cos(theta),np.sin(theta)])
    tangent=np.array([-d[1],d[0]])
    points=[]
    for r in [45,110,185,280,390,520,700]:
        p=np.array([365,387])+d*r+tangent*(.00017*r*r)
        points.append(tuple(p))
    lines.append(points)
apply_ridges('halo-swept-rays',halo,lines,.12,.40,.32)

# Main right wing: fine bent bars cross the long feather shafts. Their outer
# ends slope down; they do not follow the foil rainbow already in the photo.
lines=[]
for y in np.arange(-150,880,4.15):
    bend=24*np.sin((y-50)/185)
    lines.append([(460,y-29),(510,y-11),(549,y),(586,y+15+bend*.25),
                  (630,y+37+bend),(685,y+63+bend),(770,y+78+bend)])
apply_ridges('silver-wing-crosscuts',right_wing,lines,.14,.46,.30)

# Foreground wings sweep diagonally into the bottom corners.
lines=[]
for y in np.arange(350,1010,3.75):
    lines.append([(-40,y+90),(30,y+43),(90,y+9),(150,y-28),(210,y-85),(262,y-139)])
apply_ridges('left-foreground-feather',left_lower,lines,.135,.43,.31)
lines=[]
for y in np.arange(240,900,3.85):
    lines.append([(480,y-65),(536,y-23),(590,y+25),(650,y+74),(703,y+113),(773,y+153)])
apply_ridges('right-foreground-feather',right_lower,lines,.135,.43,.31)

# Dark hair: visibly nested bowed lines wrap over the left crown, then become
# shallow curved horizontal bands approaching the shoulder.
lines=[]
for y in np.arange(-50,620,4.35):
    crown=np.clip((300-y)/160,0,1)
    lines.append([(214,y-75*crown-12),(254,y-47*crown-8),(292,y-22*crown),
                  (325,y+1),(350,y+11),(379,y+13)])
apply_ridges('dark-hair-bowed-ridges',hair,lines,.13,.46,.31)

# Shirt: hand-authored contour stations capture the shoulder descent, rounded
# chest and pleat direction. Pitches interpolate the visible ~4px ridges.
lines=[]
for y in np.arange(310,830,4.3):
    lower=np.clip((y-530)/160,0,1)
    shoulder=np.clip((480-y)/100,0,1)
    lines.append([(170,y-24),(211,y-7),(244,y+4+shoulder*6),
                  (275,y+2+lower*8),(300,y-3-lower*10),(334,y-7-lower*1),
                  (365,y-10+lower*8),(394,y-16-lower*3),(425,y-13-lower*7),
                  (455,y-3+lower*11),(478,y+12),(500,y+18),(526,y+18),(560,y+8)])
apply_ridges('cloth-draped-crosscuts',cloth,lines,.16,.47,.32)

# The heart carries compact concentric curved cuts, with its notch preserved.
lines=[]
for y in np.arange(445,580,3.5):
    lines.append([(316,y-14),(336,y-2),(355,y+7),(374,y+12),(391,y+5),(409,y-8),(426,y-22)])
apply_ridges('heart-curved-cuts',heart,lines,.095,.39,.33)

normal /= np.linalg.norm(normal,axis=2,keepdims=True)
# Smooth printed regions win last in the draw order, independently of relief.
normal = normal*(1-protection[:,:,None])+np.array([0,0,1])*protection[:,:,None]
height = height*(1-protection)+.5*protection
roughness = roughness*(1-protection)+.49*protection
foil = np.clip(.68-.17*left_wing+.07*cloth-.08*hair,0,1)
laminate = .045*(1-protection)+.016*protection
one,zero=np.ones_like(height),np.zeros_like(height)
angle=-.43
maps=dict(foil=foil,protection=protection,height=height,normal=normal*.5+.5,
          roughness=roughness,laminate=laminate,pattern=one,sparkle=zero,
          metallic=zero,secondaryFoil=zero,stamp=zero,
          direction=np.stack([one*(np.cos(2*angle)*.5+.5),one*(np.sin(2*angle)*.5+.5),one/3,one],2),
          coverage=np.stack([foil,zero,zero,laminate],2),
          surface=np.stack([height,roughness,zero,one],2))
for name,data in maps.items():
    Image.fromarray(np.uint8(np.clip(np.rint(data*255),0,255))).save(OUT/f'{name}.png',optimize=True)
Image.fromarray(labels).save(OUT/'regions.png')

# Registered color review: cyan etched coverage, coral protected pigment,
# yellow user-cutout boundary. This artifact is never loaded as material data.
overlay=np.asarray(front.resize(SIZE,Image.Resampling.LANCZOS),dtype=float)
for mask,color in [(cloth,[30,230,255]),(hair,[30,230,255]),(protection,[255,90,60]),(halo,[255,210,30])]:
    edges=np.abs(mask-gaussian_filter(mask,1.8))>.08
    overlay[edges]=color
Image.fromarray(np.uint8(overlay)).save(OUT/'boundary-review.png')
meta=dict(title='Divided Heart',kind='Original full-art photo-guided optical study',
    source='User-supplied codex-clipboard-1df5d0e0-f9e5-4e56-9ef8-979eb7cebe9f.png',
    sha256=hashlib.sha256((OUT/'front.png').read_bytes()).hexdigest(),
    cutoutSha256=hashlib.sha256((OUT/'subject-cutout.png').read_bytes()).hexdigest(),
    sourceSize=[W,H],mapSize=list(SIZE),regions=region_stats,
    observations=['Bowed transverse dark-hair lines','Draped horizontal shirt crosscuts',
                  'Curved heart cuts','Swept halo rays','Transverse wing cuts and diagonal foreground feathers'],
    estimates=['Single oblique photograph; no clean front or complementary views were supplied.',
               'All ridge depth, width, interpolated spacing, unlit line continuation and grating pitch are estimates.',
               'The original photograph is retained byte-for-byte, including baked reflections.',
               'Uniform grating is an original design assumption, not a measured property of the physical foil.'],
    method='Cubic ink contours and deterministic curved ridge families in source coordinates; continuous ridge gradients computed before region clipping. No brightness-derived or random relief.',
    cutout='Retained byte-for-byte; used to register the halo and foreground wing regions. Smooth skin and golden hair are separately traced; visibly etched clothing and dark hair remain active.',
    maps=list(maps))
(OUT/'source.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
print(f'Created {len(maps)} PNG maps, {sum(r["lines"] for r in region_stats)} authored/interpolated ridges, {SIZE}')
