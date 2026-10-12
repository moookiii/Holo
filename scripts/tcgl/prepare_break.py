"""Prepare only acquired BREAK printings from their exact TCGL sources.

Run after import_xy.py. No front edits, image-derived relief or etch generation.
The grayscale source whiteplate is preserved continuously, in its own UV box.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/tcgl-xy'


def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()


def registered(im):
    w, h = im.size
    return im.resize((733, 1024), Image.Resampling.BILINEAR,
                     box=(145 / 1024 * w, 0, 878 / 1024 * w, h))


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def main():
    target = ROOT / 'src/pokemon/data/xy-tcgl.generated.ts'
    lines = target.read_text(encoding='utf-8').splitlines()
    index = next(i for i, line in enumerate(lines) if line.startswith('export const tcglXySurfaces:'))
    prefix, encoded = lines[index].split('JSON.parse(', 1)
    surfaces = json.loads(json.loads(encoded[:-2]))
    report = []
    for surface in surfaces:
        if '_BreakRare_Squares_Holo' not in surface['tcglVariantId']:
            continue
        cid = surface['tcglCardId']; dest = OUT / cid
        evidence_path = dest / 'evidence.json'
        evidence = json.loads(evidence_path.read_bytes())
        assert evidence['printing']['assets']['etch']['status'] == 'not_applicable', cid
        for kind in ['front', 'foil']:
            assert sha(dest / f'original-{kind}.png') == evidence['sources'][kind]['sha256']
        front = registered(Image.open(dest / 'original-front.png')).convert('RGB')
        controls = registered(Image.open(dest / 'original-foil.png'))
        foil_image = controls.convert('L')
        foil = np.asarray(foil_image, dtype=np.float32) / 255
        rgb = np.asarray(front, dtype=np.float32) / 255
        r, g, b = rgb.transpose(2, 0, 1)
        # Select printed yellow/gold chroma ONLY within the source's protected
        # artwork. This is metal coverage, never a height or a normal. Dark ink
        # and white text have zero chroma; green electricity is rejected by R/G.
        gold = smooth(.07, .24, r - b) * smooth(-.025, .055, r - g)
        gold *= (1 - foil) * smooth(.06, .22, g)
        # Exact print remains the conductor's color; no flat gold replacement.
        roughness = .48 * (1 - foil) + .28 * foil
        roughness = roughness * (1 - gold) + .29 * gold
        controls.save(dest / 'break-foil-controls.png')
        foil_image.save(dest / 'break-foil.png')
        for name, values in [('break-metallic', gold), ('break-roughness', roughness)]:
            Image.fromarray(np.rint(values * 255).astype(np.uint8)).save(dest / (name + '.png'))
        maps = {key: f'/cards/pokemon/tcgl-xy/{cid}/{name}.png' for key, name in [
            ('foil', 'break-foil'), ('foilControls', 'break-foil-controls'),
            ('metallic', 'break-metallic'), ('roughness', 'break-roughness')]}
        surface.update(profile='pokemon-break', maps=maps, textured=False,
                       treatmentStatus='calibrated-video', deferredEffect=None)
        evidence.update(profile='pokemon-break', maps=maps, treatmentStatus='calibrated-video',
                        deferredEffect=None, normalGeneration=False, shaderChanges=True,
                        limitations='Nidoking video calibrates shared optics. Other printings lack matching physical video; source whiteplate boundaries are authoritative. Gold chroma coverage is an approximation, not measured ink composition.')
        finish = {
            'tcglCardId': cid, 'tcglVariantId': surface['tcglVariantId'],
            'sourceHashes': {kind: evidence['sources'][kind]['sha256'] for kind in ['front', 'foil']},
            'sourceDimensions': {kind: list(Image.open(dest / f'original-{kind}.png').size) for kind in ['front', 'foil']},
            'registration': evidence['registration'], 'etch': 'Exact manifest: not applicable; no normal/height generated.',
            'goldCoverage': 'Smooth yellow/gold chroma within inverse original whiteplate; no brightness-derived relief.',
            'pattern': 'break-squares: 16.4 cells/card height, 45 degrees, four fixed optical domains; flat laminate.',
            'reference': 'Nidoking BREAK 46/108 supplied 6.766667-second video; see docs/pokemon-break.md',
            'outputs': {key: {'path': path, 'sha256': sha(ROOT / 'public' / path.lstrip('/')), 'dimensions': [733, 1024]} for key, path in maps.items()},
        }
        (dest / 'break-evidence.json').write_text(json.dumps(finish, indent=2) + '\n')
        evidence['breakFinishEvidence'] = f'/cards/pokemon/tcgl-xy/{cid}/break-evidence.json'
        evidence_path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        report.append({'cardId': surface['cardId'], 'tcglCardId': cid, 'variant': surface['tcglVariantId']})
    assert len(report) == 35, len(report)
    lines[index] = prefix + 'JSON.parse(' + json.dumps(json.dumps(surfaces, ensure_ascii=False), ensure_ascii=False) + ');'
    target.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    (ROOT / 'docs/pokemon-break-printings.json').write_text(json.dumps(report, indent=2) + '\n')
    pending_path = ROOT / 'docs/xy-pending-finishes.json'
    pending = json.loads(pending_path.read_bytes())
    pending.pop('Gold Pokemon BREAK', None)
    pending_path.write_text(json.dumps(pending, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    audit_path = OUT / 'import-audit.json'
    audit = json.loads(audit_path.read_bytes())
    from collections import Counter
    audit['profiles'] = dict(Counter(s['profile'] for s in surfaces))
    audit['pendingFamilies'].pop('Gold Pokemon BREAK', None)
    audit['shaderChanges'] = True
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(report)} exact BREAK printings')


if __name__ == '__main__':
    main()
