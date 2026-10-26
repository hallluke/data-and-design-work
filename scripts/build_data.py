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
from validate_data import validate_dataset
from build_summaries import calculate, GROUPS, DETAIL
from build_comparison import calculate_comparison


def validate_outputs(rows, monthly, detail, comparison):
    """Reject incomplete, malformed, or inconsistent outputs before writing files."""
    return validate_dataset(rows, monthly, detail, comparison)


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
