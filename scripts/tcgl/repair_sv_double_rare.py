"""Repair retired Double Rare registrations using each exact TCGL variant.

Only registration labels change. Preserved fronts, masks and normals are never
regenerated. Historical non-Double-Rare aliases keep their illustration finish.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def destination(surface):
    if surface['profile'] not in ('sv_tcgl_ex_holo', 'sv_tcgl_illustration_holo'):
        return surface['profile']
    evidence = json.loads((ROOT / 'public' / surface['evidence'].lstrip('/')).read_text(encoding='utf-8'))
    if not re.search(r'_DoubleRareC?_', evidence['tcglVariantId']):
        return surface['profile']
    if surface['textured'] and surface['foilType'] == 'SV_ULTRA':
        return 'prismatic_sir_texture'
    if not surface['textured'] and surface['foilType'] == 'SUN_PILLAR':
        return 'pokemon151_ex_holo'
    raise ValueError('Unreviewed Double Rare source: ' + surface['cardId'])


def main():
    changes = {}
    for manifest in sorted((ROOT / 'public/cards/pokemon/tcgl-sv').glob('*/tcgl/manifest.json')):
        records = json.loads(manifest.read_text(encoding='utf-8'))
        changed = False
        for surface in records:
            target = destination(surface)
            if target == surface['profile']:
                continue
            changes[(surface['cardId'], surface['variant'])] = target
            surface['profile'] = target
            changed = True
        if changed:
            manifest.write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    for name in ('sv-tcgl-surfaces.generated.ts', 'sv-tcgl-additions-surfaces.generated.ts'):
        path = ROOT / 'src/pokemon/data' / name
        text = path.read_text(encoding='utf-8')
        def replace(match):
            block = match.group(0)
            card_id = re.search(r'"cardId": "([^"]+)"', block)[1]
            variant = re.search(r'"variant": "([^"]+)"', block)[1]
            target = changes.get((card_id, variant))
            return re.sub(r'"profile": "[^"]+"', '"profile": "' + target + '"', block) if target else block
        updated = re.sub(r'  \{\n    "cardId":.*?\n  \}', replace, text, flags=re.S)
        if updated != text:
            path.write_text(updated, encoding='utf-8')
    counts = {target: list(changes.values()).count(target) for target in set(changes.values())}
    print(json.dumps(counts, sort_keys=True))


if __name__ == '__main__':
    main()
