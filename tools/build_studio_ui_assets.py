#!/usr/bin/env python3
"""Decode selected original Galaxy UI BC3 textures; developer-only rebuild."""
import argparse
import hashlib
import io
import json
import struct
from pathlib import Path
from PIL import Image
import zpak_research as z

SELECT = {
    'chara_sele_icon.spr': {'galaxy_chara_pl_s_001.png', 'galaxy_chara_pl_s_000.png', 'chara_chips_000.png'},
    'galaxy_mode_personal_score.spr': {'galaxy_icon_000.png', 'galaxy_chara_pl_000.png', 'galaxy_chara_pl_001.png', 'galaxy_chara_name_pl.png', 'galaxy_chara_achievement_pl.png'},
    'galaxy_mode_key_plate_l.spr': {'chara_chips_flame.png', 'key_plate.png', 'galaxy_line_001.png'},
    'just_action_list.spr': {'rb2_window_line.png', 'rb2_window_line_ef.png', 'rb2_gradation_base.png', 'main_window_line_000.png'},
    'galaxy_zon_BG_base.spr': {'galaxy_base.png'},
}

def digest(b):
    return hashlib.sha256(b).hexdigest()

def member(stream, index):
    stream.seek(8+index*8)
    offset, size = struct.unpack('<II', stream.read(8))
    stream.seek(offset)
    pak, _ = z.read_container(stream.read(size))
    return {e['name']: pak[e['offset']:e['offset']+e['size']] for e in z.members(pak)}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('afs', type=Path)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    with args.afs.open('rb') as f:
        if f.read(4) != b'AFS\0':
            raise ValueError('Expected AFS')
        sprites, textures = member(f, 872), member(f, 873)
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {'game': 'BLES00978', 'archive': args.afs.name,
                'conversion': 'Original top-level BC3/DXT5 pixels decoded to RGBA PNG. No redraw or screenshot crops.', 'textures': []}
    for spr_name, names in SELECT.items():
        spr, vram = sprites[spr_name], textures[spr_name[:-4]+'.vram']
        es, ss, ins = struct.unpack_from('>III', spr, 20)
        sb, ib, db = 64+es, 64+es+ss, 64+es+ss+ins
        assert spr[64:68] == b'TX2D'
        for i in range(struct.unpack_from('>I', spr, 72)[0]):
            n, o = struct.unpack_from('>II', spr, ib+i*32+8)
            name = spr[sb+n:spr.index(0, sb+n)].decode('ascii')
            if name not in names:
                continue
            meta = struct.unpack_from('>4I4H2IB', spr, db+o)
            offset, size, w, h, encoding = meta[1], meta[3], meta[4], meta[5], meta[-1]
            assert encoding == 24 and offset+size <= len(vram)
            pixels = vram[offset:offset+w*h]
            dds = bytearray(128)
            dds[:4] = b'DDS '
            struct.pack_into('<7I', dds, 4, 124, 0x81007, h, w, w*h, 0, 1)
            struct.pack_into('<II4s', dds, 76, 32, 4, b'DXT5')
            struct.pack_into('<I', dds, 108, 0x1000)
            image = Image.open(io.BytesIO(dds+pixels)).convert('RGBA')
            dest = args.output/name
            image.save(dest, optimize=True)
            manifest['textures'].append({'file': name, 'spr': spr_name, 'sprEntry': 872, 'vramEntry': 873,
                'sprSha256': digest(spr), 'vramSha256': digest(vram), 'offset': offset, 'size': size,
                'width': w, 'height': h, 'sourceName': name, 'pixelsSha256': digest(pixels), 'pngSha256': digest(dest.read_bytes())})
    assert len(manifest['textures']) == sum(map(len, SELECT.values()))
    (args.output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print('Extracted', len(manifest['textures']), 'original UI textures')

if __name__ == '__main__':
    main()
