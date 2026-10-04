"""Propose physical bounds for the black-backed collector scans.
Writes overlays/previews for visual review. --apply-bounds records reviewed
coordinates only; pipeline.py --apply publishes normalized fronts afterward.
"""
import argparse
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw
from pipeline import ROOT, INPUT, normalize, write_json


def physical_quad(image):
    gray = cv2.GaussianBlur(cv2.cvtColor(np.array(image),cv2.COLOR_RGB2GRAY),(5,5),0)
    lines = []
    for horizontal,reverse in [(True,False),(False,True),(True,True),(False,False)]:
        dim = image.width if horizontal else image.height
        points = []
        for fixed in np.linspace(dim*.18,dim*.82,200).astype(int):
            scan = gray[:,fixed] if horizontal else gray[fixed,:]
            foreground = scan>40
            # Reject isolated bright backing texture; a physical card edge
            # continues inward for several pixels.
            supported = np.convolve(foreground.astype(int),np.ones(5,dtype=int),'valid')>=5
            hits = np.flatnonzero(supported)
            if not len(hits): continue
            edge = hits[-1]+4 if reverse else hits[0]
            length = len(scan)
            if (edge if not reverse else length-1-edge)>length*.06:
                continue
            points.append([fixed,edge] if horizontal else [edge,fixed])
        if len(points)<60: raise ValueError('Not enough clear physical edge crossings')
        vx,vy,x,y = cv2.fitLine(np.array(points,dtype='float32'),cv2.DIST_HUBER,0,.01,.01).ravel()
        lines.append((np.array([x,y]),np.array([vx,vy])))
    corners = []
    for i in range(4):
        a,v = lines[(i-1)%4]; b,u = lines[i]
        t = np.linalg.solve(np.stack([v,-u],axis=1),b-a)[0]
        corners.append(a+t*v)
    q = np.array(corners)
    # Subpixel antialiasing can put the estimated edge on the dark backdrop.
    # One native pixel inset retains the printed gray border and rounded corners.
    center = q.mean(axis=0)
    q = center+(q-center)*(1-2/min(image.size))
    q[:,0] = np.clip(q[:,0],0,image.width-1)
    q[:,1] = np.clip(q[:,1],0,image.height-1)
    return q.round(2).tolist()


def run(apply=False):
    manifest = json.loads(INPUT.read_text(encoding='utf-8'))
    out = ROOT/'artifacts/lob-fronts/bounds'
    out.mkdir(parents=True,exist_ok=True)
    previews = []
    for candidate in manifest['candidates']:
        if not candidate['id'].endswith('ebay-326121140629') or candidate.get('normalization'):
            continue
        image = Image.open(ROOT/candidate['originalPath']).convert('RGB')
        try:
            q = physical_quad(image)
        except ValueError as e:
            raise ValueError(candidate['setCode']+': '+str(e)) from e
        spec = {'quad':q,'note':'Physical gray card edges fitted against dark scan backing; one native pixel inset removes background antialiasing. Original bytes retained; no sharpening, fill or upscaling.'}
        proposal = {**candidate,'normalization':spec}
        normalized = normalize(image,proposal)
        overlay = image.copy()
        ImageDraw.Draw(overlay).line([tuple(p) for p in q]+[tuple(q[0])],fill='#ff00a0',width=2)
        overlay.save(out/f"{candidate['setCode']}-bounds.png")
        if candidate['setCode'] == 'LOB-116': normalized.save(out/'LOB-116-preview.png')
        previews.append((candidate['setCode'],normalized))
        if apply:
            candidate['normalization'] = spec
            candidate['review']['evidence'] += ' Black-backed physical bounds reviewed against colored overlays and normalized fronts.'
    for offset in range(0,len(previews),24):
        sheet = Image.new('RGB',(1440,1500),'#15191f')
        draw = ImageDraw.Draw(sheet)
        for j,(number,image) in enumerate(previews[offset:offset+24]):
            image = image.copy();image.thumbnail((230,335));x=(j%6)*240;y=(j//6)*375
            sheet.paste(image,(x,y+30));draw.text((x+4,y+4),number,fill='white')
        sheet.save(out/f'review-{offset//24}.png')
    if apply: write_json(INPUT,manifest)
    print('Physical-bound proposals:',len(previews),'recorded' if apply else 'review only')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--apply-bounds',action='store_true')
    run(p.parse_args().apply_bounds)
