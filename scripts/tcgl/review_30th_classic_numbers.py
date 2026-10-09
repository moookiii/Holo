"""Persist manually read printed numbers, keeping TCGL database IDs separate."""
from pathlib import Path
import hashlib, json
ROOT = Path(__file__).resolve().parents[2]
NUMBERS = ['58/102','4/102','18/132','69/132','25/111','106/105','149/147',
 '5/109','19/109','108/115','11/113','106/106','43/146','47/127','94/102',
 '99/102','100/102','101/101','85/124','11/101','106/160','41/122','89/149',
 '57/111','33/181','138/202','050/185','114/264','123/172','203/193']
def main():
    rows=[]
    for index, number in enumerate(NUMBERS,1):
        front=ROOT/f'public/cards/pokemon/30th-celebration/me5-5c-{index}-front.png'
        rows.append({'tcglCardId':f'me5-5c_{index}','printedCollectorNumber':number,
            'frontSha256':hashlib.sha256(front.read_bytes()).hexdigest(),
            'method':'Manually read exact TCGL front at original resolution; bottom printed-number crops retained.',
            'orientation':'preserve original full-card domain; no rotation',
            **({'legendHalf':'upper' if index==16 else 'lower'} if index in [16,17] else {})})
    path=ROOT/'docs/30th-classic-identity-review.json'
    path.write_text(json.dumps({'capture':'artifacts/30th-celebration/classic-printed-numbers.png',
        'printings':rows},indent=2)+'\n')
    # Identity-only refresh; preserve prepared surfaces and image bytes.
    path=ROOT/'public/cards/pokemon/30th-celebration/catalog.json'
    records=json.loads(path.read_text(encoding='utf-8'))
    for record in records:
        if record['setId']=='30th-classic':
            index=int(record['tcglCardId'].split('_')[1]); row=rows[index-1]
            record['collectorNumber']=row['printedCollectorNumber']
            record['localId']=row['printedCollectorNumber']
    path.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    surfaces=json.loads((ROOT/'public/cards/pokemon/30th-celebration/surfaces.json').read_text())
    (ROOT/'src/pokemon/data/30th.generated.ts').write_text('// Exact TCGL anniversary identities; generated offline.\nexport const celebrationRecords = '+json.dumps(records,ensure_ascii=False,indent=2)+' as const;\nexport const celebrationSurfaces = '+json.dumps(surfaces,ensure_ascii=False,indent=2)+' as const;\n',encoding='utf-8')
if __name__=='__main__':main()
