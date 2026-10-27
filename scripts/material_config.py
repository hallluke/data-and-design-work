"""Shared material registry. Keep calculation rules separate from group membership."""
import json
from pathlib import Path
CONFIG = json.loads((Path(__file__).resolve().parents[1] / 'config' / 'materials.json').read_text(encoding='utf-8'))
MATERIALS_BY_ID = {item['id']: item for item in CONFIG['materials']}
GROUPS_BY_ID = {item['id']: item for item in CONFIG['groups']}
SOURCE_NAMES = frozenset(item['source'] for item in CONFIG['materials'])
SOURCE_TO_GROUP = {item['source']: item['label'] for item in CONFIG['materials']}
for group in CONFIG['groups']:
    for child in group['children']:
        SOURCE_TO_GROUP[MATERIALS_BY_ID[child]['source']] = group['label']
DETAIL = [MATERIALS_BY_ID[mid]['source'] for mid in GROUPS_BY_ID['mixedRecycling']['children']]
REC_GROUPS = [GROUPS_BY_ID[key]['label'] if key in GROUPS_BY_ID else MATERIALS_BY_ID[key]['label'] for key in CONFIG['monthlyGroupOrder']]
IMP_GROUPS = [label for label in REC_GROUPS if label not in {m['label'] for m in CONFIG['materials'] if not m['impute']}]
NON_IMPUTED = frozenset(item['source'] for item in CONFIG['materials'] if not item['impute'])
RESIDUAL_SOURCE = MATERIALS_BY_ID['residualWaste']['source']
