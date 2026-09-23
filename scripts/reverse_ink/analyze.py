"""Exploratory cross-reference evidence; candidates are NOT master assets.

Only the exposed lower field is used. These rasters are contrast diagnostics,
not foreground protection maps and not suitable for runtime card compositing.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
from normalize import DATA

def contrast(rgb):
    # Work in floating point luminance. Broad illumination removal is diagnostic:
    # it cannot measure pigment reflectance or infer geometry under foreground.
    linear=np.where(rgb/255 <= .04045, rgb/255/12.92, ((rgb/255+.055)/1.055)**2.4)
    lum=linear @ np.array([.2126,.7152,.0722])
    lum=cv2.GaussianBlur(lum.astype(np.float32),(0,0),.9)
    log=np.log(np.maximum(lum,.001))
    residual=log-cv2.GaussianBlur(log,(0,0),40)
    scale=cv2.GaussianBlur(abs(residual),(0,0),30)
    return np.clip(residual/np.maximum(scale,.025),-3,3)

def main():
    records=json.loads((DATA/'references/manifest.json').read_text())['references']
    work=DATA/'work';work.mkdir(exist_ok=True)
    fields={}
    for r in records:
        if r['role']!='reverse-reference':continue
        rgb=np.array(Image.open(DATA/'normalized'/f"{r['id']}.png").resize((630,880),Image.Resampling.LANCZOS))
        field=contrast(rgb)
        fields[r['id']]=field
        Image.fromarray(np.uint8(np.clip(field*50+128,0,255))).save(work/f"{r['id']}-contrast.png")
    family_fields={}
    for family in sorted(set(r['family'] for r in records)):
        selected=[fields[r['id']] for r in records if r['family']==family and r['id'] in fields]
        stack=np.stack(selected)
        result=np.median(stack,axis=0)
        family_fields[family]=result
        # Keep only the analysis field; the rest of a card has unrelated print.
        Image.fromarray(np.uint8(result[440:750,:]*40+128)).save(work/f'{family}-consensus.png')
        Image.fromarray(np.uint8(result[440:750,:]>0)*255).save(work/f'{family}-candidate.png')
    common=np.median(np.stack(list(family_fields.values())),axis=0)
    Image.fromarray(np.uint8(common[440:750,:]>0)*255).save(work/'common-candidate.png')
    np.savez_compressed(work/'contrast-fields.npz',**fields)
    print('Wrote contrast diagnostics; photometric thresholding is not an approved geometry reconstruction')

if __name__=='__main__':main()
