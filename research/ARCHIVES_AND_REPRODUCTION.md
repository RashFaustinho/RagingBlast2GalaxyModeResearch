# Archives, evidence reproduction and input identities

## Locate content by structure

Game archives are under `PS3_GAME/USRDIR/data/PS3/`. Positions below are zero-based
in the supplied original European archives, not promises about every modded AFS.
Community AFL labels can be wrong. Studio can scan nested contents and optionally
scan every entry for relocated mods.

| Archive / entry | Content |
|---|---|
| boot / 22 | Virtual boot/resident/boot_resident_ALL_m.pak → game_resident_param_m.pak; Appearance, Strength, items and preset containers |
| progress / 872 | galaxy.zpak → galaxy.mmd and tutorial.mmd; also Galaxy UI resources |
| progress / 873 | Portrait VRAM paired with SPR metadata in entry 872 |
| progress / 8+14*k, k=0..15; also 232,234 | 18 copies of battle_zone_param_m.pak inside differing outer resources |
| battle_others / 53 | Tutorial message-order tables, move bindings, tutorial CPU data and other battle parameters |
| battle_others / 96,98,100,102,104,106 | German/French/Italian/Japanese/Spanish/English Tutorial text packs |
| progress / 1891 | Character-select data including raw cs_main/cs_form in the original layout |
| progress / 1961, with identical English copies in 884/1903 | F_Item_US.pak, 750 item text members |

Boot entry 22 is labeled `db_font_pad_PS3_s.zpak` in the supplied AFL. Its internal
resource path is not a physical disc directory. Preset filenames longer than the
32-byte STPK name field can be truncated: retain `preset_character_battle_zone_nor`
and `preset_character_battle_zone_spe`, even without a `.dat` extension.

## Repacking and preservation

AFS has little-endian directory offsets/sizes. STPK uses directory entries with
member offsets/sizes and names. STPZ uses 0DCS/0LCS chunks; the token codec has literal
runs and a bounded backwards window. File extension alone is not format validation.

Small fixed-size replacements can use the older standard-library Python helpers.
Growing MMD/DATs require nested directory updates, compression layout handling and
AFS growth. Studio's bridge builds a new verified copy and retains original ranges,
opaque fields and nonzero gaps. A gap can contain a stale tail from an earlier
smaller replacement; growing into it must preserve or relocate it, not overwrite it.

All 18 original inner Zone parameter PAK copies matched, while their outer graphical
resources differed. Updating one arbitrary copy can appear ineffective. Studio
updates all matching members in the chosen AFS and preserves siblings. Mod roster
references are deliberately not added to the editable game-file replacement allowlist.

No-edit serialization is byte-identical. Edited MMD lists can share descriptors;
safe edits detach references rather than unexpectedly rewriting every user of a list.
Advanced raw edits are intentionally more direct and must retain unknown data.

## Required private inputs

| Input | Identification |
|---|---|
| Original galaxy.mmd | SHA256 c0a12c58b22cb4b2884bcfe8c550a1f5a25f60c192986c6f1fd9bd3eccb155a7 |
| Original decrypted European ELF | SHA256 8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892 |
| Original encrypted EBOOT.BIN | SHA256 da28849b6dafc65c0de74d79f3bd1c54ff19f0368ffb728faa5d97ce77a03c30 |
| Original progress AFS | SHA256 42de603448436921cb63b071cde05bdffd6a376964dceaa4b85ad31cd6ba35a7 |
| item_parameter.dat | SHA256 c6d7b2643fa0bbdca8ea449ebc7933cc6745dbc0d20c051937945f3d5526c700 |

Use the manifests for other exact inputs. An encrypted EBOOT.BIN is not the decrypted
ELF expected by static tools. The tools reject a different ELF rather than using
European addresses on arbitrary builds. User-confirmed cross-region editor data
compatibility is not executable-patch compatibility.

## Read-only reproduction examples

From the repository root, using your own files and new output paths:

```console
python tools/afs_research.py extract path/to/st_pack_boot_pt_ps3.afs --index 22 --output boot22.zpak
python tools/zpak_research.py extract boot22.zpak --output boot22
python tools/zpak_research.py extract boot22/game_resident_param_m.pak --output parameters
python tools/galaxy_address_book.py --galaxy path/to/galaxy.mmd --parameters parameters --node 117
python tools/mmd_inspect_advanced.py --help
```

Install Capstone 5.0.7 in an analysis environment for the following **read-only** checks:

```console
python tools/main_progression_flags_research.py --elf path/to/EBOOT.elf
python tools/zone_outcome_flags_research.py --elf path/to/EBOOT.elf
python tools/zone_condition_research.py --elf path/to/EBOOT.elf --zones path/to/original_mmds
python tools/music_selector_research.py --elf path/to/EBOOT.elf --parameters parameters --names path/to/O_BGM_US.pak
```

Rebuild original English item names with `item_localization_research.py --language US`,
using the boot and progress AFS flags documented by `--help`. The catalog generator
`build_editor_reference.py` binds source CSV hashes. UI extraction helpers record
texture provenance; Pillow is a developer dependency, not an application dependency.

Exact-input save/ELF patch tools are separated in [tools index](../tools/README.md).
Their successful reproduction is not a new gameplay test, not an installation
instruction for ordinary Studio users, and not evidence that every expanded path is safe.

## Validation recorded during publication

The publication audit reruns native MAIN query masks, Zone outcome-bit naming, Zone
route/arena consumers, music binding/selection evidence and exact D2 delta reproduction.
It also runs editor and Python tests and checks source-bound browser reports. See
`PUBLICATION_AUDIT.json` for the exact current outputs/counts and `EVIDENCE_INDEX.json`
for the included research inventory. Existing screenshots/runtime captures are audited
records; they are not falsely described as newly replayed emulator experiments.
