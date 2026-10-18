"""KB10A: corrected game-localized flow items, exact KB07A baseline."""
import sys, struct, json, argparse
from pathlib import Path
import afs_research as afs, preset_research as pre, zpak_research as z
from build_kid_buu_mod import member_body, replace_afs_copy
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--boot-afs', type=Path, required=True, help='Exact KB07A boot AFS')
parser.add_argument('--galaxy', type=Path, required=True, help='Exact KB07A galaxy.zpak')
parser.add_argument('--output-dir', type=Path, required=True, help='New destination directory')
args = parser.parse_args()
source = args.boot_afs
destination = args.output_dir
b = source.read_bytes()
assert z.sha(b) == '38efccb383975cbd1a8cd02a57b9a1cf06756ebc410cb44a1a7e079920af7aca'
entry = afs.inspect(b)['members'][22]
original = b[entry['offset']:entry['offset']+entry['size']]
outer, _ = z.read_container(original)
params = member_body(outer, 'game_resident_param_m.pak')
strength = member_body(params, 'preset_strength_table.dat')
rows = pre.table(strength, 88)
presets = pre.table(member_body(params, 'preset_character_galaxy.dat'), 44)
assert len(rows) == 783 and len(presets) == 1064
changes = [(777, 0x155, 0x153), (778, 0x15e, 0x15a), (780, 0x15f, 0x15b), (781, 0x162, 0x15e)]
changed = bytearray(strength)
for row, before, after in changes:
    assert rows[row][2:] == (before,) + (0xffffffff,)*19
    assert [i for i, p in enumerate(presets) if p[1] == row] == [{777:1058,778:1059,780:1061,781:1062}[row]]
    struct.pack_into('>I', changed, 16 + row*88 + 8, after)
assert rows[779][2:] == (0x79,) + (0xffffffff,)*19
assert rows[782][2:] == (0xffffffff,)*20
newrows = pre.table(bytes(changed), 88)
assert [i for i, (a,c) in enumerate(zip(rows,newrows)) if a != c] == [x[0] for x in changes]
for row, before, after in changes:
    assert newrows[row] == rows[row][:2] + (after,) + rows[row][3:]
params_after, _ = z.replace(params, 'preset_strength_table.dat', bytes(changed))
resident_after, _ = z.replace(original, 'game_resident_param_m.pak', params_after)
result, _ = replace_afs_copy(b, 22, resident_after)
finalentry = afs.inspect(result)['members'][22]
finalouter, _ = z.read_container(result[finalentry['offset']:finalentry['offset']+finalentry['size']])
assert member_body(member_body(finalouter,'game_resident_param_m.pak'),'preset_strength_table.dat') == bytes(changed)
galaxy = args.galaxy.read_bytes()
assert z.sha(galaxy) == 'ebfa9de1489904714025c5b45d7d10ef06d490f20651d6257c3b8b3ed6985f15'
destination.mkdir(exist_ok=False)
(destination/'st_pack_boot_pt_ps3.afs').write_bytes(result)
(destination/'galaxy.zpak').write_bytes(galaxy)
report = {'experiment':'KB10A','baseline':'KB07A','status':'DATA_VERIFIED_GAMEPLAY_UNTESTED',
          'changes':[{'strength':row,'old_index_hex':f'{before:03X}','new_index_hex':f'{after:03X}'} for row,before,after in changes],
          'boot_sha256':z.sha(result),'galaxy_sha256':z.sha(galaxy),
          'EBOOT':'Original, unchanged', 'gear':{'Goku_SSJ2':['153'],'Goku_SSJ3':['15A'],'Goku_base':['079'],'Vegeta_SSJ2':['15B'],'Vegeta_base':['15E'],'Fat_Buu':[]},
          'item_labels_source':'research/item-catalog-BLES00978-EN.csv, bound to original game text IDs',
          'limits':'Correct gear on base presets does not yet prove these presets are selected during cancellation.'}
(destination/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
