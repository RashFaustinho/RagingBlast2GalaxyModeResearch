#!/usr/bin/env python3
"""Bind BLES00978 item indices to original Italian game names/descriptions.

Reads only the two relevant AFS members, never modifies archives. This binding
establishes localized labels, not that every advertised effect works at runtime.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import struct

import preset_research as preset
import zpak_research as zpak
from build_kid_buu_mod import member_body


def afs_member(path, index):
    with path.open('rb') as stream:
        if stream.read(4) != b'AFS\0':
            raise ValueError('Expected AFS archive')
        count = struct.unpack('<I', stream.read(4))[0]
        if not 0 <= index < count:
            raise ValueError('Member outside AFS directory')
        stream.seek(8 + index*8)
        offset, size = struct.unpack('<II', stream.read(8))
        if offset + size > path.stat().st_size:
            raise ValueError('Member extends outside AFS')
        stream.seek(offset)
        data = stream.read(size)
        if len(data) != size:
            raise ValueError('Truncated AFS member')
    return data, {'member_index':index, 'member_offset':offset, 'member_size':size}


def extract(boot, progress, destination, language='IT'):
    if language not in ('IT', 'US'):
        raise ValueError('Supported localization tags: IT, US (English)')
    boot_member, _ = afs_member(boot, 22)
    outer, _ = zpak.read_container(boot_member)
    definitions = member_body(member_body(outer, 'game_resident_param_m.pak'), 'item_parameter.dat')
    rows = preset.item_table(definitions)
    localized_member, source = afs_member(progress, {'IT':1955, 'US':1961}[language])
    container, _ = zpak.read_container(localized_member)
    italian = member_body(container, f'F_Item_{language}.pak')
    texts = {}
    for entry in zpak.members(italian):
        name = entry['name']
        if not name.startswith('ITEM_') or not name.endswith(f'_{language}.txt'):
            raise ValueError('Unexpected Italian item-text name')
        data = italian[entry['offset']:entry['offset']+entry['size']]
        if not data.startswith(b'\xff\xfe'):
            raise ValueError('Expected UTF16LE BOM')
        texts[int(name[5:-7])] = data.decode('utf-16').rstrip('\0')
    if len(rows) != 381 or len(texts) != 750:
        raise ValueError('Unexpected BLES00978 item/text counts')
    decoded = []
    for index, row in enumerate(rows):
        # Twelve u32 bitmaps occupy record words9..20 (384 possible flags).
        flags = [f'{word*32+bit:X}' for word in range(12) for bit in range(32)
                 if row[9+word] & (1 << bit)]
        decoded.append({'item_index_hex':f'{index:03X}', 'item_index_decimal':index,
                        'name_text_id':row[0], 'description_text_id':row[1],
                        f'game_name_{"it" if language == "IT" else "en"}':texts[row[0]],
                        f'game_description_{"it" if language == "IT" else "en"}':texts[row[1]],
                        'property_flag_indices_hex':' '.join(flags)})
    with destination.open('x', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(decoded[0]))
        writer.writeheader()
        writer.writerows(decoded)
    return dict(source, language_tag=language, definition_sha256=hashlib.sha256(definitions).hexdigest(),
                inner_sha256=hashlib.sha256(italian).hexdigest(),
                definition_count=len(rows), text_files=len(texts),
                binding='word0 is name-text ID; word1 is description-text ID; equip slots use array indices')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--boot-afs', required=True, type=Path)
    parser.add_argument('--progress-afs', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--language', choices=['IT', 'US'], default='IT', help='US selects original English texts')
    args = parser.parse_args()
    print(json.dumps(extract(args.boot_afs, args.progress_afs, args.output, args.language), indent=2))
