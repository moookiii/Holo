"""Spatial regressions: painted bolts, open loops, and filled optical disks."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
MAPS=ROOT/'public/cards/pokemon/gym-heroes/maps'
protected={4:[(392,235),(300,348)],6:[(110,103),(316,332),(226,168),(101,386)],
 8:[(300,108),(294,258),(183,259)],10:[(303,360),(245,305)],13:[(334,310)],
 15:[(300,370)],19:[(300,420),(470,440)]}
background={4:[(390,175)],6:[(150,140),(178,337)],8:[(295,146),(192,330),(320,373)],
 10:[(285,360)],13:[(279,345)],15:[(194,299)],19:[(224,422),(414,418)]}
registration=json.loads((ROOT/'scripts/gym-heroes/cosmos-registration.json').read_text(encoding='utf8'))
for entry in registration:
 n=int(entry['card'])
 maps={k:np.array(Image.open(MAPS/f'{n}-{k}.png').convert('L')) for k in ['foil','protection','cosmos']}
 assert all(im.shape==(1650,1200) for im in maps.values()),n
 for x,y in protected.get(n,[]):assert maps['protection'][y*2,x*2]>245,(n,x,y,'protected')
 for x,y in background.get(n,[]):assert maps['protection'][y*2,x*2]<10,(n,x,y,'background')
 for x,y in [(25,250),(300,50),(300,550),(560,400)]:
  assert maps['foil'][y*2,x*2]==0 and maps['protection'][y*2,x*2]==255,(n,x,y,'outside art')
 for dot in entry['motifs']:
  x,y=dot['center'];radius=dot['radius']
  # Subpixel antialiasing belongs only at the perimeter, never in the core.
  assert maps['cosmos'][round(y*2),round(x*2)]>245,(n,x,y,'hollow dot')
  if radius>4:
   for dx,dy in [(0,1),(0,-1),(1,0),(-1,0)]:
    assert maps['cosmos'][round((y+dy*radius*.55)*2),round((x+dx*radius*.55)*2)]>245,(n,x,y,'hollow orb')
 assert len(entry['motifs'])>150,n
print('19 masks verified: protected lightning, open gaps, artwork bounds, filled registered disks.')
