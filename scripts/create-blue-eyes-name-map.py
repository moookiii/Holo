"""Registered optical data only. The selected raster front is never rewritten."""
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1] / 'public/cards/blue-eyes'
front = Image.open(root / 'front.png').convert('RGB')
name = Image.new('L', front.size)
coverage = Image.new('RGB', front.size)
details = Image.new('L', front.size)
draw = ImageDraw.Draw(details)
sx, sy = front.width/1312, front.height/1911
# SDK reference: eye, teeth and claws expose foil as well as the background.
# Polygons are bounded to each printed detail; brightness preserves their edges.
for vertices in [
    [(520,640),(524,605),(547,588),(576,591),(584,611),(567,636)],
    [(347,777),(601,687),(614,713),(525,743),(420,805)],
    [(504,847),(533,810),(546,774),(548,733),(625,705),(631,727),(530,872)],
    [(452,1046),(468,1004),(489,979),(523,975),(496,1020),(457,1084)],
    [(513,1070),(531,1035),(550,1016),(576,1014),(552,1055),(526,1116)],
    [(560,1104),(575,1044),(604,1025),(629,1025),(604,1081),(570,1130)],
    [(234,1309),(245,1266),(277,1231),(305,1230),(288,1268),(255,1286)],
    [(255,1335),(270,1286),(313,1241),(341,1240),(323,1284),(291,1302)],
    [(300,1342),(315,1301),(346,1276),(373,1273),(377,1285),(336,1319)],
    [(566,1318),(587,1290),(617,1271),(637,1270),(631,1290)],
    [(766,1314),(791,1303),(822,1312),(852,1345),(817,1337)],
    [(839,1293),(873,1298),(901,1318),(917,1338),(885,1330)],
    [(1067,951),(1082,931),(1094,941),(1091,974),(1077,1014),(1080,976)]
]:
    draw.polygon([(round(x*sx),round(y*sy)) for x,y in vertices], fill=255)
def smooth(a, b, x):
    t = max(0, min(1, (x-a)/(b-a)))
    return t*t*(3-2*t)
for y in range(front.height):
    for x in range(front.width):
        r, g, b = front.getpixel((x, y))
        px, py = x/sx, y/sy
        if 102 <= px < 1086 and 110 <= py < 195:
            # Dark name ink, excluding the panel and its bevel.
            name.putpixel((x, y), round((1-smooth(90, 160, max(r,g,b))) * 255))
        if 167 <= px < 1161 and 352 <= py < 1344:
            # White paint and cyan dragon ink cover the metallic backing more
            # strongly than the dark violet background. Soft classification
            # preserves antialiasing, instead of imposing a polygonal light spot.
            white = smooth(120, 205, min(r,g,b))
            cyan = smooth(5, 24, g-r)
            opacity = max(white, cyan)
            foil = .62 * (1-opacity) + .008
            if details.getpixel((x,y)):
                detail_ink = smooth(110,195,min(r,g,b))
                if 520 <= px < 585 and 585 <= py < 641:
                    detail_ink = .8
                foil = max(foil,detail_ink*.97)
            coverage.putpixel((x, y), (round(foil*255), 0, 0))
name.save(root / 'name.png')
coverage.save(root / 'coverage.png')
