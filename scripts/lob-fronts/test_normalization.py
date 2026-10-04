import unittest
from PIL import Image
from pipeline import normalize, local_path


class NormalizationTests(unittest.TestCase):
    def test_card_crop_uses_source_pixels_without_enlargement(self):
        im = Image.new('RGB', (900, 1500), '#aa7744')
        result = normalize(im, {'normalization': {'crop': [100, 100, 808, 1132]}})
        self.assertEqual(result.size, (708, 1032))
        self.assertEqual(result.getpixel((400, 600)), im.getpixel((500, 700)))

    def test_mild_quad_does_not_enlarge_native_edges(self):
        im = Image.new('RGB', (1000, 1500))
        result = normalize(im, {'normalization': {'quad': [[50, 40], [930, 50], [920, 1340], [60, 1330]]}})
        self.assertLessEqual(result.width, 860)
        self.assertLessEqual(result.height, 1290)
        self.assertAlmostEqual(result.width/result.height, 59/86, places=3)

    def test_invalid_bounds_skew_proportions_and_mirroring_fail(self):
        im = Image.new('RGB', (1000, 1500))
        for spec in [{'crop': [-1, 0, 800, 1200]}, {'crop': [0, 0, 1000, 500]},
                     {'quad': [[0, 0], [999, 0], [700, 1450], [0, 1450]]},
                     {'quad': [[900, 0], [0, 0], [0, 1300], [900, 1300]]}]:
            with self.assertRaises(ValueError): normalize(im, {'normalization': spec})
        with self.assertRaises(ValueError): local_path('../outside.jpg')


if __name__ == '__main__': unittest.main()
