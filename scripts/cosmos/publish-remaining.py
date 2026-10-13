"""Publish individually reviewed source geometry; never detect at runtime.

Input records include explicit candidate removals/additions and original hashes.
No master, coverage, protection, material or normal assets are regenerated.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).parent))
import author_missing as cosmos
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'scripts/cosmos/remaining'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def publish(card_id):
    record = json.loads((DATA / (card_id + '.json')).read_text(encoding='utf8'))
    assert record['sourceAlignmentReviewed'] and record['boundaryReview']
    assert record['motifs']
    for key, value in record['preservedHashes'].items():
        assert sha(ROOT / record[key]) == value, (card_id, key)
    assert sha(ROOT / record['source']['file']) == record['source']['sha256']
    output = ROOT / record['destination']
    output.parent.mkdir(parents=True, exist_ok=True)
    cosmos.rasterize(record['motifs']).save(output, optimize=True)
    record['outputDimensions'] = [1200, 1650]
    record['motifSha256'] = sha(output)
    record['profile'] = 'pokemon-base-set-2-cosmos'
    record['reviewStatus'] = 'reviewed-visible-features'
    evidence = ROOT / record['placementEvidence']
    cosmos.write(evidence, record)
    # Keep the source-coordinate authoring record reproducible.
    cosmos.write(DATA / (card_id + '.json'), record)
    print(card_id, len(record['motifs']), sha(output), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('card_ids', nargs='+')
    args = parser.parse_args()
    for card_id in args.card_ids:
        publish(card_id)
