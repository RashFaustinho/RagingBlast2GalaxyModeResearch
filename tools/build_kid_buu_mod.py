#!/usr/bin/env python3
"""Build the requested BLES00978 Kid Buu finale in new files only.

Uses dedicated appended presets, appearances and strengths; original records
and other archive members are verified byte-for-byte. Gameplay is untested.

Historical experiment: hidden-item labels used here were corrected later.
See research/PRESETS_ITEMS_AND_TRANSFORMATIONS.md; use build_corrected_flow_probe.py
for the corrected minimal gear. Arrays are retained to reproduce old hashes.
"""
import argparse
import copy
import json
from pathlib import Path
import struct
import sys

import afs_research as afs
import mmd_research as mmd
import preset_research as preset
import zpak_research as zpak

BOOT_SHA = "744abd145c0690d7f4c5d33fb5e175dcdb009c45a6006577797516d9ea655af7"
MMD_SHA = "c0a12c58b22cb4b2884bcfe8c550a1f5a25f60c192986c6f1fd9bd3eccb155a7"
F = 0xFFFFFFFF
# Exact arrays requested, using indices in item_parameter.dat.
FORMS = [
    {"key": "goku_ssj2", "native": 2, "template": 815, "appearance": 2,
     "costume_index": 0, "items": [0xAD, 0x4F, 0x4E, 0x157]},
    {"key": "goku_ssj3", "native": 3, "template": 815, "appearance": 3,
     "costume_index": 0, "items": [0xAD, 0x4F, 0x4E, 0x4D, 0x161, 0x15E]},
    {"key": "goku_base", "native": 0, "template": 815, "appearance": 0,
     "costume_index": 0,
     "items": [0xAD, 0x4F, 0x161, 0x165, 0x71, 0x79, 0xF0, 0x3E, 0xB4]},
    {"key": "vegeta_ssj2", "native": 20, "template": 816, "appearance": 20,
     "costume_index": 1, "items": [0xAD, 0x4F, 0x4E, 0x4D, 0x15F]},
    {"key": "vegeta_base", "native": 17, "template": 816, "appearance": 17,
     "costume_index": 1, "items": [0xAD, 0x4F, 0x164, 0x162]},
    {"key": "fat_buu", "native": 63, "template": 63, "appearance": 63,
     "costume_index": 0, "items": [0xAD, 0x4F, 0x4E]},
]


def append_records(data, stride, rows):
    existing = preset.table(data, stride)
    packed = b"".join(struct.pack(">" + str(stride // 4) + "I", *r) for r in rows)
    output = bytearray(data + packed)
    struct.pack_into(">I", output, 0, len(existing) + len(rows))
    checked = preset.table(output, stride)
    if checked[:len(existing)] != existing or checked[len(existing):] != list(map(tuple, rows)):
        raise ValueError("Table append validation failed")
    return bytes(output)


def resize_stpk(pak, name, replacement):
    """Resize one member, retaining other bodies and 16-byte payload alignment."""
    before = zpak.members(pak)
    matches = [r for r in before if r["name"] == name]
    if len(matches) != 1:
        raise ValueError("Missing or ambiguous member")
    target = matches[0]
    start, old_size = target["offset"], target["size"]
    next_offsets = [r["offset"] for r in before if r["offset"] > start]
    end = min(next_offsets) if next_offsets else len(pak)
    padding = pak[start + old_size:end]
    if any(padding):
        raise ValueError("Cannot resize a member with opaque nonzero gap bytes")
    old_span = end - start
    new_span = max(old_span, (len(replacement) + 15) // 16 * 16)
    delta = new_span - old_span
    if delta % 16:
        raise ValueError("Unsupported original STPK alignment")
    out = bytearray(pak[:start] + replacement + bytes(new_span - len(replacement)) + pak[end:])
    for r in before:
        pos = 16 + r["index"] * 48
        if r["index"] == target["index"]:
            struct.pack_into(">I", out, pos + 4, len(replacement))
        elif r["offset"] >= end:
            struct.pack_into(">I", out, pos, r["offset"] + delta)
    after = zpak.members(out)
    if [r["name"] for r in before] != [r["name"] for r in after]:
        raise ValueError("STPK directory identity changed")
    for old, new in zip(before, after):
        if old["name"] != name and old["sha256"] != new["sha256"]:
            raise ValueError("Unrequested member changed")
    new = after[target["index"]]
    if bytes(out[new["offset"]:new["offset"] + new["size"]]) != replacement:
        raise ValueError("Replacement roundtrip failed")
    return bytes(out)


def recompress_resized(pak, layout):
    new_layout = copy.deepcopy(layout)
    limit = layout["block_limit"]
    if not 0 < limit <= 128 * 1024:
        raise ValueError("Unexpected compression block size")
    reserved = layout["chunks"][-1]["reserved"]
    new_layout["chunks"] = [
        {"size": min(limit, len(pak) - offset), "reserved": reserved}
        for offset in range(0, len(pak), limit)]
    return zpak.compress(pak, new_layout)


def member_body(pak, name):
    entry = next(r for r in zpak.members(pak) if r["name"] == name)
    return pak[entry["offset"]:entry["offset"] + entry["size"]]


def replace_afs_copy(data, index, replacement):
    """Use original slot if possible, else append an aligned relocated member."""
    before = afs.inspect(data)
    old = before["members"][index]
    boundaries = [r["offset"] for r in before["members"] if r["offset"] > old["offset"]]
    if before["name_table_offset"] > old["offset"]:
        boundaries.append(before["name_table_offset"])
    capacity = min(boundaries + [len(data)]) - old["offset"]
    if len(replacement) <= capacity:
        result, report = afs.replace_in_slot(data, index, replacement)
        out = bytearray(result)
        report["placement"] = "original_slot"
    else:
        offset = (len(data) + 2047) // 2048 * 2048
        out = bytearray(data + bytes(offset - len(data)) + replacement)
        out.extend(bytes((-len(out)) % 2048))
        struct.pack_into("<2I", out, 8 + index * 8, offset, len(replacement))
        report = {"placement": "appended_member", "old_offset": old["offset"],
                  "new_offset": offset, "slot_capacity": capacity,
                  "old_size": old["size"], "new_size": len(replacement)}
    # AFS filename entry: 32-byte name, 12 timestamp bytes, u32 stored size.
    metadata = before["name_table_offset"] + index * 48 + 44
    has_metadata = before["name_table_size"] >= before["member_count"] * 48
    if has_metadata and metadata + 4 <= len(data):
        value = struct.unpack_from("<I", data, metadata)[0]
        if value == old["size"]:
            struct.pack_into("<I", out, metadata, len(replacement))
            report["metadata_size_updated"] = True
    after = afs.inspect(out)
    for x, y in zip(before["members"], after["members"]):
        if x["index"] != index and x != y:
            raise ValueError("Other AFS member changed")
    if after["members"][index]["sha256"] != zpak.sha(replacement):
        raise ValueError("AFS replacement body mismatch")
    report.update(before_sha256=zpak.sha(data), after_sha256=zpak.sha(out),
                  verification="Other 40 members and their offsets unchanged")
    return bytes(out), report


def build(boot, galaxy, output, revision="KB01"):
    if revision not in ("KB01", "KB02A", "KB02B"):
        raise ValueError("Unsupported mod revision")
    boot_data, galaxy_data = boot.read_bytes(), galaxy.read_bytes()
    if zpak.sha(boot_data) != BOOT_SHA:
        raise ValueError("Use the exact original supplied boot AFS, not G03/G04")
    boot_entries = afs.inspect(boot_data)["members"]
    e = boot_entries[22]
    boot_z = boot_data[e["offset"]:e["offset"] + e["size"]]
    boot_pak, boot_layout = zpak.read_container(boot_z)
    params = member_body(boot_pak, "game_resident_param_m.pak")
    names = {"appearance": "preset_appearance_table.dat", "presets": "preset_character_galaxy.dat",
             "strength": "preset_strength_table.dat"}
    source_tables = {k: member_body(params, n) for k, n in names.items()}
    appearances = preset.table(source_tables["appearance"], 32)
    presets = preset.table(source_tables["presets"], 44)
    strengths = preset.table(source_tables["strength"], 88)
    items = preset.item_table(member_body(params, "item_parameter.dat"))
    if (len(appearances), len(presets), len(strengths)) != (367, 1058, 777):
        raise ValueError("Unexpected source table geometry")
    specs = copy.deepcopy(FORMS)
    if revision != "KB01":
        fat = next(r for r in specs if r["key"] == "fat_buu")
        fat.update(native=62, template=62, appearance=62)
    preset_ids = {r["key"]: len(presets) + i for i, r in enumerate(specs)}
    forms = []
    new_a, new_p, new_s = [], [], []
    for i, spec in enumerate(specs):
        appearance = list(appearances[spec["appearance"]])
        if appearance[0] != spec["native"]:
            raise ValueError("Unexpected source identity")
        appearance[1] = spec["costume_index"]
        appearance[2] = 0  # Fixed variant, not the random-variant branch.
        strength = list(strengths[presets[spec["template"]][1]])
        strength[2:] = spec["items"] + [F] * (20 - len(spec["items"]))
        if any(not 0 <= v < len(items) for v in spec["items"]):
            raise ValueError("Invalid requested item")
        p = [len(appearances) + i, len(strengths) + i, 99] + [F] * 8
        # Directed links for the requested forms; no forward links from base.
        if spec["key"] == "goku_ssj2":
            p[3] = preset_ids["goku_ssj3"]
            if revision == "KB02B":
                # Original transformed enemy presets 650/785/788 use this
                # duplicated first-two-slot layout. It is an experiment, not
                # a proven interpretation of the conditional trigger.
                p[4] = preset_ids["goku_ssj3"]
        elif spec["key"] == "goku_ssj3":
            p[3] = preset_ids["goku_base"]
        elif spec["key"] == "vegeta_ssj2":
            p[3] = preset_ids["vegeta_base"]
        new_a.append(appearance); new_p.append(p); new_s.append(strength)
        forms.append(dict(spec, preset=preset_ids[spec["key"]],
                          appearance_index=p[0], strength_index=p[1],
                          first_strength_word=strength[0], second_strength_word=strength[1],
                          transformation_slots=p[3:7], fusion_slots=p[7:11]))
    changed_tables = {
        "appearance": append_records(source_tables["appearance"], 32, new_a),
        "presets": append_records(source_tables["presets"], 44, new_p),
        "strength": append_records(source_tables["strength"], 88, new_s)}
    changed_params = params
    for key, name in names.items():
        changed_params = resize_stpk(changed_params, name, changed_tables[key])
    changed_boot_pak = resize_stpk(boot_pak, "game_resident_param_m.pak", changed_params)
    changed_boot_z = recompress_resized(changed_boot_pak, boot_layout)
    changed_boot, afs_report = replace_afs_copy(boot_data, 22, changed_boot_z)
    galaxy_pak, galaxy_layout = zpak.read_container(galaxy_data)
    original_mmd = member_body(galaxy_pak, "galaxy.mmd")
    if zpak.sha(original_mmd) != MMD_SHA:
        raise ValueError("Unexpected Galaxy MMD")
    info = mmd.inspect(original_mmd)
    root = info["nodes_92_byte_candidates"][117]["offset"]
    group_ix = struct.unpack_from(">I", original_mmd, root + 0x28)[0]
    if group_ix != 789:
        raise ValueError("Unexpected mission enemy group")
    group = info["descriptors"][group_ix]
    tag, roster_ix = struct.unpack_from(">2I", original_mmd, group["absolute_offset"])
    if (tag, roster_ix) != (0, 788):
        raise ValueError("Unexpected mission roster")
    roster = info["descriptors"][roster_ix]
    original_roster = original_mmd[roster["absolute_offset"]:roster["absolute_offset"] + 16]
    if original_roster != struct.pack(">HHIHHI", 815, 0, 0, 816, 0, 0):
        raise ValueError("Unexpected original opponents")
    users = []
    for node in info["nodes_92_byte_candidates"]:
        for field in (0x24, 0x28):
            index = struct.unpack_from(">I", original_mmd, node["offset"] + field)[0]
            if index:
                d = info["descriptors"][index]
                if d["logical_size_candidate"] >= 8:
                    tag, referenced = struct.unpack_from(">2I", original_mmd, d["absolute_offset"])
                    if tag == 0 and referenced == roster_ix:
                        users.append((node["physical_index"], field))
    if users != [(117, 0x28)]:
        raise ValueError("The replaced roster is shared by another mission")
    new_roster = b"".join(struct.pack(">HHI", preset_ids[k], 0, 0)
                           for k in ["goku_ssj2", "vegeta_ssj2", "fat_buu"])
    modified_mmd = bytearray(original_mmd + new_roster)
    if revision != "KB01":
        if struct.unpack_from(">H", modified_mmd, root + 8)[0] != 9:
            raise ValueError("Unexpected original Cave arena field")
        struct.pack_into(">H", modified_mmd, root + 8, 8)
    struct.pack_into(">I", modified_mmd, 12, info["header"]["payload_size"] + len(new_roster))
    struct.pack_into(">HHI", modified_mmd, roster["table_offset"], 3, 8,
                     len(original_mmd) - info["header"]["payload_base"])
    checked = mmd.inspect(modified_mmd)
    for old, new in zip(info["nodes_92_byte_candidates"], checked["nodes_92_byte_candidates"]):
        if old != new:
            if revision == "KB01" or old["physical_index"] != 117:
                raise ValueError("Unrequested mission root changed")
            a = bytes.fromhex(old["raw_hex"])
            expected_root = a[:8] + struct.pack(">H", 8) + a[10:]
            if bytes.fromhex(new["raw_hex"]) != expected_root:
                raise ValueError("Unexpected edit of mission root")
    for old, new in zip(info["descriptors"], checked["descriptors"]):
        if old["index"] != roster_ix:
            start, size = old["absolute_offset"], old["logical_size_candidate"]
            if old["index"] == info["header"]["raw_words_0x10_through_0x20"][0] and revision != "KB01":
                expected = bytearray(original_mmd[start:start + size])
                struct.pack_into(">H", expected, root - start + 8, 8)
                if bytes(expected) != modified_mmd[start:start + size]:
                    raise ValueError("Unexpected root array modification")
            elif original_mmd[start:start + size] != modified_mmd[start:start + size]:
                raise ValueError("Another descriptor body changed")
    changed_galaxy_pak = resize_stpk(galaxy_pak, "galaxy.mmd", modified_mmd)
    changed_galaxy = recompress_resized(changed_galaxy_pak, galaxy_layout)
    # Extract independently from the completed boot and check each table again.
    entries = afs.inspect(changed_boot)["members"]
    e = entries[22]
    final_pak, _ = zpak.read_container(changed_boot[e["offset"]:e["offset"] + e["size"]])
    final_params = member_body(final_pak, "game_resident_param_m.pak")
    for key, name in names.items():
        if member_body(final_params, name) != changed_tables[key]:
            raise ValueError("Final AFS table verification failed")
    final_galaxy, _ = zpak.read_container(changed_galaxy)
    if member_body(final_galaxy, "galaxy.mmd") != bytes(modified_mmd):
        raise ValueError("Final Galaxy verification failed")
    payloads = {"st_pack_boot_pt_ps3.afs": changed_boot,
                "galaxy.zpak": changed_galaxy, "galaxy.mmd": bytes(modified_mmd),
                "boot-resident22.zpak": changed_boot_z,
                "game_resident_param_m.pak": changed_params,
                **{names[k]: v for k, v in changed_tables.items()}}
    report = {"mod_id": revision, "game": "BLES00978", "status": "GAMEPLAY_UNTESTED",
              "node": 117, "node_offset": hex(root), "enemy_group": group_ix,
              "enemy_roster_descriptor": roster_ix, "original_presets": [815, 816],
              "new_team": [preset_ids[k] for k in ["goku_ssj2", "vegeta_ssj2", "fat_buu"]],
              "forms": forms, "afs": afs_report, "eboot_modified": False,
              "arena_id": 9 if revision == "KB01" else 8,
              "arena_field_offset": hex(root + 8),
              "slot_experiment": revision == "KB02B",
              "ai_configuration": "CPU MAX item 0xAD on all six forms; original opaque strength words preserved",
              "table_counts": {"appearance": 373, "galaxy_presets": 1064, "strength": 783},
              "files": {name: {"size": len(body), "sha256": zpak.sha(body)}
                        for name, body in payloads.items()},
              "verification": ["Original table records unchanged", "Other mission roots unchanged",
                  "Roster descriptor 788 relocated to appended 3-member list",
                  "Other 117 Galaxy members unchanged, including tutorial.mmd",
                  "Other 8 outer boot members and 10 parameter members unchanged",
                  "Other 40 AFS members unchanged", "Final extraction and decompression verified"]}
    output.mkdir(parents=True, exist_ok=False)
    for name, body in payloads.items():
        (output / name).write_bytes(body)
    (output / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--boot-afs", type=Path, required=True)
    p.add_argument("--galaxy-zpak", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--revision", choices=["KB01", "KB02A", "KB02B"], default="KB02B")
    args = p.parse_args()
    try:
        report = build(args.boot_afs, args.galaxy_zpak, args.output, args.revision)
        print(json.dumps(report, indent=2))
    except (OSError, ValueError, struct.error) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
