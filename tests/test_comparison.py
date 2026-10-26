import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build_comparison import calculate_comparison, compare
ROOT = Path(__file__).resolve().parents[1]
ROWS = json.loads((ROOT / 'reference/collections.json').read_text())
EXPECTED = json.loads((ROOT / 'reference/comparison.json').read_text())

class ComparisonTests(unittest.TestCase):
    def test_reference(self):
        self.assertEqual(compare(calculate_comparison(ROWS), EXPECTED), [])
    def test_scenario_order(self):
        v = calculate_comparison(ROWS)['projectedAdditionalKg']
        self.assertLessEqual(v['low'], v['central'])
        self.assertLessEqual(v['central'], v['high'])
    def test_missing_material(self):
        with self.assertRaisesRegex(ValueError, 'Missing collections'):
            calculate_comparison([r for r in ROWS if r['type'] != 'Glass'])
    def test_insufficient_waste(self):
        with self.assertRaisesRegex(ValueError, 'at least three'):
            calculate_comparison([r for r in ROWS if r['type'] != 'Waste'] + [r for r in ROWS if r['type'] == 'Waste'][:2])

if __name__ == '__main__': unittest.main()
