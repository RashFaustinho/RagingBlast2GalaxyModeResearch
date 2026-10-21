#!/usr/bin/env python3
"""Reproduce the C64 circle-pool control from the exact final D2 research ELF.

This is a layered research experiment, not an ordinary Studio installation step.
It needs D2's matching save and map data. Read-only unless --output is supplied;
an output must be a new file. Other category pools keep their original capacities.
"""
import argparse
import hashlib
import json
from pathlib import Path

from apply_gs512_elf import apply


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("elf", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        path = Path(__file__).resolve().parents[1] / "research/executable-followup-20261019/C64-patch.json"
        manifest = json.loads(path.read_text())
        source = args.elf.read_bytes()
        if hashlib.sha256(source).hexdigest() != manifest["original_sha256"]:
            raise ValueError("Expected the exact final D2 decrypted research ELF; this is not an original-EBOOT patch.")
        output = apply(source, manifest)
        if args.output:
            with args.output.open("xb") as file:
                file.write(output)
        print(json.dumps({"sourceProfile": "Final D2",
                          "sha256": hashlib.sha256(output).hexdigest(),
                          "instructionsChanged": len(manifest["patches"]),
                          "written": args.output is not None,
                          "researchOnly": True}, indent=2))
    except (OSError, ValueError, KeyError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
