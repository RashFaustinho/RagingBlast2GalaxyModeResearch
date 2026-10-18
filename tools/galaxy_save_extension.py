#!/usr/bin/env python3
"""Inspect or convert decrypted RPCS3 SYS-DATA; GS512 is a research save format.

Always writes a new file and validates the internal checksum. Converting a save
does not patch the game: GS512 requires the matching executable changes.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct

OLD_SIZE = 0xD6D8
OLD_BASE = 0x8148
OLD_GALAXY_SIZE = 0x3E80
OLD_MISSIONS_SIZE = 500 * 28
NEW_BASE = OLD_SIZE
NEW_COUNT = 512
NEW_MISSIONS_SIZE = NEW_COUNT * 28
EXTRA = NEW_MISSIONS_SIZE - OLD_MISSIONS_SIZE
NEW_GALAXY_SIZE = OLD_GALAXY_SIZE + EXTRA
NEW_SIZE = NEW_BASE + NEW_GALAXY_SIZE


def checksum(data):
    """Original 318998 path: sum alternating low/high bytes, split into u32s."""
    total = (sum(data[8::2]) + 256 * sum(data[9::2])) & 0xFFFFFFFF
    return total >> 8, total & 255


def checked(data):
    if len(data) not in (OLD_SIZE, NEW_SIZE):
        raise ValueError('Expected decrypted original55000-byte or GS51271336-byte SYS-DATA')
    if struct.unpack_from('>II', data) != checksum(data):
        raise ValueError('Internal checksum mismatch; encrypted/other-version saves are not supported')
    return data


def finish(data):
    data = bytearray(data)
    struct.pack_into('>II', data, 0, *checksum(data))
    return bytes(checked(data))


def expand(data):
    checked(data)
    if len(data) != OLD_SIZE:
        raise ValueError('Save is already GS512; do not expand twice')
    block = data[OLD_BASE:OLD_BASE + OLD_GALAXY_SIZE]
    appended = block[:OLD_MISSIONS_SIZE] + bytes(EXTRA) + block[OLD_MISSIONS_SIZE:]
    return finish(data + appended)


def downgrade(data):
    checked(data)
    if len(data) != NEW_SIZE:
        raise ValueError('Expected GS512 save')
    data = bytearray(data)
    block = data[NEW_BASE:NEW_SIZE]
    original = block[:OLD_MISSIONS_SIZE] + block[NEW_MISSIONS_SIZE:]
    data[OLD_BASE:OLD_BASE + OLD_GALAXY_SIZE] = original
    # Progress for missions500..511 is discarded; all other current fields survive.
    return finish(data[:OLD_SIZE])


def inspect(data):
    checked(data)
    expanded = len(data) == NEW_SIZE
    base = NEW_BASE if expanded else OLD_BASE
    count = NEW_COUNT if expanded else 500
    rows = [struct.unpack_from('>7I', data, base + i * 28) for i in range(count)]
    return {'format': 'GS512 research' if expanded else 'Original BLES00978',
            'size': len(data), 'checksum_valid': True,
            'sha256': hashlib.sha256(data).hexdigest(), 'mission_capacity': count,
            'nonzero_additional_rows': {str(i): list(rows[i]) for i in range(498, count) if any(rows[i])},
            'global_last_native': struct.unpack_from('>I', data, base + count * 28 + 66 * 28)[0]}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('operation', choices=['inspect', 'expand', 'downgrade'])
    p.add_argument('input', type=Path)
    p.add_argument('--output', type=Path)
    args = p.parse_args()
    try:
        data = args.input.read_bytes()
        if args.operation == 'inspect':
            result = inspect(data)
        else:
            if args.output is None:
                raise ValueError('--output is required; input is never overwritten')
            if args.output.exists():
                raise ValueError('Output already exists; choose a new filename')
            output = expand(data) if args.operation == 'expand' else downgrade(data)
            # Exclusive creation also protects against a concurrent overwrite.
            with args.output.open('xb') as f:
                f.write(output)
            result = inspect(output)
            result['output'] = str(args.output)
            result['requires_matching_GS512_executable'] = args.operation == 'expand'
            if args.operation == 'downgrade':
                result['discarded_mission_ids'] = list(range(500, 512))
        print(json.dumps(result, indent=2))
    except (OSError, ValueError, struct.error) as e:
        p.error(str(e))


if __name__ == '__main__':
    main()
