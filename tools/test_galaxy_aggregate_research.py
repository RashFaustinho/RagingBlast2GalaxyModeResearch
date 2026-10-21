import struct
import unittest

from galaxy_aggregate_research import build_save, layout, BASE, SIZE
from galaxy_save_extension import checksum


class AggregateSaveTests(unittest.TestCase):
    def source(self):
        data = bytearray((i * 137 + 19) % 256 for i in range(55000))
        struct.pack_into('>II', data, 0, *checksum(data))
        return bytes(data)

    def test_preserves_all_original_progress_and_unrelated_data(self):
        source = self.source()
        for profile in ('G67', 'G100'):
            with self.subTest(profile=profile):
                data = build_save(source, profile)
                info = layout(profile)
                self.assertEqual(len(data), SIZE)
                self.assertEqual(data[8:55000], source[8:])
                self.assertEqual(data[BASE:BASE+14000], source[0x8148:0xB7F8])
                a, g = info['aggregateBase'], info['globalBase']
                self.assertEqual(data[a:a+66*28], source[0xB7F8:0xBF30])
                self.assertEqual(data[g:g+152], source[0xBF30:0xBFC8])
                for i in range(66, info['aggregateCount']):
                    self.assertEqual(struct.unpack_from('>7i', data, a+i*28), (0,0,-1,0,0,0,0))
                self.assertEqual(struct.unpack_from('>II', data), checksum(data))

    def test_highest_record_and_aggregate_do_not_alias_globals_or_other_banks(self):
        for profile in ('G67', 'G100'):
            source = self.source()
            data = bytearray(build_save(source, profile))
            info = layout(profile)
            a, g = info['aggregateBase'], info['globalBase']
            saved_globals = bytes(data[g:g+152])
            last_row = BASE + (info['missionCount']-1)*28
            last_aggregate = a + (info['aggregateCount']-1)*28
            data[last_row:last_row+28] = bytes([0x5a])*28
            data[last_aggregate:last_aggregate+28] = bytes([0x69])*28
            self.assertEqual(data[g:g+152], saved_globals)
            self.assertEqual(data[8:55000], source[8:])
            self.assertLess(last_row+28, last_aggregate)
            self.assertEqual(last_aggregate+28, g)

    def test_rejects_corruption_unknown_profile_and_other_large_formats(self):
        source = bytearray(self.source())
        source[100] ^= 1
        with self.assertRaises(ValueError): build_save(source, 'G67')
        with self.assertRaises(ValueError): build_save(self.source(), 'D2')
        with self.assertRaises(ValueError): build_save(bytes(SIZE), 'G67')


if __name__ == '__main__':
    unittest.main()
