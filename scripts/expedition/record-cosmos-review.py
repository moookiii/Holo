"""Record completed audits/captures, without implying automated placement QA."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[2]
p = root/'artifacts/expedition'
audit = json.loads((p/'cosmos-audit.json').read_text())
expected = {f'pokemon:ecard1-{n}:holo' for n in range(1,33)} | {'pokemon:base4-1:holo','pokemon:basep-34:holo'}
states = ['front','left','right','grazing','dark','specular','moving']
backends = {}
for backend in ['webgl','webgpu']:
    files = [p/'live'/backend/'report.json']
    if backend == 'webgpu':
        files += [p/'live'/backend/'report-32.json']
    results = {}
    for f in files:
        r = json.loads(f.read_text())
        assert not r['errors'], f
        results.update({c['id']:c for c in r['report']})
    assert set(results) == expected
    for c in results.values():
        reg = c['registration']
        assert reg['missing'] == 0 and reg['extra'] == 0 and reg['flipY'] is False
        assert all((p/'live'/backend/(c['id'].replace(':','-')+'-'+s+'.png')).exists() for s in states)
    backends[backend] = {'cardsChecked':32,'references':['pokemon:base4-1:holo','pokemon:basep-34:holo'],
                         'states':states,'results':list(results.values())}
record = {'offlineAudit':audit,'liveBackends':backends,
          'visualReview':'Whole foil overlays and motif-only PNGs, then individual front foil renders for all 32; pixel-grid measurements and selected additional angle captures.',
          'scope':'Expedition 1/165 through 32/165 regular holo; unchanged masters, windows, SAM and established Cosmos optics.',
          'uncertainty':'Faint scan-sized and completely hidden features; physical angular matching per scanned specimen remains unmeasured.'}
(root/'docs/expedition-cosmos-validation.json').write_text(json.dumps(record,indent=2)+'\n')
print('Recorded both backends: all 32 cards and both references.')
