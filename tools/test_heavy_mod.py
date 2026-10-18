"""Check archive growth and references needed by the multi-form mission mod."""
import struct
import unittest

from build_kid_buu_mod import resize_stpk, replace_afs_copy
from zpak_research import members
import afs_research


def tiny_pak():
    p = bytearray(208)
    p[:16] = b"STPK" + struct.pack(">3I", 1, 2, 16)
    for i, (offset, name, body) in enumerate([(112, b"a", b"first"), (128, b"b", b"second")]):
        pos = 16 + 48 * i
        struct.pack_into(">2I", p, pos, offset, len(body))
        p[pos + 8:pos + 16] = b"opaque!!"
        p[pos + 16:pos + 16 + len(name)] = name
        p[offset:offset + len(body)] = body
    return bytes(p)


class ArchiveGrowthTests(unittest.TestCase):
    def test_growth_moves_neighbor_preserving_body_and_directory_metadata(self):
        p = tiny_pak()
        result = resize_stpk(p, "a", b"new" * 15)
        a, b = members(result)
        self.assertEqual(a["size"], 45)
        self.assertEqual(b["offset"], 160)
        self.assertEqual(result[b["offset"]:b["offset"] + b["size"]], b"second")
        self.assertEqual(result[24:32], b"opaque!!")
        self.assertEqual(result[72:80], b"opaque!!")

    def test_growth_into_nonzero_gap_is_rejected(self):
        p = bytearray(tiny_pak())
        p[123] = 1
        with self.assertRaisesRegex(ValueError, "nonzero"):
            resize_stpk(bytes(p), "a", bytes(64))

    def test_oversize_afs_relocates_without_moving_other_member(self):
        p = bytearray(8192)
        p[:8] = b"AFS\0" + struct.pack("<I", 2)
        struct.pack_into("<4I", p, 8, 2048, 4, 4096, 4)
        struct.pack_into("<2I", p, 24, 6144, 96)
        p[2048:2052] = b"AAAA"
        p[4096:4100] = b"BBBB"
        p[6144:6145] = b"a"
        p[6192:6193] = b"b"
        struct.pack_into("<I", p, 6188, 4)
        struct.pack_into("<I", p, 6236, 4)
        result, report = replace_afs_copy(bytes(p), 0, b"X" * 3000)
        entries = afs_research.inspect(result)["members"]
        self.assertEqual(report["placement"], "appended_member")
        self.assertEqual(entries[0]["offset"], 8192)
        self.assertEqual(entries[1]["offset"], 4096)
        self.assertEqual(result[4096:4100], b"BBBB")
        self.assertEqual(struct.unpack_from("<I", result, 6188)[0], 3000)


if __name__ == "__main__":
    unittest.main()
