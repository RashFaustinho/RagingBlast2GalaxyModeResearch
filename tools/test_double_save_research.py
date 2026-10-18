import struct
import unittest
import double_save_research as d

class D2Tests(unittest.TestCase):
    def original(self):
        return d.finish(bytes((i * 137 + 19) % 256 for i in range(d.OLD_SIZE)))

    def test_exact_double_and_lossless_roundtrip(self):
        b = self.original()
        large = d.expand(b)
        self.assertEqual(len(large), 2 * len(b))
        self.assertEqual(d.downgrade(large), b)
        self.assertEqual(large[8:d.OLD_SIZE], b[8:])

    def test_current_old_progress_survives_downgrade(self):
        b = self.original()
        e = bytearray(d.expand(b))
        pairs = [(d.GAL + 499 * 28, 0x8148 + 499 * 28),
                 (d.TUT + 8 * 28 + 12, 0xBFC8 + 8 * 28 + 12),
                 (d.BZ + d.BZ_MODE + 7 * d.BZ_ROUTE + 20 * 24 + 8,
                  0x5E20 + 0x1060 + 7 * 0x20C + 20 * 24 + 8),
                 (d.BZ + 2 * d.BZ_MODE + 128, 0x7EE0 + 128),
                 (d.BZ + 4 + 20 * 24 + 20, 0x5E20 + 4 + 20 * 24 + 20),
                 (d.BZ + d.BZ_CELLS * 24 + 8, 0x5E20 + 504 + 8)]
        for n, (new, old) in enumerate(pairs):
            struct.pack_into('>I', e, new, 0x12345600 + n)
        small = d.downgrade(d.finish(e))
        for n, (_, old) in enumerate(pairs):
            self.assertEqual(struct.unpack_from('>I', small, old)[0], 0x12345600 + n)

    def test_new_boundary_records_do_not_alias_old_banks(self):
        b = self.original()
        e = bytearray(d.expand(b))
        for start, stride, last in [(d.GAL, 28, d.GAL_COUNT-1),
                                    (d.TUT, 28, d.TUT_COUNT-1),
                                    (d.BZ + d.BZ_MODE + 7*d.BZ_ROUTE + 4, 24, d.BZ_CELLS-1)]:
            e[start + last*stride:start + (last+1)*stride] = b'\x5A'*stride
        self.assertEqual(d.downgrade(d.finish(e)), b)
        for _, start, size in d.BANKS:
            self.assertGreaterEqual(start, d.OLD_SIZE)
            self.assertLessEqual(start+size, d.NEW_SIZE-64)
        for (_, a, n), (_, b, _) in zip(d.BANKS, d.BANKS[1:]):
            self.assertLess(a+n, b)

    def test_reject_corrupt_and_unknown_format(self):
        b = bytearray(d.expand(self.original()))
        b[500] ^= 1
        with self.assertRaises(ValueError): d.checked(b)
        b = bytearray(d.expand(self.original()))
        b[-64] ^= 1
        with self.assertRaises(ValueError): d.finish(b)
        b = bytearray(d.expand(self.original()))
        struct.pack_into('>I', b, d.NEW_SIZE - 40, d.TUT_COUNT + 1)
        struct.pack_into('>II', b, 0, *d.checksum(b))
        with self.assertRaises(ValueError): d.checked(b)
        with self.assertRaises(ValueError): d.expand(bytes(110000))

if __name__ == '__main__': unittest.main()
