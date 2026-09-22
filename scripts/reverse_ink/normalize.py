"""Single-resampling, full-card homographies from reviewed source-space corners."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'research/reverse-ink'

def read_source(path):
    with Image.open(path) as image:
        return np.asarray(ImageOps.exif_transpose(image).convert('RGB'))

def homography(corners, width, height):
    points = np.asarray(corners, dtype=np.float32)
    if points.shape != (4, 2) or not np.isfinite(points).all():
        raise ValueError('Expected four finite TL, TR, BR, BL corners')
    if not cv2.isContourConvex(points.astype(np.float32)) or cv2.contourArea(points, oriented=True) <= 0:
        raise ValueError('Corners must be a convex clockwise quadrilateral in image coordinates')
    return cv2.getPerspectiveTransform(points, np.float32([[0,0],[width-1,0],[width-1,height-1],[0,height-1]]))

def normalize(record, source_root, output, size):
    source = source_root / record['file']
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != record['sha256']:
        raise ValueError(f"Source changed: {record['id']}")
    rgb = read_source(source)
    if list(rgb.shape[1::-1]) != record['source_size']:
        raise ValueError(f"EXIF-oriented dimensions changed: {record['id']}")
    matrix = homography(record['corners'], *size)
    result = cv2.warpPerspective(rgb, matrix, size, flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT)
    Image.fromarray(result).save(output / f"{record['id']}.png")
    debug = Image.fromarray(rgb)
    draw = ImageDraw.Draw(debug)
    corners = [tuple(p) for p in record['corners']]
    draw.line(corners + corners[:1], fill='#ff286b', width=3)
    for label, (x,y) in zip(['TL','TR','BR','BL'],corners):
        draw.ellipse((x-6,y-6,x+6,y+6),fill='#ff286b')
        draw.text((x+8,y+8),label,fill='#ff286b',stroke_width=1,stroke_fill='white')
    debug.thumbnail((600,800))
    debug.save(output / f"{record['id']}-corners.png")
    return {'id':record['id'],'sha256':digest,'matrix':matrix.tolist(),'output_size':size,
            'source_size':record['source_size'],'corner_method':record['corner_method']}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root',type=Path,default=Path.home()/'Pictures')
    parser.add_argument('--output',type=Path,default=DATA/'normalized')
    parser.add_argument('--width',type=int,default=1512)
    args = parser.parse_args()
    if args.width < 63:
        parser.error('width must be >=63')
    size=(args.width,round(args.width*88/63))
    manifest=json.loads((DATA/'references/manifest.json').read_text())
    args.output.mkdir(parents=True,exist_ok=True)
    reports=[normalize(r,args.source_root,args.output,size) for r in manifest['references']]
    (args.output/'homographies.json').write_text(json.dumps(reports,indent=2)+'\n')
    tiles=[]
    for r in manifest['references']:
        tile=Image.new('RGB',(252,382),'#efefef')
        thumb=Image.open(args.output/f"{r['id']}.png")
        thumb.thumbnail((252,352))
        tile.paste(thumb,(0,24))
        ImageDraw.Draw(tile).text((6,5),r['id'],fill='black')
        tiles.append(tile)
    for start in range(0,len(tiles),12):
        sheet=Image.new('RGB',(252*4,382*3),'white')
        for i,tile in enumerate(tiles[start:start+12]):sheet.paste(tile,(i%4*252,i//4*382))
        sheet.save(args.output/f'contact-{start//12+1}.png')
    print(f'Normalized {len(reports)} references at {size}; exactly one warp from each original')

if __name__=='__main__':main()
