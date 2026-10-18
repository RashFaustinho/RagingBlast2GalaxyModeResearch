#!/usr/bin/env python3
"""Reversible D2 research format. Decrypted BLES00978 SYS-DATA only.

Requires the matching experimental executable, not the original game/GS512.
Writes new files only. Capacities are layout targets, not gameplay guarantees.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct

OLD_SIZE, NEW_SIZE = 55000, 110000
GAL, TUT, BZ = 0xD700, 0x150B0, 0x15820
GAL_COUNT, TUT_COUNT, BZ_CELLS = 1040, 64, 54
GAL_SIZE = GAL_COUNT * 28 + 2000
TUT_SIZE = TUT_COUNT * 28 + 68
BZ_ROUTE = BZ_CELLS * 24 + 20
BZ_MODE = 8 * BZ_ROUTE
BZ_SIZE = 2 * BZ_MODE + 616
MAGIC = b'RB2D2SAVEv1\0'
BANKS = [('galaxy', GAL, GAL_SIZE), ('tutorial', TUT, TUT_SIZE), ('battle_zone', BZ, BZ_SIZE)]


def checksum(data):
    total = (sum(data[8::2]) + 256 * sum(data[9::2])) & 0xFFFFFFFF
    return total >> 8, total & 255


def checked(data):
    if len(data) not in (OLD_SIZE, NEW_SIZE):
        raise ValueError('Expected original 55000 or D2 110000 bytes')
    if struct.unpack_from('>II', data) != checksum(data):
        raise ValueError('Internal checksum mismatch')
    if len(data) == NEW_SIZE and data[-64:-64 + len(MAGIC)] != MAGIC:
        raise ValueError('D2 format marker missing; refusing an unrelated large save')
    if len(data) == NEW_SIZE and struct.unpack_from('>4I', data, NEW_SIZE - 48) != (
            NEW_SIZE, GAL_COUNT, TUT_COUNT, BZ_CELLS):
        raise ValueError('Unsupported D2 layout capacities; refusing a different bank layout')
    return data


def finish(data):
    b = bytearray(data)
    struct.pack_into('>II', b, 0, *checksum(b))
    return bytes(checked(b))


def expand(data):
    checked(data)
    if len(data) != OLD_SIZE:
        raise ValueError('Already expanded')
    b = bytearray(data + b'\xA5' * (NEW_SIZE - OLD_SIZE))
    for _, start, size in BANKS:
        b[start:start + size] = bytes(size)
    b[GAL:GAL + 14000] = data[0x8148:0xB7F8]
    b[GAL + GAL_COUNT * 28:GAL + GAL_SIZE] = data[0xB7F8:0xBFC8]
    b[TUT:TUT + 252] = data[0xBFC8:0xC0C4]
    b[TUT + TUT_COUNT * 28:TUT + TUT_SIZE] = data[0xC0C4:0xC108]
    for mode in range(2):
        for zone in range(8):
            old = 0x5E20 + mode * 0x1060 + zone * 0x20C
            new = BZ + mode * BZ_MODE + zone * BZ_ROUTE
            b[new:new + 508] = data[old:old + 508]
            b[new + BZ_CELLS * 24 + 4:new + BZ_ROUTE] = data[old + 508:old + 524]
    b[BZ + 2 * BZ_MODE:BZ + BZ_SIZE] = data[0x7EE0:0x8148]
    b[-64:-64 + len(MAGIC)] = MAGIC
    struct.pack_into('>4I', b, NEW_SIZE - 48, NEW_SIZE, GAL_COUNT, TUT_COUNT, BZ_CELLS)
    return finish(b)


def downgrade(data):
    checked(data)
    if len(data) != NEW_SIZE:
        raise ValueError('Expected D2 save')
    b = bytearray(data[:OLD_SIZE])
    b[0x8148:0xB7F8] = data[GAL:GAL + 14000]
    b[0xB7F8:0xBFC8] = data[GAL + GAL_COUNT * 28:GAL + GAL_SIZE]
    b[0xBFC8:0xC0C4] = data[TUT:TUT + 252]
    b[0xC0C4:0xC108] = data[TUT + TUT_COUNT * 28:TUT + TUT_SIZE]
    for mode in range(2):
        for zone in range(8):
            old = 0x5E20 + mode * 0x1060 + zone * 0x20C
            new = BZ + mode * BZ_MODE + zone * BZ_ROUTE
            b[old:old + 508] = data[new:new + 508]
            b[old + 508:old + 524] = data[new + BZ_CELLS * 24 + 4:new + BZ_ROUTE]
    b[0x7EE0:0x8148] = data[BZ + 2 * BZ_MODE:BZ + BZ_SIZE]
    return finish(b)


def inspect(data):
    checked(data)
    expanded = len(data) == NEW_SIZE
    return dict(format='D2 research' if expanded else 'Original BLES00978',
                size=len(data), checksum_valid=True, sha256=hashlib.sha256(data).hexdigest(),
                capacities=dict(galaxy=GAL_COUNT, tutorial=TUT_COUNT,
                                battle_zone_physical_cells_per_route=BZ_CELLS) if expanded else None,
                banks=[dict(name=n, offset=o, size=s) for n, o, s in BANKS] if expanded else None)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('operation', choices=['inspect', 'expand', 'downgrade'])
    p.add_argument('input', type=Path)
    p.add_argument('--output', type=Path)
    a = p.parse_args()
    try:
        b = a.input.read_bytes()
        if a.operation != 'inspect':
            if a.output is None:
                raise ValueError('--output required')
            b = expand(b) if a.operation == 'expand' else downgrade(b)
            with a.output.open('xb') as f:
                f.write(b)
        print(json.dumps(inspect(b), indent=2))
    except (OSError, ValueError, struct.error) as e:
        p.error(str(e))


if __name__ == '__main__':
    main()
