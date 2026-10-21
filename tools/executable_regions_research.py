#!/usr/bin/env python3
"""Compare selected instruction spans in the three supplied legacy EBOOTs.

Reads decrypted EBOOT_BLES00978.elf, EBOOT_BLUS30581.elf and EBOOT_BLJS10085.elf
from --legacy-directory. Restores the author-confirmed single NOP in memory only.
No executables are written. This is not a generic signature-based patcher.
"""
import argparse
import json
from pathlib import Path
import struct

from download_preset_research import original_image
from elf_evidence import bytes_at, load_segments

SPANS = {
    "zoneMusicChoice": (0x26F740, 0x26F8C8),
    "zoneSecretRequirement": (0x26F8C8, 0x26FA18),
    "zoneConfigMusicConsumer": (0x271700, 0x2717E8),
    "galaxyMapSetupSpan": (0x1F0D80, 0x1F0E20),
    "downloadFlagGetter": (0x172578, 0x1725D4),
}


WORLD_SPANS = {
    "worldControllerDestructor": (0x1D65E8, 0x1D67CC),
    "worldControllerPoolConstructor": (0x1D702C, 0x1D7134),
    "worldControllerConstructor": (0x1D7F04, 0x1D7F84),
    "galaxyAggregateInitializer": (0x3190D4, 0x319148),
    "galaxyCostumeArguments": (0x1ED87C, 0x1ED8E0),
}


def words_at(raw, segments, address, size):
    return list(struct.unpack(">" + str(size // 4) + "I",
                              bytes_at(raw, segments, address, address + size)[1]))


def masks(words, start):
    result = []
    end = start + 4 * len(words)
    for i, word in enumerate(words):
        opcode = word >> 26
        mask = 0xFFFFFFFF
        if opcode == 18 and not word & 2:
            delta = word & 0x3FFFFFC
            if delta & 0x2000000:
                delta -= 0x4000000
            if not start <= start + 4 * i + delta < end:
                mask = 0xFC000003
        elif opcode == 16 and not word & 2:
            delta = word & 0xFFFC
            if delta & 0x8000:
                delta -= 0x10000
            if not start <= start + 4 * i + delta < end:
                mask = 0xFFFF0003
        elif opcode in list(range(32, 56)) + [14, 15] and (word >> 16) & 31 == 2:
            mask = 0xFFFF0000
        result.append(mask)
    return result


def compare(directory, spans=None, strict=True):
    inputs = {}
    for region in ("BLES00978", "BLUS30581", "BLJS10085"):
        reference, _, profile = original_image((directory / f"EBOOT_{region}.elf").read_bytes())
        if profile["region"] != region:
            raise ValueError("Filename and recognized regional profile differ")
        inputs[region] = reference, load_segments(reference)
    european, european_segments = inputs["BLES00978"]
    reports = []
    for name, (start, end) in (SPANS if spans is None else spans).items():
        reference = words_at(european, european_segments, start, end - start)
        mask = masks(reference, start)
        best = (0, 0)
        run = None
        for i, m in enumerate(mask + [0]):
            if m == 0xFFFFFFFF and run is None:
                run = i
            if m != 0xFFFFFFFF and run is not None:
                if i - run > best[1] - best[0]:
                    best = run, i
                run = None
        needle = struct.pack(">" + str(best[1] - best[0]) + "I", *reference[best[0]:best[1]])
        if len(needle) < 12:
            raise ValueError("Insufficient exact anchor")
        for region, (raw, segments) in inputs.items():
            offset = 0
            hits = []
            while (offset := raw.find(needle, offset)) != -1:
                segment = next((s for s in segments if s["flags"] & 1 and
                                s["file_offset"] <= offset < s["file_offset"] + s["file_size"]), None)
                if segment and offset % 4 == 0:
                    candidate = offset - segment["file_offset"] + segment["virtual"] - best[0] * 4
                    try:
                        values = words_at(raw, segments, candidate, end - start)
                    except ValueError:
                        values = []
                    if len(values) == len(reference) and all((a & m) == (b & m)
                                                            for a, b, m in zip(reference, values, mask)):
                        hits.append(hex(candidate))
                offset += 1
            if len(hits) != 1 and strict:
                raise ValueError(f"Missing/ambiguous span: {region}/{name}: {hits}")
            reports.append(dict(feature=name, region=region, EUReferenceVA=hex(start),
                                bytesCompared=end-start, maskedWordCount=sum(m != 0xFFFFFFFF for m in mask),
                                matches=hits,
                                scope="Static instruction-layout/internal-branch comparison; external call targets and TOC offsets are masked and are NOT proved semantically identical by this scan. Not a gameplay control or generic patch permission."))
    return reports


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--legacy-directory", type=Path, required=True)
    parser.add_argument("--world-spans", action="store_true",
                        help="Compare world/initializer spans and report missing/ambiguous matches without guessing")
    args = parser.parse_args()
    print(json.dumps(compare(args.legacy_directory, WORLD_SPANS if args.world_spans else None,
                             strict=not args.world_spans), indent=2))
