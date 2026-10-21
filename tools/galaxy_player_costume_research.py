#!/usr/bin/env python3
"""Reproduce the stock Galaxy main-player costume path, without patching/running it.

Requires Capstone 5.0.7 and the exact privately supplied European decrypted ELF.
Guest addresses are translated through ELF segments, never applied to SELF offsets.
"""
import argparse
import hashlib
import json
from pathlib import Path

from elf_evidence import EXPECTED, bytes_at, load_segments


def analyze(raw):
    from capstone import Cs, CS_ARCH_PPC, CS_MODE_64, CS_MODE_BIG_ENDIAN

    if hashlib.sha256(raw).hexdigest() != EXPECTED:
        raise ValueError("Unsupported ELF: rediscover the path for this executable")
    segments = load_segments(raw)
    decoder = Cs(CS_ARCH_PPC, CS_MODE_64 | CS_MODE_BIG_ENDIAN)

    def read(start, end):
        return bytes_at(raw, segments, start, end)[1]

    checks = {
        0x1ED888: ("li", "r0, 2"),
        0x1ED88C: ("extsw", "r7, r7"),
        0x1ED890: ("li", "r8, 0"),
        0x1ED89C: ("li", "r4, 0"),
        0x1ED8A0: ("li", "r5, 0"),
        0x1ED8BC: ("bl", "0x1cdae8"),
        0x1CDAE8: ("mulli", "r5, r5, 0xbc"),
        0x1CDAF0: ("mulli", "r4, r4, 0x3ac"),
        0x1CDAFC: ("addi", "r11, r5, 0x60"),
        0x1CDB30: ("stw", "r8, 0x10(r11)"),
        0x1CDB48: ("stw", "r9, 0x10(r3)"),
        0x1CDCE4: ("mulli", "r5, r5, 0xbc"),
        0x1CDCF4: ("addi", "r5, r5, 0x68"),
        0x1CBBBC: ("bl", "0x1cdce4"),
        0x1CBBD0: ("beq", "cr7, 0x1cc5c0"),
        0x1CC5D8: ("lwz", "r9, 8(r3)"),
        0x1CC5F0: ("stw", "r9, 8(r28)"),
        0x1CC5C8: ("lwz", "r8, 0x18(r3)"),
        0x1CC604: ("stw", "r8, 0x18(r28)"),
        0x172E4: ("lwz", "r0, 8(r28)"),
        0x172F0: ("stw", "r0, 4(r31)"),
        0x172F4: ("lwz", "r9, 0x18(r28)"),
        0x172F8: ("stw", "r9, 8(r31)"),
        0x1ED968: ("bl", "0x1e6c18"),
        0x1ED980: ("bl", "0x1cdb50"),
        0x1EDA9C: ("bl", "0x1e6c18"),
        0x1EDAB4: ("bl", "0x1cdb50"),
    }
    for address, expected in checks.items():
        decoded = list(decoder.disasm_lite(read(address, address + 4), address))
        if len(decoded) != 1 or decoded[0][2:] != expected:
            raise ValueError(f"Instruction mismatch at {address:08X}")

    ranges = {
        "galaxy_main_player_arguments": (0x1ED87C, 0x1ED8E0),
        "ordinary_participant_setter": (0x1CDAE8, 0x1CDB50),
        "participant_getter": (0x1CDCE4, 0x1CDD00),
        "main_player_branch": (0x1CBBBC, 0x1CBBE0),
        "main_player_parameter_copy": (0x1CC5C0, 0x1CC60C),
        "actor_identity_copy": (0x172D8, 0x172FC),
        "galaxy_ally_preset": (0x1ED964, 0x1ED984),
        "galaxy_enemy_preset": (0x1EDA98, 0x1EDAB8),
    }
    disassembly = {}
    for name, (start, end) in ranges.items():
        rows = list(decoder.disasm_lite(read(start, end), start))
        if sum(row[1] for row in rows) != end - start:
            raise ValueError("Incomplete disassembly: " + name)
        disassembly[name] = [f"{a:08X}: {m} {o}".rstrip() for a, _, m, o in rows]
    offset, original = bytes_at(raw, segments, 0x1ED890, 0x1ED894)
    candidate = bytearray(raw)
    candidate[offset:offset + 4] = bytes.fromhex("39000001")
    return {
        "source_elf_sha256": EXPECTED,
        "scope": "Read-only static proof. Does not execute, patch or write the supplied ELF.",
        "instruction_checks": len(checks),
        "finding": "Galaxy main player uses literal costume index0; allies/enemies use preset expansion.",
        "flow": ["r8=0 at1ED890", "setter1CDAE8 writes config+70 for side0/slot0",
                 "getter1CDCE4 returns config+68", "1CC5D8 reads +8 (config+70)",
                 "parameter row+8 receives costume", "172E4/172F0 copy it into actor+4"],
        "minimal_candidate": {
            "guest_virtual_address": "0x1ED890", "elf_file_offset": hex(offset),
            "original_word": original.hex(), "replacement_word": "39000001",
            "meaning": "li r8,0 -> li r8,1: use zero-based costume1 (costume2)",
            "candidate_elf_sha256": hashlib.sha256(candidate).hexdigest(),
            "limitations": "Global Galaxy main-player override, not a per-character policy or new selector UI. Does not add costume resources or save storage. Must choose a costume supported by the character."
        },
        "related_custom_slot_candidate": {
            "guest_virtual_address": "0x1ED888",
            "original_word": "38000002", "original_meaning": "li r0,2: ordinary Custom3 index",
            "proposed_words": {"Custom1": "38000000", "Custom2": "38000001"},
            "flow": "stack+7C -> config+80 -> parameter row+18 -> actor+8",
            "scope": "Static candidate only; no changed-Custom-slot runtime control. The costume A/B retains Custom3 in both runs. Not a Galaxy preset index."
        },
        "disassembly": disassembly,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--elf", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(analyze(args.elf.read_bytes()), indent=2))


if __name__ == "__main__":
    main()
