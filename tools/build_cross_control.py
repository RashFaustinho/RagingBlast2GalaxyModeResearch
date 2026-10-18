#!/usr/bin/env python3
"""Build KB03X from the exact KB02B Galaxy: exchange two enemy references.

This is a diagnostic comparison, not the requested final roster. Boot tables
and all battle settings stay unchanged. Use the matching KB02B boot AFS.
"""
import argparse
import json
from pathlib import Path
import struct

import mmd_research as mmd
import zpak_research as zpak

KB02B_GALAXY_SHA = "ebfa9de1489904714025c5b45d7d10ef06d490f20651d6257c3b8b3ed6985f15"


def build(source, output):
    if output.exists() or source.resolve() == output.resolve():
        raise ValueError("Choose a new output file")
    archive = source.read_bytes()
    if zpak.sha(archive) != KB02B_GALAXY_SHA:
        raise ValueError("Expected the exact KB02B galaxy.zpak")
    pak, _ = zpak.read_container(archive)
    member = next(e for e in zpak.members(pak) if e["name"] == "galaxy.mmd")
    data = pak[member["offset"]:member["offset"] + member["size"]]
    parsed = mmd.inspect(data)
    changed = bytearray(data)
    edits = []
    for node_index, expected_count, before, after in [(117, 3, 1058, 788), (125, 1, 788, 1058)]:
        node = parsed["nodes_92_byte_candidates"][node_index]
        group = parsed["descriptors"][node["reference_candidates"]["0x28"]]
        if (group["count_candidate"], group["element_size_candidate"]) != (1, 8):
            raise ValueError("Unsupported enemy group")
        tag, roster_index = struct.unpack_from(">2I", data, group["absolute_offset"])
        roster = parsed["descriptors"][roster_index]
        if tag != 0 or (roster["count_candidate"], roster["element_size_candidate"]) != (expected_count, 8):
            raise ValueError("Unsupported roster")
        offset = roster["absolute_offset"]
        if struct.unpack_from(">H", data, offset)[0] != before:
            raise ValueError("Unexpected baseline enemy")
        struct.pack_into(">H", changed, offset, after)
        edits.append({"node": node_index, "roster_descriptor": roster_index,
                      "offset": hex(offset), "before_preset": before, "after_preset": after})
    mmd.inspect(changed)
    difference = mmd.difference(data, changed)
    if sum(s["length"] for s in difference["changed_spans"]) != 4:
        raise ValueError("Expected exactly four changed MMD bytes")
    compressed, report = zpak.replace(archive, "galaxy.mmd", bytes(changed))
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as stream:
        stream.write(compressed)
    report.update({"experiment": "KB03X", "status": "DATA_VERIFIED_GAMEPLAY_UNTESTED",
                   "edits": edits, "mmd_difference": difference,
                   "boot": "Exact KB02B boot, unchanged",
                   "purpose": "Cross the original Cell-boss Gohan preset and modified Goku between mission contexts"})
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--galaxy-zpak", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    print(json.dumps(build(a.galaxy_zpak, a.output), indent=2))


if __name__ == "__main__":
    main()
