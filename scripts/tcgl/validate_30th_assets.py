"""Validate originals, registration metadata and every offline normal numerically."""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image
from convert_30th_sources import normal_pixels, SIZE
ROOT=Path(__file__).resolve().parents[2]
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    manifest=json.loads((ROOT/'docs/30th-asset-preparation.json').read_text(encoding='utf-8'))
    result=[]; originals=0; normals=0
    for p in manifest['printings']:
        stem=p['tcglCardId'].replace('_','-'); base=ROOT/'public/cards/pokemon/30th-celebration'
        for kind,source in p['sources'].items():
            path=base/f'{stem}-{kind}.png'
            assert sha(path)==source['sha256'],str(path)
            originals+=1
        for name,digest in p['maps'].items():
            path=base/'maps'/name
            assert sha(path)==digest,str(path)
            with Image.open(path) as image:
                assert image.size==SIZE,(name,image.size)
                assert image.mode==('RGB' if name.endswith('-normal.png') else 'L'),(name,image.mode)
                image.load()
        foil=np.asarray(Image.open(base/f'{stem}-foil.png').convert('RGBA'))
        row={'cardId':p['cardId'],'tcglCardId':p['tcglCardId'],'foilType':p['foilDeclaration']['type'],
            'foilRgbMin':[int(foil[...,n].min()) for n in range(3)],
            'foilRgbMax':[int(foil[...,n].max()) for n in range(3)],
            'foilChromaticPixels':int(np.count_nonzero((foil[...,0]!=foil[...,1])|(foil[...,1]!=foil[...,2]))),
            'foilAlphaRange':[int(foil[...,3].min()),int(foil[...,3].max())]}
        if 'etch' in p['sources']:
            raw=Image.open(base/f'{stem}-etch.png').convert('RGBA')
            protected=np.asarray(Image.open(base/'maps'/f'{stem}-protection.png'),np.float32)/255
            expected=normal_pixels(raw,protected)
            actual=np.asarray(Image.open(base/'maps'/f'{stem}-normal.png'))
            assert np.array_equal(expected,actual),'Converter mismatch: '+stem
            assert np.all(actual[protected==1]==[128,128,255]),'Invalid protected normal: '+stem
            assert np.all(actual[...,2]>=128),'Backfacing normal: '+stem
            etch=np.asarray(raw)
            row['etchChromaticPixels']=int(np.count_nonzero((etch[...,0]!=etch[...,1])|(etch[...,1]!=etch[...,2])))
            row['normalNumericalValidation']='exact reference conversion; full 1800x2475 UV domain'
            row['physicalPolarityDepthAndContours']='not validated by numerical checks'
            normals+=1
        result.append(row)
    assert originals==443 and normals==45 and len(result)==199
    report={'printings':199,'originalAssets':originals,'referenceNormals':normals,
        'allHashesAndDimensionsPassed':True,'numericalNormalsPassed':True,
        'physicalFinishValidated':False,'assets':result}
    output=ROOT/'artifacts/30th-celebration/asset-validation.json'
    output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='assets'}))
if __name__=='__main__':main()
