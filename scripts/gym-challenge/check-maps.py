"""Spatial regressions: painted bolts, open loops, and filled optical disks."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
MAPS=ROOT/'public/cards/pokemon/gym-challenge/maps'
protected={6:[(300,280),(300,350),(460,320)],11:[(250,250),(450,175),(160,380)],
 8:[(475,270)],14:[(300,300)],16:[(245,245),(495,205)],17:[(300,370)],20:[(325,400)]}
background={6:[(93,330),(190,400)],11:[(110,250),(410,240)],8:[(400,180)],
 14:[(400,330)],16:[(350,240),(160,350)],17:[(189,330)],20:[(440,270)]}
registration=json.loads((ROOT/'scripts/gym-challenge/cosmos-registration.json').read_text(encoding='utf8'))
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
 assert len(entry['motifs'])>0,n
print('20 masks verified: protected lightning, open gaps, artwork bounds, filled registered disks.')
