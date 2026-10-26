import json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_summaries import calculate,compare

class TestSummaries(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows=json.loads((ROOT/'reference/collections.json').read_text())
        cls.monthly,cls.detail=calculate(cls.rows)
    def test_reference_values(self):
        for name,obj in [('monthly',self.monthly),('detail',self.detail)]:
            ref=json.loads((ROOT/'reference'/f'{name}.json').read_text())
            for section in ['recorded','imputed']:
                self.assertEqual(len(obj[section]),len(ref[section]))
                for a,b in zip(obj[section],ref[section]):
                    self.assertEqual({k:v for k,v in a.items() if k!='kg'}, {k:v for k,v in b.items() if k!='kg'})
                    self.assertLessEqual(abs(a['kg']-b['kg']),1e-5)
    def test_metadata(self):
        ref=json.loads((ROOT/'reference/monthly.json').read_text())
        self.assertEqual(self.monthly['metadata'],ref['metadata'])
    def test_recorded_conservation(self):
        self.assertAlmostEqual(sum(x['kg'] for x in self.monthly['recorded']),sum(x['kg'] for x in self.rows),places=6)
    def test_imputed_conservation_except_batteries(self):
        expected=sum(x['kg'] for x in self.rows if x['type']!='Batteries')
        self.assertAlmostEqual(sum(x['kg'] for x in self.monthly['imputed']),expected,places=5)

if __name__=='__main__':unittest.main()
