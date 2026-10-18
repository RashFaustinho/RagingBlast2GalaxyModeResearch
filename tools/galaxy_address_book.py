#!/usr/bin/env python3
"""Print HxD file offsets for one Galaxy mission and export a mission index.

Read-only. Requires extracted MAIN galaxy.mmd and three extracted DAT tables.
All IDs on the command line are decimal. Output offsets are hexadecimal.
"""
import argparse
import csv
import json
import struct
from pathlib import Path
import mmd_research as mmd
from preset_research import table

def reference(galaxy, parameters):
    data = galaxy.read_bytes()
    info = mmd.inspect(data)
    ds = info['descriptors']
    root_index, _, _, galaxy_index, _ = info['header']['raw_words_0x10_through_0x20']
    roots, galaxies = ds[root_index], ds[galaxy_index]
    if roots['element_size_candidate'] != 92 or galaxies['element_size_candidate'] != 12:
        raise ValueError('Unexpected mission/galaxy table geometry')
    preset_path = parameters / 'preset_character_galaxy.dat'
    presets = table(preset_path.read_bytes(), 44)
    appearances = table((parameters / 'preset_appearance_table.dat').read_bytes(), 32)
    strengths = table((parameters / 'preset_strength_table.dat').read_bytes(), 88)
    owners = {}
    for native in range(galaxies['count_candidate']):
        _, ref, start, _ = struct.unpack_from('>IIHH', data, galaxies['absolute_offset'] + native * 12)
        if not ref:
            continue
        desc = ds[ref]
        if desc['element_size_candidate'] != 4:
            raise ValueError('Unexpected galaxy node list')
        for j in range(desc['count_candidate']):
            node = struct.unpack_from('>H', data, desc['absolute_offset'] + j * 4)[0]
            owners.setdefault(node, []).append(native)
    rows = []
    for n in range(roots['count_candidate']):
        root = roots['absolute_offset'] + n * 92
        stage, category, music = struct.unpack_from('>3H', data, root + 8)
        group_index = struct.unpack_from('>I', data, root + 0x28)[0]
        row = dict(node=n, galaxy_native_ids=owners.get(n, []), root_offset=hex(root),
                   stage_id=stage, stage_offset=hex(root+8), category_code=category,
                   category_offset=hex(root+10), music_id=music, music_offset=hex(root+12),
                   enemy_group_descriptor=group_index, enemies=[])
        if group_index:
            group = ds[group_index]
            tag, roster_index = struct.unpack_from('>2I', data, group['absolute_offset'])
            row['group_tag'] = hex(tag)
            if tag == 0:
                roster = ds[roster_index]
                if roster['element_size_candidate'] != 8:
                    raise ValueError('Unexpected participant record geometry')
                row.update(roster_descriptor=roster_index, roster_descriptor_offset=hex(roster['table_offset']),
                           roster_offset=hex(roster['absolute_offset']), enemy_count=roster['count_candidate'])
                for slot in range(roster['count_candidate']):
                    a = roster['absolute_offset'] + slot * 8
                    pi, opaque, extra = struct.unpack_from('>HHI', data, a)
                    p = presets[pi]; ai, si = p[:2]; app, strength = appearances[ai], strengths[si]
                    row['enemies'].append(dict(slot=slot, participant_offset=hex(a), preset_id=pi,
                      preset_offset=hex(16+pi*44), appearance_id=ai, appearance_offset=hex(16+ai*32),
                      native_id=app[0], costume_index=app[1], strength_id=si, strength_offset=hex(16+si*88),
                      item_slot0_offset=hex(16+si*88+8), level_word=strength[0], ai_type_word=hex(strength[1]),
                      items_hex=[f'{i:03X}' for i in strength[2:] if i!=0xFFFFFFFF],
                      forward_preset_links=[hex(i) for i in p[3:7]],
                      opaque_u16=opaque, extra_descriptor=extra))
        rows.append(row)
    return rows

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--galaxy', type=Path, required=True)
    p.add_argument('--parameters', type=Path, required=True)
    p.add_argument('--node', type=int)
    p.add_argument('--csv', type=Path)
    a = p.parse_args(); rows = reference(a.galaxy, a.parameters)
    if a.csv:
        with a.csv.open('x', newline='', encoding='utf-8') as f:
            fields = ['node','galaxy_native_ids','root_offset','stage_id','stage_offset','category_code',
                      'music_id','music_offset','enemy_group_descriptor','roster_descriptor',
                      'roster_descriptor_offset','roster_offset','enemy_count','enemy_preset_ids','enemy_native_ids']
            w=csv.DictWriter(f, fieldnames=fields);w.writeheader()
            for r in rows:
                out={k:r.get(k,'') for k in fields}
                out['galaxy_native_ids']=';'.join(map(str,r['galaxy_native_ids']))
                out['enemy_preset_ids']=';'.join(str(e['preset_id']) for e in r['enemies'])
                out['enemy_native_ids']=';'.join(str(e['native_id']) for e in r['enemies'])
                w.writerow(out)
    if a.node is not None:
        if not 0<=a.node<len(rows):p.error('Node outside mission table')
        print(json.dumps(rows[a.node],indent=2))
    elif not a.csv:
        print(json.dumps(rows,indent=2))
if __name__=='__main__':
    main()
