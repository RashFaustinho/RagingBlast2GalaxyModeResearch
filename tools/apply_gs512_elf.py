#!/usr/bin/env python3
"""Apply the exact GS512 research delta to a matching decrypted ELF, into a new file."""
import argparse
import hashlib
import json
from pathlib import Path
from elf_evidence import load_segments, bytes_at


def apply(source, manifest):
    if hashlib.sha256(source).hexdigest() != manifest['original_sha256']:
        raise ValueError('Different input: expected the exact original BLES00978 decrypted ELF. Encrypted EBOOT.BIN and other mods are not accepted.')
    segments = load_segments(source)
    output = bytearray(source)
    used = set()
    for patch in manifest['patches']:
        address = patch['address']
        if address in used or address % 4:
            raise ValueError('Duplicate or unaligned instruction patch')
        used.add(address)
        offset, before = bytes_at(source, segments, address, address + 4)
        if before.hex() != patch['old']:
            raise ValueError('Instruction mismatch at ' + hex(address))
        after = bytes.fromhex(patch['new'])
        if len(after) != 4:
            raise ValueError('Invalid instruction size')
        output[offset:offset + 4] = after
    if hashlib.sha256(output).hexdigest() != manifest['patched_sha256']:
        raise ValueError('Final ELF hash mismatch')
    return bytes(output)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('elf', type=Path)
    p.add_argument('--manifest', type=Path, default=Path(__file__).resolve().parents[1] / 'research/limits-20261015/GS512-patch.json')
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    try:
        if args.output.exists():
            raise ValueError('Output exists; choose a new filename')
        manifest = json.loads(args.manifest.read_text())
        output = apply(args.elf.read_bytes(), manifest)
        with args.output.open('xb') as f:
            f.write(output)
        print(json.dumps({'file': str(args.output), 'sha256': hashlib.sha256(output).hexdigest(),
                          'instructions_changed': len(manifest['patches']),
                          'requires_converted_GS512_save': True, 'research_only': True}, indent=2))
    except (OSError, ValueError, KeyError) as e:
        p.error(str(e))


if __name__ == '__main__':
    main()
