#!/usr/bin/env python3
"""Build an isolated Galaxy-aggregate research save from an original valid save.

G67/G100 are distinct from D2 despite sharing its110000-byte file length. This
script only constructs NEW files from original55000-byte input; it does not guess
an expanded format, downgrade unknown files, patch SELF or modify Studio projects.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct

from galaxy_save_extension import checksum

PROFILES = {"G67": (500, 67), "G100": (600, 100)}
BASE, SIZE = 0xD700, 110000


def layout(profile):
    if profile not in PROFILES:
        raise ValueError("Unknown research profile")
    missions, aggregates = PROFILES[profile]
    aggregate = BASE + missions * 28
    globals_ = aggregate + aggregates * 28
    return dict(profile=profile, size=SIZE, galaxyBank=BASE, missionCount=missions,
                aggregateCount=aggregates, aggregateBase=aggregate, globalBase=globals_,
                galaxySize=globals_ + 152 - BASE)


def build_save(source, profile):
    if len(source) != 55000 or struct.unpack_from(">II", source) != checksum(source):
        raise ValueError("Expected checksum-valid original55000-byte decrypted save")
    info = layout(profile)
    output = bytearray(source + b"\xA5" * (SIZE - len(source)))
    aggregate, globals_ = info["aggregateBase"], info["globalBase"]
    output[BASE:BASE + info["galaxySize"]] = bytes(info["galaxySize"])
    output[BASE:BASE + 500 * 28] = source[0x8148:0xB7F8]
    output[aggregate:aggregate + 66 * 28] = source[0xB7F8:0xBF30]
    for index in range(66, info["aggregateCount"]):
        struct.pack_into(">i", output, aggregate + index * 28 + 8, -1)
    output[globals_:globals_ + 152] = source[0xBF30:0xBFC8]
    struct.pack_into(">II", output, 0, *checksum(output))
    return bytes(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--profile", required=True, choices=PROFILES)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        output = build_save(args.input.read_bytes(), args.profile)
        with args.output.open("xb") as file:
            file.write(output)
        print(json.dumps(dict(layout(args.profile), sha256=hashlib.sha256(output).hexdigest(),
                              requiresMatchingExecutableAndMMD=True,
                              formatIdentification="Explicit profile; length alone cannot distinguish G67/G100/D2",
                              researchOnly=True), indent=2))
    except (OSError, ValueError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
