#!/usr/bin/env python3
"""Derive KB16A from exact KB15B: swap Buu/Vegeta, add No Switch Outs.

Writes a new directory. Only the three ordinary enemy roster records and six
dedicated strength rows are eligible for editing. Archive readbacks are checked;
this script does not execute the game.
"""
import argparse
import csv
import json
import struct
from pathlib import Path

import afs_research as afs
import mmd_research as mmd
import preset_research as pre
import zpak_research as z
from build_kid_buu_mod import member_body, replace_afs_copy

F = 0xFFFFFFFF
BOOT_SHA = "4134cd60bea322fb47620af1fded901f12f98d6188e122dbeb0bacfbfe873d65"
GALAXY_SHA = "f7057b124e730e6345565405d1d2f93234d65b8818791c0cc11522c23e598c54"


def build(baseline, output, catalog):
    if output.exists():
        raise ValueError("Choose a new output directory")
    boot = (baseline / "st_pack_boot_pt_ps3.afs").read_bytes()
    galaxy = (baseline / "galaxy.zpak").read_bytes()
    if (z.sha(boot), z.sha(galaxy)) != (BOOT_SHA, GALAXY_SHA):
        raise ValueError("Expected the exact delivered KB15B archives")
    with catalog.open(encoding="utf-8", newline="") as stream:
        item = next(row for row in csv.DictReader(stream)
                    if int(row["item_index_decimal"]) == 0x16A)
    if (item["name_text_id"], item["game_name_it"]) != ("625", "Nessun Cambio"):
        raise ValueError("Unexpected item catalog binding")

    entry = afs.inspect(boot)["members"][22]
    resident = boot[entry["offset"]:entry["offset"] + entry["size"]]
    params = member_body(z.read_container(resident)[0], "game_resident_param_m.pak")
    strengths = member_body(params, "preset_strength_table.dat")
    rows = pre.table(strengths, 88)
    presets = pre.table(member_body(params, "preset_character_galaxy.dat"), 44)
    if (len(rows), len(presets)) != (783, 1064):
        raise ValueError("Unexpected table counts")
    definitions = pre.item_table(member_body(params, "item_parameter.dat"))
    if definitions[0x16A][:2] != (625, 739):
        raise ValueError("Item-definition text IDs do not match the catalog")
    changed = bytearray(strengths)
    edits = []
    for preset, strength in zip(range(1058, 1064), range(777, 783)):
        if presets[preset][1] != strength or 0x16A in rows[strength][2:]:
            raise ValueError("Unexpected preset/equipment baseline")
        slot = rows[strength][2:].index(F)
        offset = 16 + strength * 88 + 8 + slot * 4
        struct.pack_into(">I", changed, offset, 0x16A)
        edits.append(dict(preset=preset, strength=strength, item_slot=slot,
                          offset_hex=hex(offset), item_hex="16A"))
    expected = list(rows)
    for edit in edits:
        row = list(expected[edit["strength"]])
        row[2 + edit["item_slot"]] = 0x16A
        expected[edit["strength"]] = tuple(row)
    assert pre.table(changed, 88) == expected
    new_params, _ = z.replace(params, "preset_strength_table.dat", bytes(changed))
    new_resident, _ = z.replace(resident, "game_resident_param_m.pak", new_params)
    new_boot, afs_report = replace_afs_copy(boot, 22, new_resident)
    read_entry = afs.inspect(new_boot)["members"][22]
    read_resident = new_boot[read_entry["offset"]:read_entry["offset"] + read_entry["size"]]
    read_params = member_body(z.read_container(read_resident)[0], "game_resident_param_m.pak")
    assert member_body(read_params, "preset_strength_table.dat") == changed

    original_mmd = member_body(z.read_container(galaxy)[0], "galaxy.mmd")
    descriptor = mmd.inspect(original_mmd)["descriptors"][788]
    if (descriptor["count_candidate"], descriptor["element_size_candidate"]) != (3, 8):
        raise ValueError("Unexpected enemy roster geometry")
    start = descriptor["absolute_offset"]
    records = [original_mmd[start + 8*i:start + 8*(i+1)] for i in range(3)]
    if [struct.unpack_from(">H", record)[0] for record in records] != [1058, 1061, 1063]:
        raise ValueError("Unexpected roster presets")
    new_mmd = original_mmd[:start] + records[0] + records[2] + records[1] + original_mmd[start + 24:]
    assert len(new_mmd) == len(original_mmd)
    geometry = ("index", "table_offset", "count_candidate", "element_size_candidate",
                "relative_offset", "absolute_offset", "logical_size_candidate")
    for before, after in zip(mmd.inspect(original_mmd)["descriptors"],
                             mmd.inspect(new_mmd)["descriptors"]):
        assert all(before[key] == after[key] for key in geometry)
    new_galaxy, galaxy_report = z.replace(galaxy, "galaxy.mmd", new_mmd)
    assert member_body(z.read_container(new_galaxy)[0], "galaxy.mmd") == new_mmd
    report = dict(experiment="KB16A", baseline="KB15B",
                  status="ARCHIVE_READBACK_VERIFIED_GAMEPLAY_UNTESTED",
                  node=117, roster_before=[1058, 1061, 1063], roster_after=[1058, 1063, 1061],
                  roster_names=["Goku SSJ2", "Fat Buu", "Vegeta SSJ2"],
                  roster_offset_hex=hex(start), added_item=item, strength_edits=edits,
                  executable_modified=False, boot_sha256=z.sha(new_boot),
                  galaxy_sha256=z.sha(new_galaxy), galaxy_mmd_sha256=z.sha(new_mmd),
                  afs=afs_report, galaxy=galaxy_report,
                  limits="No gameplay test. No Switch Outs blocks ordinary switches; original game description explicitly permits item-effect switches. Roster-order rationale is the user's tested result; the last-button explanation remains a hypothesis.")
    output.mkdir()
    for name, data in [("st_pack_boot_pt_ps3.afs", new_boot), ("galaxy.zpak", new_galaxy),
                       ("galaxy.mmd", new_mmd)]:
        (output / name).write_bytes(data)
    (output / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--catalog", type=Path, required=True)
    args = parser.parse_args()
    build(args.baseline, args.output, args.catalog)
