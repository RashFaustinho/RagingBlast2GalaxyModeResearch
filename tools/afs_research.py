#!/usr/bin/env python3
"""Read AFS, extract a member, or replace within its EXISTING slot in a copy.

No reallocation or movement of other members. An oversized replacement is
refused. Other member hashes and all opaque filename metadata are preserved.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys


def inspect(data):
    if len(data) < 8 or data[:4] != b"AFS\0":
        raise ValueError("Expected AFS signature")
    count = struct.unpack_from("<I", data, 4)[0]
    end = 8 + count * 8
    if end + 8 > len(data):
        raise ValueError("Truncated directory")
    name_offset, name_size = struct.unpack_from("<II", data, end)
    has_names = name_size >= count * 48 and name_offset + name_size <= len(data)
    entries = []
    for index in range(count):
        offset, size = struct.unpack_from("<II", data, 8 + index * 8)
        if offset < end + 8 or offset + size > len(data):
            raise ValueError("Member outside AFS")
        body = data[offset:offset + size]
        name = None
        if has_names:
            name = data[name_offset + index * 48:name_offset + index * 48 + 32].split(b"\0")[0].decode("utf-8", errors="replace")
        entries.append({"index": index, "metadata_name": name,
                        "offset": offset, "size": size,
                        "signature_hex": body[:4].hex(" "),
                        "sha256": hashlib.sha256(body).hexdigest()})
    ordered = sorted(entries, key=lambda entry: entry["offset"])
    for previous, current in zip(ordered, ordered[1:]):
        if previous["offset"] + previous["size"] > current["offset"]:
            raise ValueError("Overlapping AFS members are unsupported")
    return {"sha256": hashlib.sha256(data).hexdigest(), "size": len(data),
            "member_count": count, "name_table_offset": name_offset,
            "name_table_size": name_size, "members": entries}


def replace_in_slot(data, index, replacement):
    before = inspect(data)
    if not 0 <= index < before["member_count"]:
        raise ValueError("Member index outside AFS")
    item = before["members"][index]
    offset = item["offset"]
    boundaries = [entry["offset"] for entry in before["members"] if entry["offset"] > offset]
    if before["name_table_offset"] > offset:
        boundaries.append(before["name_table_offset"])
    boundaries.append(len(data))
    capacity = min(boundaries) - offset
    if not replacement or len(replacement) > capacity:
        raise ValueError("Replacement does not fit existing slot; use a reallocating AFS packer")
    result = bytearray(data)
    result[offset:offset + len(replacement)] = replacement
    struct.pack_into("<I", result, 8 + index * 8 + 4, len(replacement))
    after = inspect(result)
    for old, new in zip(before["members"], after["members"]):
        if old["index"] != index and old != new:
            raise ValueError("Unexpected change to another AFS member")
    if after["members"][index]["sha256"] != hashlib.sha256(replacement).hexdigest():
        raise ValueError("AFS replacement verification failed")
    return bytes(result), {"before_sha256": before["sha256"], "after_sha256": after["sha256"],
                           "member_index": index, "old_size": item["size"],
                           "new_size": len(replacement), "slot_capacity": capacity,
                           "status": "Other members identical; experimental copy, gameplay unrun"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    listing = commands.add_parser("list")
    listing.add_argument("afs", type=Path)
    extract = commands.add_parser("extract")
    extract.add_argument("afs", type=Path)
    extract.add_argument("--index", type=int, required=True)
    extract.add_argument("--output", type=Path, required=True)
    edit = commands.add_parser("replace-in-slot")
    edit.add_argument("afs", type=Path)
    edit.add_argument("--index", type=int, required=True)
    edit.add_argument("--replacement", type=Path, required=True)
    edit.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        data = args.afs.read_bytes()
        report = inspect(data)
        if args.command == "replace-in-slot":
            if args.output.resolve() in (args.afs.resolve(), args.replacement.resolve()):
                raise ValueError("In-place writing is forbidden")
            changed, report = replace_in_slot(data, args.index, args.replacement.read_bytes())
            with args.output.open("xb") as stream:
                stream.write(changed)
        elif args.command == "extract":
            if not 0 <= args.index < report["member_count"]:
                raise ValueError("Member index outside AFS")
            if args.output.resolve() == args.afs.resolve():
                raise ValueError("In-place writing is forbidden")
            entry = report["members"][args.index]
            with args.output.open("xb") as stream:
                stream.write(data[entry["offset"]:entry["offset"] + entry["size"]])
            report = entry
        print(json.dumps(report, indent=2))
        return 0
    except (OSError, ValueError, struct.error) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
