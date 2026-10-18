#!/usr/bin/env python3
"""Build the requested full gear using the original game-localized item indices.

Input boot is the verified KB10A baseline with six dedicated appended presets.
The Galaxy input must contain the exact original European MMD. For node117,
combat fields are copied from simple Goku node238; coordinates, prerequisites,
rewards and the node's own enemy-group reference are retained. No EBOOT edits.
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
from build_kid_buu_mod import (member_body, replace_afs_copy, resize_stpk,
                               recompress_resized)

F = 0xFFFFFFFF
BOOT_SHA = "52f800e7df95ac2f0cb09c34b3848da1d805a837cb27e51f39f1fbcea73e631c"
MMD_SHA = "c0a12c58b22cb4b2884bcfe8c550a1f5a25f60c192986c6f1fd9bd3eccb155a7"
FORMS = [
    ("goku_ssj2", 1058, 777, 2, 0, [0xAD, 0x4F, 0x4E, 0x153]),
    ("goku_ssj3", 1059, 778, 3, 0, [0xAD, 0x4F, 0x4E, 0x4D, 0x15D, 0x15A]),
    ("goku_base", 1060, 779, 0, 0,
     [0xAD, 0x4F, 0x15D, 0x161, 0x71, 0x79, 0xF0, 0x3E, 0xB4]),
    ("vegeta_ssj2", 1061, 780, 20, 1, [0xAD, 0x4F, 0x4E, 0x4D, 0x15B]),
    ("vegeta_base", 1062, 781, 17, 1, [0xAD, 0x4F, 0x160, 0x15E]),
    ("fat_buu", 1063, 782, 62, 0, [0xAD, 0x4F, 0x4E]),
]
LINKS = {1058: (1059, 1059, F, F), 1059: (1060, F, F, F),
         1060: (F, F, F, F), 1061: (1062, F, F, F),
         1062: (F, F, F, F), 1063: (F, F, F, F)}
FORMS_14 = [
    (key, pi, si, native, costume,
     {"goku_ssj3": [0xAD, 0x4F, 0x4E, 0x4D, 0x15B],
      "vegeta_ssj2": [0xAD, 0x4F, 0x4E, 0x4D, 0x13C, 0x15B],
      "vegeta_base": [0xAD, 0x4F]}.get(key, gear))
    for key, pi, si, native, costume, gear in FORMS
]
FORMS_15 = [
    (key, pi, si, native, costume,
     {"goku_ssj2": [0xAD, 0x4F, 0x4E, 0x156],
      "vegeta_base": [0xAD, 0x4F, 0x15D]}.get(key, gear))
    for key, pi, si, native, costume, gear in FORMS_14
]
LINKS_15 = dict(LINKS)
LINKS_15[1058] = (F, 1059, F, F)


def build(boot_path, galaxy_path, catalog_path, output, node, setup="kb13"):
    if node not in (117, 238) or output.exists():
        raise ValueError("Choose node117 or238 and a new output directory")
    boot = boot_path.read_bytes()
    if z.sha(boot) != BOOT_SHA:
        raise ValueError("Expected exact KB10A corrected minimal boot baseline")
    entry = afs.inspect(boot)["members"][22]
    resident = boot[entry["offset"]:entry["offset"] + entry["size"]]
    outer, _ = z.read_container(resident)
    params = member_body(outer, "game_resident_param_m.pak")
    strengths_raw = member_body(params, "preset_strength_table.dat")
    strengths = pre.table(strengths_raw, 88)
    presets = pre.table(member_body(params, "preset_character_galaxy.dat"), 44)
    appearances = pre.table(member_body(params, "preset_appearance_table.dat"), 32)
    if (len(strengths), len(presets), len(appearances)) != (783, 1064, 373):
        raise ValueError("Unexpected baseline table counts")
    with catalog_path.open(newline="", encoding="utf-8") as f:
        catalog = {int(x["item_index_decimal"]): x for x in csv.DictReader(f)}
    definitions = pre.item_table(member_body(params, "item_parameter.dat"))
    changed = bytearray(strengths_raw)
    forms = []
    selected_forms = {"kb13": FORMS, "kb14": FORMS_14, "kb15": FORMS_15, "kb15b": FORMS_15}[setup]
    selected_links = LINKS_15 if setup == "kb15" else LINKS
    for key, index, strength_index, native, costume, gear in selected_forms:
        p = presets[index]
        if (p[1], appearances[p[0]][0], appearances[p[0]][1], p[3:7]) != (
                strength_index, native, costume, LINKS[index]):
            raise ValueError("Unexpected dedicated preset identity or links")
        if strengths[strength_index][1] != F:
            raise ValueError("Expected baseline default AI type")
        for i in gear:
            if i not in catalog or int(catalog[i]["name_text_id"]) != definitions[i][0]:
                raise ValueError("Catalog text binding differs from item definition")
        row = strengths[strength_index][:2] + tuple(gear) + (F,) * (20 - len(gear))
        struct.pack_into(">22I", changed, 16 + strength_index * 88, *row)
        forms.append({"key": key, "preset": index, "strength": strength_index,
                      "native": native, "costume_index": costume,
                      "level_word_before_item_effects": row[0], "AI_type_word": "FFFFFFFF",
                      "links": [hex(x) for x in selected_links[index]],
                      "items": [catalog[i] for i in gear]})
    checked = pre.table(bytes(changed), 88)
    assert checked[:777] == strengths[:777]
    for _, _, si, _, _, gear in selected_forms:
        assert checked[si][:2] == strengths[si][:2]
        assert checked[si][2:] == tuple(gear) + (F,) * (20 - len(gear))
    new_params, _ = z.replace(params, "preset_strength_table.dat", bytes(changed))
    if setup == "kb15":
        new_presets = bytearray(member_body(params, "preset_character_galaxy.dat"))
        struct.pack_into(">4I", new_presets, 16 + 1058 * 44 + 12, *LINKS_15[1058])
        checked_presets = pre.table(bytes(new_presets), 44)
        assert checked_presets[:1058] == presets[:1058]
        assert checked_presets[1058][3:7] == LINKS_15[1058]
        assert checked_presets[1059:] == presets[1059:]
        new_params, _ = z.replace(new_params, "preset_character_galaxy.dat", bytes(new_presets))
    new_resident, _ = z.replace(resident, "game_resident_param_m.pak", new_params)
    new_boot, afs_report = replace_afs_copy(boot, 22, new_resident)

    galaxy = galaxy_path.read_bytes()
    galaxy_pak, galaxy_layout = z.read_container(galaxy)
    original = member_body(galaxy_pak, "galaxy.mmd")
    if z.sha(original) != MMD_SHA:
        raise ValueError("Expected exact original European Galaxy MMD")
    info = mmd.inspect(original)
    roots = info["descriptors"][3465]
    root = roots["absolute_offset"] + node * 92
    simple = roots["absolute_offset"] + 238 * 92
    old_root = original[root:root + 92]
    group_index = struct.unpack_from(">I", old_root, 0x28)[0]
    group = info["descriptors"][group_index]
    tag, roster_index = struct.unpack_from(">2I", original, group["absolute_offset"])
    assert tag == 0 and roster_index == {117: 788, 238: 1580}[node]
    roster = info["descriptors"][roster_index]
    body = b"".join(struct.pack(">HHI", i, 0, 0) for i in [1058, 1061, 1063])
    changed_mmd = bytearray(original + body)
    new_root = bytearray(original[simple:simple + 92])
    # Preserve this node's map position, prerequisites, rewards and enemy group.
    new_root[:8] = old_root[:8]
    for offset in (0x20, 0x28, 0x2C):
        new_root[offset:offset + 4] = old_root[offset:offset + 4]
    struct.pack_into(">HH", new_root, 8, 8, 4)  # Kai world; original hard difficulty.
    changed_mmd[root:root + 92] = new_root
    struct.pack_into(">I", changed_mmd, 12, info["header"]["payload_size"] + len(body))
    struct.pack_into(">HHI", changed_mmd, roster["table_offset"], 3, 8,
                     len(original) - info["header"]["payload_base"])
    final_info = mmd.inspect(bytes(changed_mmd))
    for n in range(498):
        a = roots["absolute_offset"] + 92 * n
        assert changed_mmd[a:a + 92] == (new_root if n == node else original[a:a + 92])
    for before, after in zip(info["descriptors"], final_info["descriptors"]):
        if before["index"] in (3465, roster_index):
            continue
        a, size = before["absolute_offset"], before["logical_size_candidate"]
        assert changed_mmd[a:a + size] == original[a:a + size]
    resized = resize_stpk(galaxy_pak, "galaxy.mmd", bytes(changed_mmd))
    new_galaxy = recompress_resized(resized, galaxy_layout) if galaxy_layout else resized
    unpacked, _ = z.read_container(new_galaxy)
    assert member_body(unpacked, "galaxy.mmd") == bytes(changed_mmd)
    final_entry = afs.inspect(new_boot)["members"][22]
    final_outer, _ = z.read_container(new_boot[final_entry["offset"]:
                                            final_entry["offset"] + final_entry["size"]])
    assert member_body(member_body(final_outer, "game_resident_param_m.pak"),
                       "preset_strength_table.dat") == bytes(changed)
    report = {"experiment": ("KB" if node == 117 else "GB") + {"kb13": "13A", "kb14": "14A", "kb15": "15A", "kb15b": "15B"}[setup],
              "status": "DATA_VERIFIED_GAMEPLAY_UNTESTED", "node": node,
              "simple_template_node": 238, "arena": 8, "menu_difficulty": 4,
              "roster": [1058, 1061, 1063], "forms": forms, "EBOOT_modified": False,
              "root_before_hex": old_root.hex(), "root_after_hex": bytes(new_root).hex(),
              "root_field_policy": "Simple template except coordinates, prerequisites+20, enemy-group+28, rewards+2C; arena8 and difficulty4",
              "boot_sha256": z.sha(new_boot), "galaxy_sha256": z.sha(new_galaxy),
              "baseline_boot_sha256": z.sha(boot), "baseline_galaxy_sha256": z.sha(galaxy),
              "catalog_sha256": z.sha(catalog_path.read_bytes()), "afs": afs_report,
              "limits": ({"kb14": "KB14 configuration is not gameplay-tested, per user request. GokuSSJ3 and VegetaSSJ2 cancel at two bars; only Goku base has HP-based switch. Raging Soul Start is13C (propertyB2).", "kb15": "GokuSSJ2 native slot0 is cancellation and slot1 is SSJ3. Item156 selects second slot at3bars, with only that preset link enabled. Vegeta base now has15D. Gameplay verification pending.", "kb15b": "Uses item156 for GokuSSJ2 second native slot at3bars, retaining the original game's duplicated first/second preset link pattern. Vegeta base now has15D. Gameplay verification pending.", "kb13": "GokuSSJ3 switch15D and cancel15A compete at the same HP condition; precedence untested."}[setup]) + " KO-entry buffs require actual preceding KO, not HP-based switching."}
    output.mkdir(parents=True, exist_ok=False)
    (output / "st_pack_boot_pt_ps3.afs").write_bytes(new_boot)
    (output / "galaxy.zpak").write_bytes(new_galaxy)
    (output / "galaxy.mmd").write_bytes(changed_mmd)
    (output / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--boot-afs", type=Path, required=True)
    parser.add_argument("--galaxy-zpak", type=Path, required=True)
    parser.add_argument("--catalog-it", type=Path, required=True)
    parser.add_argument("--node", type=int, choices=[117, 238], default=117)
    parser.add_argument("--setup", choices=["kb13", "kb14", "kb15", "kb15b"], default="kb13")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = build(args.boot_afs, args.galaxy_zpak, args.catalog_it, args.output, args.node, args.setup)
    print(json.dumps({k: report[k] for k in ["experiment", "status", "boot_sha256", "galaxy_sha256"]}))


if __name__ == "__main__":
    main()
