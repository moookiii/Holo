"""Offline conversion of the eight reviewed exact SVE reverse foil masks.

These cards have no TCGL etch resource. Never derive relief from their print.
"""
from pathlib import Path
import json, hashlib
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'research/tcgl/prismatic-energy/sources.json'
OUT=ROOT/'public/cards/pokemon/prismatic-evolutions/tcgl'

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    source=json.loads(SOURCE.read_text())
    for row in source['printings']:
        number=row['number'];front=ROOT/f'public/cards/pokemon/energy/{number}.png'
        raw=np.asarray(Image.open(ROOT/row['sources']['foil']['file']).convert('RGBA'),np.float32)/255
        luminance=raw[...,:3].mean(2)
        # The preserved SVE PNG has a neutral black compression floor of 33.
        foil=np.clip((luminance-33/255)/(222/255),0,1)*raw[...,3]
        protection=np.clip((36/255-luminance)/(6/255),0,1)*raw[...,3]
        maps={}
        for name,value in [('foil',foil),('protection',protection)]:
            filename=f'energy-{number}-reverse-{name}.png'
            value=cv2.resize(value,(1800,2475),interpolation=cv2.INTER_LINEAR)
            Image.fromarray(np.rint(value*255).astype(np.uint8)).save(OUT/filename)
            maps[name]={'path':'/cards/pokemon/prismatic-evolutions/tcgl/'+filename,'sha256':digest(OUT/filename)}
        row['alignmentReview']={'status':'reviewed','capture':'artifacts/prismatic-tcgl-set/energy-sources.jpg','verticalFlip':False,'cropOrOffset':False,'fullCardUvs':True,'holoFrontSha256':digest(front)}
        row['maps']=maps;row['outputDimensions']=[1800,2475];row['normalScale']=0;row['embossStrength']=0
        row['method']='Mean TCGL foil RGB, decoded black floor 33/255 removed, alpha multiplied; full-domain bilinear resize. No etch asset and no fabricated relief.'
        (OUT/f'energy-{number}-reverse-evidence.json').write_text(json.dumps(row,indent=2)+'\n')
    SOURCE.write_text(json.dumps(source,indent=2)+'\n')

if __name__=='__main__':main()
