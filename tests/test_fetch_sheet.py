import csv
import tempfile
import unittest
from pathlib import Path
from scripts.fetch_sheet import sheet_rows_to_csv


class SheetConversionTests(unittest.TestCase):
    def test_valid_rows(self):
        with tempfile.TemporaryDirectory() as d:
            target = Path(d) / 'source.csv'
            count = sheet_rows_to_csv([['Date', 'Material', 'Weight (kg)'], ['07/01/2025', 'Food Waste', '0.5'], []], target)
            self.assertEqual(count, 1)
            with target.open(newline='') as f:
                self.assertEqual(list(csv.reader(f))[1], ['07/01/2025', 'Food Waste', '0.5'])

    def test_bad_header(self):
        with self.assertRaises(ValueError):
            sheet_rows_to_csv([['Date', 'Material', 'Kg'], ['07/01/2025', 'Food Waste', '0.5']], '/tmp/unused.csv')

    def test_partial_row(self):
        with self.assertRaises(ValueError):
            sheet_rows_to_csv([['Date', 'Material', 'Weight (kg)'], ['07/01/2025', 'Food Waste']], '/tmp/unused.csv')

    def test_empty(self):
        with self.assertRaises(ValueError):
            sheet_rows_to_csv([['Date', 'Material', 'Weight (kg)']], '/tmp/unused.csv')
