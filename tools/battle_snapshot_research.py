#!/usr/bin/env python3
"""Read the supplied BLES00978 battle snapshot without changing memory.

Offsets come from the matching EBOOT. Table copies, live item bits, CPU
candidates and code identity are reported separately from gameplay conclusions.
"""
import argparse
import json
import mmap
from pathlib import Path
import struct

from elf_evidence import EXPECTED, load_segments, bytes_at
from ram_research import readable_regions, find_exact
from zpak_research import sha
from preset_research import table

TOC = 0x6E8D90


def analyze(memory_path, manifest_path, elf_path, tables):
    manifest = json.loads(manifest_path.read_text())
    regions = readable_regions(manifest, memory_path.stat().st_size)
    elf = elf_path.read_bytes()
    if sha(elf) != EXPECTED:
        raise ValueError("Different ELF; live-layout offsets are version-specific")
    segments = load_segments(elf)
    with memory_path.open("rb") as f, mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as memory:
        def u32(addr):
            if not any(a <= addr and addr + 4 <= b for a, b in regions):
                raise ValueError(f"Read outside readable region: {addr:#x}")
            return struct.unpack_from(">I", memory, addr)[0]

        matches = []
        for name in ["preset_appearance_table.dat", "preset_character_galaxy.dat",
                     "preset_strength_table.dat", "galaxy.mmd"]:
            b = (tables / name).read_bytes()
            hits = find_exact(memory, regions, b)
            matches.append({"file": name, "sha256": sha(b), "addresses": list(map(hex, hits))})
        spans = [(0x12D3E4, 0x12D678), (0x1D7EC, 0x1D914),
                 (0x16BD8, 0x16C7C), (0x193B8, 0x193F0),
                 (0xACF58, 0xAD1B4), (0x18B2C, 0x18C40),
                 (0x1947C, 0x194C0)]
        code = []
        for start, end in spans:
            _, b = bytes_at(elf, segments, start, end)
            code.append({"start": hex(start), "end_exclusive": hex(end),
                         "identical_to_original_elf": memory[start:end] == b})
        if not all(r["identical_to_original_elf"] for r in code):
            raise ValueError("Snapshot code differs from original ELF")
        app = u32(u32(TOC - 0x7EB8))
        context = u32(app + 0x3C)
        game_data = u32(u32(u32(TOC - 0x46A4)))
        actors = []
        for side in [0, 1]:
            current = u32(context + 0x487C + 4 * side)
            for slot in range(5):
                a = context + 0x4924 + side * 0xB85C + slot * 0x24DC
                flags = memory[a + 0x3D]
                if not flags & 1:
                    continue
                effects = a + 0x40
                effect_words = [u32(effects + i * 4) for i in range(25)]
                items = [i for i in range(384)
                         if effect_words[13 + i // 32] & (1 << (i % 32))]
                actors.append({"side": side, "team_slot": slot, "address": hex(a),
                               "active": u32(current + 0x1C) == slot,
                               "native_id": u32(a), "costume_index": u32(a + 4),
                               "galaxy_preset_index": u32(a + 8) if flags & 0x40 else None,
                               "raw_configuration_index": u32(a + 8),
                               "configuration_flags": hex(flags),
                               "runtime_level_word": u32(a + 0x24),
                               "max_hp": u32(a + 0x28), "current_hp": u32(a + 0x2C),
                               "aura_float": struct.unpack_from(">f", memory, a + 0x34)[0],
                               "item_indices": list(map(hex, items)),
                               "effect_words_hex": list(map(hex, effect_words)),
                               "property_flags_hex": [hex(i) for i in range(384)
                                                      if effect_words[1 + i // 32] & (1 << (i % 32))],
                               # Original localized definition153 sets propertyE2.
                               # Earlier reports mislabeled D2 (157: three steps/one bar).
                               "first_transform_3hp_property_present": bool(effect_words[8] & 0x4)})
        availability = []
        for side in [0, 1]:
            addr = game_data + side * 0xBE8 + 0x5B8
            bits = struct.unpack_from(">2Q", memory, addr)
            availability.append({"side": side, "address": hex(addr),
                                 "native_ids_allowed": [i for i in range(100)
                                                        if bits[i // 64] >> (i % 64) & 1]})
        # Follow the controller pointer used by the original 0x1947C getter.
        # A base-target vector [0,F,F,F] is common in unrelated RAM objects;
        # pattern matches alone do not establish a CPU controller identity.
        appearances = table((tables / "preset_appearance_table.dat").read_bytes(), 32)
        presets = table((tables / "preset_character_galaxy.dat").read_bytes(), 44)
        vectors = set()
        for actor in actors:
            if actor["side"] != 1 or not actor["active"]:
                continue
            index = actor["galaxy_preset_index"]
            if index is None:
                continue
            vector = tuple(0xFFFFFFFF if link == 0xFFFFFFFF else appearances[presets[link][0]][0]
                           for link in presets[index][3:7])
            if any(value != 0xFFFFFFFF for value in vector):
                vectors.add(vector)
        candidates = []
        controller = u32(context + 0x48AC + 4)
        vector = tuple(u32(controller + 0x6C + i * 4) for i in range(4))
        if vectors and u32(controller) == 1:
            candidates.append({"address": hex(controller), "side": 1,
                               "located_via": "0x1947C battle-context controller pointer",
                               "transformation_native_ids": list(vector),
                               "matches_active_preset_links": vector in vectors,
                               "equal_parameter_slot_word": hex(u32(controller + 0xE0)),
                               "fusion_equal_parameter_slot_word": hex(u32(controller + 0xE4))})
        return {"title_id": manifest["title_id"], "created_utc": manifest["created_utc"],
                "status": "One battle snapshot; no temporal trace of HP threshold crossing",
                "elf_sha256": EXPECTED, "original_code_spans": code,
                "file_copies": matches, "app_address": hex(app),
                "battle_context_address": hex(context), "game_data_address": hex(game_data),
                "context_word_0x24": u32(context + 0x24), "actors": actors,
                "native_id_availability": availability, "cpu_candidate_structures": candidates}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--memory", type=Path, required=True)
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--elf", type=Path, required=True)
    p.add_argument("--tables", "--kb01-files", dest="tables", type=Path, required=True,
                   help="Exact extracted tables for the revision being analyzed")
    a = p.parse_args()
    print(json.dumps(analyze(a.memory, a.manifest, a.elf, a.tables), indent=2))


if __name__ == "__main__":
    main()
