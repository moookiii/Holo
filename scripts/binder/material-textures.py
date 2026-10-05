"""Deterministic woven nylon and clear PVC micro-normal assets (binder only)."""
from pathlib import Path
import numpy as np
from PIL import Image
out=Path('public/binder'); out.mkdir(exist_ok=True)
n=1024
y,x=np.mgrid[0:n,0:n]/n
# Interlaced rounded yarns with individual filaments; periodic at texture borders.
a=x*32; b=y*32
warp=np.sin(np.pi*(a%1))**.65
weft=np.sin(np.pi*(b%1))**.65
over=((np.floor(a)+np.floor(b))%2)==0
h=np.where(over,warp*(.62+.38*np.cos(2*np.pi*b)),weft*(.62+.38*np.cos(2*np.pi*a)))
h+=.025*np.sin(x*2*np.pi*384)+.025*np.sin(y*2*np.pi*384)
Image.fromarray(np.uint8(np.clip(.22+.65*h,0,1)*255)).save(out/'nylon-weave.png')
def normal(height,gain,name):
    dy,dx=np.gradient(height)
    v=np.stack((-dx*gain,dy*gain,np.ones_like(dx)),axis=-1)
    v/=np.linalg.norm(v,axis=-1,keepdims=True)
    Image.fromarray(np.uint8(np.round((v*.5+.5)*255))).save(out/name)
normal(h,6,'nylon-normal.png')
# Wrinkles concentrate at heat-sealed margins, with a quiet clear center.
edge=np.exp(-np.minimum.reduce([x,1-x,y,1-y])*15)
h=.004*np.sin(2*np.pi*(x*2+y))+.012*edge*np.sin(2*np.pi*(x*3+y*2)+2*np.sin(y*8))
normal(h,65,'sleeve-normal.png')

