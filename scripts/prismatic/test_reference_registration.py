"""Close-up alignment may certify only the photographed print rectangle."""
import importlib.util
from pathlib import Path
import unittest
import numpy as np

spec = importlib.util.spec_from_file_location('registration', Path(__file__).with_name('register-references.py'))
registration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(registration)


class CloseUpCoverageTests(unittest.TestCase):
    def setUp(self):
        self.bounds = [0, 0, 600, 440]
        self.points = np.array([[x+i, y+i] for x, y in [(90, 90), (490, 90), (90, 300), (490, 300)] for i in range(6)])
        self.errors = np.full(24, .7)

    def test_upper_close_up_cannot_certify_full_card(self):
        self.assertEqual(registration.landmark_coverage(self.points, self.errors, self.bounds), [6]*4)
        with self.assertRaisesRegex(ValueError, 'four quarters'):
            registration.landmark_coverage(self.points, self.errors, [0, 0, 600, 825])

    def test_off_region_landmark_is_rejected(self):
        self.points[0] = [100, 441]
        with self.assertRaisesRegex(ValueError, 'inside photographed bounds'):
            registration.landmark_coverage(self.points, self.errors, self.bounds)

    def test_close_up_keeps_error_threshold(self):
        with self.assertRaisesRegex(ValueError, 'four quarters'):
            registration.landmark_coverage(self.points, np.full(24, 2.1), self.bounds)

    def test_bounds_cannot_expand_beyond_print(self):
        for bounds in ([-1, 0, 600, 440], [0, 0, 601, 440], [0, 0, 600, 826], [100, 0, 90, 440], [0, 0, float('nan'), 440]):
            with self.subTest(bounds=bounds), self.assertRaisesRegex(ValueError, 'Invalid'):
                registration.print_bounds(bounds, 600, 825)
        self.assertEqual(registration.print_bounds(None, 600, 825), [0, 0, 600, 825])


if __name__ == '__main__':
    unittest.main()
