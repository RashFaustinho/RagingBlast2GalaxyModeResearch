#!/usr/bin/env python3
"""Reproduce the scoped feature control on top of the EXACT G100 research ELF.

Includes a new authored helper segment. This is not a generic patch manager,
SELF exporter or an ordinary Galaxy Studio installation step. Read the research
scope and supply its matching save/data fixture. Writes a new file only.
"""
import argparse
import hashlib
import json
from pathlib import Path
from apply_double_save_elf import apply


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('elf', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--existing-secret-control', action='store_true',
                        help='Use the separate Normal Zone1 existing-secret-route control manifest')
    args = parser.parse_args()
    try:
        name = 'SCOPED_FEATURE_EXISTING_SECRET_CONTROL.json' if args.existing_secret_control else 'SCOPED_FEATURE_CONTROL.json'
        path = Path(__file__).resolve().parents[1] / 'research/executable-followup-20261019' / name
        manifest = json.loads(path.read_text())
        output = apply(args.elf.read_bytes(), manifest)
        if args.output:
            with args.output.open('xb') as file:
                file.write(output)
        print(json.dumps(dict(sourceProfile=manifest['sourceProfile'],
                              sha256=hashlib.sha256(output).hexdigest(),
                              written=args.output is not None, researchOnly=True), indent=2))
    except (OSError, ValueError, KeyError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
