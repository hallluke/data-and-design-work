#!/usr/bin/env python3
"""Build four JSON files from a CSV; no Google credentials or website changes.

The regression fixture is only used by the separate test suite, never by a
production build. Output is staged and promoted only after all checks pass.
"""
import argparse
import json
import math
import tempfile
from pathlib import Path

from build_collections import parse_collections, MATERIALS
from build_summaries import calculate, GROUPS, DETAIL
from build_comparison import calculate_comparison


def validate_outputs(rows, monthly, detail, comparison):
    if not rows:
        raise ValueError('No source records')
    if any(r['type'] not in MATERIALS or not math.isfinite(r['kg']) or r['kg'] <= 0 for r in rows):
        raise ValueError('Invalid collection record')
    if len(monthly['months']) != len(set(monthly['months'])):
        raise ValueError('Duplicate month in output')
    months = set(monthly['months'])
    for name, obj in [('monthly', monthly), ('detail', detail)]:
        for section in ('recorded', 'imputed'):
            for i, item in enumerate(obj[section]):
                if item['month'] not in months or not isinstance(item['kg'], (int,float)) or not math.isfinite(item['kg']) or item['kg'] < 0:
                    raise ValueError(f'{name}.{section}[{i}] invalid month or weight')
    total = sum(r['kg'] for r in rows)
    recorded = sum(x['kg'] for x in monthly['recorded'])
    if abs(total-recorded)>1e-5:
        raise ValueError(f'Recorded totals do not reconcile: {total} vs {recorded}')
    expected_imputed = sum(r['kg'] for r in rows if r['type']!='Batteries')
    actual_imputed = sum(x['kg'] for x in monthly['imputed'])
    if abs(expected_imputed-actual_imputed)>1e-5:
        raise ValueError(f'Imputed totals do not reconcile: {expected_imputed} vs {actual_imputed}')
    for section in ('recorded','imputed'):
        dry = {(r['month']):r['kg'] for r in monthly[section] if r['group']=='Dry recycling'}
        for month in months:
            subtotal=sum(r['kg'] for r in detail[section] if r['month']==month)
            if abs(dry[month]-subtotal)>1e-5:
                raise ValueError(f'Dry recycling detail mismatch: {section} {month}')
    values=comparison['projectedAdditionalKg']
    if not all(math.isfinite(values[k]) and values[k]>=0 for k in ('low','central','high')):
        raise ValueError('Nonfinite/negative projection')
    if not values['low']<=values['central']<=values['high']:
        raise ValueError('Projection scenarios out of order')
    return {'records':len(rows),'weight_kg':round(total,6),'months':len(months),
            'complete_through':monthly['metadata']['completeThrough'],
            'comparison_through':comparison['metadata']['comparisonCompleteThrough']}


def build(csv_path, output):
    rows=parse_collections(csv_path)
    monthly,detail=calculate(rows)
    comparison=calculate_comparison(rows)
    summary=validate_outputs(rows,monthly,detail,comparison)
    payloads={'collections':rows,'monthly':monthly,'detail':detail,'comparison':comparison}
    output=Path(output)
    output.mkdir(parents=True,exist_ok=True)
    # Serialize and validate in a temporary folder before replacing any output.
    with tempfile.TemporaryDirectory(prefix='waste-build-') as tmp:
        staged=Path(tmp)
        for name,obj in payloads.items():
            p=staged/f'{name}.json'
            p.write_text(json.dumps(obj,indent=2,ensure_ascii=False,allow_nan=False)+'\n',encoding='utf-8')
            json.loads(p.read_text(encoding='utf-8'))
        for name in payloads:
            (staged/f'{name}.json').replace(output/f'{name}.json')
    return summary


def main():
    p=argparse.ArgumentParser(description='Offline build; does not publish website JSON')
    p.add_argument('--csv',required=True,type=Path)
    p.add_argument('--output',default='build/data',type=Path)
    args=p.parse_args()
    summary=build(args.csv,args.output)
    print('PASS: generated and validated four JSON files')
    print(json.dumps(summary,indent=2))
    print(f'Output: {args.output.resolve()} (not the website data directory)')

if __name__=='__main__':main()
