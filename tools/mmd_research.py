#!/usr/bin/env python3
"""Conservative, offline inspection of the observed RB2 MAIN/MMD layout.

This is a research aid, not a game-tested editor or a complete format specification.
The supplied tutorial and European galaxy samples were structurally validated.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys


def number(value):
    return int(value, 0)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inspect(data):
    if len(data) < 0x24 or data[:4] != b"MAIN":
        raise ValueError("Not an observed MAIN file: need MAIN and a 0x24-byte header")
    version, table_size, payload_size, *roots = struct.unpack_from(
        ">8I", data, 4
    )
    if version != 0x00060000:
        raise ValueError("Unsupported header version; do not assume the tutorial layout")
    base = 0x24 + table_size
    if not table_size or table_size % 8 or base > len(data):
        raise ValueError("Invalid descriptor table bounds/size")
    if base + payload_size != len(data):
        raise ValueError("Header sizes do not account for the complete file")
    count = table_size // 8
    warnings = []
    descriptors = []
    for index in range(count):
        position = 0x24 + index * 8
        elements, element_size, relative = struct.unpack_from(
            ">HHI", data, position
        )
        absolute = base + relative
        logical_size = elements * element_size
        if absolute > len(data) or absolute + logical_size > len(data):
            raise ValueError(f"Descriptor #{index} extends beyond this file")
        descriptors.append({
            "index": index, "table_offset": position,
            "count_candidate": elements, "element_size_candidate": element_size,
            "relative_offset": relative, "absolute_offset": absolute,
            "logical_size_candidate": logical_size,
            "preview_hex": data[absolute:absolute + min(logical_size, 32)].hex(" "),
        })
    for index, desc in enumerate(descriptors):
        end = (descriptors[index + 1]["absolute_offset"]
               if index + 1 < count else len(data))
        gap = end - desc["absolute_offset"]
        desc["distance_to_next_descriptor"] = gap
        if gap < desc["logical_size_candidate"]:
            warnings.append(f"#{index}: overlapping/shared or unordered payload ranges")
        elif gap != desc["logical_size_candidate"]:
            warnings.append(f"#{index}: gap includes padding or unmodelled bytes")
    nodes = []
    root = roots[0]
    if root >= count:
        warnings.append("Header +0x10 is not a valid descriptor index")
    else:
        candidate = descriptors[root]
        if candidate["element_size_candidate"] == 0x5C:
            for index in range(candidate["count_candidate"]):
                offset = candidate["absolute_offset"] + index * 0x5C
                refs = {}
                for slot in range(0x20, 0x58, 4):
                    value = struct.unpack_from(">I", data, offset + slot)[0]
                    refs[f"0x{slot:02X}"] = value
                    if value >= count:
                        warnings.append(f"Node {index}, +0x{slot:02X}: reference candidate out of range")
                nodes.append({
                    "physical_index": index, "offset": offset,
                    "xy_float_candidates": list(struct.unpack_from(">2f", data, offset)),
                    "reference_candidates": refs,
                    "raw_hex": data[offset:offset + 0x5C].hex(" "),
                })
        else:
            warnings.append("Header +0x10 does not select 92-byte records; node schema not applied")
    return {
        "sha256": digest(data), "file_size": len(data),
        "layout_status": "Geometry validated on supplied tutorial/galaxy samples; semantics provisional; no RPCS3 execution",
        "header": {"magic": "MAIN", "version_raw": version,
                   "descriptor_table_start": 0x24, "descriptor_table_size": table_size,
                   "descriptor_count": count, "payload_base": base,
                   "payload_size": payload_size,
                   "raw_words_0x10_through_0x20": roots},
        "descriptors": descriptors, "nodes_92_byte_candidates": nodes,
        "warnings": warnings,
    }


def difference(before, after):
    spans = []
    start = None
    for offset in range(max(len(before), len(after))):
        changed = before[offset:offset + 1] != after[offset:offset + 1]
        if changed and start is None:
            start = offset
        if start is not None and (not changed or offset == max(len(before), len(after)) - 1):
            end = offset if not changed else offset + 1
            spans.append({"offset": start, "length": end - start,
                          "before": before[start:end].hex(" "),
                          "after": after[start:end].hex(" ")})
            start = None
    return {"before_sha256": digest(before), "after_sha256": digest(after),
            "before_size": len(before), "after_size": len(after), "changed_spans": spans}


def patch(source, destination, offset, expected, replacement):
    if source.resolve() == destination.resolve():
        raise ValueError("In-place patching is forbidden; choose a new output file")
    if not expected or len(expected) != len(replacement):
        raise ValueError("Expected/replacement must have the same nonzero byte length")
    data = source.read_bytes()
    if offset < 0 or offset + len(expected) > len(data):
        raise ValueError("Patch outside the file")
    if data[offset:offset + len(expected)] != expected:
        raise ValueError("Expected bytes do not match; wrong file, offset, or baseline")
    changed = data[:offset] + replacement + data[offset + len(expected):]
    # This verifies structural bounds, not the meaning of references or gameplay.
    inspect(data)
    inspect(changed)
    with destination.open("xb") as stream:
        stream.write(changed)
    return difference(data, changed)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    show = commands.add_parser("inspect", help="Write structural analysis as JSON to stdout")
    show.add_argument("file", type=Path)
    compare = commands.add_parser("diff", help="List every changed byte span and both SHA256 hashes")
    compare.add_argument("before", type=Path)
    compare.add_argument("after", type=Path)
    edit = commands.add_parser("patch", help="Create a NEW experimental copy; never overwrite")
    edit.add_argument("file", type=Path)
    edit.add_argument("--output", type=Path, required=True)
    edit.add_argument("--offset", type=number, required=True)
    edit.add_argument("--expect", required=True)
    edit.add_argument("--replace", required=True)
    search = commands.add_parser("scan", help="Locate exact bytes in a file or raw RAM dump")
    search.add_argument("file", type=Path)
    search.add_argument("--hex", required=True)
    search.add_argument("--guest-base", type=number,
                        help="Only for a contiguous raw guest dump of KNOWN starting address")
    search.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    try:
        if args.command == "inspect":
            result = inspect(args.file.read_bytes())
        elif args.command == "diff":
            result = difference(args.before.read_bytes(), args.after.read_bytes())
        elif args.command == "patch":
            result = patch(args.file, args.output, args.offset,
                           bytes.fromhex(args.expect), bytes.fromhex(args.replace))
        else:
            needle = bytes.fromhex(args.hex)
            if not needle or args.limit < 1:
                raise ValueError("Need nonempty hex bytes and a positive limit")
            data = args.file.read_bytes()
            hits = []
            offset = 0
            truncated = False
            while True:
                offset = data.find(needle, offset)
                if offset < 0:
                    break
                if len(hits) == args.limit:
                    truncated = True
                    break
                hit = {"dump_offset": offset}
                if args.guest_base is not None:
                    hit["guest_address"] = args.guest_base + offset
                hits.append(hit)
                offset += 1
            result = {"file_sha256": digest(data), "pattern": needle.hex(" "),
                      "hits": hits, "truncated": truncated}
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except (OSError, ValueError, struct.error) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
