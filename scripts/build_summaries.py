#!/usr/bin/env python3
"""Rebuild recorded and interval-imputed monthly summaries from validated collections."""
import argparse, calendar, json
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

GROUPS={'Waste':'Residual waste','Food Waste':'Food waste','Soft plastic':'Soft plastics','Batteries':'Batteries',**{x:'Dry recycling' for x in ['Glass','Cardboard','Tin','Plastic','Paper']}}
DETAIL=['Glass','Cardboard','Tin','Plastic','Paper']
REC_GROUPS=['Residual waste','Food waste','Dry recycling','Soft plastics','Batteries']
IMP_GROUPS=REC_GROUPS[:-1]
START=date(2025,1,1)

def months_between(first,last):
    y,m=first.year,first.month
    while (y,m)<=(last.year,last.month):
        yield f'{y:04d}-{m:02d}'
        y,m=(y+1,1) if m==12 else (y,m+1)

def calculate(rows, start=START):
    rows=sorted(rows,key=lambda r:(r['date'],r['type']))
    end=date.fromisoformat(rows[-1]['date']); months=list(months_between(start,end))
    recorded=defaultdict(float); imputed=defaultdict(float)
    previous={}
    for r in rows:
        t=r['type']; d=date.fromisoformat(r['date']); kg=r['kg']; group=GROUPS[t]
        recorded[(d.strftime('%Y-%m'),t)]+=kg
        if t=='Batteries':continue # Excluded from interval imputation in reference dataset.
        prev=previous.get(t,start-timedelta(days=1))
        if d<=prev: raise ValueError(f'Non-increasing collection date for {t}: {d}')
        days=(d-prev).days; daily=kg/days
        for offset in range(1,days+1):
            day=prev+timedelta(days=offset)
            if day>=start:imputed[(day.strftime('%Y-%m'),t)]+=daily
        previous[t]=d
    def sum_group(d,m,g):return sum(v for (month,t),v in d.items() if month==m and GROUPS[t]==g)
    def group_rows(d,groups):return [{'month':m,'group':g,'kg':round(sum_group(d,m,g),8)} for m in months for g in groups]
    def detail_rows(d):return [{'month':m,'type':t,'kg':round(d[(m,t)],8)} for m in months for t in DETAIL]
    # Completeness requires at least one subsequent collection of each interval-imputed material.
    # Last fully covered month is the month before the earliest latest-collection month.
    latest=min(previous.values())
    complete=(latest.replace(day=1)-timedelta(days=1)).strftime('%Y-%m')
    monthly={'months':months,'groups':IMP_GROUPS,'imputed':group_rows(imputed,IMP_GROUPS),'recorded':group_rows(recorded,REC_GROUPS),
             'metadata':{'completeThrough':complete,'imputationStart':start.isoformat(),'completenessMethod':'collection-interval',
             'note':'Complete through the last calendar month covered by subsequent collections of every imputed material. Update in the data pipeline.'}}
    detail={'imputed':detail_rows(imputed),'recorded':detail_rows(recorded)}
    return monthly,detail

def compare(actual,expected,tag):
    problems=[]; maxdiff=0; count=0
    for section in ('recorded','imputed'):
        a=actual[section]; e=expected[section]
        if len(a)!=len(e):problems.append(f'{section}: {len(a)} vs {len(e)} rows');continue
        for i,(x,y) in enumerate(zip(a,e)):
            if {k:v for k,v in x.items() if k!='kg'}!={k:v for k,v in y.items() if k!='kg'}:
                problems.append(f'{section} row {i}: keys differ');continue
            delta=abs(x['kg']-y['kg']);maxdiff=max(maxdiff,delta);count+=1
            if delta>1e-5 and len(problems)<12:problems.append(f'{section} {x}: reference kg={y["kg"]}, delta={delta:.8f}')
    print(f'{tag}: {count} values checked; maximum absolute difference {maxdiff:.10f} kg')
    if problems: print('  MISMATCHES:',*problems,sep='\n  ')
    else: print('  All values match within 0.00001 kg')
    return problems

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--collections',default='reference/collections.json');p.add_argument('--reference',default='reference');p.add_argument('--output',default='generated');args=p.parse_args()
    rows=json.loads(Path(args.collections).read_text());monthly,detail=calculate(rows)
    out=Path(args.output);out.mkdir(exist_ok=True,parents=True)
    for name,obj in [('monthly',monthly),('detail',detail)]:
        (out/f'{name}.json').write_text(json.dumps(obj,indent=2)+'\n')
        compare(obj,json.loads((Path(args.reference)/f'{name}.json').read_text()),name)
    expected=json.loads((Path(args.reference)/'monthly.json').read_text())
    print('Monthly metadata:',monthly['metadata']);print('Reference metadata:',expected['metadata'])
