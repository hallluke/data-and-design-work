"""Strict structural and cross-dataset validation for the waste pipeline."""
import math
from collections import Counter
from datetime import date, timedelta
from build_collections import MATERIALS
from material_config import NON_IMPUTED, RESIDUAL_SOURCE, GROUPS_BY_ID
from build_summaries import GROUPS, DETAIL, REC_GROUPS, IMP_GROUPS, START, months_between

TOL = 1e-5

def require(ok, message):
    if not ok:
        raise ValueError(message)

def finite_weight(v, where, positive=False):
    require(type(v) in (float, int) and math.isfinite(v) and (v > 0 if positive else v >= 0), f'{where}: invalid weight')

def validate_dataset(rows, monthly, detail, comparison):
    require(isinstance(rows, list) and bool(rows), 'No source records')
    seen = set()
    for i, r in enumerate(rows):
        require(isinstance(r, dict) and set(r) == {'date','type','kg'}, f'collections[{i}]: invalid keys')
        try:
            d = date.fromisoformat(r['date'])
        except (TypeError, ValueError):
            raise ValueError(f'collections[{i}]: invalid ISO date') from None
        require(d.isoformat() == r['date'] and d >= START, f'collections[{i}]: date before imputation start or malformed')
        require(r['type'] in MATERIALS, f'collections[{i}]: invalid material')
        finite_weight(r['kg'], f'collections[{i}]', positive=True)
        key = (r['date'], r['type'])
        require(key not in seen, f'collections[{i}]: duplicate date/material')
        seen.add(key)
    require(isinstance(monthly, dict) and set(monthly) == {'months','groups','recorded','imputed','metadata'}, 'monthly: invalid structure')
    require(isinstance(detail, dict) and set(detail) == {'recorded','imputed'}, 'detail: invalid structure')
    require(isinstance(comparison, dict) and set(comparison) == {'metadata','projectedAdditionalKg'}, 'comparison: invalid structure')
    months = list(months_between(START, max(date.fromisoformat(r['date']) for r in rows)))
    require(monthly['months'] == months, 'monthly.months: missing, duplicate or unexpected months')
    require(monthly['groups'] == IMP_GROUPS, 'monthly.groups: unexpected groups')
    require(isinstance(monthly['metadata'], dict) and monthly['metadata'].get('imputationStart') == START.isoformat(), 'monthly: incorrect imputation start')
    latest_by_material = {t:max(date.fromisoformat(r['date']) for r in rows if r['type']==t) for t in MATERIALS if any(r['type']==t for r in rows)}
    imputed_materials = set(MATERIALS)-NON_IMPUTED
    require(imputed_materials <= latest_by_material.keys(), 'monthly: missing imputed material')
    monthly_latest = min(latest_by_material[t] for t in imputed_materials)
    monthly_expected = (monthly_latest.replace(day=1)-timedelta(days=1)).strftime('%Y-%m')
    require(monthly['metadata'].get('completeThrough') == monthly_expected, 'monthly: incorrect completeness cutoff')
    comparison_materials = imputed_materials-{RESIDUAL_SOURCE}
    comparison_latest = min(latest_by_material[t] for t in comparison_materials)
    comparison_expected = (comparison_latest.replace(day=1)-timedelta(days=1)).strftime('%Y-%m')
    require(comparison['metadata'].get('comparisonCompleteThrough') == comparison_expected, 'comparison: incorrect completeness cutoff')
    expected_monthly = {'recorded': REC_GROUPS, 'imputed': IMP_GROUPS}
    for section, groups in expected_monthly.items():
        records = monthly[section]
        require(isinstance(records, list), f'monthly.{section}: not a list')
        require(len(records) == len(months)*len(groups), f'monthly.{section}: missing/extra rows')
        for i, (month, group) in enumerate((m,g) for m in months for g in groups):
            r = records[i]
            require(isinstance(r, dict) and set(r) == {'month','group','kg'} and r['month']==month and r['group']==group, f'monthly.{section}[{i}]: incorrect row/order')
            finite_weight(r['kg'], f'monthly.{section}[{i}]')
    for section in ('recorded','imputed'):
        records=detail[section]
        require(isinstance(records, list) and len(records)==len(months)*len(DETAIL), f'detail.{section}: missing/extra rows')
        for i, (month, typ) in enumerate((m,t) for m in months for t in DETAIL):
            r=records[i]
            require(isinstance(r, dict) and set(r)=={'month','type','kg'} and r['month']==month and r['type']==typ, f'detail.{section}[{i}]: incorrect row/order')
            finite_weight(r['kg'], f'detail.{section}[{i}]')
    total=sum(r['kg'] for r in rows)
    recorded=sum(r['kg'] for r in monthly['recorded'])
    require(abs(total-recorded) <= TOL, f'Recorded totals do not reconcile: {total} vs {recorded}')
    expected_imputed=sum(r['kg'] for r in rows if r['type']!='Batteries')
    actual_imputed=sum(r['kg'] for r in monthly['imputed'])
    require(abs(expected_imputed-actual_imputed) <= TOL, f'Imputed totals do not reconcile: {expected_imputed} vs {actual_imputed}')
    # Recorded totals must also reconcile by month and material group.
    recorded_by_group=Counter()
    for r in rows:
        recorded_by_group[(r['date'][:7],GROUPS[r['type']])]+=r['kg']
    for r in monthly['recorded']:
        require(abs(r['kg']-recorded_by_group[(r['month'],r['group'])])<=TOL, f'Recorded group mismatch: {r["month"]} {r["group"]}')
    mixed_label = GROUPS_BY_ID['mixedRecycling']['label']
    for section in ('recorded','imputed'):
        dry={r['month']:r['kg'] for r in monthly[section] if r['group']==mixed_label}
        detail_by_month=Counter()
        for r in detail[section]: detail_by_month[r['month']]+=r['kg']
        for month in months:
            require(abs(dry[month]-detail_by_month[month])<=TOL, f'{mixed_label} detail mismatch: {section} {month}')
    meta=comparison['metadata']
    require(isinstance(meta,dict) and meta.get('projectionMaterial')=='Residual waste', 'comparison: invalid projection material')
    require(meta.get('projectionDays') is not None and type(meta['projectionDays']) is int and meta['projectionDays']>=0, 'comparison: invalid projection days')
    require(type(meta.get('historicalIntervals')) is int and meta['historicalIntervals']>=2, 'comparison: insufficient historical intervals')
    try:
        cutoff=date.fromisoformat(meta['projectionThrough'])
        last=date.fromisoformat(meta['projectionLastCollection'])
    except (TypeError,ValueError):
        raise ValueError('comparison: invalid projection dates') from None
    require((cutoff-last).days == meta['projectionDays'] and cutoff.strftime('%Y-%m')==meta['comparisonCompleteThrough'], 'comparison: inconsistent projection dates')
    values=comparison['projectedAdditionalKg']
    require(isinstance(values,dict) and set(values)=={'low','central','high'}, 'comparison: invalid projection keys')
    for k,v in values.items(): finite_weight(v,f'comparison.{k}')
    require(values['low']<=values['central']<=values['high'], 'Projection scenarios out of order')
    return {'records':len(rows),'weight_kg':round(total,6),'months':len(months),'complete_through':monthly['metadata']['completeThrough'],'comparison_through':meta['comparisonCompleteThrough']}
