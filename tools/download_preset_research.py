#!/usr/bin/env python3
"""Inspect the supplied regional DLC Enablers and scoped replacements.

Read-only by default. --output-elf writes a NEW decrypted research ELF from an
recognized input or an ELF matching all audited local checks; it does not write
SELF/EBOOT.BIN or saves. Requires Capstone 5.0.7. USA/Japan reference images are
reconstructed from the author's confirmed single-instruction modification.
No original game binary is included.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import struct

from elf_evidence import bytes_at, load_segments

EXPECTED_LIST = [0, 1, 2, 3, 5, 6, 7, 11, 12, 13, 17, 18, 19, 20,
                 22, 23, 34, 35, 37, 54, 55, 67, 68, 69, 70, 78]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def original_image(raw):
    """Normalize only known feature-owned words, preserving unrelated modifications.

    Whole-file hashes identify known inputs. Unknown hashes must match exactly one
    audited local layout, including code, dependency spans, table and TOC pointer.
    This is feature-local compatibility, not certification of every installed mod.
    """
    actual = digest(raw)
    path = Path(__file__).resolve().parents[1] / "research/download-presets-20261019/EXECUTABLE_PROFILES.json"
    profiles = json.loads(path.read_text())["profiles"]
    try:
        segments = load_segments(raw)
        entry = struct.unpack_from(">Q", raw, 24)[0]
        # Ambiguous mappings must not let checks read a different segment from the
        # one the loader executes. Extra disjoint helper segments remain allowed.
        for index, segment in enumerate(segments):
            if segment["memory_size"] < segment["file_size"]:
                raise ValueError("Segment smaller than its file data")
            for other in segments[index + 1:]:
                if max(segment["virtual"], other["virtual"]) < min(
                        segment["virtual"] + segment["memory_size"],
                        other["virtual"] + other["memory_size"]):
                    raise ValueError("Overlapping loadable memory segments")
    except (ValueError, struct.error) as error:
        raise ValueError(f"Unrecognized ELF: {error}") from error
    candidates, failures = [], []
    for profile in profiles:
        try:
            result = bytearray(raw)
            sites = [("restoreVA", "ebc100e0", "60000000"),
                     ("cleanupWordVA", "7c005878", "7c005b78"),
                     ("cleanupCallerVA", profile["originalCallWord"], "60000000")]
            changed = []
            for key, stock, patched in sites:
                address = int(profile[key], 16)
                offset, word = bytes_at(raw, segments, address, address + 4)
                if word.hex() not in (stock, patched):
                    raise ValueError(f"conflicting instruction at {address:08X}")
                changed.append(word.hex() == patched)
                result[offset:offset + 4] = bytes.fromhex(stock)
            if sum(changed) > 1:
                raise ValueError("mixed feature states require manual review")
            state = next((name for name, active in zip(
                ("legacy-enabler", "unlock-listed", "preserve"), changed) if active), "reference")
            for check in profile["localChecks"]:
                address = int(check["address"], 16)
                if check["role"] == "ELF entry code and TOC descriptor" and entry != address:
                    raise ValueError("ELF entry descriptor changed")
                _, span = bytes_at(result, segments, address, address + check["size"])
                segment = next(s for s in segments if s["virtual"] <= address < s["virtual"] + s["file_size"])
                if segment["flags"] != check["segmentFlags"] or digest(span) != check["sha256"]:
                    raise ValueError(f"local check differs: {check['role']}")
            canonical = bytes(result)
            exact = actual in (profile["referenceSHA256"], profile["legacySHA256"], profile["forceSHA256"])
            # Preserve policy has no separate published full hash: reconstructing
            # the known reference still proves it is a recognized exact variant.
            exact = exact or digest(canonical) == profile["referenceSHA256"]
            recognized = state if exact else "verified-local-layout"
            metadata = dict(profile, inputState=state, wholeFileKnown=exact,
                            compatibility="known-image" if exact else "verified-local-layout")
            candidates.append((canonical, recognized, metadata))
        except ValueError as error:
            failures.append(f"{profile['region']}: {error}")
    if len(candidates) != 1:
        if candidates:
            raise ValueError("Ambiguous local layout; no patch applied")
        raise ValueError("Unrecognized ELF or conflicting local layout: " + "; ".join(failures))
    return candidates[0]


def patched_image(raw, policy):
    original, recognized, profile = original_image(raw)
    if policy not in ("preserve", "unlock-listed"):
        raise ValueError("Unknown policy")
    address = int(profile["cleanupCallerVA"] if policy == "preserve" else profile["cleanupWordVA"], 16)
    before = bytes_at(original, load_segments(original), address, address + 4)[1].hex()
    if policy == "preserve":
        word = int(before, 16)
        if word & 0xFC000003 != 0x48000001:
            raise ValueError("Expected direct cleanup call")
        delta = word & 0x3FFFFFC
        if delta & 0x2000000:
            delta -= 0x4000000
        if address + delta != int(profile["cleanupFunctionVA"], 16):
            raise ValueError("Unexpected cleanup target")
        after = "60000000"
    else:
        if before != "7c005878":
            raise ValueError("Expected original ANDC")
        after = "7c005b78"
    offset, actual = bytes_at(original, load_segments(original), address, address + 4)
    if actual.hex() != before:
        raise ValueError("Patch site mismatch")
    result = bytearray(original)
    result[offset:offset + 4] = bytes.fromhex(after)
    if (policy == "unlock-listed" and digest(original) == profile["referenceSHA256"]
            and digest(result) != profile["forceSHA256"]):
        raise ValueError("Unexpected force-unlock image identity")
    return bytes(result), recognized


def analyze(raw, parameters=None):
    from capstone import Cs, CS_ARCH_PPC, CS_MODE_64, CS_MODE_BIG_ENDIAN

    original, recognized, profile = original_image(raw)
    segments = load_segments(original)
    decoder = Cs(CS_ARCH_PPC, CS_MODE_64 | CS_MODE_BIG_ENDIAN)
    def read(a, n):
        return bytes_at(original, segments, a, a + n)[1]

    # Map each independently located span; there is no universal regional delta.
    def mapped(address):
        if 0x31B278 <= address < 0x31B2B4:
            return int(profile["cleanupCallerVA"], 16) + address - 0x31B28C
        if 0x31CBCC <= address < 0x31CC68:
            return int(profile["cleanupFunctionVA"], 16) + address - 0x31CBCC
        if 0x318D18 <= address < 0x318DB8:
            return int(profile["predicateVA"], 16) + address - 0x318D18
        if 0x172578 <= address < 0x1725D4:
            return int(profile["flagGetterVA"], 16) + address - 0x172578
        if address == 0x274424 or 0x2743F4 <= address < 0x274448:
            others = [int(v, 16) for v in profile["predicateCallers"]
                      if int(v, 16) != mapped(0x31CC0C)]
            if len(others) != 1:
                raise ValueError("Ambiguous second predicate caller")
            return others[0] + address - 0x274424
        raise ValueError(f"Unmapped evidence address {address:X}")

    checks = {
        0x31B28C: ("bl", "0x31cbcc"),
        0x31CBFC: ("addi", "r9, r9, -0x32e0"),
        0x31CC0C: ("bl", "0x318d18"),
        0x31CC2C: ("cmpwi", "cr6, r31, 0x63"),
        0x31CC38: ("beq", "cr7, 0x31cc48"),
        0x31CC3C: ("lwzx", "r0, r30, r9"),
        0x31CC40: ("andc", "r0, r0, r11"),
        0x31CC44: ("stwx", "r0, r30, r9"),
        0x318D28: ("addi", "r30, r1, 0x70"),
        0x318D38: ("li", "r5, 0x68"),
        0x318D3C: ("addi", "r4, r9, 0x168"),
        0x318D4C: ("li", "r0, 0x1a"),
        0x318D7C: ("li", "r3, 1"),
        0x318D80: ("ld", "r30, 0xe0(r1)"),
        0x318DA0: ("ld", "r30, 0xe0(r1)"),
        0x274424: ("bl", "0x318d18"),
        0x1725B4: ("addi", "r9, r9, -0x32e0"),
        0x1725BC: ("lwzx", "r3, r11, r9"),
        0x1725C0: ("srw", "r3, r3, r29"),
    }
    for baseline_address, expected in checks.items():
        address = mapped(baseline_address)
        mnemonic, operands = expected
        if mnemonic == "bl":
            operands = hex(mapped(int(operands, 16)))
        elif mnemonic == "beq":
            operands = "cr7, " + hex(mapped(0x31CC48))
        expected = mnemonic, operands
        instructions = list(decoder.disasm_lite(read(address, 4), address))
        if len(instructions) != 1 or instructions[0][2:] != expected:
            raise ValueError(f"Instruction mismatch at {address:08X}")
    predicate = int(profile["predicateVA"], 16)
    pointer_instruction = struct.unpack(">I", read(predicate + 12, 4))[0]
    if pointer_instruction & 0xFFFF0000 != 0x81220000:
        raise ValueError("Expected predicate table load through TOC")
    displacement = pointer_instruction & 0xFFFF
    if displacement & 0x8000:
        displacement -= 0x10000
    table = struct.unpack(">I", read(int(profile["toc"], 16) + displacement, 4))[0] + 0x168
    entries = list(struct.unpack(">26I", read(table, 104)))
    if entries != EXPECTED_LIST:
        raise ValueError("Different fixed blacklist")
    masks = [sum(1 << (i % 32) for i in entries if i // 32 == w) for w in range(4)]
    catalog = []
    if parameters is not None:
        names_path = Path(__file__).resolve().parents[1] / "research/advanced/NATIVE_CHARACTER_IDS_EN.csv"
        names = {int(r["native_id"]): r["name"] for r in csv.DictReader(names_path.open())}
        presets = (parameters / "preset_character_download.dat").read_bytes()
        appearances = (parameters / "preset_appearance_table.dat").read_bytes()
        if struct.unpack_from(">I", presets)[0] != 100 or len(presets) != 4416:
            raise ValueError("Expected original 100-row download table")
        for i in entries:
            appearance, strength = struct.unpack_from(">II", presets, 16 + i * 44)
            native, costume, mode = struct.unpack_from(">III", appearances, 16 + appearance * 32)
            if native != i:
                raise ValueError("Download index/native mapping differs")
            catalog.append(dict(downloadIndex=i, native=native, name=names[native],
                                appearance=appearance, strength=strength, costume=costume, costumeMode=mode))
    spans = {"successful_load_caller": (0x31B278, 0x31B2B4),
             "fixed_list_predicate": (0x318D18, 0x318DB8),
             "load_cleanup": (0x31CBCC, 0x31CC68),
             "flag_getter": (0x172578, 0x1725D4),
             "other_predicate_caller": (0x2743F4, 0x274448)}
    return dict(referenceSHA256=profile["referenceSHA256"], region=profile["region"],
                referenceProvenance=profile["referenceProvenance"],
                recognizedInput=recognized, inputSHA256=digest(raw),
                canonicalBaseSHA256=digest(original), inputState=profile["inputState"],
                compatibility=profile["compatibility"], localChecks=len(profile["localChecks"]),
                compatibilityLimits="Local feature layout verified; unrelated modifications are preserved, not globally certified. Relocated or conflicting local code requires a new audit.",
                verification="Static proof; runtime results recorded separately", instructionChecks=len(checks),
                saveBank="SYS-DATA+0xCD20, four BE32 words, low-bit-first IDs0..99",
                fixedList=entries, masks=[f"{m:08x}" for m in masks], catalog=catalog,
                legacy=dict(elfSHA256=profile["legacySHA256"], address=profile["restoreVA"], before="ebc100e0", after="60000000",
                            effect="True branch fails to restore nonvolatile r30. Cleanup caller consequently uses a stack-scratch pointer instead of its save-bank pointer. Another call exists at274424. This preserves preexisting flags by violating the calling convention; it does not set missing flags."),
                policies={"preserve": dict(address=profile["cleanupCallerVA"], after="60000000",
                                            meaning="Skip just the fixed-list cleanup call; requires existing flag bits"),
                          "unlock-listed": dict(address=profile["cleanupWordVA"], before="7c005878", after="7c005b78",
                                                elfSHA256=profile["forceSHA256"], meaning="AND-NOT -> OR: set the26 listed bits on successful load, preserving the other bits and the register-restore code")},
                limits="No checksum bypass or resource installation. New-game initialization, gameplay and other regions require separate controls. ELF offsets are not SELF offsets. No automatic general EBOOT.BIN resigning.",
                disassembly={name: [f"{a:08X}: {m} {o}".rstrip() for a, _, m, o in
                                    decoder.disasm_lite(read(mapped(start), end-start), mapped(start))]
                             for name, (start, end) in spans.items()})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--elf", type=Path, required=True)
    parser.add_argument("--parameters", type=Path)
    parser.add_argument("--policy", choices=("preserve", "unlock-listed"), default="unlock-listed")
    parser.add_argument("--output-elf", type=Path)
    args = parser.parse_args()
    raw = args.elf.read_bytes()
    report = analyze(raw, args.parameters)
    if args.output_elf:
        patched, recognized = patched_image(raw, args.policy)
        with args.output_elf.open("xb") as file:
            file.write(patched)
        report["writtenCopy"] = dict(policy=args.policy, sha256=digest(patched), recognizedInput=recognized)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
