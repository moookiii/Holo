"""Umbreon 161 surface reconstruction from the user's video and finish details.

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

# Registered to the 600 x 825 print. Keep the moon-side gap below the ear open;
# the chest and toe tips are separate parts of the actual character silhouette.
SUBJECT_POINTS = [
    (249,236),(239,250),(248,279),(252,286),(257,291),(261,294),
    (263,298),(264,302),(263.5,309),(262.5,317),(261.4,325),
    (259.9,332),(257.5,338),(255.3,345),(254,352),(252.5,359),
    (251.6,366),(250.2,373),(249.1,380),(249.1,387),(248.4,393),
    (245.3,397),(240.8,402),(236,409),(236,430),(241,444),
    (246,453),(250,466),(247,471),(243,476),(242,480),(245,483),
    (251,483),(259,478),(269,474),(284,474),(298,476),(310,475),
    (320,477),(331,479),(343,482),(355,486),(358,484),(358,480),
    (355,476),(349,472),(340,468),(349,458),(356,444),(366,434),
    (380,420),(392,380),(404,339),(382,358),(366,381),(358,391),
    (346,385),(341,373),(335,361),(329,348),(323,334),(316,320),
    (311,307),(308,294),(307,282),(311,274),(314,261),(318,269),
    (323,278),(330,286),(339,295),(349,301),(361,307),(374,312),
    (379,315),(356,285),(330,257),(306,241),
    (307,229),(287,218),(269,229),
]

# Center, short/long semiaxes and rotation in image coordinates. The lower
# medallions lean in opposite directions; an axis-aligned ellipse cannot fit.
ROSETTES = [
    (86.0,365.8,17.6,17.3,0), (512.8,365.8,17.7,17.6,0),
    (237.1,558.9,21.5,28.0,27), (358.8,558.9,21.7,28.5,-27),
    (77.3,655.4,17.8,30.1,25), (519.2,657.0,17.8,29.6,-24),
]

# Individually registered floating gems and crown shards. The clear moon gaps
# between jewels are deliberately absent from this secondary material mask.
GEM_POLYGONS = [
    [(159,186),(169,169),(176,162),(185,165),(185,188),(174,200),(160,195)],
    [(185,159),(200,144),(219,151),(233,156),(225,179),(210,190),(192,183),(181,177)],
    [(233,148),(253,137),(269,146),(269,168),(251,185),(230,176),(227,169)],
    [(288,147),(309,139),(328,153),(323,176),(301,187),(286,173)],
    [(345,160),(367,154),(382,173),(378,193),(354,199),(338,182)],
    [(390,184),(409,177),(421,199),(417,219),(400,224),(386,205)],
    [(421,204),(433,204),(442,220),(441,237),(429,246),(420,241),(416,220)],
    [(433,246),(436,260),(435,267),(427,265),(425,251)],
    [(417,248),(429,247),(428,277),(424,284),(415,291),(407,283),(410,264)],
    [(400,260),(411,268),(416,282),(404,300),(394,307),(383,293),(384,276)],
    [(369,268),(381,281),(375,298),(363,305),(351,292),(352,279)],
    [(319,274),(329,285),(341,297),(322,308),(310,295),(313,282)],
    [(211,245),(225,240),(237,254),(233,271),(216,279),(205,266)],
    [(179,229),(197,224),(204,238),(200,254),(185,260),(176,248),(176,237)],
    [(164,201),(178,207),(180,222),(177,236),(173,242),(160,235),(159,219)],
    [(159,193),(171,199),(169,219),(164,223),(155,219),(154,207)],
    # Crown base and the separate crystal points rising into the moon.
    [(255,179),(269,193),(266,171),(276,196),(284,187),(291,185),
     (300,198),(316,188),(329,176),(321,198),(335,195),(332,209),
     (349,206),(326,224),(349,220),(329,232),(328,239),(315,246),
     (306,236),(291,228),(278,230),(266,235),(251,235),(260,225),
     (255,229),(255,213),(266,207)],
    [(245,234),(262,229),(275,216),(287,214),(299,222),(311,224),(312,238),
     (300,231),(290,227),(280,231),(271,233),(260,234)],
    [(257,215),(268,207),(268,218),(260,225),(255,229)],
    [(270,207),(276,200),(277,214),(270,222)],
    [(280,222),(287,211),(293,209),(291,222),(286,228)],
    [(296,221),(307,213),(305,229),(298,235)],
    [(308,230),(316,217),(316,232),(310,241)],
    [(316,235),(326,228),(324,239),(316,245)],
    [(273,196),(268,181),(280,192),(281,202)],
    [(293,199),(290,182),(303,188),(308,182),(308,196),(299,203)],
    [(313,205),(322,186),(330,181),(328,199)],
    [(319,218),(335,209),(347,207),(333,217)],
    [(320,231),(338,225),(347,220),(340,230)],
]


def ellipse_radius(x, y, spec):
    cx, cy, rx, ry, degrees = spec
    angle = np.deg2rad(degrees)
    dx, dy = x-cx, y-cy
    u = dx*np.cos(angle) + dy*np.sin(angle)
    v = -dx*np.sin(angle) + dy*np.cos(angle)
    return np.hypot(u/rx, v/ry)


def polygon(points):
    im = Image.new('L', (W, H))
    ImageDraw.Draw(im).polygon([(round(x*S), round(y*S)) for x, y in points], fill=255)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32)/255


def body_texture(x, y):
    """Estimated shallow embossed dimples, evaluated before silhouette clipping.

    Rounded manufactured geometry; neither print brightness nor noise is used
    as height. Spacing/depth are visual estimates from the three body close-ups.
    """
    pitch = 1.35
    row = np.floor(y/pitch)
    u = x/pitch + .5*(row % 2)
    col = np.floor(u)
    a = u-col-.5-.17*np.sin(row*1.7+col*2.3)
    b = y/pitch-row-.5-.15*np.sin(col*1.3-row*2.1)
    radius = np.sqrt((a/.46)**2+(b/.39)**2)
    return -2.3*np.maximum(0,1-radius*radius)**2


def build(video=None):
    OUT.mkdir(parents=True, exist_ok=True)
    REF.mkdir(parents=True, exist_ok=True)
    if video is None:
        previous = json.loads((OUT/'161-holo-evidence.json').read_text(encoding='utf8'))
        video_evidence = previous['video']
        references = previous['references']
    else:
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
        video_evidence = dict(file=video.name,sha256=hashlib.sha256(video.read_bytes()).hexdigest())
    yy, xx = np.mgrid[:H, :W].astype(np.float32)
    x, y = (xx+.5)/S, (yy+.5)/S
    inner = polygon([(23,24),(578,24),(578,803),(23,803)])
    subject = polygon(SUBJECT_POINTS)
    gems = np.maximum.reduce([polygon(points) for points in GEM_POLYGONS])
    gems *= 1-subject  # A hanging jewel passes behind the ear.
    moon = polygon([(188,165),(239,140),(301,138),(357,153),(404,191),(430,237),
                    (420,283),(387,316),(340,341),(288,353),(236,335),(198,303),(173,263),(164,217)])
    crown = polygon([(173,164),(214,142),(261,138),(306,137),(362,153),(403,185),(438,231),
                     (432,270),(408,304),(378,307),(398,270),(405,230),(377,197),(345,190),
                     (310,203),(292,240),(267,238),(282,195),(246,182),(219,197),(202,227),
                     (197,258),(173,248),(159,216)])
    # One continuous phase carries the curved engraving through the lower fan.
    # Switching to a second center at its boundary left a foil-free-looking arc.
    dx, dy = x-298, (y-235)*.94
    theta = np.arctan2(dy, dx)
    radius = np.hypot(dx, dy)
    # Keep the scallop influence below the radial slope. Larger angular offsets
    # cancel the radial gradient in two sectors and form long, flat stretch bands.
    petal_phase = radius + np.sin(theta*12) + .3*np.sin(theta*24)
    phase = petal_phase
    # Shallow grooves, interrupted by the smooth crystal subject and moon.
    amplitude = .84*inner*(1-.86*subject)*(1-.63*moon)*(1-.50*crown)
    relief = amplitude*np.sin(phase*2*np.pi/1.45)
    # The moon has much finer, mostly upright incisions in the close-up.
    relief = relief*(1-moon*.82) + .13*moon*(1-subject)*np.sin((x+.14*y)*2*np.pi/1.9)
    # Small engraved rosettes observed in the side and lower ornaments.
    rough_wave = np.cos(phase*2*np.pi/1.45)
    for spec in ROSETTES:
        rr = ellipse_radius(x, y, spec)
        # Feather inward at the printed gold perimeter, without a circular halo
        # outside the ornament. Roughness and normals share the same ring phase.
        weight = np.clip((1-rr)/.075,0,1)
        weight = weight*weight*(3-2*weight)
        ring_phase = rr*spec[2]*2*np.pi/1.45
        relief = relief*(1-weight) + .58*np.sin(ring_phase)*weight
        rough_wave = rough_wave*(1-weight) + np.cos(ring_phase)*weight
    # Continuous fine curved engraving across all four border strips, including
    # corners. Only the rim receives this field; no discontinuous side tiles.
    edge = 1-inner
    edge_phase = .56*x + .34*y + 8*np.sin(.044*y+.018*x) + 4*np.cos(.061*x-.023*y)
    edge_wave = edge_phase*2*np.pi/1.35
    relief = relief*inner + .48*np.sin(edge_wave)*edge
    rough_wave = rough_wave*inner + np.cos(edge_wave)*edge
    # Protection follows only printed lettering inside manually bounded text zones.
    front = np.asarray(Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/161.png').convert('RGB').resize((W,H)), dtype=np.float32)/255
    white_ink = (front.min(axis=2)>.66) & ((front.max(axis=2)-front.min(axis=2))<.19)
    zones = np.zeros((H,W), dtype=np.float32)
    for x0,y0,x1,y1 in [(110,27,578,74),(186,479,403,514),(26,512,520,539),
                         (500,475,558,511),(181,574,287,615),(25,611,562,639),
                         (25,712,558,738),(29,753,190,799),
                         (176,774,201,800)]:  # Both collector stars, including the right tip.
        zones[int(y0*S):int(y1*S),int(x0*S):int(x1*S)] = 1
    protection = cv2.dilate((white_ink*zones).astype(np.float32),np.ones((3,3),np.uint8))*.96
    for points in [[(107,95),(552,95),(529,135),(124,135),(103,119)],
                   [(224,740),(561,740),(581,761),(574,790),(552,799),(224,798),(205,779),(209,757)],
                   [(23,63),(75,52),(104,76),(102,123),(79,150),(35,150),(16,119)],
                   # The collector stars have gold centers that the white-ink
                   # threshold misses; trace each opaque printed shape.
                   [(173,776),(176,782),(182,782),(178,787),(179,793),
                    (173,790),(167,793),(168,788),(163,784),(170,783)],
                   [(187,780),(190,786),(195,788),(191,792),(192,797),
                    (186,794),(181,796),(182,791),(178,788),(184,786)]]:
        protection = np.maximum(protection,polygon(points)*.98)
    # Differentiate physical grooves before applying opaque ink. Differentiating
    # the protection mask would introduce a false raised/dark rim around letters.
    gy,gx = np.gradient(relief,1/S,1/S)
    body_relief = body_texture(x,y)
    by,bx = np.gradient(body_relief,1/S,1/S)
    body = subject*(1-gems)
    gx = gx*(1-body)+bx*body
    gy = gy*(1-body)+by*body
    relief = relief*(1-body)+body_relief*body
    gx *= (1-protection)*(1-gems)
    gy *= (1-protection)*(1-gems)
    relief *= (1-protection)*(1-gems)
    normal = np.stack([-gx*.065, gy*.065, np.ones_like(gx)],axis=2)
    normal /= np.linalg.norm(normal,axis=2,keepdims=True)
    foil = (.90*inner + .98*(1-inner))*(1-.48*subject)*(1-.12*moon)
    rough = .35 + .07*subject + .04*moon + .13*protection + .022*rough_wave*(1-protection)
    rough = rough*(1-gems) + .27*gems
    arrays = {'foil':foil,'protection':protection,'height':.5+relief*.19,
              'normal':normal*.5+.5,'roughness':rough,'secondary-foil':gems,
              'body':subject*(1-gems)}
    maps = {}
    for name,array in arrays.items():
        file = OUT/f'161-holo-{name}.png'
        temporary = file.with_name(f'{file.stem}.tmp.png')
        Image.fromarray(np.rint(np.clip(array,0,1)*255).astype(np.uint8)).save(temporary)
        temporary.replace(file)
        maps[file.name] = hashlib.sha256(file.read_bytes()).hexdigest()
    evidence = dict(cardId='sv08.5-161',variant='holo',status='video-guided-reconstruction',
                    rendererReady=True,textured=True,referencePolicy='Original video guides the body and ornament. User-supplied crown/gem and edge detail images guide the added microdiamond and rim finishes.',
                    video=video_evidence,
                    references=references,mapSize=[W,H],maps=maps,
                    bodyReferences=[dict(file=name,sha256=hashlib.sha256((REF/name).read_bytes()).hexdigest(),role=role)
                                    for name,role in [('body-bright.png','User close-up: fine body texture in bright light'),
                                                      ('body-medium.png','User close-up: intermediate body texture response'),
                                                      ('body-dark.png','User close-up: subdued body texture in low light')]],
                    finishReferences=[dict(file=name,sha256=hashlib.sha256((REF/name).read_bytes()).hexdigest(),role=role)
                                      for name,role in [('microdiamond-reference.png','User-authorized shared crown and gem finish from another card'),
                                                        ('edge-reference.png','User-authorized Prismatic edge etching detail'),
                                                        ('microdiamond-closeup-reference.png','Later user close-up: short square flashes rather than uniform grain')]],
                    registrationCorrections='User annotations: filled right chest and toe-tip silhouette gaps; tightened the left neck/chest boundary to restore the adjacent background etching; fitted all six medallions with registered rotated ellipses; extended Onyx ink protection above the O; completed the top energy icon and both collector stars; removed mask-induced normal edges.',
                    observations=['0–16s: full-face rainbow sweep, reflective rim, protected white rules panels.',
                                  '18–24s: fine curved background grooves, upright moon lines, subdued crystal subject, lower concentric ornament.'],
                    limitations='Curve spacing, groove depth and optical constants are calibrated approximations. The video does not resolve every individual manufacturing incision. Clean front is retained for print and registration only. The two later user-supplied detail images inform only the added crown/gem and rim finishes.')
    (OUT/'161-holo-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('video',type=Path,nargs='?',help='Original video; omit to reuse recorded evidence and reference frames')
    build(parser.parse_args().video)
