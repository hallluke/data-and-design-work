"""Regenerate browser-readable material configuration from the canonical JSON."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'config/materials.json').read_text(encoding='utf-8'))
(root/'js/material-registry.js').write_text('// Generated mirror of config/materials.json; run scripts/sync_materials.py after editing the registry.\nexport default '+json.dumps(config,indent=2,ensure_ascii=False)+';\n',encoding='utf-8')
