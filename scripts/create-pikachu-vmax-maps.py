"""Registered etched Rainbow Rare surface for English VIV 188/185.

Requires Pillow, NumPy, SciPy. Run from any directory. The exact front.png is
read-only. No photograph or colored lighting enters these material maps.
Paths are hand traced in the 734 x 1024 print coordinates; manufacturing fields
are evaluated at 2x resolution. See docs/pikachu-vmax-rainbow.md for references.
"""
from pathlib import Path
import hashlib
import json
import re
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, maximum_filter

ROOT = Path(__file__).resolve().parents[1] / 'public/cards/pikachu-vmax-vivid-voltage'
W, H, S = 1468, 2048, 2
y, x = np.mgrid[:H, :W].astype(np.float32) / S
rng = np.random.default_rng(2020188)


def smooth(a, b, v):
    t = np.clip((v-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


def save(name, a):
    Image.fromarray(np.rint(np.clip(a, 0, 1)*255).astype(np.uint8)).save(ROOT / f'{name}.png', optimize=True)


def points(path):
    """Small absolute M/L/Q/C/Z path sampler for reproducible authored curves."""
    tokens = re.findall(r'[MLQCZ]|-?\d*\.?\d+', path)
    i, out, p = 0, [], np.zeros(2)
    while i < len(tokens):
        op = tokens[i]; i += 1
        if op == 'Z':
            out.append(out[0]); continue
        count = {'M': 2, 'L': 2, 'Q': 4, 'C': 6}[op]
        a = np.array([float(v) for v in tokens[i:i+count]]).reshape(-1, 2); i += count
        if op in ('M', 'L'):
            out.append(tuple(a[0])); p = a[0]; continue
        for t in np.linspace(0, 1, 40)[1:]:
            q = (1-t)**2*p + 2*(1-t)*t*a[0] + t*t*a[1] if op == 'Q' else (1-t)**3*p + 3*(1-t)**2*t*a[0] + 3*(1-t)*t*t*a[1] + t**3*a[2]
            out.append(tuple(q))
        p = a[-1]
    return [(round(px*S), round(py*S)) for px, py in out]


def mask(path, stroke=None):
    im = Image.new('L', (W, H)); d = ImageDraw.Draw(im)
    p = points(path)
    if stroke is None: d.polygon(p, fill=255)
    else: d.line(p, fill=255, width=max(1, round(stroke*S)), joint='curve')
    return gaussian_filter(np.asarray(im, dtype=np.float32)/255, .65)


# Follow the printed lower contour through the left foot and behind the rule
# panel; a single rounded belly arc spills into the background and clips toes.
BODY = 'M185 287 C139 259 85 207 65 163 L80 147 C140 147 211 179 280 207 Q383 182 499 232 Q574 198 641 186 Q670 179 631 245 Q610 276 575 305 C592 330 611 366 615 393 C620 421 606 452 594 468 Q634 494 658 549 Q677 597 649 634 Q693 703 692 784 Q696 852 662 890 Q640 918 610 931 Q554 957 470 963 Q321 978 197 950 C203 958 199 972 191 975 Q159 986 122 976 Q114 966 111 945 Q52 929 38 875 Q35 865 38 857 C24 786 40 700 57 638 C78 554 111 459 143 380 Q169 318 185 287 Z'
LEFT_HAND = 'M215 459 Q265 485 318 530 Q334 549 321 560 Q332 578 310 583 Q311 598 296 600 L264 623 Q213 612 174 577 Q148 550 137 533 Q170 510 215 459 Z'
RIGHT_HAND = 'M557 535 Q601 519 637 544 Q677 595 649 634 Q614 620 579 597 Q563 587 563 577 Q545 573 557 551 Z'
LEFT_EAR = 'M65 163 L80 147 C140 147 211 179 280 207 Q258 236 185 287 C139 259 85 207 65 163 Z'
RIGHT_EAR = 'M499 232 Q574 198 641 186 Q670 179 631 245 Q610 276 575 305 Q550 265 499 232 Z'
LEFT_CHEEK = 'M206 322 C251 260 312 306 284 353 C243 413 183 369 206 322 Z'
RIGHT_CHEEK = 'M578 324 C567 321 571 355 580 377 C588 398 600 414 605 409 C614 400 600 357 578 324 Z'
LEFT_EYE = 'M292 253 C307 226 354 232 359 249 C369 277 332 288 305 281 C289 277 287 264 292 253 Z'
RIGHT_EYE = 'M507 262 C519 241 552 268 559 287 C569 320 530 301 513 281 Z'
MOUTH = 'M370 317 Q389 335 424 329 Q466 321 490 334 Q514 345 525 333'
BELLY = 'M264 678 Q305 779 291 842 Q277 921 225 956'
LIGHTNING = 'M297 0 L439 0 L480 198 L294 130 L294 202 L147 154 M109 221 L47 225 L93 328 L11 357 L58 456 L0 498 L72 576 L0 638 L44 674'

body = gaussian_filter(mask(BODY), 2.4)
left_hand, right_hand = mask(LEFT_HAND), mask(RIGHT_HAND)
left_ear, right_ear = mask(LEFT_EAR), mask(RIGHT_EAR)
left_cheek, right_cheek = mask(LEFT_CHEEK), mask(RIGHT_CHEEK)
eyes = np.maximum(mask(LEFT_EYE), mask(RIGHT_EYE))
# The print already defines the silhouette, fingers and narrow right cheek. A raised
# outline makes a detached highlight beside the ink, especially at grazing light.
# Use the registered body coverage for its material transition, without a ridge.
edge = np.maximum.reduce([mask(p, 1.6) for p in [LEFT_CHEEK, LEFT_EYE, RIGHT_EYE, MOUTH, BELLY]])
lightning = mask(LIGHTNING, 2.0)*(1-body)

# Pixel classification is restricted to known typography; colored illustration
# boundaries never become accidental ink holes in the full-card foil.
front = Image.open(ROOT / 'front.png').convert('RGB')
assert front.size == (734, 1024)
rgb = np.asarray(front.resize((W, H), Image.Resampling.LANCZOS), dtype=np.float32)/255
lo, hi = rgb.min(axis=2), rgb.max(axis=2)
regions = np.zeros((H, W), dtype=np.float32)
for x0, y0, x1, y1 in [(132, 32, 409, 85), (520, 34, 638, 90), (123, 95, 317, 118),
                        (229, 750, 513, 792), (615, 750, 702, 794), (50, 798, 681, 854),
                        (38, 936, 203, 993), (291, 931, 694, 980), (213, 999, 523, 1018)]:
    regions[y0*S:y1*S, x0*S:x1*S] = 1
black_ink = (1-smooth(.24, .48, hi))*regions
# Protect both dark glyphs and their narrow white printed outlines.
halo = maximum_filter(black_ink, size=9)
protection = np.maximum(black_ink, halo*smooth(.72, .96, lo))
protection = maximum_filter(protection, size=3)
# VMAX label, evolution thumbnail and Gigantamax label have their own opaque ink.
badge = mask('M28 46 L121 44 L113 145 Q110 163 83 162 L35 163 Q22 161 25 137 Z')
giga = mask('M128 123 L298 123 L288 149 L124 148 Z')
rules = mask('M29 882 L708 879 L696 912 L27 911 Q14 902 29 882 Z')
rule_panel = mask('M298 932 Q341 922 371 931 L475 932 Q530 922 697 933 Q730 941 698 963 L672 982 L273 985 Q246 982 257 965 Z')
protection = np.maximum.reduce([protection, badge*.9, giga*.88, rules*.82, rule_panel*.76])
# Energy symbols remain metallic but their black lightning glyph stays opaque.
energy_region = (((x-72)**2+(y-769)**2 < 21**2) | ((x-116)**2+(y-769)**2 < 21**2) | ((x-160)**2+(y-769)**2 < 21**2) | ((x-670)**2+(y-61)**2 < 31**2))
protection = np.maximum(protection, (1-smooth(.22, .42, hi))*energy_region)
protection = np.clip(protection, 0, 1)
active = 1-protection

# A curved diagonal engraving across the torso, turning around the neck/belly.
# Different engraved regions terminate at the traced anatomical boundaries.
body_phase = (y - .54*x + 38*np.sin((x-90)/310) + .00013*(y-480)**2)/2.35
fields = [(gaussian_filter(left_hand, 20), (y-.58*x+.0004*(x-220)**2)/2.30),
                    (left_ear, (y-.94*x)/2.1), (right_ear, (y+.7*x)/2.2),
                    (left_cheek, (y+.18*x+.0012*(x-247)**2)/2.1),
                    (right_cheek, (x+.38*y)/1.9),
                    (eyes, (y-.25*x)/1.9)]

# The background shows interrupted, directionally related microcuts. Fixed
# multiscale deviations break their continuity without turning them into noise.
noise = rng.standard_normal((H, W)).astype(np.float32)
slow = gaussian_filter(noise, 15); slow /= max(float(slow.std()), 1e-6)
fine = gaussian_filter(noise, .7); fine /= max(float(fine.std()), 1e-6)
background_phase = (y+.24*x+14*np.sin(x/83)+7*np.sin(y/115))/1.95 + .18*slow
background_cut = (np.cos(background_phase*2*np.pi)*.5+.5)**2
body_cut = (np.cos((body_phase+.045*fine)*2*np.pi)*.5+.5)**2
for area, phase in fields:
    # Blend physical ridges, never scalar phases: interpolating unrelated phase
    # counts invents dense interference seams at the hand/ear boundaries.
    cut = (np.cos((phase+.045*fine)*2*np.pi)*.5+.5)**2
    body_cut = body_cut*(1-area)+cut*area
grain = smooth(-.6, 1.2, fine)
interrupt = .45+.55*smooth(-1.1, .9, gaussian_filter(noise, 1.0)*3.5)
micro = (body_cut*.52 + grain*.48)*body + (background_cut*.32*interrupt + grain*.68)*(1-body)
micro *= 1-eyes*.64
micro *= active

# Physical relief in centimetres (micron-scale). Macro contours and fine etch
# are separate so height derivatives and the micro normal never double-count.
macro = (.00010*body + .00023*edge + .00009*lightning)*active
micro_cm = (micro-.42)*(.00075*body+.00115*(1-body))
gy, gx = np.gradient(micro_cm, 8.8/H, 6.3/W)
normals = np.stack([-gx, gy, np.ones_like(gx)], axis=2)
normals /= np.linalg.norm(normals, axis=2, keepdims=True)

# Grating orientation follows the same scalar field as the relief, with the
# image Y axis inverted to the material's +Y-up tangent convention. Double-angle
# encoding makes unoriented 180-degree grating axes interpolate without seams.
bgy, bgx = np.gradient(background_phase, 8.8/H, 6.3/W)
pgy, pgx = np.gradient(body_phase, 8.8/H, 6.3/W)
angle = np.arctan2(-pgy, pgx)
axis_c, axis_s = np.cos(2*angle), np.sin(2*angle)
for area, phase in fields:
    pgy, pgx = np.gradient(phase, 8.8/H, 6.3/W)
    angle = np.arctan2(-pgy, pgx)
    axis_c = axis_c*(1-area)+np.cos(2*angle)*area
    axis_s = axis_s*(1-area)+np.sin(2*angle)*area
background_angle = np.arctan2(-bgy, bgx)
axis_c = axis_c*body+np.cos(2*background_angle)*(1-body)
axis_s = axis_s*body+np.sin(2*background_angle)*(1-body)
angle = np.arctan2(axis_s, axis_c)*.5 + .008*slow + (.10*body+.18*(1-body))*fine
spacing = .326 + .004*np.tanh(slow) + .012*grain
direction = np.stack([np.cos(angle*2)*.5+.5, np.sin(angle*2)*.5+.5, spacing, np.ones_like(x)], axis=2)

roughness = (.34*body+.37*(1-body)) + .055*(1-micro) + .009*np.tanh(slow)
roughness = roughness*(1-eyes)+.245*eyes
roughness = roughness*(1-edge*.6)+.23*edge*.6
roughness = roughness*active + .46*protection
foil = .89*body+.96*(1-body)
foil = np.maximum(foil, edge*.99)
laminate = (.46*body+.38*(1-body))*(1-protection*.22)
pattern = (.78+.22*micro)*(1-eyes*.4)
sparkle = (.45*body+.70*(1-body))*active

save('foil', foil)
save('protection', protection)
save('height', .5+macro/.0008)
save('normal', normals*.5+.5)
save('roughness', roughness)
save('direction', direction)
save('pattern', pattern)
save('laminate', laminate)
save('sparkle', sparkle)

meta = {
    'identity': {'name': 'Pikachu VMAX', 'set': 'Sword & Shield—Vivid Voltage', 'number': '188/185', 'language': 'English', 'rarity': 'Rare Rainbow', 'artist': 'aky CG Works', 'year': 2020},
    'print': {'url': 'https://images.pokemontcg.io/swsh4/188_hires.png', 'size': [734, 1024], 'sha256': hashlib.sha256((ROOT/'front.png').read_bytes()).hexdigest(), 'processing': 'Unmodified digital print; no photographs, glare or additional rainbow overlays.'},
    'maps': {'size': [W, H], 'generator': 'scripts/create-pikachu-vmax-maps.py', 'normalConvention': 'OpenGL +Y up', 'seed': 2020188, 'heightRangeCm': .0008, 'notes': 'Authored estimates from multiple real-card photographs; no measured surface scan.'},
    'references': ['https://limitlesstcg.com/cards/en/VIV/188', 'https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/swsh4.json', 'https://www.ebay.co.uk/itm/336001692973', 'https://www.ebay.com/itm/318521727878', 'https://www.ebay.com/itm/255311777096'],
}
(ROOT/'source.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(f'Authored 9 registered {W} x {H} material maps; front sha256 {meta["print"]["sha256"]}')
