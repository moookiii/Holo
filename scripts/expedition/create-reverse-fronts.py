"""Use matching non-holo Expedition artwork in the exact-number reverse frames.

Untouched numbered scans remain N.png. Only the illustration window changes.
No generated art, inpainting, or removal of scanned foil by image filtering.
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'public/cards/pokemon/expedition'
REVIEW = ROOT / 'artifacts/expedition/clean-reverses'
REVIEW.mkdir(parents=True, exist_ok=True)
cards = json.loads((BASE/'catalog.json').read_text())['cards']
checklist = json.loads((ROOT/'scripts/expedition/checklist-independent.json').read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
cv2.setNumThreads(2)
sift = cv2.SIFT_create(nfeatures=5000)
records = []
for n in range(1,33):
    card = cards[n-1]
    matches = [c for c in cards[32:70] if c['name']==card['name'] and c.get('illustrator')==card.get('illustrator')]
    assert len(matches)==1, (n,matches)
    donor = int(matches[0]['localId'])
    assert card['rarity'] == 'Holo Rare'
    assert matches[0]['rarity'] == 'Rare' and matches[0]['variants']['holo'] is False
    independent = [c for c in checklist if c['id'] == matches[0]['id']][0]
    assert independent['name'] == card['name'] and independent['artist'] == card['illustrator']
    original = np.array(Image.open(BASE/f'{n}.png').convert('RGB'))
    source = np.array(Image.open(BASE/f'{donor}.png').convert('RGB'))
    window = np.array(Image.open(BASE/f'maps/{n}-holo-window.png').convert('L'))
    # Foil coverage can exclude pale printed art touching the frame. A clean
    # reconstruction replaces the complete illustration, not just foil pixels.
    target_gradient = np.linalg.norm(np.diff(original.astype(float),axis=0),axis=2)
    clean_top = 95 + int(np.argmax(target_gradient[94:106,180:430].mean(axis=1)))
    clean_bottom = 389 + int(np.argmax(target_gradient[388:408,200:560].mean(axis=1))) - 1
    original_hsv = cv2.cvtColor(original,cv2.COLOR_RGB2HSV)
    yellow_ink = (original_hsv[:,:,0]>=14)&(original_hsv[:,:,0]<=39)&(original_hsv[:,:,1]>=85)&(original_hsv[:,:,2]>=110)
    ribbon_rows = np.flatnonzero(yellow_ink[96:109,470:577].mean(axis=1)>.60)
    assert len(ribbon_rows), (n,'missing stage ribbon')
    clean_label_top = max(clean_top,97 + int(ribbon_rows[-1]))
    for x in range(150,580):
        top = clean_top if x < 445 else clean_label_top
        window[80:top,x] = 0; window[top:125,x] = 255
        if x >= 190:
            window[375:clean_bottom+1,x] = 255; window[clean_bottom+1:420,x] = 0
    # Preserve each printed glyph, including the g descender past the ribbon.
    # Limit extension to the letter's own column and two raster rows below the
    # opaque band so the surrounding scanned foil is still replaced.
    glyph_protection = np.zeros_like(window)
    glyph_protection[85:clean_label_top,445:580] = 255
    letter = original[clean_label_top:clean_label_top+3,476:496]
    dark = (letter.mean(axis=2)<155)&((letter.max(axis=2).astype(int)-letter.min(axis=2))<90)
    glyph_protection[clean_label_top:clean_label_top+3,476:496] = dark.astype('uint8')*255
    window[glyph_protection>0] = 0
    Image.fromarray(glyph_protection).save(BASE/f'maps/{n}-stage-print-protection.png')
    Image.fromarray(window).save(BASE/f'maps/{n}-clean-art-window.png')
    # Fit the same printed subject, which is not scanned foil. A similarity fit
    # allows only uniform scale, rotation and translation, never perspective warp.
    subject = np.array(Image.open(BASE/f'maps/{n}-holo-protection.png').convert('L'))
    target_features = cv2.bitwise_and(window,subject)
    source_features = np.zeros_like(window); source_features[100:400,60:580]=255
    kt,dt = sift.detectAndCompute(cv2.cvtColor(original,cv2.COLOR_RGB2GRAY),target_features)
    ks,ds = sift.detectAndCompute(cv2.cvtColor(source,cv2.COLOR_RGB2GRAY),source_features)
    pairs = cv2.BFMatcher().knnMatch(ds,dt,k=2)
    good = [a for a,b in pairs if a.distance < .70*b.distance]
    assert len(good)>=8, (n,len(good))
    xy_source = np.float32([ks[m.queryIdx].pt for m in good])
    xy_target = np.float32([kt[m.trainIdx].pt for m in good])
    transform,inliers = cv2.estimateAffinePartial2D(xy_source,xy_target,method=cv2.RANSAC,ransacReprojThreshold=1.5,maxIters=10000)
    assert transform is not None and int(inliers.sum())>=8, n
    scale = float(np.linalg.norm(transform[:,0]))
    assert .95 < scale < 1.05, (n,scale)
    registered = cv2.warpAffine(source,transform,(600,825),flags=cv2.INTER_LANCZOS4)
    # The artwork aligns independently of the printing's window. Never transplant
    # a donor's yellow frame when its opening ends before the target opening.
    # Locate ONLY its boundary in a narrow band around the supplied contour;
    # fill the contour so yellow artwork inside it remains legitimate artwork.
    gradient_y = np.linalg.norm(np.diff(source.astype(float),axis=0),axis=2)
    gradient_x = np.linalg.norm(np.diff(source.astype(float),axis=1),axis=2)
    donor_top = 95 + int(np.argmax(gradient_y[94:104,180:430].mean(axis=1)))
    donor_bottom = 387 + int(np.argmax(gradient_y[386:406,200:560].mean(axis=1))) - 1
    donor_left = 51 + int(np.argmax(gradient_x[180:315,50:70].mean(axis=0)))
    donor_right = 571 + int(np.argmax(gradient_x[150:375,570:584].mean(axis=0))) - 1
    yy,xx = np.nonzero(window)
    target_top = int(np.median([np.flatnonzero(window[:,x])[0] for x in range(180,430)]))
    target_bottom = int(np.median([np.flatnonzero(window[:,x])[-1] for x in range(200,560)]))
    sx = (donor_right-donor_left)/(xx.max()-xx.min())
    sy = (donor_bottom-donor_top)/(target_bottom-target_top)
    boundary_transform = np.float32([[sx,0,donor_left-sx*xx.min()],[0,sy,donor_top-sy*target_top]])
    donor_window = cv2.warpAffine(window,boundary_transform,(600,825),flags=cv2.INTER_NEAREST)
    # The template's anti-foil contour may indent where yellow artwork meets
    # the frame. Rebuild straight printing edges from measured scan boundaries.
    for x in range(150,575):
        top = donor_top if x < 445 else max(donor_top,100 + int(np.argmax(gradient_y[99:107,470:570].mean(axis=1))))
        donor_window[80:top,x] = 0; donor_window[top:125,x] = 255
        if x >= 190:
            donor_window[375:donor_bottom+1,x] = 255
            donor_window[donor_bottom+1:420,x] = 0
    # Two pixels protect against the scan's mixed artwork/frame edge samples.
    donor_safe = cv2.erode(donor_window,np.ones((5,5),np.uint8))
    distance,nearest = cv2.distanceTransformWithLabels(255-donor_safe,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
    palette = np.zeros((int(nearest.max())+1,3),np.uint8)
    palette[nearest[donor_safe>0]] = source[donor_safe>0]
    edge_extended = source.copy()
    edge_extended[donor_safe==0] = palette[nearest[donor_safe==0]]
    registered = cv2.warpAffine(edge_extended,transform,(600,825),flags=cv2.INTER_LANCZOS4)
    registered_distance = cv2.warpAffine(distance,transform,(600,825),flags=cv2.INTER_LINEAR)
    maximum_extension = float(registered_distance[window>0].max())
    assert maximum_extension < 16, (n,maximum_extension)
    predicted = cv2.transform(xy_source[None],transform)[0]
    residual = np.linalg.norm(predicted-xy_target,axis=1)[inliers.ravel()>0]
    result = original.copy(); result[window>0] = registered[window>0]
    assert np.array_equal(result[window==0],original[window==0])
    output = BASE/f'{n}-reverse.png'; Image.fromarray(result).save(output)
    review = Image.new('RGB',(1800,850),'#15191f')
    for i,pixels in enumerate([original,source,result]): review.paste(Image.fromarray(pixels),(i*600,25))
    ImageDraw.Draw(review).text((10,6),f'{n}: holo master | {donor}: matching non-holo art | {n}: reverse master',fill='white')
    review.save(REVIEW/f'{n}-comparison.png')
    Image.fromarray(result).resize((1200,1650),Image.Resampling.NEAREST).save(REVIEW/f'{n}-zoom.png')
    records.append({'cardId':card['id'],'number':n,'name':card['name'],'illustrator':card['illustrator'],
        'frameSource':{'cardId':card['id'],'url':f"{card['image']}/high.png",'file':f'{n}.png','sha256':sha(BASE/f'{n}.png')},
        'artSource':{'cardId':matches[0]['id'],'url':f"{matches[0]['image']}/high.png",'file':f'{donor}.png','sha256':sha(BASE/f'{donor}.png')},
        'dimensions':[600,825],'sourceToTargetAffine':transform.tolist(),'uniformScale':scale,
        'subjectFeatureInliers':int(inliers.sum()),'window':f'maps/{n}-clean-art-window.png','windowSha256':sha(BASE/f'maps/{n}-clean-art-window.png'),
        'registrationResidualPixels':{'median':float(np.median(residual)),'p95':float(np.percentile(residual,95)),'maximum':float(residual.max())},
        'donorRarity':matches[0]['rarity'],'donorNormalVariantId':next(v['variantId'] for v in matches[0]['variantsDetailed'] if v['type']=='normal'),
        'donorWindow':f'maps/{n}-donor-art-window.png','maximumEdgeExtensionPixels':maximum_extension,
        'donorWindowBounds':{'left':donor_left,'right':donor_right,'top':donor_top,'bottom':donor_bottom},
        'donorBoundaryTransform':boundary_transform.tolist(),
        'stagePrintProtection':f'maps/{n}-stage-print-protection.png',
        'stagePrintChangedPixels':int(np.count_nonzero(np.any(result!=original,axis=2)&(glyph_protection>0))),
        'edgeTreatment':'Nearest real donor artwork pixels at window edge only; no inpainting, generated artwork, hue filtering or donor frame pixels.',
        'output':output.name,'outputSha256':sha(output),'outsideWindowChangedPixels':0,
        'method':'Independent-checklist verified same-name, same-illustrator non-holo art; SIFT printed-subject registration; similarity transform, Lanczos resampling; donor frame excluded; exact numbered frame unchanged.'})
    Image.fromarray(donor_window).save(BASE/f'maps/{n}-donor-art-window.png')
    print(f'{n} <- {donor}: {int(inliers.sum())} printed-subject inliers; scale {scale:.5f}',flush=True)
(BASE/'reverse-front-evidence.json').write_text(json.dumps(records,indent=2)+'\n')
for start in range(1,33,8):
    sheet = Image.new('RGB',(2400,850),'#15191f')
    for i,n in enumerate(range(start,start+8)):
        x,y=(i%4)*600,(i//4)*425
        sheet.paste(Image.open(BASE/f'{n}-reverse.png').crop((0,0,600,405)),(x,y+20))
        ImageDraw.Draw(sheet).text((x+8,y+3),f'{n}: {cards[n-1]["name"]}',fill='white')
    sheet.save(REVIEW/f'sheet-{start}.png')
