"""Overlay a reconstructed glyph on every same-family reference.

Uses only the independently fitted radial center and radius for registration;
there is no per-symbol alignment optimized to make the comparison look better.
"""
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from normalize import DATA
from fit_symbol import sample_path

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('family')
    args=parser.parse_args()
    out=DATA/'review/symbols'
    data=json.loads((out/f'{args.family}.json').read_text())
    spec=data['spec']; x,y,w,h=spec['patch']
    manifest=json.loads((DATA/'references/manifest.json').read_text())
    rows={r['id']:r for r in json.loads((DATA/'review/radial/measurements.json').read_text())}
    anchor=rows[spec['source']]
    selected=[r for r in manifest['references'] if r['family']==args.family and r['role']=='reverse-reference']
    sheet=Image.new('RGB',(540*len(selected),580),'white');draw=ImageDraw.Draw(sheet)
    for i,record in enumerate(selected):
        row=rows[record['id']]; cx,cy=row['center'];ratio=row['inner_ring_radius']/anchor['inner_ring_radius']
        original=Image.open(DATA/'normalized'/f"{record['id']}.png")
        scale=original.width/630
        crop=original.crop(tuple(round(v*scale) for v in (cx-45,cy-45,cx+45,cy+45))).resize((540,540),Image.Resampling.LANCZOS)
        sheet.paste(crop,(i*540,30))
        draw.text((i*540+5,8),f"{record['id']} | independent ring registration",fill='black')
        for path in data['refined_paths']:
            points=(sample_path(path,80)+[x,y]-anchor['center'])*ratio
            points=(points+[45,45])*6+[i*540,30]
            draw.line([tuple(p) for p in points]+[tuple(points[0])],fill='#ff286b',width=2)
    sheet.save(out/f'{args.family}-comparison.png')
    print(f'Compared {args.family} against {len(selected)} independent references')

if __name__=='__main__':main()
