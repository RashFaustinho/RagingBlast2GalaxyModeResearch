"""Offline format and preservation checks; these are not gameplay tests."""
from pathlib import Path
import random
import struct
import tempfile
import unittest
import os

import mmd_research as mmd
import zpak_research as zpak
import afs_research as afs
import preset_research as presets
import ram_research as ram


ROOT = Path(__file__).resolve().parents[1]
TUTORIAL = Path(os.environ.get('RB2_TEST_FIXTURES', ROOT / 'test-fixtures')) / 'tutorial.mmd'


def archive_fixture(name="sample.bin", content=b"A" * 300):
    header = b"STPK" + struct.pack(">3I", 1, 1, 16)
    directory = struct.pack(">4I", 64, len(content), 0, 0) + name.encode().ljust(32, b"\0")
    pak = header + directory + content
    layout = {"outer_header_hex": (b"STPZ" + header[4:]).hex(), "block_limit": 15360,
              "chunks": [{"size": len(pak), "reserved": 0}]}
    return pak, zpak.compress(pak, layout)


@unittest.skipUnless(TUTORIAL.is_file(), 'Set RB2_TEST_FIXTURES to your private original files')
class MMDChecks(unittest.TestCase):
    def test_geometry_and_indirection_of_real_sample(self):
        data = TUTORIAL.read_bytes()
        result = mmd.inspect(data)
        self.assertEqual(result["header"]["payload_base"], 0x21C)
        self.assertEqual(len(result["descriptors"]), 63)
        self.assertEqual(len(result["nodes_92_byte_candidates"]), 9)
        self.assertEqual(result["nodes_92_byte_candidates"][0]["reference_candidates"]["0x28"], 3)
        self.assertEqual(struct.unpack_from(">I", data, 0x24C)[0], 2)
        for desc in result["descriptors"][1:]:
            aligned = (desc["logical_size_candidate"] + 3) & ~3
            self.assertEqual(desc["distance_to_next_descriptor"], aligned)

    def test_truncation_is_rejected(self):
        with self.assertRaises(ValueError):
            mmd.inspect(TUTORIAL.read_bytes()[:-1])

    def test_bad_descriptor_is_rejected(self):
        data = bytearray(TUTORIAL.read_bytes())
        struct.pack_into(">I", data, 0x38, 0xFFFFFFFF)
        with self.assertRaises(ValueError):
            mmd.inspect(data)

    def test_patch_does_not_overwrite_or_change_source(self):
        source = TUTORIAL
        before = source.read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "patched.mmd"
            report = mmd.patch(source, destination, 0x240, b"\0\1", b"\0\2")
            self.assertEqual(report["changed_spans"], [{"offset": 0x241, "length": 1,
                                                        "before": "01", "after": "02"}])
            with self.assertRaises(FileExistsError):
                mmd.patch(source, destination, 0x240, b"\0\1", b"\0\2")
            self.assertEqual(destination.read_bytes()[0x240:0x242], b"\0\2")
        self.assertEqual(source.read_bytes(), before)
        with self.assertRaises(ValueError):
            mmd.patch(source, source, 0x240, b"\0\1", b"\0\2")

    def test_wrong_baseline_or_changed_size_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "patched.mmd"
            with self.assertRaises(ValueError):
                mmd.patch(TUTORIAL, destination, 0x240, b"\x00\x09", b"\0\2")
            with self.assertRaises(ValueError):
                mmd.patch(TUTORIAL, destination, 0x240, b"\0\1", b"\2")
            self.assertFalse(destination.exists())


class ArchiveChecks(unittest.TestCase):
    def test_literals_backreferences_and_chunk_roundtrips(self):
        rng = random.Random(192)
        examples = [b"", b"A", b"A" * 1000, b"abc" * 200,
                    bytes(range(256)) * 5, rng.randbytes(4096),
                    bytes(rng.randrange(8) for _ in range(4096))]
        for data in examples:
            self.assertEqual(zpak.decode_tokens(zpak.encode_tokens(data), len(data)), data)

    def test_overlapping_reference(self):
        self.assertEqual(zpak.decode_tokens(b"\x02A\x0b\x01", 6), b"A" * 6)

    def test_invalid_or_truncated_reference(self):
        for data, expected in ((b"\x07\x01", 3), (b"\x07", 3),
                               (b"\x04A", 2), (b"\x02A", 2), (b"\0", 0)):
            with self.assertRaises(ValueError):
                zpak.decode_tokens(data, expected)

    def test_member_replacement_and_wrong_size(self):
        pak, archive = archive_fixture()
        updated, report = zpak.replace(archive, "sample.bin", b"B" * 300)
        decoded, _ = zpak.decompress(updated)
        self.assertEqual(decoded[:64], pak[:64])
        self.assertEqual(decoded[64:], b"B" * 300)
        self.assertEqual(report["changed_members"], ["sample.bin"])
        with self.assertRaises(ValueError):
            zpak.replace(archive, "sample.bin", b"short")
        with self.assertRaises(ValueError):
            zpak.replace(archive, "absent.bin", b"B" * 300)

    def test_raw_stpk_replacement(self):
        pak, _ = archive_fixture()
        result, report = zpak.replace(pak, "sample.bin", b"C" * 300)
        self.assertEqual(result[:64], pak[:64])
        self.assertEqual(result[64:], b"C" * 300)
        self.assertEqual(report["changed_members"], ["sample.bin"])

    def test_unsafe_member_path_and_archive_bounds(self):
        for name in ("../bad", "..", "C:bad", "dir\\bad"):
            pak, _ = archive_fixture(name)
            with self.assertRaises(ValueError):
                zpak.members(pak)
        _, archive = archive_fixture()
        with self.assertRaises(ValueError):
            zpak.decompress(archive[:-1])


class ResidentChecks(unittest.TestCase):
    def test_afs_little_endian_index_and_bounds(self):
        data = bytearray(0x1030)
        data[:8] = b"AFS\0" + struct.pack("<I", 1)
        struct.pack_into("<II", data, 8, 0x800, 3)
        struct.pack_into("<II", data, 16, 0x1000, 48)
        data[0x800:0x803] = b"ABC"
        data[0x1000:0x1005] = b"name\0"
        result = afs.inspect(data)
        self.assertEqual(result["members"][0]["offset"], 0x800)
        self.assertEqual(result["members"][0]["metadata_name"], "name")
        struct.pack_into("<I", data, 12, len(data))
        with self.assertRaises(ValueError):
            afs.inspect(data)

    def test_afs_slot_replacement_preserves_other_member(self):
        data = bytearray(0x1060)
        data[:8] = b"AFS\0" + struct.pack("<I", 2)
        struct.pack_into("<4I", data, 8, 0x800, 3, 0xC00, 4)
        struct.pack_into("<II", data, 24, 0x1000, 96)
        data[0x800:0x803], data[0xC00:0xC04] = b"ABC", b"DEFG"
        result, report = afs.replace_in_slot(bytes(data), 0, b"12345")
        self.assertEqual(afs.inspect(result)["members"][0]["size"], 5)
        self.assertEqual(result[0xC00:0xC04], b"DEFG")
        self.assertEqual(len(result), len(data))
        self.assertEqual(report["slot_capacity"], 0x400)
        with self.assertRaises(ValueError):
            afs.replace_in_slot(bytes(data), 0, bytes(0x401))

    def test_item_table_has_no_header(self):
        data = struct.pack(">21I", 0x224, 662, *([0] * 19))
        self.assertEqual(presets.item_table(data)[0][:2], (0x224, 662))
        with self.assertRaises(ValueError):
            presets.item_table(data + b"\0")

    def test_parameter_geometry_is_checked(self):
        data = struct.pack(">4I", 2, 0, 0, 0) + bytes(2 * 88)
        self.assertEqual(len(presets.table(data, 88)), 2)
        with self.assertRaises(ValueError):
            presets.table(data[:-1], 88)

    def test_item_patch_preserves_original_and_checks_slots(self):
        data = struct.pack(">4I", 1, 0, 0, 0) + struct.pack(">22I", 1, 32, 1, *([0xFFFFFFFF] * 19))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, output, items = root / "strength", root / "patched", root / "items"
            source.write_bytes(data)
            items.write_bytes(bytes(84 * 2))
            report = presets.patch_item(source, output, 0, 0, 1, 0, items)
            self.assertEqual(report["offset"], 24)
            self.assertEqual(source.read_bytes(), data)
            self.assertEqual(struct.unpack_from(">I", output.read_bytes(), 24)[0], 0)
            with self.assertRaises(FileExistsError):
                presets.patch_item(source, output, 0, 0, 1, 0, items)
            for record, slot, expected, replacement in ((1, 0, 1, 0), (0, 20, 1, 0),
                                                       (0, 0, 0, 1), (0, 0, 1, 2)):
                with self.assertRaises(ValueError):
                    presets.patch_item(source, root / "invalid", record, slot, expected, replacement, items)


class MemoryChecks(unittest.TestCase):
    def test_guest_manifest_rejects_host_layout(self):
        meta = {"format": "rpcs3-guest-memory-dump", "file_offset_equals_guest_address": True,
                "address_space_size": "0x100", "regions": [{"start": "0x20", "end_exclusive": "0x80", "readable": True}]}
        self.assertEqual(ram.readable_regions(meta, 256), [(32, 128)])
        meta["file_offset_equals_guest_address"] = False
        with self.assertRaises(ValueError):
            ram.readable_regions(meta, 256)

    def test_exact_search_respects_regions_and_full_content(self):
        memory = b"ABCX_ABCY_ABCX"
        self.assertEqual(ram.find_exact(memory, [(0, 9)], b"ABCX"), [0])
        self.assertEqual(ram.find_exact(memory, [(0, len(memory))], b"ABCX"), [0, 10])
        with self.assertRaises(ValueError):
            ram.find_exact(memory, [(0, len(memory))], b"")


if __name__ == "__main__":
    unittest.main()
