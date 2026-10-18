#!/usr/bin/env python3
"""Build the offline editor's English reference catalog and original portraits.

Normal users do not run this tool: the editor bundles its catalog and PNGs.
The optional --game-afs argument is only for rebuilding developer assets from
the user's original BLES00978 progress archive. No game archive is distributed.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import struct


ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def clean(text):
    """Convert in-game formatting placeholders into readable English labels."""
    text = re.sub(r"<DIG=[^>]+>", "[value]", text)
    text = re.sub(r"<PAD=([^>]+)>", lambda m: m[1].translate(str.maketrans(
        "ＬＲ０１２３４５６７８９＄", "LR0123456789 ")).strip(), text)
    return text.replace("\r", "").strip()


def build_catalog(research):
    source_names = []

    def rows(name):
        source_names.append(name)
        with (research / name).open(encoding="utf-8-sig", newline="") as stream:
            return list(csv.DictReader(stream))

    defaults = {}
    for row in rows("galaxy-presets-decoded.csv"):
        native = int(row["native_character_id"])
        if native not in defaults:
            defaults[native] = json.loads(row["appearance_other_fields"])[2:]
    characters = [{"id": int(r["native_id"]), "name": r["name"],
                   "portrait": f"assets/portraits/{int(r['native_id']):03}.png",
                   "defaultMoves": defaults[int(r["native_id"])]}
                  for r in rows("advanced/NATIVE_CHARACTER_IDS_EN.csv")]
    items = [{"id": int(r["item_index_decimal"]),
              "name": clean(r["game_name_en"]),
              "description": clean(r["game_description_en"]),
              "textId": int(r["name_text_id"])}
             for r in rows("item-catalog-BLES00978-EN.csv")]
    moves = [{"native": int(r["native_id"]),
              "id": int(r["local_move_index"]), "name": clean(r["move_name"]),
              "resolved": r["matching_resolved_text"] == "True"}
             for r in rows("advanced/LOCAL_MOVE_IDS_EN.csv")]
    stages = [{"id": int(r["stage_id_decimal"]), "name": r["original_english_name"]}
              for r in rows("STAGE_IDS_BLES00978_EN.csv")]
    music = [{"id": int(r["music_id_decimal"]),
              "name": "Random / automatic (mode-dependent)" if int(r["music_id_decimal"]) == 56 else r["original_english_name"],
              "textId": int(r["name_text_id"]), "description": r["description"]}
             for r in rows("MUSIC_IDS_BLES00978_EN.csv")]
    objectives = [{"id": int(r["objective_type"]), "name": clean(r["text"])}
                  for r in rows("advanced/GALAXY_OBJECTIVE_TYPES_EN.csv")]
    rules = [{"id": 0, "name": "None", "textId": None}] + [
        {"id": int(r["root_rule_selector"]), "name": clean(r["text"]),
         "textId": int(r["raw_text_id"])}
        for r in rows("advanced/GALAXY_RULE_DESCRIPTION_TEXTS_EN.csv")]
    texts = rows("advanced/JUST_ACTION_TEXT_IDS_EN.csv")
    actions = []
    for action_id in range(112):
        name = clean(texts[action_id]["text"]) if action_id < 108 else "Unresolved native action"
        if name == "???":
            name = "Unresolved native action"
        mode = ("direct" if action_id in {81, 82, 88, 100, 102, 108, 109, 110}
                else "expression" if action_id in {94, 95, 96, 97, 106} else "none")
        actions.append({"id": action_id, "name": name, "parameterMode": mode,
                        "resolved": action_id < 108 and action_id != 106})
    handicaps = [{"id": int(r["handicap_code"]), "name": clean(r["name"]),
                  "item": int(r["item_hex"], 16) if r["item_hex"] else None}
                 for r in rows("advanced/BATTLE_ZONE_HANDICAP_CODES_EN.csv")]
    stamps = [{"id": int(r["criterion_id"]), "name": clean(r["text"])}
              for r in rows("advanced/BATTLE_ZONE_CHALLENGE_STAMP_CRITERIA_EN.csv")]
    forms = []
    for r in rows("NATIVE_FORM_SLOTS_BLES00978.csv"):
        forms.append({"id": int(r["native_id_decimal"]), "slots": [
            {"slot": i,
             "target": int(r[f"native_slot{i}_target"]) if int(r[f"native_slot{i}_target"]) < 100 else None,
             "cancel": r[f"slot{i}_cancel_bit"] == "1"} for i in range(4)]})
    result = {
        "version": "BLES00978 / research 2026-10-15", "characters": characters,
        "items": items, "moves": moves, "stages": stages, "music": music,
        "objectives": objectives, "rules": rules, "actions": actions,
        "handicaps": handicaps, "stamps": stamps, "nativeTransforms": forms,
        "categories": [{"id": i, "name": name} for i, name in enumerate([
            "Standard A", "Standard B", "Perfect Action", "Bonus", "Boss",
            "Common A", "Common B", "Unknown category 7", "Tutorial"])],
        "difficulties": [{"id": i, "name": name} for i, name in enumerate([
            "Tutorial", "Very Easy", "Easy", "Normal", "Hard", "Very Hard", "Ultimate"])],
        "sources": [{"path": "research/" + name,
                     "sha256": sha((research / name).read_bytes())}
                    for name in source_names],
        "notes": {
            "items": "IDs are equipment-array indices, not save/localization IDs. textId is display provenance only.",
            "moves": "Move IDs are local to a native character/form. Unresolved rows are marked.",
            "rules": "id is the stored one-based rule selector. Zero means no rule text. Rule labels alone do not implement an effect.",
            "actions": "IDs are native action detectors. Only text IDs 0..107 supply corresponding labels; controller glyph strings 108+ are not action names.",
            "forms": "Native slots determine the action/animation. Preset links determine destination appearance and equipment. Null target means unused native slot.",
            "objectives": "Original label bindings, not a complete tested recipe for every condition.",
            "battleZoneMusic": "Stock Battle Zone chooses music from native stage-type pools and special last-zone cases; the MMD music word does not select the track.",
        },
    }
    assert len(characters) == 100 and len(items) == 381 and len(moves) == 690
    assert all(r["id"] == i for i, r in enumerate(characters))
    assert all(r["id"] == i for i, r in enumerate(items))
    assert items[0x156]["textId"] != 0x156, "Guard against the historical item ID namespace mistake"
    return result


def write_catalog(research, output):
    data = build_catalog(research)
    output.parent.mkdir(parents=True, exist_ok=True)
    chunks = ["/* Generated English BLES00978 reference data. See assets/ASSET_SOURCES.md. */\n",
              "globalThis.RB2 = globalThis.RB2 || {};\nRB2.DATA = {\n"]
    for key, value in data.items():
        chunks.append(json.dumps(key) + ": " + json.dumps(value, ensure_ascii=False, separators=(",", ":")) + ",\n")
    chunks.append("};\n")
    output.write_text("".join(chunks), encoding="utf-8")
    return {name: len(value) for name, value in data.items() if isinstance(value, list)}


def extract_portraits(afs, output):
    """Decode the original Galaxy screen's 100 DXT5 native-ID textures."""
    from PIL import Image
    import zpak_research as zpak

    def member(index, name):
        with afs.open("rb") as stream:
            if stream.read(4) != b"AFS\0":
                raise ValueError("Expected the original BLES00978 progress AFS")
            count = struct.unpack("<I", stream.read(4))[0]
            if index >= count:
                raise ValueError("AFS has no required member")
            stream.seek(8 + index * 8)
            offset, size = struct.unpack("<II", stream.read(8))
            stream.seek(offset)
            compressed = stream.read(size)
        pak, _ = zpak.read_container(compressed)
        entries = [x for x in zpak.members(pak) if x["name"] == name]
        if len(entries) != 1:
            raise ValueError(f"Expected one {name} in AFS member {index}")
        entry = entries[0]
        return pak[entry["offset"]:entry["offset"] + entry["size"]]

    spr = member(872, "chara_chip_tex.spr")
    vram = member(873, "chara_chip_tex.vram")
    if spr[:4] != b"SPRP" or spr[64:68] != b"TX2D":
        raise ValueError("Unsupported portrait SPR header")
    count = struct.unpack_from(">I", spr, 72)[0]
    if count != 100:
        raise ValueError("Expected 100 native character portraits")
    entry_size, string_size, info_size = struct.unpack_from(">III", spr, 20)
    string_base = 64 + entry_size
    info_base = string_base + string_size
    block_base = info_base + info_size
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "game": "Dragon Ball Raging Blast 2 / BLES00978 (European PS3)",
        "archive": "st_pack_progress_pt_ps3.afs",
        "metadata": {"afsEntry": 872, "name": "chara_chip_tex.spr", "sha256": sha(spr)},
        "textures": {"afsEntry": 873, "name": "chara_chip_tex.vram", "sha256": sha(vram)},
        "conversion": "Original 128x128 DXT5/BC3 pixels decoded to RGBA PNG; no enlargement, redraw, crop or synthetic artwork.",
        "portraits": [],
    }
    for native in range(count):
        name_offset, data_offset = struct.unpack_from(">II", spr, info_base + native * 32 + 8)
        end = spr.index(b"\0", string_base + name_offset)
        name = spr[string_base + name_offset:end].decode("ascii")
        if name != f"sc_chara_{native:03}.png":
            raise ValueError("Portrait native IDs do not follow the expected source names")
        metadata = struct.unpack_from(">4I4H2IB", spr, block_base + data_offset)
        offset, size, width, height, encoding = metadata[1], metadata[3], metadata[4], metadata[5], metadata[-1]
        if (width, height, size, encoding) != (128, 128, 16384, 24) or offset + size > len(vram):
            raise ValueError("Unexpected portrait texture geometry/encoding")
        dds = bytearray(128)
        dds[:4] = b"DDS "
        struct.pack_into("<7I", dds, 4, 124, 0x81007, height, width, size, 0, 1)
        struct.pack_into("<II4s", dds, 76, 32, 4, b"DXT5")
        struct.pack_into("<I", dds, 108, 0x1000)
        texture = vram[offset:offset + size]
        image = Image.open(io.BytesIO(dds + texture))
        image.load()
        if image.mode != "RGBA" or image.size != (128, 128):
            raise ValueError("DDS decoder returned unexpected output")
        path = output / f"{native:03}.png"
        image.save(path, optimize=True)
        manifest["portraits"].append({"id": native, "sourceName": name,
                                      "vramOffset": offset, "textureSha256": sha(texture),
                                      "file": path.name, "pngSha256": sha(path.read_bytes())})
    (output.parent / "portrait-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return len(manifest["portraits"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--research", type=Path, default=ROOT / "research")
    parser.add_argument("--output", type=Path, default=ROOT / "editor" / "js" / "data.js")
    parser.add_argument("--game-afs", type=Path, help="Developer asset rebuild only; optional original progress AFS")
    parser.add_argument("--portraits", type=Path, default=ROOT / "editor" / "assets" / "portraits")
    args = parser.parse_args()
    report = write_catalog(args.research, args.output)
    if args.game_afs:
        report["portraitsExtracted"] = extract_portraits(args.game_afs, args.portraits)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
