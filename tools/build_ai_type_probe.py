#!/usr/bin/env python3
"""Build Goku probes from exact KB03X boot: type 8 or Gohan's items.

Input is the exact KB02B boot also distributed in KB03X. Pair the output
with unchanged KB03X Galaxy to compare the same Cell boss before/after.

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

BOOT_SHA = "4abbe2057479606a81f5fe520cb8562d981d4466de15ce3a44a40b2885906ed2"


def build(source, output, probe="type8"):
    if probe not in ("type8", "gohan-items"):
        raise ValueError("Unsupported probe")
    if output.exists() or source.resolve() == output.resolve():
        raise ValueError("Choose a new output file")
    boot = source.read_bytes()
    if zpak.sha(boot) != BOOT_SHA:
        raise ValueError("Expected exact KB02B / KB03X boot AFS")
    entry = afs.inspect(boot)["members"][22]
    original_z = boot[entry["offset"]:entry["offset"] + entry["size"]]
    outer, _ = zpak.read_container(original_z)
    parameters = member_body(outer, "game_resident_param_m.pak")
    strength = member_body(parameters, "preset_strength_table.dat")
    rows = preset.table(strength, 88)
    presets = preset.table(member_body(parameters, "preset_character_galaxy.dat"), 44)
    if len(rows) != 783 or presets[1058][1] != 777:
        raise ValueError("Unexpected Goku preset/strength mapping")
    expected = (20, 0xFFFFFFFF, 0xAD, 0x4F, 0x4E, 0x157) + (0xFFFFFFFF,) * 16
    if rows[777] != expected:
        raise ValueError("Unexpected baseline gear/type")
    expected_row = list(rows[777])
    if probe == "type8":
        expected_row[1] = 8
        experiment = "KB04A"
        description = "Only one decoded u32; compressed bytes/sizes may differ"
    else:
        donor_items = rows[676][2:]
        if donor_items != (0x87, 0xF8, 0xC8, 0x42, 0x14C, 0x169, 0x146, 0xE1, 0x155) + (0xFFFFFFFF,) * 11:
            raise ValueError("Unexpected original Gohan SSJ1 gear")
        if presets[788][1] != 676:
            raise ValueError("Unexpected Gohan donor mapping")
        expected_row[2:] = donor_items
        experiment = "KB05A"
        description = "Only Goku SSJ2 item slots change from KB03X; native default type 6 restored from KB04A"
    row_offset = 16 + 777 * 88
    changed = strength[:row_offset] + struct.pack(">22I", *expected_row) + strength[row_offset + 88:]
    updated_rows = preset.table(changed, 88)
    if updated_rows[777] != tuple(expected_row) or any(a != b for i, (a, b) in enumerate(zip(rows, updated_rows)) if i != 777):
        raise ValueError("Unexpected strength change")
    params_after, params_report = zpak.replace(parameters, "preset_strength_table.dat", changed)
    resident_after, resident_report = zpak.replace(original_z, "game_resident_param_m.pak", params_after)
    boot_after, afs_report = replace_afs_copy(boot, 22, resident_after)
    final_entry = afs.inspect(boot_after)["members"][22]
    final_outer, _ = zpak.read_container(boot_after[final_entry["offset"]:final_entry["offset"] + final_entry["size"]])
    final_parameters = member_body(final_outer, "game_resident_param_m.pak")
    if member_body(final_parameters, "preset_strength_table.dat") != changed:
        raise ValueError("Final extraction mismatch")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as stream:
        stream.write(boot_after)
    return {"experiment": experiment, "status": "DATA_VERIFIED_GAMEPLAY_UNTESTED",
            "baseline": "KB03X (boot identical to KB02B)", "preset": 1058, "strength_row": 777,
            "probe": probe, "strength_row_offset": hex(row_offset),
            "table_offset": hex(row_offset + (4 if probe == "type8" else 8)),
            "type_before": "FFFFFFFF (native default 6)",
            "type_after": 8 if probe == "type8" else "FFFFFFFF (native default 6)",
            "level_word": expected_row[0],
            "gear": [f"{i:X}" for i in expected_row[2:] if i != 0xFFFFFFFF],
            "before_strength_words": list(rows[777]), "after_strength_words": expected_row,
            "scope": description,
            "boot_before_sha256": BOOT_SHA, "boot_after_sha256": zpak.sha(boot_after),
            "strength_before_sha256": zpak.sha(strength), "strength_after_sha256": zpak.sha(changed),
            "parameter_archive": params_report, "resident_archive": resident_report,
            "afs": afs_report, "galaxy": "Use unchanged exact KB03X galaxy.zpak",
            "elf": "Original, unmodified"}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--boot-afs", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--probe", choices=["type8", "gohan-items"], default="type8")
    a = p.parse_args()
    print(json.dumps(build(a.boot_afs, a.output, a.probe), indent=2))


if __name__ == "__main__":
    main()
