"""Numerical checks for the reference conversion, not physical-finish approval."""
import unittest
import numpy as np
from PIL import Image
from convert_30th_sources import normal_pixels, convert


class ConversionTests(unittest.TestCase):
    def test_protection_boundary_does_not_create_relief(self):
        # Differentiating a clipped constant field would bevel this boundary.
        raw = Image.new('RGBA', (12, 12), (190, 190, 190, 255))
        protection = np.zeros((12, 12), np.float32)
        protection[:, :6] = 1
        result = normal_pixels(raw, protection, (12, 12))
        np.testing.assert_array_equal(result, np.broadcast_to([128, 128, 255], result.shape))

    def test_source_alpha_and_protected_print_are_flat_rgb(self):
        values = np.tile(np.arange(12, dtype=np.uint8) * 20, (12, 1))
        raw = np.stack([values, values, values, np.full_like(values, 255)], axis=2)
        raw[:, 0, 3] = 0
        protection = np.zeros((12, 12), np.float32)
        protection[:, 6:9] = 1
        result = normal_pixels(Image.fromarray(raw), protection, (12, 12))
        self.assertEqual(result.shape, (12, 12, 3))
        np.testing.assert_array_equal(result[:, 0], np.tile([128, 128, 255], (12, 1)))
        np.testing.assert_array_equal(result[:, 6:9], np.broadcast_to([128, 128, 255], (12, 3, 3)))
        # Inverted height falls as raster luminance increases: tangent X > 0.
        self.assertTrue((result[:, 3, 0] > 128).all())

    def test_top_down_rows_use_positive_derivative_for_y(self):
        values = np.tile((np.arange(12, dtype=np.uint8) * 20)[:, None], (1, 12))
        raw = np.stack([values, values, values, np.full_like(values, 255)], axis=2)
        result = normal_pixels(Image.fromarray(raw), np.zeros((12, 12), np.float32), (12, 12))
        self.assertTrue((result[3, :, 1] < 128).all())

    def test_missing_exact_etch_and_unreviewed_printing_rejected(self):
        with self.assertRaisesRegex(ValueError, 'No exact TCGL etch'):
            convert({'sources': {}}, {})
        with self.assertRaisesRegex(ValueError, 'Exact printing review required'):
            convert({'sources': {'etch': {}}, 'tcglVariantId': 'exact'}, {'status': 'pending'})


if __name__ == '__main__':
    unittest.main()
