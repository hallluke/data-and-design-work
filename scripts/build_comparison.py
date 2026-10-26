"""Reproduce the reference residual-waste provisional estimate from collection intervals.

The comparison cutoff is the last month fully covered by all materials except
residual waste and batteries. The provisional interval ends at that cutoff.
This is an observed-rate scenario, not a calibrated prediction interval.
"""
import argparse
import calendar
import json
from datetime import date, timedelta
from pathlib import Path

from build_summaries import GROUPS


def month_end(d):
    return date(d.year, d.month, calendar.monthrange(d.year, d.month)[1])


def calculate_comparison(rows):
    by_type = {}
    for r in rows:
        by_type.setdefault(r['type'], []).append((date.fromisoformat(r['date']), float(r['kg'])))
    for typ in by_type:
        by_type[typ].sort()
    required = [t for t, g in GROUPS.items() if g not in ('Residual waste', 'Batteries')]
    missing = [t for t in required if not by_type.get(t)]
    if missing:
        raise ValueError(f'Missing collections for comparison cutoff: {missing}')
    earliest_latest = min(by_type[t][-1][0] for t in required)
    cutoff = earliest_latest.replace(day=1) - timedelta(days=1)
    waste = by_type.get('Waste', [])
    if len(waste) < 3:
        raise ValueError('Need at least three residual-waste collections to estimate historical rates')
    # Only use waste collections observed on or before the cutoff.
    waste = [(d, kg) for d, kg in waste if d <= cutoff]
    if len(waste) < 3:
        raise ValueError('Not enough residual-waste collections before the comparison cutoff')
    intervals = [(d - previous_d).days for (previous_d, _), (d, _) in zip(waste, waste[1:])]
    if any(n <= 0 for n in intervals):
        raise ValueError('Residual-waste collection dates must be strictly increasing')
    rates = [kg / days for (_, kg), days in zip(waste[1:], intervals)]
    days_to_cutoff = (cutoff - waste[-1][0]).days
    if days_to_cutoff < 0:
        raise ValueError('Comparison cutoff predates latest residual-waste collection')
    # Weighted daily rate = total weight / total days for completed intervals.
    pooled = sum(kg for _, kg in waste[1:]) / sum(intervals)
    return {
        'metadata': {
            'comparisonCompleteThrough': cutoff.strftime('%Y-%m'),
            'comparisonExcludedFromCutoff': ['Residual waste', 'Batteries'],
            'projectionMaterial': 'Residual waste',
            'projectionLastCollection': waste[-1][0].isoformat(),
            'projectionThrough': cutoff.isoformat(),
            'projectionDays': days_to_cutoff,
            'historicalIntervals': len(intervals),
            'method': 'historical daily accumulation rates; pooled central estimate and observed min/max scenarios; not probability intervals',
        },
        'projectedAdditionalKg': {
            'low': round(min(rates) * days_to_cutoff, 5),
            'central': round(pooled * days_to_cutoff, 5),
            'high': round(max(rates) * days_to_cutoff, 5),
        },
    }


def compare(actual, expected, tolerance=1e-5):
    errors = []
    for key, value in expected['metadata'].items():
        if actual['metadata'].get(key) != value:
            errors.append(f'metadata.{key}: {actual["metadata"].get(key)!r} != {value!r}')
    for key, value in expected['projectedAdditionalKg'].items():
        actual_value = actual['projectedAdditionalKg'].get(key)
        if actual_value is None or abs(actual_value - value) > tolerance:
            errors.append(f'projectedAdditionalKg.{key}: {actual_value!r} != {value!r}')
    return errors


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--collections', default='reference/collections.json')
    parser.add_argument('--reference', default='reference/comparison.json')
    parser.add_argument('--output', default='generated/comparison.json')
    args = parser.parse_args()
    obj = calculate_comparison(json.loads(Path(args.collections).read_text()))
    expected = json.loads(Path(args.reference).read_text())
    errors = compare(obj, expected)
    print('Comparison metadata:', obj['metadata'])
    print('Projection:', obj['projectedAdditionalKg'])
    if errors:
        raise SystemExit('REGRESSION FAILURE:\n' + '\n'.join(errors))
    print('PASS: comparison.json matches reference within 0.00001 kg')
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(obj, indent=2) + '\n')
