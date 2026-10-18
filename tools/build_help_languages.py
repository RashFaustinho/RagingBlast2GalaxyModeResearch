#!/usr/bin/env python3
"""Rebuild local tutorial previews from six privately extracted G_Tutorial packs.

Reads game resources only. Original strings retain PAD tags and line breaks.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zpak_research as zpak


def build(source, output):
    texts, sources = {}, []
    for language in ('US', 'IT', 'FR', 'DE', 'SP', 'JP'):
        name = f'G_Tutorial_{language}.pak'
        data = (source / name).read_bytes()
        rows = []
        for member in zpak.members(data):
            match = re.fullmatch(r'TUTO_(\d+)_' + language + r'\.txt', member['name'])
            if not match:
                raise ValueError('Unexpected tutorial resource name')
            body = data[member['offset']:member['offset'] + member['size']]
            if not body.startswith(b'\xff\xfe'):
                raise ValueError('Expected UTF-16LE BOM')
            rows.append(dict(id=int(match[1]), text=body.decode('utf-16').rstrip('\0')))
        if sorted(row['id'] for row in rows) != list(range(85)):
            raise ValueError('Expected tutorial IDs 0..84')
        texts[language] = rows
        sources.append(dict(file=name, sha256=hashlib.sha256(data).hexdigest(), count=len(rows)))
    output.write_text('/* Original multilingual tutorial previews. Rebuild: tools/build_help_languages.py. */\n'
                      'globalThis.RB2.HELP_LANGUAGES = ' + json.dumps(texts, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    return sources


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(build(args.source, args.output), indent=2))
