"""Refine hand-authored cubic paths against a specified real reference patch.

An explicit low-point-count tracing is required. Photographic edges can move
the tracing only within its author-specified search distance. This is not a
general-purpose auto-tracer: topology, curves, holes and source choice remain
reviewed data. It emits review overlays and reusable monochrome SVG geometry.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
from scipy.optimize import least_squares
from PIL import Image, ImageDraw
from normalize import ROOT, DATA

def sample_path(path, samples=24):
    start=np.array(path['start'],dtype=float); chunks=[]
    t=np.linspace(0,1,samples,endpoint=False)[:,None]
    for segment in path['curves']:
        c1,c2,end=np.asarray(segment,dtype=float)
        chunks.append((1-t)**3*start+3*(1-t)**2*t*c1+3*(1-t)*t*t*c2+t**3*end)
        start=end
    return np.concatenate(chunks)

def unpack(values, template):
    curves=values[2:].reshape((-1,3,2)).copy()
    curves[-1,2]=values[:2]  # enforce exact closure, no near-coincident seam
    return {'start':values[:2].tolist(),'curves':curves.tolist()}

def refine(path, luminance, scale, search):
    initial=np.r_[path['start'],np.asarray(path['curves']).ravel()].astype(float)
    points=sample_path(path)
    tangent=np.roll(points,-1,axis=0)-np.roll(points,1,axis=0)
    normals=np.c_[-tangent[:,1],tangent[:,0]]
    normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],.001)
    offsets=np.linspace(-search,search,41)
    # Search along each authored normal, away from unrelated distant print.
    sample=points[:,None,:]+offsets[None,:,None]*normals[:,None,:]
    outside=sample+normals[:,None,:]*.65
    inside=sample-normals[:,None,:]*.65
    def read(coords):
        return cv2.remap(luminance,(coords[:,:,0]*scale).astype(np.float32),
                        (coords[:,:,1]*scale).astype(np.float32),cv2.INTER_LINEAR)
    edges=abs(read(outside)-read(inside))
    # Favor the authored edge when gradients are indistinguishable.
    edges-=abs(offsets)[None,:]*.0008
    indices=edges.argmax(axis=1)
    targets=sample[np.arange(len(points)),indices]
    strength=edges[np.arange(len(points)),indices]
    weights=np.clip(strength/(np.median(strength)+1e-6),.15,2)
    def residual(values):
        current=unpack(values,path)
        fitted=sample_path(current)
        # Point-to-normal residual permits tangential redistribution of controls.
        distance=np.sum((fitted-targets)*normals,axis=1)
        joins=[]
        curves=np.array(current['curves'])
        for i in range(len(curves)-1):
            incoming=curves[i,2]-curves[i,1]
            outgoing=curves[i+1,0]-curves[i,2]
            # Collinear, forward-facing tangents keep authored smooth joins
            # smooth. The start/closure may be an intentional sharp tip.
            denominator=max(np.linalg.norm(incoming)+np.linalg.norm(outgoing),.001)
            joins.extend([(incoming[0]*outgoing[1]-incoming[1]*outgoing[0])/denominator*6,
                          min(float(incoming@outgoing),0)/denominator*6])
        return np.r_[distance*np.sqrt(weights),(values-initial)*.06,joins]
    result=least_squares(residual,initial,bounds=(initial-search,initial+search),loss='soft_l1',f_scale=.6,max_nfev=200)
    refined=unpack(result.x,path)
    distances=np.linalg.norm(sample_path(refined)-targets,axis=1)
    return refined,dict(median_target_distance=float(np.median(distances)),
                       p95_target_distance=float(np.percentile(distances,95)),
                       boundary_search_units=search,curve_count=len(path['curves']),
                       warning='Fit residual describes the selected photo edges, not held-out reconstruction accuracy.')

def svg_path(path):
    fmt=lambda p:' '.join(f'{v:.4f}' for v in p)
    return 'M '+fmt(path['start'])+' '+' '.join('C '+fmt(np.array(c).ravel()) for c in path['curves'])+' Z'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('spec',type=Path)
    args=parser.parse_args()
    spec=json.loads(args.spec.read_text())
    source=Image.open(DATA/'normalized'/f"{spec['source']}.png").convert('RGB')
    scale=source.width/630
    x,y,w,h=spec['patch']
    crop=source.crop(tuple(round(v*scale) for v in (x,y,x+w,y+h)))
    rgb=np.array(crop,dtype=np.float32)/255
    lum=cv2.GaussianBlur(rgb @ np.float32([.2126,.7152,.0722]),(0,0),.8)
    paths=[];metrics=[]
    for path in spec['paths']:
        refined,metric=refine(path,lum,scale,spec.get('search_distance',2))
        paths.append(refined);metrics.append(metric)
    out=DATA/'review/symbols';out.mkdir(parents=True,exist_ok=True)
    preview=crop.resize((round(w*6),round(h*6)),Image.Resampling.LANCZOS)
    draw=ImageDraw.Draw(preview)
    for path in paths:
        points=sample_path(path,80)*6
        draw.line([tuple(p) for p in points]+[tuple(points[0])],fill='#ff2969',width=2)
    preview.save(out/f"{spec['family']}-fit.png")
    document=dict(spec=spec,refined_paths=paths,metrics=metrics,status='component-needs-multiple-reference-review')
    (out/f"{spec['family']}.json").write_text(json.dumps(document,indent=2)+'\n')
    assets=ROOT/'assets/reverse-ink/sv/components';assets.mkdir(parents=True,exist_ok=True)
    content=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">\n'
             f'<title>{spec["family"]} symbol geometry — source-derived component</title>\n'
             '<desc>Monochrome geometry only. Positive glyph silhouette, not pigment polarity. '
             'Not a complete family master. See research/reverse-ink/review/symbols for provenance and review status.</desc>\n'
             f'<path fill="currentColor" fill-rule="evenodd" d="{" ".join(svg_path(p) for p in paths)}"/>\n</svg>\n')
    (assets/f"{spec['family']}-symbol.svg").write_text(content)
    print(json.dumps(metrics,indent=2))

if __name__=='__main__':main()
