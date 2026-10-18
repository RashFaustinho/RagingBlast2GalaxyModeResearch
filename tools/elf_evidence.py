#!/usr/bin/env python3
"""Reproduce the selected static PPC64 evidence from the supplied EBOOT.

Needs capstone==5.0.7. Reads the ELF without executing it or patching code.
Addresses apply only to the exact SHA256 checked below.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

EXPECTED = "8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892"
RANGES = {
    "main_loader": (0x2F2F10, 0x2F3160),
    "advanced_actor_move_selectors": (0x172FC, 0x17324),
    "advanced_ally_conditions": (0x1ED8E0, 0x1ED9C0),
    "advanced_action_list_loader": (0x1EDBFC, 0x1EDD18),
    "advanced_action_numeric_parameter": (0x1EDEE8, 0x1EDF04),
    "advanced_objective_pointer": (0xF3F30, 0xF3F68),
    "advanced_objective_victory": (0xF4898, 0xF4A20),
    "advanced_incident_edge_resolution": (0x2F2A14, 0x2F2A60),
    "advanced_expression_query_dispatch": (0x2F3C28, 0x2F3CE0),
    "advanced_MAIN_query2_flag": (0x2F41F0, 0x2F420C),
    "advanced_MAIN_query3_flag": (0x2F4AFC, 0x2F4B18),
    "advanced_OR_query_list": (0x2F3884, 0x2F390C),
    "advanced_expression_vm": (0x2F57C4, 0x2F5950),
    "advanced_zone_root_loader": (0x2F33FC, 0x2F35E0),
    "advanced_zone_handicap_lookup": (0x26C800, 0x26C9B0),
    "advanced_zone_rewards": (0x272B30, 0x272BF0),
    "advanced_zone_music": (0x26F740, 0x26F850),
    "participant_pointer": (0x2F2E24, 0x2F2E9C),
    "participant_count": (0x2F2E9C, 0x2F2F10),
    "galaxy_preset_selection": (0x1E6C18, 0x1E6CA4),
    "tutorial_preset_selection": (0x20C118, 0x20C1A4),
    "preset_record_address": (0x12BF60, 0x12BF74),
    "preset_expansion": (0x12D3E4, 0x12D678),
    "preset_table_for_current_mode": (0x1C9D0, 0x1CAD0),
    "current_mode_preset_record": (0x1CAD0, 0x1CB10),
    "transformation_target_identity": (0x1D7EC, 0x1D914),
    "transformation_request_preset_branch": (0x3A840, 0x3A8B8),
    "request_target_identity": (0x3A12C, 0x3A250),
    "runtime_parameter_dispatch": (0x14E914, 0x14E980),
    "runtime_preset_reload": (0x14EAC4, 0x14EB78),
    "runtime_preset_mode_branches": (0x14ED28, 0x14EDB0),
    "base_parameters": (0x12C9CC, 0x12CA40),
    "custom_parameters": (0x12CA40, 0x12CAB4),
    "item_effect_expansion": (0x12CB9C, 0x12CDC8),
    "stpk_member_address": (0x476208, 0x47622C),
    "boot_container_load": (0x3D9D58, 0x3D9D90),
}


def load_segments(data):
    if data[:7] != b"\x7fELF\x02\x02\x01" or struct.unpack_from(">H", data, 18)[0] != 21:
        raise ValueError("Expected ELF64, big endian, PowerPC64")
    offset = struct.unpack_from(">Q", data, 32)[0]
    size, count = struct.unpack_from(">HH", data, 54)
    if size != 56 or offset + size * count > len(data):
        raise ValueError("Unsupported or truncated ELF program headers")
    result = []
    for index in range(count):
        kind, flags, file_offset, virtual, physical, file_size, memory_size, alignment = struct.unpack_from(
            ">II6Q", data, offset + index * size)
        if kind == 1 and file_size:
            if file_offset + file_size > len(data):
                raise ValueError("Truncated loadable segment")
            result.append({"virtual": virtual, "file_offset": file_offset,
                           "file_size": file_size, "memory_size": memory_size,
                           "flags": flags})
    return result


def bytes_at(data, segments, start, end):
    for segment in segments:
        if segment["virtual"] <= start <= end <= segment["virtual"] + segment["file_size"]:
            offset = segment["file_offset"] + start - segment["virtual"]
            return offset, data[offset:offset + end - start]
    raise ValueError("Address range is not in one file-backed segment")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("elf", type=Path)
    args = parser.parse_args()
    try:
        from capstone import Cs, CS_ARCH_PPC, CS_MODE_64, CS_MODE_BIG_ENDIAN
        data = args.elf.read_bytes()
        actual = hashlib.sha256(data).hexdigest()
        if actual != EXPECTED:
            raise ValueError("Different ELF hash; selected evidence addresses must be rediscovered")
        segments = load_segments(data)
        decoder = Cs(CS_ARCH_PPC, CS_MODE_64 | CS_MODE_BIG_ENDIAN)
        functions = {}
        for name, (start, end) in RANGES.items():
            offset, code = bytes_at(data, segments, start, end)
            instructions = [
                {"guest_virtual_address": address,
                 "file_offset": offset + address - start,
                 "bytes": code[address - start:address - start + size].hex(" "),
                 "mnemonic": mnemonic, "operands": operands}
                for address, size, mnemonic, operands in decoder.disasm_lite(code, start)
            ]
            if sum(len(bytes.fromhex(item["bytes"])) for item in instructions) != len(code):
                raise ValueError(f"Incomplete disassembly of {name}")
            functions[name] = {"start": start, "end_exclusive": end,
                               "file_offset": offset, "instructions": instructions}
        print(json.dumps({"elf_sha256": actual, "segments": segments,
                          "status": "Static disassembly, no game execution", "evidence": functions}, indent=2))
        return 0
    except ImportError:
        print("Install capstone==5.0.7 in an analysis venv", file=sys.stderr)
        return 1
    except (OSError, ValueError, struct.error) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
