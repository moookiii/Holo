"""Register an explicitly selected physical-copy photo without publishing dots."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
sys.dont_write_bytecode = True
import cv2
import numpy as np
from PIL import Image
import author_missing as cosmos

ROOT = Path(__file__).resolve().parents[2]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('card_id')
    ap.add_argument('file')
    ap.add_argument('--page', required=True)
    ap.add_argument('--image', required=True)
    ap.add_argument('--title', required=True)
    a = ap.parse_args()
    source_path = ROOT / a.file
    with Image.open(source_path) as im:
        dimensions = list(im.size)
    selected = dict(file=a.file, pageUrl=a.page, imageUrl=a.image,
                    title=a.title, dimensions=dimensions,
                    sha256=hashlib.sha256(source_path.read_bytes()).hexdigest())
    sources_path = ROOT / 'scripts/cosmos/sources.json'
    sources = json.loads(sources_path.read_text(encoding='utf8'))
    c = next(c for c in sources if c['cardId'] == a.card_id)
    aligned = cosmos.register(c, selected)
    if aligned is None:
        raise ValueError('Insufficient print anchors: ' + a.card_id)
    photo, transform = aligned
    transform['method'] = 'SIFT print anchors; RANSAC projective registration to exact clean full-card master'
    target = ROOT / 'research/cosmos-missing' / a.card_id / 'registered-selected.png'
    Image.fromarray(photo).save(target)
    master = np.asarray(Image.open(ROOT / c['master']).convert('RGB').resize(cosmos.COORDS))
    foil = np.asarray(Image.open(ROOT / c['foil']).convert('L').resize(cosmos.COORDS))
    protection = np.asarray(Image.open(ROOT / c['protection']).convert('L').resize(cosmos.COORDS))
    motifs = cosmos.propose(photo, master, (foil > 20) & (protection < 180))
    record = dict(c, source=selected, registration=transform,
                  coordinateDimensions=list(cosmos.COORDS),
                  registeredReference=target.relative_to(ROOT).as_posix(),
                  motifs=motifs, reviewStatus='candidate-only')
    proposal_path = ROOT / 'scripts/cosmos/proposals.json'
    records = json.loads(proposal_path.read_text(encoding='utf8'))
    records = [record if p['cardId'] == a.card_id else p for p in records]
    if not any(p['cardId'] == a.card_id for p in records):
        records.append(record)
    cosmos.write(proposal_path, records)
    references_path = ROOT / 'scripts/cosmos/extra-references.json'
    references = json.loads(references_path.read_text(encoding='utf8')) if references_path.exists() else {}
    references[a.card_id] = selected
    cosmos.write(references_path, references)
    cosmos.review_images(c, photo, motifs, 'selected-proposals')
    cosmos.review_tiles(c, photo, motifs, 'selected-proposals')
    print(a.card_id, len(motifs), 'inactive proposals', transform)

if __name__ == '__main__':
    main()
