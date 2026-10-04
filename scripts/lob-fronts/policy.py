"""Offline quality/printing policy. Measurements never establish printing identity."""
import math

PRIORITY = {'exact-scan': 1, 'market-product': 2, 'graded-archive': 3,
            'collector-listing': 4, 'ygoprodeck': 5}
TARGET = {'edition': '1st Edition', 'region': 'North America',
          'generation': 'original-2002', 'language': 'en'}
CHECKS = ('sharpness', 'compression', 'glare', 'reflections', 'perspective',
          'sleeveObstruction', 'slabObstruction', 'cropCompleteness', 'borderVisibility',
          'textReadability', 'cornersVisible', 'watermark', 'colorEditing', 'upscaling')


def assess(candidate, card, metrics):
    """Return eligibility, score and reasons; unknown reviews fail closed."""
    evidence = candidate.get('printingEvidence', {})
    observed = evidence.get('observed', {})
    reasons = []
    if candidate.get('rejectedByUser'):
        reasons.append('user-rejected-front')
    for field, expected in {**TARGET, 'setCode': card['number'], 'passcode': card['passcode'],
                            'name': card['name'], 'copyright': '1996 KAZUKI TAKAHASHI',
                            'layout': 'early-tcg', 'securityStamp': 'gold-bottom-right'}.items():
        if observed.get(field) != expected:
            reasons.append('printing-unverified:' + field if field not in observed else 'printing-mismatch:' + field)
    confidence = evidence.get('confidence', 0)
    if not isinstance(confidence, (float, int)) or not math.isfinite(confidence) or not 0.9 <= confidence <= 1:
        reasons.append('printing-confidence-below-gate')
        confidence = 0
    review = candidate.get('review', {})
    if not review.get('reviewer') or not review.get('evidence'):
        reasons.append('manual-review-required')
    for check in CHECKS:
        if review.get(check) != 'pass':
            reasons.append('quality-unreviewed:' + check if check not in review else 'quality-rejected:' + check)
    if metrics['width'] < 650 or metrics['height'] < 1000:
        reasons.append('insufficient-native-resolution')
    if metrics['sharpness'] < 35:
        reasons.append('soft-at-viewer-scale')
    if candidate.get('upscaled', False):
        reasons.append('upscaled-fallback-only')
    if candidate.get('kind') not in PRIORITY:
        reasons.append('unknown-source-priority')
    if not candidate.get('sourceUrl') or not candidate.get('imageUrl') or not candidate.get('sourceSite'):
        reasons.append('incomplete-provenance')
    if not candidate.get('sha256') or len(candidate['sha256']) != 64:
        reasons.append('reviewed-source-checksum-required')
    # A clean early LOB front can improve the baseline while its NA attribution
    # remains unresolved. This is explicitly a fallback, never an exact-print win.
    visual_confidence = evidence.get('frontConfidence', 0)
    provisional = (candidate.get('allowRegionalReview') is True
                   and isinstance(visual_confidence, (int, float))
                   and math.isfinite(visual_confidence) and .9 <= visual_confidence <= 1
                   and 'printing-unverified:region' in reasons
                   and set(reasons) <= {'printing-unverified:region', 'printing-confidence-below-gate'})
    # Quality dominates pixel count. Fixed-scale sharpness avoids rewarding noisy,
    # enormous photos. Glare proxy is advisory: pale printed artwork is not glare.
    q = candidate.get('quality', {})
    def unit(key, default):
        v = q.get(key, default)
        return max(0., min(1., v)) if isinstance(v, (float, int)) and math.isfinite(v) else default
    score = (45 * min(1, max(0, confidence)) + 20 * min(1, metrics['sharpness'] / 220)
             + 5 * min(1, metrics['height'] / 2000) + 8 * (1 - unit('glare', 1))
             + 6 * (1 - unit('perspective', 1)) + 8 * unit('cropCompleteness', 0)
             + 3 * (1 - unit('watermark', 1)) + 5 * unit('sourceTrust', 0))
    return {'eligible': not reasons, 'provisionalEligible': provisional, 'score': round(score, 3), 'reasons': reasons,
            'priority': PRIORITY.get(candidate.get('kind'), 99)}


def rank(candidates):
    """Gate first, source tier next, multidimensional quality within each tier."""
    return sorted(candidates, key=lambda c: (0 if c['assessment']['eligible'] else 1 if c['assessment'].get('provisionalEligible') else 2,
                  c['assessment']['priority'], -c['assessment']['score'], c['id']))
