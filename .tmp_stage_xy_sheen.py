import json
import subprocess
from pathlib import Path


IDS = {'xyalt-100': 'xyalt_100', 'xyalt-101': 'xyalt_101', 'xyalt-102': 'xyalt_102'}
LINKS = {
    'xyalt_100': 'https://pokumon.com/card/mirror-holofoil-treecko-6-160-collector-chest-special-print/',
    'xyalt_101': 'https://pokumon.com/card/mirror-holofoil-torchic-25-160-collector-chest-special-print/',
    'xyalt_102': 'https://pokumon.com/card/mirror-holofoil-mudkip-33-160-collector-chest-special-print/',
}


def head(path):
    return subprocess.check_output(['git', 'show', 'HEAD:' + path]).decode('utf8')


def stage_text(path, content):
    blob = subprocess.run(['git', 'hash-object', '-w', '--stdin'], input=content.encode('utf8'),
                          stdout=subprocess.PIPE, check=True).stdout.decode().strip()
    subprocess.run(['git', 'update-index', '--add', '--cacheinfo', f'100644,{blob},{path}'], check=True)


p = 'scripts/tcgl/import_xy.py'
s = head(p)
constant = """# Physical Collector Chest preview printings are Sheen, despite TCGL Cosmos metadata.
COLLECTOR_CHEST_SHEEN = {
    'xyalt_100': 'https://pokumon.com/card/mirror-holofoil-treecko-6-160-collector-chest-special-print/',
    'xyalt_101': 'https://pokumon.com/card/mirror-holofoil-torchic-25-160-collector-chest-special-print/',
    'xyalt_102': 'https://pokumon.com/card/mirror-holofoil-mudkip-33-160-collector-chest-special-print/',
}


"""
s = s.replace('def sha(path):', constant + 'def sha(path):', 1)
s = s.replace("    if rarity == 'BreakRare': return 'print-only', 'Gold Pokemon BREAK'",
              "    if rarity == 'BreakRare': return 'print-only', 'Gold Pokemon BREAK'\n"
              "    if m['card_id'] in COLLECTOR_CHEST_SHEEN:\n"
              "        assert m['set_id'] == 'xyalt' and m['foil_effect'] == 'Cosmos'\n"
              "        return 'pokemon-sheen', None", 1)
s = s.replace('        profile, pending = treatment(m, row, variant)',
              "        profile, pending = treatment(m, row, variant)\n"
              "        physical_effect = 'Sheen' if cid in COLLECTOR_CHEST_SHEEN else m['foil_effect']", 1)
s = s.replace("'variantFronts': {variant: front.relative_to(OUT).as_posix()}, 'foil': {variant:m['foil_effect']}",
              "'variantFronts': {variant: front.relative_to(OUT).as_posix()}, 'foil': {variant:physical_effect}", 1)
s = s.replace("        if pending == 'Cosmos registered motif placement':",
              """        if cid in COLLECTOR_CHEST_SHEEN:
            evidence['physicalFinishCorrection'] = {
                'finish':'Sheen Holofoil', 'tcglFinish':m['foil_effect'],
                'scope':'Exact 2014 Collector Chest preview printing only',
                'sources':[
                    'https://www.elitefourum.com/t/updated-6-15-15-alternate-set-card-checklist-english/11788',
                    COLLECTOR_CHEST_SHEEN[cid],
                ]}
        if pending == 'Cosmos registered motif placement':""", 1)
s = s.replace("'foilType':m['foil_effect'],'tcglCardId':cid", "'foilType':physical_effect,'tcglCardId':cid", 1)
assert s.count('COLLECTOR_CHEST_SHEEN') == 5
stage_text(p, s)

p = 'src/pokemon/data/xy-tcgl.generated.ts'
s = head(p)
lines = s.splitlines(keepends=True)
for i, line in enumerate(lines):
    if 'JSON.parse(' not in line:
        continue
    prefix, tail = line.split('JSON.parse(', 1)
    data = json.loads(json.loads(tail.removesuffix(');\n')))
    if 'tcglXySets' in prefix:
        for group in data:
            for card in group['cards']:
                if card['id'] in IDS:
                    card['foil']['holo'] = 'Sheen'
    elif 'tcglXySurfaces' in prefix:
        for surface in data:
            if surface['cardId'] in IDS and surface['variant'] == 'holo':
                cid = IDS[surface['cardId']]
                surface.update(profile='pokemon-sheen', foilType='Sheen', treatmentStatus='existing-material',
                               deferredEffect=None,
                               maps={'foil':f'/cards/pokemon/tcgl-xy/{cid}/foil.png',
                                     'foilControls':f'/cards/pokemon/tcgl-xy/{cid}/foil-controls.png',
                                     'roughness':'/cards/pokemon/tcgl-xy/shared/smooth-roughness.png'})
    else:
        continue
    lines[i] = prefix + 'JSON.parse(' + json.dumps(json.dumps(data, ensure_ascii=False), ensure_ascii=False) + ');\n'
stage_text(p, ''.join(lines))

p = 'docs/xy-pending-finishes.json'
data = json.loads(head(p))
for key, cards in data.items():
    data[key] = [card for card in cards if card.get('tcglCardId') not in LINKS]
stage_text(p, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

for cid in LINKS:
    p = f'public/cards/pokemon/tcgl-xy/{cid}/evidence.json'
    subprocess.run(['git', 'add', '--', p], check=True)
    for name in ('foil.png', 'foil-controls.png'):
        subprocess.run(['git', 'add', '--', f'public/cards/pokemon/tcgl-xy/{cid}/{name}'], check=True)

print('Staged exact Collector Chest classification only')
