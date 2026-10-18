#!/usr/bin/env python3
"""Check the curated research inventory, claim links and local Markdown targets.

--write-index explicitly refreshes the inventory after intentional research edits.
The normal read-only check rejects stale hashes, missing/new files and game binaries.
It does not certify old gameplay observations or assign new meanings to raw labels.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'research'
INDEX = RESEARCH / 'EVIDENCE_INDEX.json'
FORBIDDEN = {'.mmd', '.dat', '.afs', '.pak', '.zpak', '.elf', '.exe', '.bin', '.rb2project'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def research_files():
    return sorted(p for p in RESEARCH.rglob('*') if p.is_file()
                  and '__pycache__' not in p.parts and p != INDEX)


def role(path):
    rel = path.relative_to(RESEARCH)
    if rel.parts[0] == 'publication-checks':
        return 'Selected static or delta-reproduction evidence rerun for publication; no new gameplay'
    if path.suffix == '.md' and len(rel.parts) == 1:
        return 'English topic guide or reference manual; see FINDINGS.md for current authority'
    if path.suffix == '.csv':
        return 'Decoded original-file catalog; IDs and observations retain their stated namespaces'
    if path.suffix == '.png':
        return 'Recorded screenshot; not independent evidence of a complete save/cold-load path'
    if path.suffix == '.jsonl':
        return 'Historical debugger observations/interventions; interpret with experiment history'
    if 'patch' in path.name.lower() or path.suffix == '.yml':
        return 'Historical exact-input experimental delta; not a supported Studio installation'
    return 'Structured/static or historical evidence; pending/derived labels may be superseded'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write-index', action='store_true')
    args = parser.parse_args()
    files = research_files()
    errors = []
    if args.write_index:
        INDEX.write_text(json.dumps({
            'schema_version': 1,
            'authority': 'FINDINGS.md, CLAIMS.json and current topic guides; historical labels are not silently upgraded',
            'files': [{'path': str(p.relative_to(RESEARCH)), 'bytes': p.stat().st_size,
                       'sha256': digest(p), 'role': role(p)} for p in files],
        }, indent=2) + '\n')
    inventory = json.loads(INDEX.read_text())['files']
    indexed = {item['path']: item for item in inventory}
    actual = {str(p.relative_to(RESEARCH)): p for p in files}
    if len(indexed) != len(inventory) or set(indexed) != set(actual):
        errors.append('Research inventory is incomplete, duplicated or stale')
    for name, p in actual.items():
        item = indexed.get(name, {})
        if item.get('sha256') != digest(p) or item.get('bytes') != p.stat().st_size:
            errors.append('Research file changed: ' + name)
    claims = json.loads((RESEARCH / 'CLAIMS.json').read_text())['claims']
    if len({c['id'] for c in claims}) != len(claims):
        errors.append('Duplicate finding IDs')
    for c in claims:
        if not c['evidence_levels'] or not c['limits']:
            errors.append('Finding lacks scope: ' + c['id'])
        for source in c['evidence']:
            if not (RESEARCH / source).is_file():
                errors.append(c['id'] + ': missing evidence ' + source)
    checked_links = 0
    for p in ROOT.rglob('*'):
        if not p.is_file() or '.git' in p.parts or '__pycache__' in p.parts:
            continue
        if p.suffix.lower() in FORBIDDEN:
            errors.append('Game/input binary in publication tree: ' + str(p.relative_to(ROOT)))
        if p.name.startswith('RB2 Galaxy Research Part ') and p.suffix == '.html':
            errors.append('Private Discord export remains in current tree')
        if p.suffix != '.md':
            continue
        for match in re.finditer(r'!?\[[^\]]*\]\(([^)\n]+)\)', p.read_text()):
            target = match.group(1).strip().strip('<>')
            if target.startswith(('https:', 'http:', 'mailto:', '#')):
                continue
            checked_links += 1
            path = p.parent / unquote(target.split('#')[0])
            if not path.exists():
                errors.append(str(p.relative_to(ROOT)) + ': broken link ' + target)
    result = {'result': 'FAIL' if errors else 'PASS', 'research_files': len(files),
              'claims': len(claims), 'local_markdown_links_checked': checked_links,
              'errors': errors, 'scope': 'Inventory, links and file exclusions; not a gameplay replay'}
    print(json.dumps(result, indent=2))
    return bool(errors)


if __name__ == '__main__':
    raise SystemExit(main())
