# DLC costumes in ordinary VS

Research date: 19 October 2026. Predominantly AI-assisted research and implementation.
This is a new, separate option in the unreleased EBOOT.BIN Mods development preview.
It does not require selecting a Download preset or unlocking that preset first.

## What prevents ordinary selection

`st_pack_boot_pt_ps3.afs` entry 22 contains the nested resident parameter pack,
`game_resident_param_m.pak`. Its raw `game_resident_character_param.dat` member has
100 records of 56 bytes. Two distinct fields matter:

| Record offset | Meaning established by the consumers |
|---|---|
| `+0x20` | Ordinary costume count; used by ordinary character selection |
| `+0x2C` | Total costume count, including the extra Download costume |

These counts differ for exactly the 26 native forms used by the 14 DLC characters.
For each, `total = ordinary + 1`, and the Download Appearance costume index equals
the ordinary count. The other 74 records have equal counts. This is not the
`cs_main.dat` field at `+0x0C`: that field counts related native/form entries.

The ordinary menu also skips costumes whose unlock bit is off. That bit resides
at `DB_SAVE + 0x20 + native * 0xE8`, bit `costumeIndex + 1` of the big-endian word.
The existing bank already accommodates these indices; no save expansion is needed.
Simply returning the larger count would still skip the locked extra slot.

## Scoped executable patch

For the exact original European v1 reference ELF
`8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892`:

1. At guest VA `0x17480C`, replace `80690020` with `8069002C`. The count getter now
   reads the existing total-count field. Its three direct callers include menu
   initialization, the next/previous selector and a random costume chooser.
2. At `0x1748D8`, replace `2F800000` with a branch to an authored leaf helper at
   `0x01000140`. If the original save-bit test passed, preserve its result. Otherwise
   accept only the catalogued DLC costume for the current native ID. All other
   candidates continue through the original skip loop.

The helper uses an immutable 100-byte table at `0x01000900`: 26 supported indices,
with `255` for every unlisted native. It bounds-checks the native ID and performs
no save/heap writes, calls or CTR changes. Its temporary registers are dead before
the native continuations. The two original instructions, complete dependent spans
and Studio-owned helper are checked together; partial/conflicting patches are rejected.

The selected costume does not grant Download Strength equipment. **Normal** or
ordinary **Custom** slots remain available. The original Download availability
cleanup can stay enabled; the separate Download unlock option is unnecessary.
The count change also exposes the total count to the existing random chooser;
it is not restricted to a single screen instance.

Studio preserves its previous helper format: older zero-filled extension space is
accepted only as a complete absent module. Installing this option adds the checked
module; modified/partial helper code is rejected. Uninstall restores both original
instructions and removes an unused helper without discarding third-party tail data.

## Costume list

| Characters and supported native forms | Ordinary menu label |
|---|---|
| Goku, Super Saiyan, Super Saiyan 2, Super Saiyan 3 | Costume 8 |
| Krillin; Android 18 | Costume 4 |
| Teen Gohan and both Super Saiyan forms; Piccolo; Yamcha; Vegeta, Super Saiyan, Super Vegeta and Super Saiyan 2; Trunks (Sword) and Super Saiyan; Vegito and Super Vegito; Bardock; Android 17; Broly and both Super Saiyan forms; Super Gogeta; Turles | Costume 3 |

The machine-readable [native evidence](NATIVE_EVIDENCE.json) lists each native ID,
the two counts and the corresponding Download Appearance index relationship.

## Verification and limits

- **Static original-data/code proof:** all 100 count pairs checked against the
  independently decoded 26-entry Download/Appearance catalog; whole ELF hash and
  function-span hashes recorded. Reproduce with `tools/vs_costume_research.py`.
- **Native original control:** ordinary VS, Goku costume 1, one left input wraps
  to visible **Costume 7**. The DLC bit is off.
- **Native patched control:** same save, original AFS data, only this option enabled.
  Normal menu inputs reach **Goku Costume 8** and **Vegeta Costume 3**, with
  **Normal** customization. Battle initialization loads native 0/costume 7 and
  native 17/costume 2; both have preset `0xFFFFFFFF` (ordinary fighters).
  No guest memory/register writes or actor injections were used.
- **Active combat:** normal forward/Square input and CPU attacks leave Goku at
  39,232/40,000 HP, retaining costume 7; Vegeta retains costume 2. Both remain
  ordinary fighters. All 26 costume unlock words still equal their loaded values.
  This is an active-combat control, not a completed-match/persistence test.
- **Save loading:** all 55,000 RAM bytes equal the disk input after the valid-load
  popup. Costume unlock words remain unchanged after selection/battle initialization.
- **Editor/machine-code checks:** 1,600 supported-native/candidate/save-bit cases
  execute the actual leaf's bounded PPC subset, plus out-of-range natives. Tests
  check locked regular costumes, all sixteen helper-feature combinations, mixed
  instructions, older helper upgrade, exact uninstall and regional blocking.
- **Browser:** actual encrypted input, export/reload detection, complete rollback,
  unchanged save handling, and a standalone costume-only ZIP with no save payload.

The cloud software renderer has the previously observed black character-material
problem. Loaded indices and ordinary-fighter status are established; this is not
a visual texture/material certification of all costumes. Full 26-form battles,
transformations/fusions, new-game paths, online play and physical PS3 are not certified.
The exported debug SELF is for RPCS3.
The structured [runtime report](RUNTIME_REPORT.json) binds the original/modified
ELF hashes, menu observations, actors, unchanged unlock words and standalone browser export.

USA and Japan have unique matching count/cycle spans in the supplied reference
images, at different addresses; see [regional comparison](REGIONAL_SPANS.json).
That masked static comparison is not runtime/dependency certification. Their UI
option remains disabled; EU v2 is likewise not newly certified.

## Reproduce the static evidence

```sh
python tools/vs_costume_research.py \
  --elf /private/original-european-v1.elf \
  --parameters /private/game_resident_character_param.dat
```

The command reads files only. Actual installation goes through Studio's checked
transaction/export workflow. Supply your own files; no game binary, save or raw
parameter member is included in this repository.
