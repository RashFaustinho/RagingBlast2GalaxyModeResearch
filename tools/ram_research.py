#!/usr/bin/env python3
"""Find exact disk-file copies in a manifested RPCS3 guest-memory image.

Uses mmap and only readable allocated regions. Does not read a 4 GiB image
into a Python bytes object. No memory modification or process attachment.
"""
import argparse
import hashlib
import json
import mmap
from pathlib import Path
import sys


def number(value):
    return int(value, 0) if isinstance(value, str) else int(value)


def readable_regions(manifest, memory_size):
    if (manifest.get("format") != "rpcs3-guest-memory-dump"
            or manifest.get("file_offset_equals_guest_address") is not True
            or number(manifest["address_space_size"]) != memory_size):
        raise ValueError("Need a manifested raw guest image with offset = guest address")
    result = []
    for region in manifest["regions"]:
        start, end = number(region["start"]), number(region["end_exclusive"])
        if not 0 <= start < end <= memory_size:
            raise ValueError("Region outside memory image")
        if region.get("readable"):
            result.append((start, end))
    return result


def find_exact(memory, regions, data):
    if not data:
        raise ValueError("Cannot search for an empty file")
    result = set()
    prefix = data[:96]
    for start, end in regions:
        position = start
        while True:
            position = memory.find(prefix, position, end)
            if position < 0:
                break
            if position + len(data) <= end and memory[position:position + len(data)] == data:
                result.add(position)
            position += 1
    return sorted(result)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("memory", type=Path)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--find", type=Path, action="append", required=True)
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text())
        size = args.memory.stat().st_size
        regions = readable_regions(manifest, size)
        results = []
        with args.memory.open("rb") as file, mmap.mmap(file.fileno(), 0, access=mmap.ACCESS_READ) as memory:
            for path in args.find:
                data = path.read_bytes()
                hits = find_exact(memory, regions, data)
                results.append({"file": path.name, "sha256": hashlib.sha256(data).hexdigest(),
                                "bytes": len(data), "guest_addresses": hits,
                                "guest_addresses_hex": [hex(address) for address in hits]})
        print(json.dumps({"title_id": manifest.get("title_id"),
                          "created_utc": manifest.get("created_utc"),
                          "status": "Exact file copies in one snapshot; not proof of battle behavior",
                          "matches": results}, indent=2))
        return 0
    except (OSError, ValueError, KeyError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
