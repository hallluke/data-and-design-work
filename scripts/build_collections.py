"""Checkpoint 1: parse and validate the source CSV; reproduce collections.json."""
import argparse
import csv
import datetime as dt
import json
import math
from collections import Counter
from pathlib import Path

from material_config import SOURCE_NAMES as MATERIALS
FIELDS = ['Date','Material','Weight (kg)']


def parse_collections(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != FIELDS:
            raise ValueError(f'Expected CSV headings {FIELDS}; found {reader.fieldnames!r}')
        records = []
        errors = []
        for line, row in enumerate(reader, start=2):
            if not any((value or '').strip() for value in row.values() if isinstance(value,str)):
                continue
            try:
                if None in row or any(row[k] is None for k in FIELDS):
                    raise ValueError('missing or extra CSV columns')
                raw_date, material, raw_weight = (row[k].strip() for k in FIELDS)
                date = dt.datetime.strptime(raw_date, '%d/%m/%Y').date()
                if date.strftime('%d/%m/%Y') != raw_date:
                    raise ValueError('date must use DD/MM/YYYY')
                if material not in MATERIALS:
                    raise ValueError(f'unknown material {material!r}')
                if not raw_weight:
                    raise ValueError('blank weight')
                weight = float(raw_weight)
                if not math.isfinite(weight) or weight <= 0:
                    raise ValueError('weight must be finite and positive')
                records.append({'date':date.isoformat(),'type':material,'kg':weight})
            except (ValueError,TypeError,OverflowError) as exc:
                errors.append(f'CSV line {line}: {exc}')
        duplicates = Counter((r['date'],r['type']) for r in records)
        errors.extend(f'duplicate date/material: {key!r} ({count} occurrences)' for key,count in duplicates.items() if count>1)
        if not records:errors.append('no collection records found')
        if errors:raise ValueError('Source validation failed:\n'+'\n'.join(errors))
        return sorted(records,key=lambda r:r['date'])


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('csv',type=Path)
    parser.add_argument('--output',type=Path)
    parser.add_argument('--compare',type=Path)
    args=parser.parse_args()
    records=parse_collections(args.csv)
    if args.compare:
        existing=json.loads(args.compare.read_text(encoding='utf-8'))
        if records != existing:
            raise SystemExit('FAIL: generated collection records differ from reference JSON')
        print('PASS: records exactly match reference collections.json')
    print(f'PASS: {len(records)} records, {sum(r["kg"] for r in records):.3f} kg, {records[0]["date"]} to {records[-1]["date"]}')
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(records,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        print(f'Wrote {args.output}')

if __name__=='__main__':main()
