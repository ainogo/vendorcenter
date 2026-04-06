"""Inject base64-encoded training data into notebook Cell 2."""
import json, os, sys

NOTEBOOK = os.path.join(os.path.dirname(__file__), '..', 'notebooks', 'finetune_vendorcenter.ipynb')
B64_FILE = os.path.join(os.path.dirname(__file__), '..', 'training-data', '.jsonl_b64.txt')

# Read base64 data
with open(B64_FILE, 'r') as f:
    b64_data = f.read().strip()
print(f"Base64 data: {len(b64_data)} chars")

# Read notebook
with open(NOTEBOOK, 'r', encoding='utf-8') as f:
    nb = json.load(f)

# Find the upload cell (Cell index 2 = 3rd cell, after markdown header + pip install)
target_idx = 2
cell = nb['cells'][target_idx]
old_src = ''.join(cell.get('source', []))
print(f"Target cell [{target_idx}] current first line: {old_src[:80]}...")

# Build new cell source with inline base64
new_source = [
    "# Cell 2: Transfer training data (base64-encoded gzip)\n",
    "import base64, gzip, os\n",
    "\n",
    'B64 = "' + b64_data + '"\n',
    "\n",
    "data = gzip.decompress(base64.b64decode(B64))\n",
    "with open('vendorcenter_train.jsonl', 'wb') as f:\n",
    "    f.write(data)\n",
    "size_kb = os.path.getsize('vendorcenter_train.jsonl') / 1024\n",
    "print(f'Training file written: {size_kb:.1f} KB')\n",
]

cell['source'] = new_source
cell['outputs'] = []
cell['execution_count'] = None

# Write back
with open(NOTEBOOK, 'w', encoding='utf-8', newline='\n') as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

total_chars = sum(len(s) for s in new_source)
print(f"Cell updated: {total_chars} chars total")
print("Done. Reload notebook in VS Code.")
