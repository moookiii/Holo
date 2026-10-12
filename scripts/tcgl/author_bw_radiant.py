"""Prepare only the 25 BW RC finishes; preserve source art and raw manifests.

No height/normal assets. TCGL's own plate supplies decoration/print protection
on 15 cards. Ten NonFoil commons have no plate: their separate star overcoat is
explicitly an approximate manufactured sheet, never claimed as source geometry.
"""
from pathlib import Path
import hashlib
import json
import math
import sys
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image, ImageDraw
from prepare_swsh_proofs import registered

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/bw-radiant'
REVIEW = ROOT / 'artifacts/bw-radiant'
SIZE = (733, 1024)


def read(path): return json.loads(path.read_bytes())
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


def common_coat(number):
    # An explicitly approximate repeating star sheet, distinct from the printed
    # decorative stars in premium TCGL plates. No image brightness segmentation.
    factor = 3
    image = Image.new('L', (SIZE[0]*factor, SIZE[1]*factor))
    draw = ImageDraw.Draw(image)
    for row in range(-1, 20):
        for col in range(-1, 14):
            x = col*66 + (row % 2)*33 + (number*13 % 43)
            y = row*61 + (number*7 % 37)
            radius = 6 if (col + row) % 3 else 10
            points = []
            for i in range(10):
                angle = i*math.pi/5 - math.pi/2
                r = radius * (1 if i % 2 == 0 else .40)
                points.append(((x+math.cos(angle)*r)*factor, (y+math.sin(angle)*r)*factor))
            draw.polygon(points, fill=112)
    return image.resize(SIZE, Image.Resampling.LANCZOS)


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    records = []
    for number in range(1, 26):
        cid = f'bw11r_{number}'
        source = ROOT / 'public/cards/pokemon/tcgl-bw' / cid
        old = read(source / 'evidence.json')
        assert old['tcglCardId'] == cid and 'etch' not in old['sources']
        common = old['printing']['foil_effect'] == 'NonFoil'
        assert common == ('foil' not in old['sources'])
        target = OUT / str(number)
        target.mkdir(parents=True, exist_ok=True)
        preserved = {kind: sha(ROOT / ('public' + s['publicOriginal'])) for kind,s in old['sources'].items()}
        assert preserved == {kind:s['sha256'] for kind,s in old['sources'].items()}
        if common:
            # The dielectric sheet covers the whole card; only its reflection
            # is star-patterned. A star-shaped metal coverage would leave dark
            # decals visible even outside the coating's angular highlight.
            common_coat(number).save(target / 'pattern.png')
            plate = Image.new('L', SIZE, 255)
        else:
            controls = registered(Image.open(source / 'original-foil.png'), SIZE)
            controls.save(target / 'foil-controls.png')
            plate = controls.convert('L')
            # Change grain size over a broad, smooth transition in full-card UV;
            # never extend coverage beyond this card's original whiteplate.
            y = np.arange(SIZE[1], dtype=np.float32)[:,None] / (SIZE[1]-1)
            ramp = np.clip((y-.545)/.065, 0, 1)
            ramp = ramp*ramp*(3-2*ramp)
            secondary = np.rint(np.asarray(plate, dtype=np.float32)*ramp).astype(np.uint8)
            Image.fromarray(secondary).save(target / 'secondary.png')
        plate.save(target / 'foil.png')
        Image.new('L', (1,1), 255).save(target / 'laminate.png')
        maps = {'foil':f'/cards/pokemon/bw-radiant/{number}/foil.png',
                'laminate':f'/cards/pokemon/bw-radiant/{number}/laminate.png'}
        if common: maps['pattern'] = f'/cards/pokemon/bw-radiant/{number}/pattern.png'
        if not common:
            maps.update(foilControls=f'/cards/pokemon/bw-radiant/{number}/foil-controls.png',
                        secondaryFoil=f'/cards/pokemon/bw-radiant/{number}/secondary.png')
        profile = 'bw-radiant-overcoat' if common else 'bw-radiant-glitter'
        evidence = dict(old, profile=profile, maps=maps, treatmentStatus='existing-material', deferredEffect=None,
            normalGeneration=False, shaderChanges=False,
            physicalFinishReview=dict(activeEtch='None; smooth coating with optical particles only',
                evidence='docs/bw-radiant.md',
                remainingUncertainty='Ten common star sheets and all particle populations are approximate; exact own foil/print plates are retained for the other fifteen cards.'),
            limitations='Angular intensity and particle distribution are rendering estimates, not measured factory data. '
                + ('TCGL labels this exact printing NonFoil and has no coating plate. Authored repeating stars approximate its physical overcoat; their positions are not an exact-copy registration.' if common else
                   'Own exact TCGL decorative/print plate. Fine and coarse glitter populations are fixed optical estimates; physical-copy particle positions are not matched.'),
            radiantFinish=dict(coordinateDimensions=list(SIZE), outputDimensions=list(SIZE),
                verticalFlip=False, uvBox=[145/1024,0,878/1024,1],
                registration='Same established full-card Unity bleed removal for paired front and whiteplate. No artwork-only crop, offset or rotation.',
                frontChanged=False, sourceHashes=preserved,
                coverageSource='Uniform dielectric overcoat above print; approximate stars modulate reflection only through pattern.png; no source foil plate exists' if common else 'Own original TCGL foil, continuous grayscale with individual glyph and subject protection intact',
                secondarySource=None if common else 'Own plate multiplied by smoothstep(.545,.610, full-card row UV)',
                roughnessSource='Profile values, independent of printed brightness',
                normalScale=0, embossStrength=0, runtimeDetection=False, runtimeNormalGeneration=False,
                physicalReferences=['https://www.mercari.com/us/item/m61096852228/',
                    'https://www.mercari.com/us/item/m96116919642/',
                    'https://www.mercari.com/us/item/m10585848937/'],
                review='docs/bw-radiant.md',
                outputs={key:{'sha256':sha(ROOT/('public'+url)),
                    'dimensions':list(Image.open(ROOT/('public'+url)).size)} for key,url in maps.items()}))
        write(target / 'evidence.json', evidence)
        # Full-card overlay for registration/edge review. This is never a site mask.
        front = np.asarray(registered(Image.open(source/'original-front.png').convert('RGB'), SIZE), dtype=np.float32)
        amount = np.asarray(common_coat(number) if common else plate, dtype=np.float32)[:,:,None]/255*.40
        overlay = Image.fromarray(np.rint(front*(1-amount)+np.array([255,45,200])*amount).astype(np.uint8))
        overlay.save(REVIEW / f'RC{number:02}-coverage.png')
        records.append(dict(cardId=f'bw11r-{number}', tcglCardId=cid, tcglVariantId=old['tcglVariantId'],
            profile=profile, ownTcglPlate=not common, frontHashesPreserved=True, maps=maps,
            evidence=f'/cards/pokemon/bw-radiant/{number}/evidence.json'))
    assert sum(c['ownTcglPlate'] for c in records) == 15
    write(ROOT/'docs/bw-radiant.json', dict(status='authored', cards=records,
        counts=dict(total=25, exactPlates=15, approximateCommonOvercoats=10),
        normalGeneration=False, unrelatedCardsChanged=False))
    pending_path = ROOT / 'docs/bw-pending-finishes.json'
    pending = read(pending_path)
    pending.pop('Legendary Treasures Radiant Collection glitter and overcoat', None)
    write(pending_path, pending)
    print('Prepared 25 RC cards: 15 own TCGL plates, 10 approximate common star overcoats. No relief.')


if __name__ == '__main__': main()
