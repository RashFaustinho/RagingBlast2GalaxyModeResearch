#!/usr/bin/env python3
"""Decode the supplied resident parameter tables and patch one item slot.

Table geometry was checked against EBOOT and the supplied BLES00978 AFS.
Unknown fields are exported raw. No gameplay behavior is certified.
Item word0 is a localized name-text ID; stored_item_code is retained as a
legacy compatibility alias, not an equip-slot index.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import struct
import sys


def table(data, stride):
    if len(data) < 16:
        raise ValueError("Truncated parameter table header")
    count = struct.unpack_from(">I", data)[0]
    if len(data) != 16 + count * stride:
        raise ValueError("Parameter table length differs from header/stride")
    return [struct.unpack_from(">" + str(stride // 4) + "I", data, 16 + index * stride)
            for index in range(count)]


def item_table(data):
    # This table has NO 0x10-byte header. +0x10 is a property field.
    if not data or len(data) % 84:
        raise ValueError("item_parameter.dat length is not a multiple of 84")
    return [struct.unpack_from(">21I", data, index * 84)
            for index in range(len(data) // 84)]


def catalog(parameters):
    appearance = table((parameters / "preset_appearance_table.dat").read_bytes(), 32)
    strength = table((parameters / "preset_strength_table.dat").read_bytes(), 88)
    items = item_table((parameters / "item_parameter.dat").read_bytes())
    result = {"status": "Static decoded configuration; no gameplay test",
              "item_definitions": [
                  {"array_index": index, "record_offset": index * 84,
                   "name_text_id": row[0],
                   "stored_item_code": row[0], "description_id": row[1],
                   "raw_words": row} for index, row in enumerate(items)],
              "appearance_records": appearance, "strength_records": strength}
    for filename, key in (("preset_character_galaxy.dat", "galaxy_presets"),
                          ("preset_character_tutorial.dat", "tutorial_presets")):
        source = (parameters / filename).read_bytes()
        records = table(source, 44)
        decoded = []
        for index, row in enumerate(records):
            appearance_index, strength_index = row[:2]
            if appearance_index >= len(appearance) or strength_index >= len(strength):
                raise ValueError("Preset reference outside parameter tables")
            a = appearance[appearance_index]
            s = strength[strength_index]
            slots = []
            for slot, value in enumerate(s[2:]):
                if value & 0x80000000:
                    slots.append({"slot": slot, "item_index": None, "raw": value})
                    continue
                if value >= len(items):
                    raise ValueError("Item slot outside item_parameter.dat")
                slots.append({"slot": slot, "item_index": value,
                              "name_text_id": items[value][0],
                              "stored_item_code": items[value][0],
                              "description_id": items[value][1]})
            decoded.append({"index": index, "record_offset": 16 + index * 44,
                            "appearance_index": appearance_index,
                            "strength_index": strength_index,
                            "native_character_id": a[0], "appearance_raw_words": a,
                            "strength_first_two_words": s[:2], "item_slots": slots,
                            "other_preset_words": row[2:]})
        result[key] = {"sha256": hashlib.sha256(source).hexdigest(), "records": decoded}
    return result


def patch_item(source, output, record, slot, expected, replacement, item_definitions):
    if source.resolve() == output.resolve():
        raise ValueError("In-place patching is forbidden")
    data = source.read_bytes()
    records = table(data, 88)
    definitions = item_table(item_definitions.read_bytes())
    if not 0 <= record < len(records) or not 0 <= slot < 20:
        raise ValueError("Strength record or item slot outside range")
    if not 0 <= replacement < len(definitions):
        raise ValueError("Replacement index outside item definitions")
    if records[record][slot + 2] != expected:
        raise ValueError("Expected item differs from baseline")
    offset = 16 + record * 88 + 8 + slot * 4
    patched = data[:offset] + struct.pack(">I", replacement) + data[offset + 4:]
    with output.open("xb") as stream:
        stream.write(patched)
    return {"before_sha256": hashlib.sha256(data).hexdigest(),
            "after_sha256": hashlib.sha256(patched).hexdigest(),
            "offset": offset, "record": record, "slot": slot,
            "before_item_index": expected, "after_item_index": replacement,
            "length": len(patched), "status": "Experimental copy; gameplay unrun"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    inspect = commands.add_parser("catalog")
    inspect.add_argument("parameters", type=Path)
    edit = commands.add_parser("patch-item")
    edit.add_argument("strength", type=Path)
    edit.add_argument("--item-table", type=Path, required=True)
    edit.add_argument("--record", type=int, required=True)
    edit.add_argument("--slot", type=int, required=True)
    edit.add_argument("--expect", type=lambda value: int(value, 0), required=True)
    edit.add_argument("--replace", type=lambda value: int(value, 0), required=True)
    edit.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = (catalog(args.parameters) if args.command == "catalog" else
                  patch_item(args.strength, args.output, args.record, args.slot,
                             args.expect, args.replace, args.item_table))
        print(json.dumps(result, indent=2))
        return 0
    except (OSError, ValueError, struct.error) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
