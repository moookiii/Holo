import unittest
from copy import deepcopy
from policy import TARGET, CHECKS, assess, rank

class QualityGateTests(unittest.TestCase):
    def setUp(self):
        self.card = {'number': 'LOB-008', 'passcode': '89091579', 'name': 'Basic Insect'}
        self.c = {'id': 'test', 'kind': 'exact-scan', 'sourceUrl': 'https://example.org/listing',
                  'sha256': 'a' * 64,
                  'sourceSite': 'Test scan', 'imageUrl': 'https://example.org/front.jpg',
                  'printingEvidence': {'confidence': .98, 'observed': {**TARGET, 'setCode': 'LOB-008',
                    'passcode': '89091579', 'name': 'Basic Insect', 'copyright': '1996 KAZUKI TAKAHASHI',
                    'layout': 'early-tcg', 'securityStamp': 'gold-bottom-right'}},
                  'review': {'reviewer': 'Tester', 'evidence': 'Pixel inspection', **dict.fromkeys(CHECKS, 'pass')},
                  'quality': {'glare': 0, 'perspective': 0, 'cropCompleteness': 1, 'watermark': 0, 'sourceTrust': 1}}
        self.m = {'width': 1100, 'height': 1600, 'sharpness': 180}

    def test_reprints_unlimited_and_foreign_prints_fail(self):
        for key, value in [('setCode', 'LOB-EN008'), ('edition', 'Unlimited'), ('generation', '25th-anniversary'),
                           ('region', 'Australia'), ('language', 'ja'), ('passcode', '00000000')]:
            c = deepcopy(self.c); c['printingEvidence']['observed'][key] = value
            self.assertFalse(assess(c, self.card, self.m)['eligible'], key)

    def test_title_and_filename_cannot_verify_printing(self):
        c = deepcopy(self.c); c['printingEvidence'] = {'confidence': 1}
        self.assertFalse(assess(c, self.card, self.m)['eligible'])

    def test_every_unknown_quality_check_fails_closed(self):
        for key in CHECKS:
            c = deepcopy(self.c); del c['review'][key]
            self.assertFalse(assess(c, self.card, self.m)['eligible'], key)

    def test_huge_blurry_and_upscaled_images_fail(self):
        self.assertFalse(assess(self.c, self.card, {**self.m, 'width': 4000, 'height': 5800, 'sharpness': 12})['eligible'])
        c = {**self.c, 'upscaled': True}
        self.assertFalse(assess(c, self.card, self.m)['eligible'])
        self.assertFalse(assess(self.c, self.card, {**self.m, 'height': 580})['eligible'])

    def test_priority_only_applies_after_gate(self):
        good = {**self.c, 'id': 'clean', 'kind': 'collector-listing'}
        good['assessment'] = assess(good, self.card, self.m)
        bad = {**self.c, 'id': 'glare', 'review': {**self.c['review'], 'glare': 'fail'}}
        bad['assessment'] = assess(bad, self.card, {**self.m, 'height': 4000})
        self.assertEqual(rank([bad, good])[0]['id'], 'clean')
        exact = {**self.c, 'assessment': assess(self.c, self.card, self.m)}
        self.assertEqual(rank([good, exact])[0]['id'], 'test')

    def test_regional_review_is_explicit_and_cannot_admit_mismatches(self):
        c = deepcopy(self.c)
        del c['printingEvidence']['observed']['region']
        c['printingEvidence']['frontConfidence'] = .98
        self.assertFalse(assess(c, self.card, self.m)['provisionalEligible'])
        c['allowRegionalReview'] = True
        result = assess(c, self.card, self.m)
        self.assertFalse(result['eligible'])
        self.assertTrue(result['provisionalEligible'])
        for field, value in [('region', 'Asia'), ('edition', 'Unlimited'), ('setCode', 'LOB-EN008')]:
            wrong = deepcopy(c); wrong['printingEvidence']['observed'][field] = value
            self.assertFalse(assess(wrong, self.card, self.m)['provisionalEligible'])
        c['review']['glare'] = 'fail'
        self.assertFalse(assess(c, self.card, self.m)['provisionalEligible'])

    def test_invalid_confidence_and_missing_checksum_fail_closed(self):
        for value in ['seller says exact', None, float('nan')]:
            c = deepcopy(self.c); c['printingEvidence']['confidence'] = value
            self.assertFalse(assess(c, self.card, self.m)['eligible'])
        c = deepcopy(self.c); del c['sha256']
        self.assertFalse(assess(c, self.card, self.m)['eligible'])

if __name__ == '__main__': unittest.main()
