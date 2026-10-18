#!/usr/bin/env python3
"""Apply the exact D2 research delta to a matching original decrypted ELF.

Never overwrites inputs. Requires the matching D2 save converter and fixtures.
This is a capacity experiment, not a general executable patcher.
"""
import argparse
import hashlib
import json
from pathlib import Path
from elf_evidence import load_segments, bytes_at


def apply(source, manifest):
    if hashlib.sha256(source).hexdigest() != manifest['original_sha256']:
        raise ValueError('Expected exact original BLES00978 decrypted ELF')
    segments = load_segments(source)
    output = bytearray(source)
    used = set()
    for p in manifest['patches']:
        a = p['address']
        if a in used or a % 4:
            raise ValueError('Duplicate or unaligned instruction')
        used.add(a)
        off, before = bytes_at(source, segments, a, a + 4)
        after = bytes.fromhex(p['new'])
        if before.hex() != p['old'] or len(after) != 4:
            raise ValueError('Instruction mismatch at ' + hex(a))
        output[off:off+4] = after
    h = manifest['helper_segment']
    off = h['header_offset']
    if source[off:off+56].hex() != h['old_header']:
        raise ValueError('Program header mismatch')
    header = bytes.fromhex(h['new_header'])
    code = bytes.fromhex(h['payload_hex'])
    if (len(header) != 56 or len(code) != h['mapped_size'] or
            hashlib.sha256(code).hexdigest() != h['sha256'] or
            not len(output) <= h['file_offset'] <= len(output) + 65535):
        raise ValueError('Invalid helper segment')
    output[off:off+56] = header
    output.extend(bytes(h['file_offset'] - len(output)))
    output.extend(code)
    if hashlib.sha256(output).hexdigest() != manifest['patched_sha256']:
        raise ValueError('Final ELF hash mismatch')
    return bytes(output)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('elf', type=Path)
    p.add_argument('--manifest', type=Path, default=Path(__file__).resolve().parents[1] /
                   'research/double-save-20261015/D2-patch.json')
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    try:
        output = apply(a.elf.read_bytes(), json.loads(a.manifest.read_text()))
        with a.output.open('xb') as f:
            f.write(output)
        print(json.dumps(dict(output=str(a.output), sha256=hashlib.sha256(output).hexdigest(),
                              requires_matching_D2_save=True, research_only=True), indent=2))
    except (OSError, ValueError, KeyError) as e:
        p.error(str(e))


if __name__ == '__main__':
    main()
