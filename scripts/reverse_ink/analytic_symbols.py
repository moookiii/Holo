"""Measured circular glyph models, expressed with sparse cubic circular arcs."""
import math
import numpy as np

def arc(center,r,start,sweep,pieces):
    center=np.asarray(center,dtype=float);curves=[]
    for a,b in zip(np.linspace(start,start+sweep,pieces+1)[:-1],np.linspace(start,start+sweep,pieces+1)[1:]):
        p=center+r*np.array([math.cos(a),math.sin(a)])
        q=center+r*np.array([math.cos(b),math.sin(b)])
        k=4/3*math.tan((b-a)/4)*r
        c1=p+k*np.array([-math.sin(a),math.cos(a)])
        c2=q-k*np.array([-math.sin(b),math.cos(b)])
        curves.append([c1.tolist(),c2.tolist(),q.tolist()])
    return {'start':(center+r*np.array([math.cos(start),math.sin(start)])).tolist(),'curves':curves}

def line_to(path,point):
    start=np.asarray(path['curves'][-1][2]);end=np.asarray(point)
    path['curves'].append([(start+(end-start)/3).tolist(),(start+2*(end-start)/3).tolist(),end.tolist()])

def trainer(values):
    cx,cy,r,ring_outer,ring_inner,dot,angle,half_width=values
    center=[cx,cy];angle=math.radians(angle);paths=[]
    for side in [0,math.pi]:
        outer_delta=math.asin(half_width/r)
        inner_delta=math.asin(half_width/ring_outer)
        outer=arc(center,r,angle+side+outer_delta,math.pi-2*outer_delta,2)
        inner=arc(center,ring_outer,angle+side+math.pi-inner_delta,-math.pi+2*inner_delta,2)
        line_to(outer,inner['start']);outer['curves'].extend(inner['curves']);line_to(outer,outer['start'])
        paths.append(outer)
    paths.extend([arc(center,ring_inner,0,2*math.pi,4),arc(center,dot,0,2*math.pi,4)])
    return paths

MODELS={'trainer':trainer}
