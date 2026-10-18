#!/usr/bin/env python3
"""Two independent one-word controls from exact KB06 boot; new files only.

A replaces Goku's lone 157 with 155. B removes Vegeta SSJ2's lone 15F.
Both pair with unchanged KB06 Galaxy. Neither changes the EBOOT.

Historical experiment: hidden-item labels used here were corrected later.
See research/PRESETS_ITEMS_AND_TRANSFORMATIONS.md; use build_corrected_flow_probe.py
for the corrected minimal gear. Arrays are retained to reproduce old hashes.
"""
import argparse
import json
from pathlib import Path
import struct

import afs_research as afs
import preset_research as preset
import zpak_research as zpak
from build_kid_buu_mod import member_body, replace_afs_copy

BOOT_SHA = "5805a229566e16221f167627664adfc237e498c629c481702ff6d1757afd4790"
F = 0xFFFFFFFF
BASE_ITEMS = {777: [0x157], 778: [0x15E], 779: [0x79], 780: [0x15F], 781: [0x162], 782: []}


def build(source, output, revision):
    if revision not in ("KB07A", "KB07B"):
        raise ValueError("Unsupported control")
    if output.exists() or source.resolve() == output.resolve():
        raise ValueError("Choose a new output file")
    boot = source.read_bytes()
    if zpak.sha(boot) != BOOT_SHA:
        raise ValueError("Expected exact KB06 boot")
    entry = afs.inspect(boot)["members"][22]
    original_z = boot[entry["offset"]:entry["offset"] + entry["size"]]
    outer, _ = zpak.read_container(original_z)
    params = member_body(outer, "game_resident_param_m.pak")
    strength = member_body(params, "preset_strength_table.dat")
    rows = preset.table(strength, 88)
    presets = preset.table(member_body(params, "preset_character_galaxy.dat"), 44)
    if len(rows) != 783 or len(presets) != 1064:
        raise ValueError("Unexpected table counts")
    for r, items in BASE_ITEMS.items():
        if rows[r][2:] != tuple(items) + (F,) * (20 - len(items)):
            raise ValueError("Unexpected KB06 baseline gear")
    index, row, before, after = (1058, 777, 0x157, 0x155) if revision == "KB07A" else (1061, 780, 0x15F, F)
    if presets[index][1] != row or [i for i, p in enumerate(presets) if p[1] == row] != [index]:
        raise ValueError("Unexpected or shared preset mapping")
    offset = 16 + row * 88 + 8
    if struct.unpack_from(">I", strength, offset)[0] != before:
        raise ValueError("Unexpected baseline slot")
    changed = strength[:offset] + struct.pack(">I", after) + strength[offset + 4:]
    new_rows = preset.table(changed, 88)
    if [i for i, (a, b) in enumerate(zip(rows, new_rows)) if a != b] != [row]:
        raise ValueError("Unexpected changed rows")
    if new_rows[row][:2] != rows[row][:2] or new_rows[row][3:] != rows[row][3:]:
        raise ValueError("Unexpected row changes")
    params_after, params_report = zpak.replace(params, "preset_strength_table.dat", changed)
    resident_after, resident_report = zpak.replace(original_z, "game_resident_param_m.pak", params_after)
    boot_after, afs_report = replace_afs_copy(boot, 22, resident_after)
    final_entry = afs.inspect(boot_after)["members"][22]
    final_outer, _ = zpak.read_container(boot_after[final_entry["offset"]:final_entry["offset"] + final_entry["size"]])
    if member_body(member_body(final_outer, "game_resident_param_m.pak"), "preset_strength_table.dat") != changed:
        raise ValueError("Final extraction mismatch")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as stream:
        stream.write(boot_after)
    return {"experiment": revision, "status": "DATA_VERIFIED_GAMEPLAY_UNTESTED",
            "baseline": "KB06", "preset": index, "strength_row": row, "slot": 0,
            "offset": hex(offset), "before": hex(before), "after": hex(after),
            "only_decoded_change": "One u32 item slot",
            "boot_before_sha256": BOOT_SHA, "boot_after_sha256": zpak.sha(boot_after),
            "parameter_archive": params_report, "resident_archive": resident_report,
            "afs": afs_report, "galaxy": "Exact KB06 Galaxy unchanged", "elf": "Unmodified"}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--boot-afs", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--revision", choices=["KB07A", "KB07B"], required=True)
    a = p.parse_args()
    print(json.dumps(build(a.boot_afs, a.output, a.revision), indent=2))


if __name__ == "__main__":
    main()
