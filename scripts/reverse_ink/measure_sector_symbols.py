"""Fit small repeated glyph placements inside the ten wheel sectors.

Only local position, scale and rotation are fitted; glyph topology is taken
from the existing family component. Scores are diagnostic and not acceptance.
"""
import json
import cv2
import numpy as np
from scipy.ndimage import gaussian_filter
from normalize import ROOT, DATA
from fit_symbol import sample_path
from reconstruct_wheel import polar
from PIL import Image, ImageDraw


def glyph_mask(document, anchor):
    canvas=np.zeros((200,200),np.uint8)
    x,y,*_=document['spec']['patch']
    ratio=105/anchor['inner_ring_radius']
    for path in document['refined_paths']:
        points=(sample_path(path,80)+[x,y]-anchor['center'])*ratio
        polygon=np.round((points+50)*2).astype(np.int32)
        layer=np.zeros_like(canvas);cv2.fillPoly(layer,[polygon],255)
        canvas=cv2.bitwise_xor(canvas,layer)
    return canvas


def main():
    index=json.loads((ROOT/'assets/reverse-ink/sv/index.json').read_text())
    fields=np.load(DATA/'work/shared-pattern-fields.npz')
    rows={r['id']:r for r in json.loads((DATA/'review/radial/measurements.json').read_text())}
    all_results={};sheet=Image.new('RGB',(660,11*110),'white');draw=ImageDraw.Draw(sheet)
    for fi,family in enumerate(index['families']):
        name=family['id'];document=json.loads((DATA/f'review/symbols/{name}.json').read_text())
        template=glyph_mask(document,rows[document['spec']['source']])
        field=gaussian_filter(fields[name].astype(np.float32),.7)
        entries=[]
        for sector in range(10):
            phase=sector*36+18
            expected=np.array([448,598])+polar(82,phase)
            # A 51px sample gives only +/-5px translation around the predicted
            # sector center when matched against a 41px template.
            xx,yy=np.meshgrid(np.arange(51)-25+expected[0],np.arange(51)-25+expected[1])
            crop=cv2.remap(field,xx.astype('float32'),yy.astype('float32'),cv2.INTER_LINEAR)
            ty,tx=np.mgrid[:41,:41]
            window=((tx-20)**2+(ty-20)**2<=15**2).astype(np.float32)
            total=float(window.sum())
            local_sum=cv2.matchTemplate(crop,window,cv2.TM_CCORR)
            local_square=cv2.matchTemplate(crop*crop,window,cv2.TM_CCORR)
            local_variance=np.maximum(local_square-local_sum*local_sum/total,1e-6)
            best=(-np.inf,None,None)
            for scale in [.28,.32,.36,.40,.44,.48,.52]:
                for angle in range(-180,180,10):
                    theta=np.deg2rad(angle);c=np.cos(theta);s=np.sin(theta)
                    matrix=np.array([[scale*c/2,-scale*s/2,20-scale*(c-s)*50],
                                     [scale*s/2,scale*c/2,20-scale*(s+c)*50]],np.float32)
                    rendered=cv2.warpAffine(template,matrix,(41,41),flags=cv2.INTER_LINEAR).astype(np.float32)/255
                    # Small glyphs have the opposite contrast to the large
                    # central glyph in the inspected source photographs.
                    centered=(-rendered+float((rendered*window).sum())/total)*window
                    variance=max(float((centered*centered).sum()),1e-6)
                    response=cv2.matchTemplate(crop,centered,cv2.TM_CCORR)/np.sqrt(local_variance*variance)
                    _,score,_,point=cv2.minMaxLoc(response)
                    if score>best[0]:best=(score,(scale,angle,point),rendered)
            score,(scale,angle,(px,py)),rendered=best
            center=expected+np.array([px-5,py-5])
            entries.append({'sector':sector,'center':center.tolist(),'scale':scale,'rotation':angle,
                            'ncc':score,'status':'candidate-not-accepted',
                            'at_translation_bound':px in (0,10) or py in (0,10)})
            source=Image.fromarray(np.uint8(np.clip(crop*45+128,0,255))).convert('RGB').resize((60,60))
            sheet.paste(source,(60+sector*60,fi*110+25))
            draw.text((60+sector*60,fi*110+88),f'{score:.2f}',fill='black')
        draw.text((2,fi*110+7),name,fill='black')
        all_results[name]=entries
        print(name, 'median NCC', round(float(np.median([e['ncc'] for e in entries])),3),flush=True)
    out=DATA/'review/patterns'
    (out/'sector-symbol-candidates.json').write_text(json.dumps({
        'status':'review-required','method':'Local normalized correlation; seven discrete scales and 10-degree rotations.',
        'limitation':'Text, glare, symmetry and sector edges can create false matches. Do not treat scores as validation.',
        'families':all_results},indent=2)+'\n')
    sheet.save(out/'sector-evidence.png')
    # Rotational symmetries make equivalent orientations indistinguishable.
    periods={'colorless':60,'metal':120,'lightning':180,'trainer':180}
    selected=[]
    for family,entries in all_results.items():
        period=periods.get(family,360)
        for entry in entries:
            expected=entry['sector']*36-18
            delta=(entry['rotation']-expected+period/2)%period-period/2
            if entry['ncc']<=.65 or entry['at_translation_bound'] or abs(delta)>=16 or not .32<=entry['scale']<=.44:continue
            displacement=np.array(entry['center'])-[448,598]
            angle=np.rad2deg(np.arctan2(displacement[0],-displacement[1]))
            phase=(angle-(entry['sector']*36+18)+180)%360-180
            selected.append({'family':family,'sector':entry['sector'],'radius':float(np.linalg.norm(displacement)),
                             'phase':float(phase),'scale':entry['scale'],'rotation_delta':float(delta)})
    values=np.array([[r[k] for k in ['radius','phase','scale','rotation_delta']] for r in selected])
    medians=np.median(values,axis=0)
    (out/'sector-placement.json').write_text(json.dumps({
        'status':'shared-placement-candidate','sample_count':len(selected),
        'radius':float(medians[0]),'phase_degrees':float(medians[1]),'scale':float(medians[2]),
        'rotation_base_degrees':float(-18+medians[3]),'sector_step_degrees':36,
        'percentile_10_90':np.percentile(values,[10,90],axis=0).tolist(),'samples':selected,
        'limitations':'Shared rotational law is inferred from consistent matches; text-covered sectors and weak families are not independently validated. Rejected symbol geometry remains rejected.'
    },indent=2)+'\n')


if __name__=='__main__':main()
