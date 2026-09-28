"""Reuse authored masks, registering subject geometry separately from print rails.

No front modification, relief inference or new subject segmentation. Affines are
measured from matching artwork landmarks; source ink quirks remain continuous.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/base-set-2/maps'
REVIEW = ROOT / 'artifacts/base-set-2/registered'
OUT.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)
BASE = ['alakazam','blastoise','chansey','charizard','clefairy','gyarados','hitmonchan','machamp','magneton','mewtwo','nidoking','ninetales','poliwrath','raichu','venusaur','zapdos']
catalog = json.loads((ROOT/'public/cards/pokemon/base-set-2/catalog.json').read_text())['cards']
registrations = json.loads((ROOT/'scripts/base-set-2/registration.json').read_text())
tiles = []
for row in registrations:
    n = int(row['number'])
    source, number = row['source'].split('-'); number = int(number)
    if source == 'base1':
        directory = ROOT/'public/cards'/('charizard-base-set' if number == 4 else 'pokemon/base-set/'+BASE[number-1])
        foil = np.array(Image.open(directory/'foil.png').convert('L'))
        # Remove the old window rails and evolution badge from the combined map.
        # Subject geometry lives inside this original window, including flame opacity.
        window = np.zeros_like(foil)
        vertices = [[64,100],[537,100],[537,423],[64,423]]
        if number not in [3,7,10,16]:
            vertices = [[132,100],[537,100],[537,423],[64,423],[64,147],[73,141],[82,145],[95,134],[104,133],[113,117]]
        cv2.fillPoly(window,[np.array(vertices,np.int32)*2],255)
        body = np.minimum(255-foil,cv2.erode(window,np.ones((3,3),np.uint8)))
    else:
        directory = ROOT/'public/cards/pokemon/jungle/maps'
        foil = np.array(Image.open(directory/f'{number}-foil.png').convert('L'))
        protection = np.array(Image.open(directory/f'{number}-protection.png').convert('L'))
        body = np.minimum(protection,cv2.erode(foil,np.ones((3,3),np.uint8)))
    transform = np.array(row['affine'],np.float64); transform[:,2] *= 2
    body = cv2.warpAffine(body,transform,(1200,1650),flags=cv2.INTER_LINEAR)
    # Reprint rails and badge: clean front coordinates, independent of subject scale.
    window = np.zeros_like(body)
    vertices = [[65,96],[534,96],[534,420],[65,420]]
    if catalog[n-1].get('stage') != 'Basic':
        vertices = [[143,96],[534,96],[534,420],[65,420],[65,140],[78,137],[86,143],[99,132],[111,135],[122,121],[133,115],[131,106]]
    cv2.fillPoly(window,[np.array(vertices,np.int32)*2],255)
    protection = np.maximum(body,255-window)
    Image.fromarray(window).save(OUT/f'{n}-foil.png',optimize=True)
    Image.fromarray(protection).save(OUT/f'{n}-protection.png',optimize=True)
    effective = np.uint8(window.astype(float)*(1-protection.astype(float)/255))
    front = np.array(Image.open(ROOT/f'public/cards/pokemon/base-set-2/{n}.png').convert('RGB').resize((1200,1650)))
    contours,_ = cv2.findContours((effective>127).astype(np.uint8),cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(front,contours,-1,(255,35,220),1)
    Image.fromarray(front).save(REVIEW/f'{n}-overlay.png')
    tile=Image.fromarray(front).crop((110,180,1090,870)).resize((392,276))
    ImageDraw.Draw(tile).text((4,4),f'{n} from {row["source"]}',fill='white',stroke_width=2,stroke_fill='black')
    tiles.append(tile)
sheet=Image.new('RGB',(392*4,276*5))
for i,tile in enumerate(tiles): sheet.paste(tile,(i%4*392,i//4*276))
sheet.save(REVIEW/'contact.png')
print('Registered 20 existing masks; PNG coverage and protection remain separate.')
