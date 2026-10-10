"""Reconcile extracted identities with separately cached TCGdex checklists."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
P=ROOT/'src/pokemon/data/swsh-tcgl.generated.ts'
ALIASES={'swsh3-5':'swsh3.5','swsh4-5':'swsh4.5','swsh7-5':'cel25','swsh7-5r':'cel25cc','swsh9a':'swsh9tg','swsh10a':'swsh10tg','swsh10-5':'swsh10.5','swsh11a':'swsh11tg','swsh12a':'swsh12tg','swsh12-5':'swsh12.5','swsh12-5a':'swsh12.5gg','swshbsp':'swshp'}
CLASSIC=['2/102','4/102','15/102','73/102','8/82','15/82','15/132','24','20/111','66/64','9/95','86/109','88/92','93/101','17/17','15/106','109/111','145/147','107/123','113/114','114/114','54/99','97/146','76/108','60/145']
def read_export(line):
    data=line.split(' = ',1)[1][:-1]
    return json.loads(json.loads(data[11:-1])) if data.startswith('JSON.parse(') else json.loads(data)
def main():
    lines=P.read_text(encoding='utf-8').splitlines();sets=read_export(lines[3]);surfaces=read_export(lines[4]);audit={};errors=[]
    for s in sets:
        sid=s['id'];path=ROOT/'research/tcgl/swsh-checklists'/(ALIASES.get(sid,sid)+'.json')
        if not path.exists():continue
        meta=json.loads(path.read_text());cards=meta['cards']
        if sid=='swsh4-5':cards+=json.loads((path.parent/'swsh4.5sv.json').read_text())['cards']
        expected={c['localId']:c for c in cards};matched=set()
        # Internal indices in SV/TG/GG/Classic tables differ from printed numbers.
        for c in s['cards']:
            n=int(c['id'].rsplit('-',1)[1]);number=str(n)
            if sid=='swsh4-5' and n>73:number='SV'+str(n-73).zfill(3)
            if sid.endswith('a') and sid!='swshalt':number=('GG' if sid=='swsh12-5a' else 'TG')+str(n).zfill(2)
            if sid=='swshbsp':number='SWSH'+str(n).zfill(3)
            if sid=='swsh7-5r':
                normalized=lambda v:re.sub(r'[^a-z0-9]','',v.lower().replace('é','e').replace('δ','delta'))
                found=[x for x in cards if normalized(x['name'])==normalized(c['name'])]
                number='CC'+str(n).zfill(3)
            match=expected.get(number) or expected.get(number.zfill(3))
            if not match: errors.append({'cardId':c['id'],'number':number,'reason':'Checklist mismatch'});continue
            matched.add(match['localId']);c['localId']=match['localId'];c['name']=match['name']
            denom=c['collectorNumber'].split('/')[-1]
            if number.startswith('SV'):denom='SV122'
            elif number.startswith('TG'):denom='TG30'
            elif number.startswith('GG'):denom='GG70'
            elif sid=='swshbsp':denom=''
            elif sid=='swsh7-5r':
                # TCGdex localId includes the printed denominator for Classic.
                denom=''
            c['collectorNumber']=c['localId']+('/'+denom if denom else '')
            if sid=='swsh7-5r':c['localId']=CLASSIC[n-1].split('/')[0];c['collectorNumber']=CLASSIC[n-1];c['rarity']='Classic Collection'
        audit[sid]={'extractedCards':len(s['cards']),'checklistCards':len(cards),'matched':len(matched),'missingFromExtraction':[x for x in expected if x not in matched]}
    for surface in surfaces:
        if surface['foilType']=='SunPillar' and surface['profile']=='swsh-celebrations-silver':surface['profile']='swsh-textured'
        if surface['cardId']=='swsh3-5-79' or surface['cardId'] in ('swshbsp-97','swshbsp-99','swshbsp-180','swshbsp-182','swshbsp-184'):
            surface['profile']='swsh-textured'
        if surface['foilType']=='Cosmos' and 'direction' in surface['maps']:surface['maps']['motif']=surface['maps'].pop('direction')
    lines[3]=lines[3].split(' = ',1)[0]+' = JSON.parse('+json.dumps(json.dumps(sets,ensure_ascii=False),ensure_ascii=False)+');'
    lines[4]=lines[4].split(' = ',1)[0]+' = JSON.parse('+json.dumps(json.dumps(surfaces,ensure_ascii=False),ensure_ascii=False)+');'
    P.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    out=ROOT/'public/cards/pokemon/tcgl-swsh/checklist-audit.json';out.write_text(json.dumps({'sets':audit,'errors':errors},indent=2)+'\n')
    print(json.dumps({'sets':audit,'errors':errors},indent=2))
if __name__=='__main__':main()
