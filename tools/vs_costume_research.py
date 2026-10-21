#!/usr/bin/env python3
"""Read-only ordinary/DLC costume evidence for the exact original European ELF.

--parameters is the raw 100 x 56-byte game_resident_character_param.dat member.
No executable, game data or save is modified. Download IDs use the independently
decoded preset/Appearance catalog, not a character-select group ID.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct

from elf_evidence import EXPECTED, bytes_at, load_segments


SPANS = {
    "ordinaryCountGetter": (0x174790, 0x174818),
    "nextPreviousSelector": (0x174818, 0x174930),
    "menuCountConsumer": (0x1834C8, 0x18355C),
    "menuNextConsumer": (0x183CEC, 0x183D18),
    "menuPreviousConsumer": (0x183DC8, 0x183DF4),
}


def analyze(source, parameters):
    if hashlib.sha256(source).hexdigest() != EXPECTED:
        raise ValueError("Expected exact original European v1 ELF; rediscover other layouts first")
    if len(parameters) != 100 * 56:
        raise ValueError("Expected the raw original 100 x 56-byte character parameter table")
    path = Path(__file__).resolve().parents[1] / "research/download-presets-20261019/NATIVE_BLES00978.json"
    catalog = json.loads(path.read_text())["catalog"]
    dlc = {r["native"]: r for r in catalog}
    rows = []
    for native in range(100):
        regular = struct.unpack_from(">I", parameters, native * 56 + 0x20)[0]
        total = struct.unpack_from(">I", parameters, native * 56 + 0x2C)[0]
        if not 1 <= regular <= total <= 8:
            raise ValueError("Unexpected original costume counts")
        if native in dlc:
            if total != regular + 1 or dlc[native]["costume"] != regular:
                raise ValueError("Download Appearance does not match the extra costume")
            rows.append(dict(native=native, name=dlc[native]["name"], regularCount=regular,
                             totalCount=total, DLCIndex=regular, displayedCostume=regular + 1))
        elif regular != total:
            raise ValueError("Unexpected extra costume outside the 26-form catalog")
    segments = load_segments(source)
    spans = []
    for name, (start, end) in SPANS.items():
        offset, raw = bytes_at(source, segments, start, end)
        spans.append(dict(role=name, address=hex(start), fileOffset=offset, size=end-start,
                          sha256=hashlib.sha256(raw).hexdigest()))
    return dict(referenceSHA256=EXPECTED, parametersSHA256=hashlib.sha256(parameters).hexdigest(),
                counts=dict(nativeForms=100, DLCNativeForms=len(rows), baseCharacters=14),
                costumeParameter=dict(rowSize=56, ordinaryCountOffset=32, totalCountOffset=44),
                saveFlags=dict(offset=32, nativeStride=232, bit="costume index + 1",
                               expansionRequired=False, patchWritesSave=False),
                catalog=rows, spans=spans,
                codeEdits=[dict(address="0x17480c", old="80690020", new="8069002c",
                                purpose="Return total count instead of ordinary count"),
                           dict(address="0x1748d8", old="2f800000", new="48e8b868",
                                purpose="Read-only selective DLC exception in next/previous filtering")],
                scope="Static evidence only. Consult the separate native runtime report.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--elf", type=Path, required=True)
    parser.add_argument("--parameters", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(analyze(args.elf.read_bytes(), args.parameters.read_bytes()), indent=2))
    except (ValueError, OSError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
