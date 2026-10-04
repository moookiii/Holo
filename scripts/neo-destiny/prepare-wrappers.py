"""Reproduce recorded front crops and back perspective rectification."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
for row in json.loads((ROOT/'scripts/neo-destiny/wrapper-sources.json').read_text()):
    if not (row.get('crop') or row.get('rectificationCorners')):continue
    image=Image.open(ROOT/'artifacts/neo-destiny/wrapper-originals'/row['file']).convert('RGBA')
    if row.get('crop'):image=image.crop(row['crop'])
    else:
        matrix=cv2.getPerspectiveTransform(np.array(row['rectificationCorners'],np.float32),np.array([[0,0],[479,0],[479,851],[0,851]],np.float32))
        image=Image.fromarray(cv2.warpPerspective(np.array(image),matrix,(480,852)))
    image.save(ROOT/'public/packs/pokemon'/row['file'])
