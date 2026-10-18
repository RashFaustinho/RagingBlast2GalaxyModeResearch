#!/usr/bin/env python3
"""Reproduce the native identities of Battle Zone result queries 11/12/13.
Read-only PPC64 analysis, with localized Perfect Action/objective label bindings.
No executable writes or claim of a completed gameplay test.
"""
import argparse
import csv
import hashlib
import json
import struct
from pathlib import Path
from elf_evidence import EXPECTED, load_segments, bytes_at

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--elf', required=True, type=Path)
    args = parser.parse_args()
    from capstone import Cs, CS_ARCH_PPC, CS_MODE_64, CS_MODE_BIG_ENDIAN
    raw = args.elf.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == EXPECTED, 'Unsupported executable'
    segments = load_segments(raw)
    decoder = Cs(CS_ARCH_PPC, CS_MODE_64 | CS_MODE_BIG_ENDIAN)
    decoder.skipdata = True
    def data(address, size):
        return bytes_at(raw, segments, address, address + size)[1]
    def u32(address):
        return struct.unpack('>I', data(address, 4))[0]
    def target(table, index):
        return table + struct.unpack('>i', data(table + index * 4, 4))[0]
    def instructions(start, end):
        return [(pc, m, o) for pc, _, m, o in decoder.disasm_lite(data(start, end-start), start)]
    def expect(address, mnemonic, operand):
        got = instructions(address, address + 4)[0]
        assert got[1:] == (mnemonic, operand), (hex(address), got)
    # Exact jump-table bases, not a search for coincidentally matching immediate values.
    assert u32(0x6e8d90 - 0x5408) == 0xf50ac
    assert u32(0x6e8d90 - 0x5424) == 0xf4a60
    assert target(0xf50ac, 87) == 0xf609c
    assert target(0xf50ac, 89) == 0xf6144
    assert target(0xf4a60, 6-5) == 0xf4c10
    checks = {
        0xf60ac: ('ld', 'r0, 0x18(r9)'),
        0xf60b0: ('rldicl', 'r0, r0, 0x3e, 0x3f'), # Super win: side flag bit2 rising
        0xf6154: ('ld', 'r0, 0x18(r9)'),
        0xf6158: ('rldicl', 'r0, r0, 0x3c, 0x3f'), # Ultimate win: side flag bit4 rising
        0xf4c2c: ('ld', 'r0, 0x20(r11)'),
        0xf4c30: ('rldicl', 'r0, r0, 0x3d, 0x3f'), # Raging Soul ends: command flag bit3 falling
        0x1292c0: ('li', 'r4, 3'),
        0x1292c8: ('bl', '0x162ec'),
        0x12939c: ('extsw', 'r9, r27'),
        0x129a64: ('rldicl', 'r0, r9, 0x3d, 0x3f'), # win path reads current Raging Soul flag
        0x129a78: ('ori', 'r0, r0, 0x40'), # records side outcome bit6
        0xf0378: ('ld', 'r0, 0x28(r10)'),
        0xf037c: ('rldicl', 'r0, r0, 0x3e, 0x3f'),
        0xf038c: ('stw', 'r0, 0x28(r7)'),
        0xf03a0: ('rldicl', 'r0, r0, 0x3c, 0x3f'),
        0xf03b0: ('stw', 'r0, 0x2c(r7)'),
        0xf03c4: ('rldicl', 'r0, r0, 0x3a, 0x3f'),
        0xf03d4: ('stw', 'r0, 0x30(r7)'),
        0x2f3e6c: ('lwz', 'r3, 0x60(r9)'),
        0x2f3e3c: ('lwz', 'r3, 0x64(r9)'),
        0x2f3e0c: ('lwz', 'r3, 0x68(r9)'),
        0x271dd8: ('lwz', 'r0, 0x30(r31)'),
        0x271de0: ('stw', 'r0, 0x30(r29)'),
    }
    for address, (mnemonic, operand) in checks.items():
        expect(address, mnemonic, operand)
    action_source = ROOT/'research/advanced/JUST_ACTION_TEXT_IDS_EN.csv'
    objective_source = ROOT/'research/advanced/GALAXY_OBJECTIVE_TYPES_EN.csv'
    actions = {int(r['text_id']): r['text'] for r in csv.DictReader(action_source.open())}
    objectives = {int(r['objective_type']): r['text'] for r in csv.DictReader(objective_source.open())}
    assert actions[87] == 'Win with Super Attack'
    assert actions[89] == 'Win with Ultimate Attack'
    assert 'Raging Soul' in objectives[6]
    ranges = {
        'perfect_action_super_win': (0xf609c, 0xf60c0),
        'perfect_action_ultimate_win': (0xf6144, 0xf6168),
        'raging_soul_objective_expiry': (0xf4c10, 0xf4c40),
        'win_outcome_writer': (0x12932c, 0x1293cc),
        'win_raging_soul_writer': (0x129a64, 0x129a84),
        'history_accumulation': (0x12575c, 0x1257b8),
        'result_collector': (0xf0364, 0xf03d8),
        'root30_copy_only': (0x271d70, 0x271de8),
    }
    print(json.dumps({
        'source_elf_sha256': EXPECTED,
        'scope': 'Static control-flow and localized-label cross-checks; no gameplay test or patch.',
        'instruction_checks': len(checks),
        'queries': {
            '11': {'name': 'Win with a Super Attack', 'proof': 'Perfect Action87 reads side outcome bit2; collector copies the same bit from history into stats+60; query11 reads stats+60.'},
            '12': {'name': 'Win with an Ultimate Attack', 'proof': 'Perfect Action89 reads side outcome bit4; collector copies the same bit from history into stats+64; query12 reads stats+64.'},
            '13': {'name': 'Win while in Raging Soul', 'proof': 'Objective6 (Raging Soul expiry) reads falling command bit3. Win outcome checks current command bit3 and sets side bit6; collector copies its history into stats+68; query13 reads stats+68.'},
        },
        'metadata': 'Root+30 is copied as part of the selected-stage snapshot. The traced native secret requirement/latch/selection does not evaluate it. No functional consumer or intended design purpose established; this does not prove global deadness in all builds.',
        'localized_sources': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in (action_source, objective_source)},
        'disassembly': {name: [f'{pc:08X}: {m} {o}' for pc,m,o in instructions(*span)] for name,span in ranges.items()},
    }, indent=2))

if __name__ == '__main__':
    main()
