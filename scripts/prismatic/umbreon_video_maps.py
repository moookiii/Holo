"""Umbreon 161 surface reconstruction from the user-supplied tilt video only.

The existing clean front is used for registration and ink protection, never for
height extraction. Curve spacing/depth are calibrated approximations of the
visible engraving, not recovered manufacturing measurements.
"""
from pathlib import Path
import hashlib
import json
import argparse
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/prismatic-evolutions/maps'
REF = ROOT / 'research/prismatic-evolutions/umbreon-video'
W, H = 1800, 2475
S = W / 600


def polygon(points):
    im = Image.new('L', (W, H))
    ImageDraw.Draw(im).polygon([(round(x*S), round(y*S)) for x, y in points], fill=255)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32)/255


def build(video):
    OUT.mkdir(parents=True, exist_ok=True)
    REF.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video))
    references = []
    for t in [1, 4, 8, 12, 18, 20, 22]:
        cap.set(cv2.CAP_PROP_POS_MSEC, t*1000)
        ok, frame = cap.read()
        if not ok:
            raise ValueError(f'Missing video frame at {t}s')
        file = REF / f'{t:02d}s.png'
        # Lossless portrait crop; no contrast, lighting or sharpening edits.
        cv2.imwrite(str(file), frame[:, 650:1260])
        references.append(dict(file=file.name, seconds=t, sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    cap.release()
    yy, xx = np.mgrid[:H, :W].astype(np.float32)
    x, y = (xx+.5)/S, (yy+.5)/S
    inner = polygon([(23,24),(578,24),(578,803),(23,803)])
    subject = polygon([(249,236),(239,250),(248,279),(260,297),(255,348),(249,398),(246,455),
                       (256,479),(324,479),(356,462),(380,420),(404,339),(382,358),(358,391),
                       (331,390),(324,361),(307,321),(304,278),(329,299),(379,318),(356,285),
                       (330,257),(306,241),(307,229),(287,218),(269,229)])
    moon = polygon([(188,165),(239,140),(301,138),(357,153),(404,191),(430,237),
                    (420,283),(387,316),(340,341),(288,353),(236,335),(198,303),(173,263),(164,217)])
    crown = polygon([(173,164),(214,142),(261,138),(306,137),(362,153),(403,185),(438,231),
                     (432,270),(408,304),(378,307),(398,270),(405,230),(377,197),(345,190),
                     (310,203),(292,240),(267,238),(282,195),(246,182),(219,197),(202,227),
                     (197,258),(173,248),(159,216)])
    lower = polygon([(95,537),(209,520),(300,527),(384,518),(507,542),(477,651),(408,688),
                     (301,710),(192,689),(116,651)])
    # Visible moon rays, petal-following scallops and concentric lower fans.
    dx, dy = x-298, (y-235)*.94
    theta = np.arctan2(dy, dx)
    radius = np.hypot(dx, dy)
    petal_phase = radius + 8*np.sin(theta*12) + 3*np.sin(theta*24)
    lower_phase = np.hypot((x-300)*.86, (y-498)*1.05) + 5*np.sin(np.arctan2(y-498,x-300)*18)
    phase = petal_phase*(1-lower) + lower_phase*lower
    # Shallow grooves, interrupted by the smooth crystal subject and moon.
    amplitude = .68*inner*(1-.86*subject)*(1-.63*moon)*(1-.50*crown)
    relief = amplitude*np.sin(phase*2*np.pi/1.45)
    # The moon has much finer, mostly upright incisions in the close-up.
    relief = relief*(1-moon*.82) + .13*moon*(1-subject)*np.sin((x+.14*y)*2*np.pi/1.9)
    # Small engraved rosettes observed in the side and lower ornaments.
    for cx, cy, rx, ry in [(86,367,19,19),(515,367,19,19),(239,552,19,25),
                            (359,558,22,23),(78,655,20,30),(523,655,20,30)]:
        rr = np.sqrt(((x-cx)/rx)**2+((y-cy)/ry)**2)
        weight = np.clip((1.12-rr)*8,0,1)
        relief = relief*(1-weight) + .58*np.sin(rr*rx*2*np.pi/2.5)*weight
    # Protection follows only printed lettering inside manually bounded text zones.
    front = np.asarray(Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/161.png').convert('RGB').resize((W,H)), dtype=np.float32)/255
    white_ink = (front.min(axis=2)>.66) & ((front.max(axis=2)-front.min(axis=2))<.19)
    zones = np.zeros((H,W), dtype=np.float32)
    for x0,y0,x1,y1 in [(110,27,557,74),(186,479,403,514),(26,512,520,539),
                         (500,475,558,511),(181,583,287,615),(25,611,562,639),
                         (25,712,558,738),(29,753,190,799)]:
        zones[int(y0*S):int(y1*S),int(x0*S):int(x1*S)] = 1
    protection = cv2.dilate((white_ink*zones).astype(np.float32),np.ones((3,3),np.uint8))*.96
    for points in [[(107,95),(552,95),(529,135),(124,135),(103,119)],
                   [(224,740),(561,740),(581,761),(574,790),(552,799),(224,798),(205,779),(209,757)],
                   [(23,63),(75,52),(104,76),(102,123),(79,150),(35,150),(16,119)]]:
        protection = np.maximum(protection,polygon(points)*.98)
    relief *= 1-protection
    gy,gx = np.gradient(relief,1/S,1/S)
    normal = np.stack([-gx*.055, gy*.055, np.ones_like(gx)],axis=2)
    normal /= np.linalg.norm(normal,axis=2,keepdims=True)
    foil = (.90*inner + .98*(1-inner))*(1-.48*subject)*(1-.12*moon)
    rough = .35 + .07*subject + .04*moon + .13*protection + .022*np.cos(phase*2*np.pi/1.45)
    arrays = {'foil':foil,'protection':protection,'height':.5+relief*.19,
              'normal':normal*.5+.5,'roughness':rough}
    maps = {}
    for name,array in arrays.items():
        file = OUT/f'161-holo-{name}.png'
        Image.fromarray(np.rint(np.clip(array,0,1)*255).astype(np.uint8)).save(file)
        maps[file.name] = hashlib.sha256(file.read_bytes()).hexdigest()
    evidence = dict(cardId='sv08.5-161',variant='holo',status='video-guided-reconstruction',
                    rendererReady=True,textured=True,referencePolicy='Only the supplied video informs etching and holo.',
                    video=dict(file=video.name,sha256=hashlib.sha256(video.read_bytes()).hexdigest()),
                    references=references,mapSize=[W,H],maps=maps,
                    observations=['0–16s: full-face rainbow sweep, reflective rim, protected white rules panels.',
                                  '18–24s: fine curved background grooves, upright moon lines, subdued crystal subject, lower concentric ornament.'],
                    limitations='Curve spacing, groove depth and optical constants are calibrated approximations. The video does not resolve every individual manufacturing incision. Clean front is retained for print and registration only; no other surface reference is used.')
    (OUT/'161-holo-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('video',type=Path)
    build(parser.parse_args().video)
