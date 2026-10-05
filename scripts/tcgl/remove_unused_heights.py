"""Remove inactive TCGL inspection heights without changing authored normals."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]


def main():
    for folder, generated in (
        ('prismatic-evolutions', 'prismatic-surfaces.generated.ts'),
        ('151', '151-surfaces.generated.ts'),
    ):
        directory = (ROOT / 'public/cards/pokemon' / folder / 'tcgl').resolve()
        assert directory.is_relative_to(ROOT / 'public/cards/pokemon')
        manifest_path = directory / 'manifest.json'
        records = json.loads(manifest_path.read_text())
        removed = []
        for record in records:
            height = record['maps'].get('height')
            if not height:
                continue
            evidence_path = ROOT / 'public' / record['evidence'].lstrip('/')
            evidence = json.loads(evidence_path.read_text())
            assert evidence['embossStrength'] == 0
            assert record['maps'].get('normal')
            path = (ROOT / 'public' / height.lstrip('/')).resolve()
            assert path.parent == directory and path.name.endswith('-height.png')
            if path.exists():
                removed.append(path.stat().st_size)
                path.unlink()
            del record['maps']['height']
            evidence['maps'].pop(path.name, None)
            evidence.get('mapDimensions', {}).pop(path.name, None)
            evidence_path.write_text(json.dumps(evidence, indent=2) + '\n')
        manifest_path.write_text(json.dumps(records, indent=2) + '\n')
        source = ROOT / 'src/pokemon/data' / generated
        text = source.read_text()
        text = re.sub(r'^\s*"height": "/cards/pokemon/[^"\n]+-height\.png",\n', '', text, flags=re.MULTILINE)
        source.write_text(text)
        print(f'{folder}: removed {len(removed)} inactive heights, {sum(removed)/1024**2:.2f} MiB')

    # Historical Prismatic inspection heights are superseded by TCGL surfaces.
    directory = (ROOT / 'public/cards/pokemon/prismatic-evolutions/maps').resolve()
    assert directory.is_relative_to(ROOT / 'public/cards/pokemon')
    heights = list(directory.glob('*-height.png'))
    names = {path.name for path in heights}
    size = sum(path.stat().st_size for path in heights)
    for path in directory.glob('*.json'):
        evidence = json.loads(path.read_text())
        maps = evidence.get('maps', {})
        removed = names.intersection(maps)
        if removed:
            for name in removed:
                del maps[name]
            path.write_text(json.dumps(evidence, indent=2) + '\n')
    for path in heights:
        path.unlink()
    print(f'Prismatic legacy: removed {len(heights)} superseded heights, {size/1024**2:.2f} MiB')


if __name__ == '__main__':
    main()
