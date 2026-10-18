"""Independent offset expectations for the separate research save converter."""
import struct
import unittest
import galaxy_save_extension as s


class SaveConversion(unittest.TestCase):
    def original(self):
        b = bytearray((i * 19 + 3) % 256 for i in range(55000))
        return s.finish(b)

    def test_original_checksum_matches_independent_le_word_sum(self):
        b = self.original()
        value = sum(struct.unpack('<' + str((len(b) - 8) // 2) + 'H', b[8:])) & 0xFFFFFFFF
        self.assertEqual(struct.unpack_from('>II', b), (value >> 8, value & 255))

    def test_all_original_rows_and_globals_move_without_aliases(self):
        b = self.original()
        out = s.expand(b)
        self.assertEqual(len(out), 71336)
        self.assertEqual(out[8:55000], b[8:])
        for i in range(500):
            self.assertEqual(out[0xD6D8 + i * 28:0xD6D8 + (i + 1) * 28], b[0x8148 + i * 28:0x8148 + (i + 1) * 28])
        self.assertEqual(out[0xD6D8 + 500 * 28:0xD6D8 + 512 * 28], bytes(336))
        self.assertEqual(out[0x10ED8:0x116A8], b[0xB7F8:0xBFC8])
        self.assertEqual(s.downgrade(out), b)

    def test_downgrade_preserves_current_non_galaxy_data_and_old_progress(self):
        old = self.original()
        b = bytearray(s.expand(old))
        struct.pack_into('>I', b, 0x1234, 0x12345678)
        struct.pack_into('>I', b, 0xD6D8 + 499 * 28 + 8, 765432)
        struct.pack_into('>I', b, 0xD6D8 + 511 * 28 + 8, 987654)
        struct.pack_into('>I', b, 0x11610, 66)
        b = s.finish(b)
        out = s.downgrade(b)
        self.assertEqual(struct.unpack_from('>I', out, 0x1234)[0], 0x12345678)
        self.assertEqual(struct.unpack_from('>I', out, 0xB7E4)[0], 765432)
        self.assertEqual(struct.unpack_from('>I', out, 0xBF30)[0], 66)
        self.assertEqual(len(out), 55000)

    def test_bad_checksum_sizes_or_double_conversions_are_rejected(self):
        b = self.original()
        with self.assertRaisesRegex(ValueError, 'already'):
            s.expand(s.expand(b))
        with self.assertRaises(ValueError):
            s.downgrade(b)
        with self.assertRaisesRegex(ValueError, 'checksum'):
            s.expand(b[:30] + bytes([b[30] ^ 1]) + b[31:])
        with self.assertRaises(ValueError):
            s.expand(b[:-1])


if __name__ == '__main__':
    unittest.main()
