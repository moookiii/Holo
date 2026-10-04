"""Create paired-front, exact foil, etch and registered-overlay review sheets."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'research/tcgl/prismatic-set/sources.json'
OUT = ROOT / 'artifacts/prismatic-tcgl-set/source-review'


def tile(printing):
    result = Image.new('RGB', (250, 390), '#151a20')
    draw = ImageDraw.Draw(result)
    draw.text((5, 4), printing['number']+' '+printing['name'][:23], fill='white')
    draw.text((5, 19), printing['variant'], fill='#9dc5df')
    sources = printing['sources']
    front = Image.open(ROOT / sources['front']['file']).convert('RGB')
    foil = Image.open(ROOT / sources['foil']['file']).convert('RGBA') if 'foil' in sources else Image.new('RGBA', front.size)
    etch = Image.open(ROOT / sources['etch']['file']).convert('RGB') if 'etch' in sources else Image.new('RGB', front.size, '#808080')
    clean = Image.open(ROOT / f"public/cards/pokemon/prismatic-evolutions/{printing['number']}.png").convert('RGB')
    mask = np.asarray(foil.resize(clean.size, Image.Resampling.BILINEAR), np.float32)/255
    coverage = np.clip((mask[..., :3].mean(2)-22/255)/(233/255), 0, 1)*mask[..., 3]
    rgb = np.asarray(clean, np.float32)/255
    overlay = rgb*(1-coverage[...,None]*.5)+np.array([0,.95,.35])*coverage[...,None]*.5
    overlay = Image.fromarray(np.rint(np.clip(overlay,0,1)*255).astype(np.uint8))
    for index, (image,label) in enumerate([(front,'TCGL front'),(foil.convert('RGB'),'TCGL foil'),(etch,'TCGL etch'),(overlay,'Holo UV overlay')]):
        image.thumbnail((122,169))
        x=index%2*125; y=40+index//2*175
        draw.text((x+3,y),label,fill='#cad3dc');result.paste(image,(x+(125-image.width)//2,y+13))
    return result


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    printings=json.loads(SOURCE.read_text())['printings']
    for start in range(0,len(printings),18):
        sheet=Image.new('RGB',(1500,1170),'#151a20')
        for index,printing in enumerate(printings[start:start+18]):
            sheet.paste(tile(printing),((index%6)*250,(index//6)*390))
        path=OUT/f'page-{start//18+1:02d}.jpg';sheet.save(path,quality=95)
    print(f'{len(printings)} printings in {(len(printings)+17)//18} review sheets',flush=True)


if __name__ == '__main__':
    main()
