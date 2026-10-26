import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_data import build,validate_outputs
from build_collections import parse_collections
from build_summaries import calculate
from build_comparison import calculate_comparison

class ProductionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.csv=ROOT/'reference'/'collections-source.csv'
        cls.rows=parse_collections(cls.csv)

    def test_build_in_separate_directory(self):
        with tempfile.TemporaryDirectory() as folder:
            summary=build(self.csv,Path(folder)/'generated')
            self.assertEqual(summary['records'],253)
            for name in ('collections','monthly','detail','comparison'):
                self.assertTrue((Path(folder)/'generated'/f'{name}.json').exists())

    def test_extra_record_does_not_require_historical_match(self):
        rows=copy.deepcopy(self.rows)
        rows.append({'date':'2026-10-20','type':'Food Waste','kg':0.45})
        monthly,detail=calculate(rows)
        comparison=calculate_comparison(rows)
        summary=validate_outputs(rows,monthly,detail,comparison)
        self.assertEqual(summary['records'],254)

    def test_missing_weight_fails(self):
        with tempfile.TemporaryDirectory() as folder:
            csv=Path(folder)/'bad.csv'
            csv.write_text('Date,Material,Weight (kg)\n07/01/2025,Food Waste,\n')
            with self.assertRaisesRegex(ValueError,'blank weight'):
                build(csv,Path(folder)/'out')
            self.assertFalse((Path(folder)/'out'/'collections.json').exists())

    def test_duplicate_fails(self):
        with tempfile.TemporaryDirectory() as folder:
            csv=Path(folder)/'bad.csv'
            csv.write_text('Date,Material,Weight (kg)\n07/01/2025,Food Waste,1\n07/01/2025,Food Waste,2\n')
            with self.assertRaisesRegex(ValueError,'duplicate date/material'):
                build(csv,Path(folder)/'out')

    def test_future_year_is_not_rejected_by_parser(self):
        with tempfile.TemporaryDirectory() as folder:
            csv=Path(folder)/'future.csv'
            csv.write_text('Date,Material,Weight (kg)\n05/01/2027,Food Waste,1\n')
            self.assertEqual(parse_collections(csv)[0]['date'],'2027-01-05')

if __name__=='__main__':unittest.main()
