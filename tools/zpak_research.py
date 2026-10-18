#!/usr/bin/env python3
"""Offline STPZ/0DCS/0LCS and flat STPK research helper.

The container/token layout was cross-checked against adsl14/Raging-tools,
commit 7727960be491aa76ccf125d00d53773d8ff37743. This implementation is
independent, bounds checked, and deliberately limited to the supplied format.
No input is overwritten. Replacements must retain a member's exact size.
Recompressed bytes are decoded and compared before writing. RPCS3 compatibility
of experimental archives still needs in-game testing.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

MAX_EXPANSION = 128 * 1024 * 1024


def sha(data):
    return hashlib.sha256(data).hexdigest()


def decode_tokens(comp, expected):
    output = bytearray()
    position = 0
    while position < len(comp):
        token = comp[position]
        position += 1
        length = token >> 1
        if not length or len(output) + length > expected:
            raise ValueError("Invalid token length or excess decompressed bytes")
        if token & 1:
            if position >= len(comp):
                raise ValueError("Truncated back-reference")
            distance = comp[position]
            position += 1
            if not distance or distance > len(output):
                raise ValueError("Back-reference outside current chunk")
            for _ in range(length):
                output.append(output[-distance])
        else:
            if position + length > len(comp):
                raise ValueError("Truncated literal")
            output.extend(comp[position:position + length])
            position += length
    if len(output) != expected:
        raise ValueError("Decompressed chunk size differs from header")
    return bytes(output)


def decompress(data):
    if len(data) < 32 or data[:4] != b"STPZ" or data[16:20] != b"0DCS":
        raise ValueError("Only STPZ with little-endian 0DCS/0LCS is supported")
    expected, total, block_limit = struct.unpack_from("<3I", data, 20)
    if expected > MAX_EXPANSION or total + 16 != len(data):
        raise ValueError("Archive size mismatch or unsupported expansion size")
    output = bytearray()
    chunks = []
    position = 32
    while position < len(data):
        if position + 16 > len(data) or data[position:position + 4] != b"0LCS":
            raise ValueError("Unknown or truncated compression chunk")
        size, compressed, reserved = struct.unpack_from("<3I", data, position + 4)
        if compressed < 16 or position + compressed > len(data):
            raise ValueError("Chunk outside archive")
        if size > MAX_EXPANSION or len(output) + size > expected:
            raise ValueError("Uncompressed chunks exceed outer size")
        decoded = decode_tokens(data[position + 16:position + compressed], size)
        output.extend(decoded)
        chunks.append({"size": size, "reserved": reserved})
        position += compressed
    if len(output) != expected:
        raise ValueError("Decompressed archive size differs from header")
    return bytes(output), {"outer_header_hex": data[:16].hex(),
                           "block_limit": block_limit, "chunks": chunks}


def encode_tokens(data):
    """Greedy 255-byte-window encoding, including overlapping references."""
    output = bytearray()
    literals = bytearray()

    def flush():
        if literals:
            output.append(len(literals) << 1)
            output.extend(literals)
            literals.clear()

    position = 0
    while position < len(data):
        best_size, best_distance = 0, 0
        if position + 3 <= len(data):
            left = max(0, position - 255)
            right = position + 2
            pattern = data[position:position + 3]
            while True:
                candidate = data.rfind(pattern, left, right)
                if candidate < 0:
                    break
                distance = position - candidate
                size = 3
                while (size < 127 and position + size < len(data)
                       and data[position + size] == data[position + size - distance]):
                    size += 1
                if size > best_size:
                    best_size, best_distance = size, distance
                if size == 127:
                    break
                right = candidate + 2
        if best_size >= 3:
            flush()
            output.extend(((best_size << 1) | 1, best_distance))
            position += best_size
        else:
            literals.append(data[position])
            position += 1
            if len(literals) == 127:
                flush()
    flush()
    return bytes(output)


def compress(pak, layout):
    chunks = bytearray()
    position = 0
    for chunk in layout["chunks"]:
        size = chunk["size"]
        part = pak[position:position + size]
        if len(part) != size:
            raise ValueError("Changed total size requires a different packer")
        encoded = encode_tokens(part)
        chunks.extend(b"0LCS" + struct.pack("<3I", size, len(encoded) + 16, chunk["reserved"]))
        chunks.extend(encoded)
        position += size
    if position != len(pak):
        raise ValueError("Compression chunk layout does not cover archive")
    output = (bytes.fromhex(layout["outer_header_hex"]) + b"0DCS"
              + struct.pack("<3I", len(pak), len(chunks) + 16, layout["block_limit"])
              + chunks)
    if decompress(output)[0] != pak:
        raise ValueError("Recompression failed byte-for-byte validation")
    return output


def members(pak):
    if len(pak) < 16 or pak[:4] != b"STPK":
        raise ValueError("Decompressed container is not STPK")
    count = struct.unpack_from(">I", pak, 8)[0]
    header_end = 16 + count * 48
    if header_end > len(pak):
        raise ValueError("STPK directory extends beyond archive")
    entries, names = [], set()
    for index in range(count):
        offset, size = struct.unpack_from(">2I", pak, 16 + index * 48)
        name = pak[32 + index * 48:64 + index * 48].split(b"\0")[0].decode("utf-8")
        if (not name or name in (".", "..") or "/" in name or "\\" in name
                or ":" in name or name in names):
            raise ValueError("Unsafe or duplicate member name")
        if offset < header_end or offset + size > len(pak):
            raise ValueError("STPK member outside payload")
        names.add(name)
        entries.append({"index": index, "name": name, "offset": offset,
                        "size": size, "sha256": sha(pak[offset:offset + size])})
    by_offset = sorted(entries, key=lambda item: item["offset"])
    for previous, current in zip(by_offset, by_offset[1:]):
        if previous["offset"] + previous["size"] > current["offset"]:
            raise ValueError("Overlapping STPK members are unsupported")
    return entries


def replace(data, member_name, replacement):
    pak, layout = read_container(data)
    original = members(pak)
    matches = [item for item in original if item["name"] == member_name]
    if len(matches) != 1:
        raise ValueError("Member not found unambiguously")
    item = matches[0]
    if len(replacement) != item["size"]:
        raise ValueError("Replacement must keep the exact original member size")
    offset = item["offset"]
    patched = pak[:offset] + replacement + pak[offset + item["size"]:]
    result = compress(patched, layout) if layout else patched
    checked, _ = read_container(result)
    updated = members(checked)
    changed = [old["name"] for old, new in zip(original, updated)
               if old["sha256"] != new["sha256"]]
    if any(name != member_name for name in changed):
        raise ValueError("Unexpected modification to another archive member")
    return result, {"before_sha256": sha(data), "after_sha256": sha(result),
                    "changed_members": changed, "member_count": len(original),
                    "decompressed_sha256": sha(checked),
                    "verification": "Byte-for-byte decompression and unchanged other members; no game execution"}


def read_container(data):
    if data[:4] == b"STPK":
        members(data)
        return data, None
    return decompress(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    listing = commands.add_parser("list")
    listing.add_argument("archive", type=Path)
    extraction = commands.add_parser("extract")
    extraction.add_argument("archive", type=Path)
    extraction.add_argument("--output", type=Path, required=True)
    editing = commands.add_parser("replace")
    editing.add_argument("archive", type=Path)
    editing.add_argument("--member", required=True)
    editing.add_argument("--replacement", type=Path, required=True)
    editing.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        data = args.archive.read_bytes()
        if args.command == "replace":
            if (args.output.resolve() in (args.archive.resolve(), args.replacement.resolve())
                    or args.output.exists()):
                raise ValueError("Choose a new output file; overwriting is forbidden")
            result, report = replace(data, args.member, args.replacement.read_bytes())
            with args.output.open("xb") as stream:
                stream.write(result)
        else:
            pak, layout = read_container(data)
            entries = members(pak)
            report = {"archive_sha256": sha(data), "decompressed_size": len(pak),
                      "decompressed_sha256": sha(pak), "compression": layout, "members": entries}
            if args.command == "extract":
                # Existing directories are refused, including symlinks.
                args.output.mkdir(parents=True, exist_ok=False)
                for item in entries:
                    with (args.output / item["name"]).open("xb") as stream:
                        stream.write(pak[item["offset"]:item["offset"] + item["size"]])
        print(json.dumps(report, indent=2))
        return 0
    except (OSError, ValueError, struct.error) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
