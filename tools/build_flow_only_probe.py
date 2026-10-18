#!/usr/bin/env python3
"""KB06: requested flow-only gear on all six dedicated Kid Buu presets.

Input boot is exact KB02B. Pair output with unchanged KB02B Galaxy to restore
the Kid Buu finale and the original Cell boss. Creates a new file only.

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
from build_ai_type_probe import BOOT_SHA

SPECS = [
    (1058, 777, "goku_ssj2", [0x157]),
    (1059, 778, "goku_ssj3", [0x15E]),
    (1060, 779, "goku_base", [0x79]),
    (1061, 780, "vegeta_ssj2", [0x15F]),
    (1062, 781, "vegeta_base", [0x162]),
    (1063, 782, "fat_buu", []),
]


def build(source, output):
    if output.exists() or source.resolve() == output.resolve():
        raise ValueError("Choose a new output file")
    boot = source.read_bytes()
    if zpak.sha(boot) != BOOT_SHA:
        raise ValueError("Expected exact KB02B boot")
    entry = afs.inspect(boot)["members"][22]
    original_z = boot[entry["offset"]:entry["offset"] + entry["size"]]
    outer, _ = zpak.read_container(original_z)
    parameters = member_body(outer, "game_resident_param_m.pak")
    strength = member_body(parameters, "preset_strength_table.dat")
    rows = preset.table(strength, 88)
    presets = preset.table(member_body(parameters, "preset_character_galaxy.dat"), 44)
    if len(rows) != 783 or len(presets) != 1064:
        raise ValueError("Unexpected table counts")
    changed = bytearray(strength)
    edits = []
    for index, row_index, name, items in SPECS:
        if presets[index][1] != row_index:
            raise ValueError("Unexpected preset mapping")
        if [i for i, p in enumerate(presets) if p[1] == row_index] != [index]:
            raise ValueError("Strength shared with another preset")
        before = rows[row_index]
        if before[1] != 0xFFFFFFFF:
            raise ValueError("Expected native default AI type")
        after = before[:2] + tuple(items) + (0xFFFFFFFF,) * (20 - len(items))
        offset = 16 + row_index * 88
        struct.pack_into(">22I", changed, offset, *after)
        edits.append({"preset": index, "strength_row": row_index, "form": name,
                      "items": list(map(hex, items)), "before_words": list(before),
                      "after_words": list(after), "row_offset": hex(offset)})
    updated_rows = preset.table(changed, 88)
    expected_rows = {row_index for _, row_index, _, _ in SPECS}
    if {i for i, (a, b) in enumerate(zip(rows, updated_rows)) if a != b} != expected_rows:
        raise ValueError("Unexpected changed rows")
    params_after, params_report = zpak.replace(parameters, "preset_strength_table.dat", bytes(changed))
    resident_after, resident_report = zpak.replace(original_z, "game_resident_param_m.pak", params_after)
    boot_after, afs_report = replace_afs_copy(boot, 22, resident_after)
    final_entry = afs.inspect(boot_after)["members"][22]
    final_outer, _ = zpak.read_container(boot_after[final_entry["offset"]:final_entry["offset"] + final_entry["size"]])
    final_params = member_body(final_outer, "game_resident_param_m.pak")
    if member_body(final_params, "preset_strength_table.dat") != bytes(changed):
        raise ValueError("Final extraction differs")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as stream:
        stream.write(boot_after)
    return {"experiment": "KB06", "status": "DATA_VERIFIED_GAMEPLAY_UNTESTED",
            "boot_before_sha256": BOOT_SHA, "boot_after_sha256": zpak.sha(boot_after),
            "strength_before_sha256": zpak.sha(strength), "strength_after_sha256": zpak.sha(changed),
            "forms": edits, "parameter_archive": params_report,
            "resident_archive": resident_report, "afs": afs_report,
            "galaxy": "Unchanged exact KB02B galaxy.zpak: restores Kid Buu finale and original Cell boss",
            "elf": "Original, unmodified"}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--boot-afs", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    print(json.dumps(build(a.boot_afs, a.output), indent=2))


if __name__ == "__main__":
    main()
