"""Activate the user-approved shared Cosmos treatment on unfinished MEP promos."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def main():
    target = ROOT / 'src/pokemon/data/mep-tcgl.generated.ts'
    text = target.read_text(encoding='utf-8')
    marker = 'export const tcglMepSurfaces:'
    prefix, declaration = text.split(marker, 1)
    schema, serialized = declaration.split(' = ', 1)
    surfaces = json.loads(serialized.strip().removesuffix(';'))
    completed = []
    for surface in surfaces:
        if surface['foilType'] != 'COSMOS':
            continue
        surface['profile'] = 'svp-cosmos'
        surface.pop('treatmentStatus', None)
        path = ROOT / 'public' / surface['evidence'].lstrip('/')
        evidence = json.loads(path.read_text(encoding='utf-8'))
        evidence['profile'] = 'svp-cosmos'
        evidence['cosmosPlacement'] = {'status': 'shared-sheet', 'profile': 'svp-cosmos', 'reason': 'User approved the existing shared Cosmos treatment for unfinished promo printings. Exact per-card foil/protection remains active; positions are not a physical-copy match.'}
        evidence['finishStatus'] = 'Shared Cosmos treatment active; exact TCGL front and coverage preserved.'
        evidence.pop('motifPlacement', None)
        path.write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
        completed.append(surface['cardId'])
    assert len(completed) == 19
    target.write_text(prefix + marker + schema + ' = ' + json.dumps(surfaces, indent=2) + ';\n', encoding='utf-8')
    (ROOT / 'public/cards/pokemon/tcgl-me/mep/tcgl/manifest.json').write_text(json.dumps(surfaces, indent=2) + '\n', encoding='utf-8')
    print('Completed 19 MEP Cosmos printings; exact assets unchanged.')

if __name__ == '__main__':
    main()
