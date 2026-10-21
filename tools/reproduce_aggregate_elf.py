#!/usr/bin/env python3
"""Reproduce a published G67/G100 exact-input research delta into a NEW ELF.

This preserves historical research input identity. Feature-local compatibility
for modded executables is implemented separately by download_preset_research.py;
this broader save/world expansion has no generic mod-composition guarantee.
"""
import argparse
import hashlib
import json
from pathlib import Path

from apply_gs512_elf import apply


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('elf', type=Path)
    parser.add_argument('--profile', required=True, choices=('G67', 'G100'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    manifest_path = Path(__file__).resolve().parents[1] / 'research/executable-followup-20261019' / (args.profile + '-patch.json')
    try:
        manifest = json.loads(manifest_path.read_text())
        output = apply(args.elf.read_bytes(), manifest)
        with args.output.open('xb') as file:
            file.write(output)
        print(json.dumps(dict(profile=args.profile, sha256=hashlib.sha256(output).hexdigest(),
                              instructionsChanged=len(manifest['patches']),
                              requiresMatchingResearchSaveAndMMD=True,
                              researchOnly=True), indent=2))
    except (OSError, ValueError, KeyError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
