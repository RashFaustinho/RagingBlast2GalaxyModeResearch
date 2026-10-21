"""Feature-local compatibility and patch controls; private ELF fixtures are never distributed.

RB2_DLC_FIXTURES points to a directory containing the three decrypted supplied
legacy files EBOOT_BLES00978.elf, EBOOT_BLUS30581.elf and EBOOT_BLJS10085.elf.
"""
import os
from pathlib import Path
import tempfile
import unittest

from download_preset_research import analyze, original_image, patched_image, digest


@unittest.skipUnless(os.environ.get("RB2_DLC_FIXTURES"), "Private regional DLC Enabler ELFs required")
class DownloadPresetPatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(os.environ["RB2_DLC_FIXTURES"])
        cls.inputs = [(root / f"EBOOT_{region}.elf").read_bytes()
                      for region in ("BLES00978", "BLUS30581", "BLJS10085")]

    def test_legacy_repair_changes_only_the_register_restore(self):
        for raw in self.inputs:
            with self.subTest(input=digest(raw)):
                reference, recognized, profile = original_image(raw)
                self.assertEqual(recognized, "legacy-enabler")
                self.assertEqual(len(reference), len(raw))
                self.assertEqual(digest(reference), profile["referenceSHA256"])
                self.assertEqual(sum(a != b for a, b in zip(reference, raw)), 3)
                self.assertNotEqual(reference, raw)

    def test_all_regional_instructions_and_fixed_lists_match(self):
        for raw in self.inputs:
            with self.subTest(input=digest(raw)):
                report = analyze(raw)
                self.assertEqual(report["instructionChecks"], 19)
                self.assertEqual(len(report["fixedList"]), 26)
                self.assertEqual(report["masks"], ["00de38ef", "00c0002c", "00004078", "00000000"])

    def test_reference_and_legacy_upgrade_produce_the_same_clean_output(self):
        for raw in self.inputs:
            reference, _, profile = original_image(raw)
            for policy in ("preserve", "unlock-listed"):
                with self.subTest(region=profile["region"], policy=policy):
                    from_legacy, _ = patched_image(raw, policy)
                    from_reference, _ = patched_image(reference, policy)
                    self.assertEqual(from_reference, from_legacy)
                    self.assertEqual(len(from_reference), len(reference))
                    if policy == "unlock-listed":
                        self.assertEqual(digest(from_reference), profile["forceSHA256"])
                        self.assertEqual(sum(a != b for a, b in zip(reference, from_reference)), 1)

    def test_conflicting_code_or_tables_are_rejected(self):
        from elf_evidence import bytes_at, load_segments
        for raw in self.inputs:
            reference, _, profile = original_image(raw)
            for key in ("predicateVA", "fixedListVA", "cleanupWordVA"):
                address = int(profile[key], 16)
                offset, _ = bytes_at(reference, load_segments(reference), address, address + 4)
                damaged = bytearray(reference)
                damaged[offset] ^= 1
                with self.subTest(region=profile["region"], key=key):
                    with self.assertRaisesRegex(ValueError, "Unrecognized ELF"):
                        patched_image(damaged, "unlock-listed")
        with self.assertRaisesRegex(ValueError, "Unrecognized ELF"):
            patched_image(b"SCE\0not-a-decrypted-ELF", "unlock-listed")

    def test_unrelated_modification_is_preserved(self):
        for raw in self.inputs:
            # Synthetic modification outside all audited spans. This verifies
            # preservation, not gameplay compatibility of arbitrary third-party mods.
            modified = bytearray(raw)
            modified[-1] ^= 1
            canonical, recognized, profile = original_image(modified)
            self.assertEqual(recognized, "verified-local-layout")
            self.assertFalse(profile["wholeFileKnown"])
            self.assertEqual(profile["inputState"], "legacy-enabler")
            self.assertEqual(canonical[-1], modified[-1])
            reference, _, _ = original_image(raw)
            for policy in ("preserve", "unlock-listed"):
                expected, _ = patched_image(reference, policy)
                expected = bytearray(expected)
                expected[-1] ^= 1
                output, _ = patched_image(modified, policy)
                self.assertEqual(output, expected)

    def test_known_costume_edit_and_download_policy_compose(self):
        from elf_evidence import bytes_at, load_segments
        for raw in self.inputs:
            reference, _, profile = original_image(raw)
            modified = bytearray(reference)
            address = int(profile["costumeVA"], 16)
            offset, original = bytes_at(reference, load_segments(reference), address, address + 4)
            self.assertEqual(original.hex(), "39000000")
            modified[offset:offset + 4] = bytes.fromhex("39000001")
            for policy in ("preserve", "unlock-listed"):
                output, recognized = patched_image(modified, policy)
                self.assertEqual(recognized, "verified-local-layout")
                expected, _ = patched_image(reference, policy)
                expected = bytearray(expected)
                expected[offset:offset + 4] = bytes.fromhex("39000001")
                self.assertEqual(output, expected)

    def test_recognized_policies_are_idempotent_and_switchable(self):
        for raw in self.inputs:
            for unrelated in (False, True):
                modified = bytearray(raw)
                if unrelated:
                    modified[-1] ^= 1
                for policy, other in (("preserve", "unlock-listed"), ("unlock-listed", "preserve")):
                    output, _ = patched_image(modified, policy)
                    again, _ = patched_image(output, policy)
                    self.assertEqual(output, again)
                    switched, _ = patched_image(output, other)
                    direct, _ = patched_image(modified, other)
                    self.assertEqual(switched, direct)

    def test_mixed_policies_are_rejected(self):
        from elf_evidence import bytes_at, load_segments
        for raw in self.inputs:
            reference, _, profile = original_image(raw)
            output, _ = patched_image(reference, "unlock-listed")
            mixed = bytearray(output)
            address = int(profile["cleanupCallerVA"], 16)
            offset, _ = bytes_at(output, load_segments(output), address, address + 4)
            mixed[offset:offset + 4] = bytes.fromhex("60000000")
            with self.assertRaisesRegex(ValueError, "mixed feature states"):
                patched_image(mixed, "unlock-listed")

    def test_input_and_existing_output_are_not_overwritten(self):
        import subprocess
        import sys

        raw = self.inputs[0]
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.elf"
            output = Path(directory) / "existing.elf"
            source.write_bytes(raw)
            output.write_bytes(b"keep existing output")
            result = subprocess.run([sys.executable, str(Path(__file__).with_name("download_preset_research.py")),
                                     "--elf", str(source), "--output-elf", str(output)],
                                    capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(source.read_bytes(), raw)
            self.assertEqual(output.read_bytes(), b"keep existing output")


if __name__ == "__main__":
    unittest.main()
