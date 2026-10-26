import copy
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_collections import parse_collections
from build_summaries import calculate
from build_comparison import calculate_comparison
from validate_data import validate_dataset

class ValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows=parse_collections(ROOT/'reference/collections-source.csv')
        cls.monthly,cls.detail=calculate(cls.rows)
        cls.comparison=calculate_comparison(cls.rows)
    def check_bad(self,kind,mutate,pattern):
        rows,monthly,detail,comparison=copy.deepcopy((self.rows,self.monthly,self.detail,self.comparison))
        mutate({'rows':rows,'monthly':monthly,'detail':detail,'comparison':comparison})
        with self.assertRaisesRegex(ValueError,pattern): validate_dataset(rows,monthly,detail,comparison)
    def test_valid(self):
        self.assertEqual(validate_dataset(self.rows,self.monthly,self.detail,self.comparison)['records'],253)
    def test_duplicate(self): self.check_bad('rows',lambda d:d['rows'].append(d['rows'][0]),'duplicate')
    def test_missing_month(self): self.check_bad('monthly',lambda d:d['monthly']['months'].pop(),'months')
    def test_missing_group_row(self): self.check_bad('monthly',lambda d:d['monthly']['recorded'].pop(),'missing/extra')
    def test_extra_detail(self): self.check_bad('detail',lambda d:d['detail']['imputed'].append(d['detail']['imputed'][-1]),'missing/extra')
    def test_nonfinite(self): self.check_bad('monthly',lambda d:d['monthly']['recorded'][0].update(kg=float('nan')),'invalid weight')
    def test_wrong_group_total(self): self.check_bad('monthly',lambda d:d['monthly']['recorded'][0].update(kg=d['monthly']['recorded'][0]['kg']+1),'reconcile|mismatch')
    def test_projection_order(self): self.check_bad('comparison',lambda d:d['comparison']['projectedAdditionalKg'].update(low=999),'out of order')
    def test_projection_days(self): self.check_bad('comparison',lambda d:d['comparison']['metadata'].update(projectionDays=999),'inconsistent')
    def test_mismatched_cutoff(self): self.check_bad('comparison',lambda d:d['comparison']['metadata'].update(comparisonCompleteThrough='2020-01'),'incorrect completeness cutoff')
    def test_invalid_collection_date(self): self.check_bad('rows',lambda d:d['rows'][0].update(date='2025-99-99'),'invalid ISO date')
    def test_unknown_material(self): self.check_bad('rows',lambda d:d['rows'][0].update(type='Unobtainium'),'invalid material')

if __name__=='__main__':unittest.main()
