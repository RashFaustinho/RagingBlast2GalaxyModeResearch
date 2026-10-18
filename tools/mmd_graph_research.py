#!/usr/bin/env python3
"""Check the observed MAIN mission graph, including both edge endpoints.

The root +0x20 list contains incident EDGE indices, not prerequisite node IDs.
This validates the original Galaxy/tutorial layouts and rebuilt experiments;
it does not establish the game's maximum number of missions or save capacity.
"""
import argparse
import json
import struct
from pathlib import Path

from mmd_edit_research import Document


def inspect_graph(data):
    d = Document(data)
    if data[:4] != b"MAIN":
        raise ValueError("Expected MAIN")
    roots_ref, edges_ref = struct.unpack_from(">II", d.header, 0x10)
    roots, edges = d.body(roots_ref), d.body(edges_ref)
    count, stride, _ = d.descriptors[roots_ref]
    edge_count, edge_stride, _ = d.descriptors[edges_ref]
    if stride != 92 or edge_stride != 8:
        raise ValueError("Unexpected graph geometry")
    pairs = [struct.unpack_from(">4H", edges, i * 8)[::2]
             for i in range(edge_count)]
    uses = {}
    problems = []
    for n in range(count):
        ref = struct.unpack_from(">I", roots, n * 92 + 0x20)[0]
        if not ref:
            continue
        if d.descriptors[ref][1] != 4:
            raise ValueError("Unexpected incident-list stride")
        for pos in range(0, len(d.body(ref)), 4):
            edge, opaque = struct.unpack_from(">HH", d.body(ref), pos)
            uses[edge, n] = uses.get((edge, n), 0) + 1
            if edge >= edge_count or n not in pairs[edge]:
                problems.append({"node": n, "invalid_incident_edge": edge})
    for edge, pair in enumerate(pairs):
        for n in pair:
            if n >= count or uses.get((edge, n)) != 1:
                problems.append({"edge": edge, "endpoint": n,
                                 "incident_occurrences": uses.get((edge, n), 0)})
    return {"node_count": count, "edge_count": edge_count,
            "root_descriptor": roots_ref, "edge_descriptor": edges_ref,
            "consistent": not problems, "problems": problems}


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("mmd", type=Path)
    args = p.parse_args()
    result = inspect_graph(args.mmd.read_bytes())
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["consistent"] else 1)
