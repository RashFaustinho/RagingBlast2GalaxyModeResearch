#!/usr/bin/env python3
"""Reproduce stock RB2 music-label and mode-selection evidence, read-only.

The resident table stores stream numbers/banks, not localization text IDs.
Requires the original ELF hash checked by elf_evidence and Capstone 5.0.7.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct

from elf_evidence import EXPECTED, bytes_at, load_segments
import zpak_research as zpak


def analyze(elf, parameters, names):
    from capstone import Cs, CS_ARCH_PPC, CS_MODE_BIG_ENDIAN, CS_MODE_64
    raw = elf.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED:
        raise ValueError('Different executable: rediscover native addresses first')
    segments = load_segments(raw)
    read = lambda a, n: bytes_at(raw, segments, a, a + n)[1]
    word = lambda a: struct.unpack('>I', read(a, 4))[0]
    decoder = Cs(CS_ARCH_PPC, CS_MODE_64 | CS_MODE_BIG_ENDIAN)
    decoder.skipdata = True
    instruction = lambda a: next(decoder.disasm_lite(read(a, 4), a))[2:]
    expected = {
        0x1C07D8: ('cmpwi', 'cr7, r31, 0x1e'),
        0x1C07DC: ('cmpwi', 'cr6, r31, 0x1f'),
        0x1C07E0: ('beq', 'cr7, 0x1c0840'),
        0x1C07E4: ('cmpwi', 'cr7, r31, 0x38'),
        0x1C07E8: ('beq', 'cr6, 0x1c0860'),
        0x1C07EC: ('beq', 'cr7, 0x1c08a0'),
        0x1C0840: ('lwz', 'r0, 0xaf0(r3)'),
        0x1C0860: ('lwz', 'r0, 0xb20(r3)'),
        0x1C08A0: ('lwz', 'r0, 0xa30(r3)'),
        0x1ED7DC: ('lhz', 'r0, 0xc(r21)'),
        0x1ED7E0: ('cmpwi', 'cr7, r0, 0x38'),
        0x1ED7E4: ('li', 'r4, 6'),
        0x210BFC: ('lhz', 'r4, 0xc(r21)'),
        0x210C04: ('bl', '0x1cd6f0'),
        0x3F7C3C: ('cmpdi', 'cr7, r4, 0x38'),
        0x271714: ('lwz', 'r4, 0x1c(r3)'),
        0x27172C: ('bl', '0x26f740'),
        0x271730: ('mr', 'r27, r3'),
        0x2717DC: ('clrldi', 'r4, r27, 0x20'),
        0x2717E0: ('bl', '0x1cd6f0'),
        0x273DF8: ('stw', 'r0, 0x78(r3)'),
    }
    for address, pair in expected.items():
        if instruction(address) != pair:
            raise ValueError(f'Native evidence mismatch at {address:X}')
    pak = names.read_bytes()
    entries = zpak.members(pak)
    texts = {}
    for e in entries:
        if e['name'].startswith('BGM_') and e['name'].endswith('_US.txt'):
            texts[int(e['name'].split('_')[1])] = pak[e['offset']:e['offset']+e['size']].decode('utf-16').rstrip('\0')
    if len(texts) != 60:
        raise ValueError('Expected sixty original English BGM text resources')
    resident = (parameters / 'game_resident_bgm_table_US.dat').read_bytes()
    japanese = (parameters / 'game_resident_bgm_table_JP.dat').read_bytes()
    if len(resident) != 16 + 56 * 8 or struct.unpack_from('>I', resident)[0] != 56:
        raise ValueError('Unexpected music parameter geometry')
    special = {30: (0xAF0 - 16)//48, 31: (0xB20 - 16)//48, 56: (0xA30 - 16)//48}
    catalog = []
    for selector in range(57):
        text_id = special.get(selector, selector if selector < 32 else selector - 2)
        row = dict(id=selector, nameTextID=text_id, originalName=texts[text_id])
        if selector < 56:
            offset = 16 + selector * 8
            stream, bank, opaque = struct.unpack_from('>IHH', resident, offset)
            jp_stream, jp_bank, _ = struct.unpack_from('>IHH', japanese, offset)
            row.update(recordHex=resident[offset:offset+8].hex(), stream=stream,
                       bank='US' if bank == 1 else 'JP' if bank == 0 else str(bank),
                       audioPath=f'sound/{"US" if bank == 1 else "JP"}/bgm/bgm_{stream:02d}_{"us" if bank == 1 else "jp"}.adx',
                       jpTableStream=jp_stream, jpTableBank=jp_bank, opaque=opaque)
        catalog.append(row)
    toc = 0x6E8D90
    zone_table = word(toc - 0x238)
    pools = {
        'ordinaryStageTypes': list(struct.unpack('>18I', read(zone_table + 0x90, 18*4))),
        'climaxLastStageTypes': list(struct.unpack('>12I', read(zone_table + 0x60, 12*4))),
    }
    if struct.unpack('>f', read(toc + 0x644C, 4))[0] != 56:
        raise ValueError('Low-level random selector range changed')
    ranges = {
        'name_dispatch': (0x1C07AC, 0x1C08C0),
        'stream_table_and_bank': (0x3F7F34, 0x3F819C),
        'low_level_random': (0x3F7C3C, 0x3F7CB4),
        'galaxy_fallback': (0x1ED7DC, 0x1ED7FC),
        'tutorial_passthrough': (0x210BFC, 0x210C08),
        'zone_music_choice': (0x26F740, 0x26F8C8),
        'zone_config_consumer': (0x271700, 0x2717E8),
        'zone_stage_type_flag': (0x273DB0, 0x273DFC),
        'zone_climax_last_predicates': (0x26CE24, 0x26CE84),
    }
    disassembly = {name: [f'{a:08X} {m} {o}'.rstrip() for a, _, m, o in decoder.disasm_lite(read(start, end-start), start)] for name, (start, end) in ranges.items()}
    return dict(elfSHA256=EXPECTED, verification='Read-only native-code and original-resource analysis; no listening/gameplay test',
                catalog=catalog, nativeRandomPools=pools,
                zoneLastIndex7=dict(normal=48, ultimate=51),
                semantics=dict(selector30='Battle of Omega (Solo Guitar); name text58, stream54 JP',
                               selector31='Battle of Omega (Full); name text59, stream55 JP',
                               selector56='Random sentinel, outside the 56-row stream table',
                               galaxy56='Converted to selector6 before battle setup',
                               tutorial56='Passed through to the low-level random resolver (0..55)',
                               zone='Root+0x20 does not select the track. Native stage-type pools and final-zone special cases feed battle config+0x38 instead.'),
                sourceSHA256={names.name: hashlib.sha256(pak).hexdigest(), 'game_resident_bgm_table_US.dat': hashlib.sha256(resident).hexdigest(), 'game_resident_bgm_table_JP.dat': hashlib.sha256(japanese).hexdigest()},
                disassembly=disassembly)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--elf', type=Path, required=True)
    p.add_argument('--parameters', type=Path, required=True)
    p.add_argument('--names', type=Path, required=True)
    args = p.parse_args()
    print(json.dumps(analyze(args.elf, args.parameters, args.names), indent=2))
