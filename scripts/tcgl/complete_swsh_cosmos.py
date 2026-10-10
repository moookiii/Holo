"""Apply the user-approved existing shared promo sheet, preserving exact assets."""
import hashlib
import json
from pathlib import Path
from audit_swsh import read_export

ROOT = Path(__file__).resolve().parents[2]
PLACEMENT = {
    'status': 'shared-sheet',
    'profile': 'svp-cosmos',
    'reason': 'User approved shared Cosmos treatment across the 148 Sword & Shield product/promo printings. Exact per-card foil/protection remains active; positions are not a physical-copy match.',
}

def main():
    target = ROOT / 'src/pokemon/data/swsh-tcgl.generated.ts'
    lines = target.read_text(encoding='utf-8').splitlines()
    surfaces = read_export(lines[4])
    completed = []
    for surface in surfaces:
        if surface['foilType'] != 'Cosmos':
            continue
        original_maps = {k: v for k, v in surface['maps'].items() if k != 'motif'}
        surface['profile'] = 'svp-cosmos'
        surface['maps'] = original_maps
        surface['limitations'] = [s for s in surface['limitations'] if s != 'Exact physical-copy Cosmos placement pending; empty motif map, no invented dots.']
        public_path = ROOT / 'public' / surface['evidence'].lstrip('/')
        tcgl_id = public_path.parent.name
        for path in [public_path, ROOT / 'research/tcgl' / tcgl_id / 'integration-evidence.json']:
            data = json.loads(path.read_text(encoding='utf-8'))
            data['profile'] = 'svp-cosmos'
            data['maps'] = original_maps
            data['limitations'] = surface['limitations']
            data['cosmosPlacement'] = PLACEMENT
            if 'outputVerification' in data:
                data['outputVerification'].pop('motif', None)
            path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
        completed.append({
            'cardId': surface['cardId'], 'variant': surface['variant'],
            'tcglVariantId': data['tcglVariantId'], 'evidence': surface['evidence'],
            'preservedMaps': {k: {'path': v, 'sha256': hashlib.sha256((ROOT / 'public' / v.lstrip('/')).read_bytes()).hexdigest()} for k, v in original_maps.items()},
        })
    assert len(completed) == 148
    lines[4] = lines[4].split(' = ', 1)[0] + ' = JSON.parse(' + json.dumps(json.dumps(surfaces, ensure_ascii=False), ensure_ascii=False) + ');'
    target.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    report = {'count': len(completed), 'placement': PLACEMENT, 'shaderChanges': False, 'frontOrCoverageChanges': False, 'printings': completed}
    (ROOT / 'public/cards/pokemon/tcgl-swsh/cosmos-completion.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Completed {len(completed)} Cosmos printings with the existing shared sheet.')

if __name__ == '__main__':
    main()
