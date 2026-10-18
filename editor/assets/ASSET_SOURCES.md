# Reference data and original character portraits

The editor uses the English references established during research on the
European PlayStation 3 release **BLES00978** of *Dragon Ball Raging Blast 2*.
All catalog data is bundled in `js/data.js`; the application makes no network
requests to obtain images, character names, move names or equipment names.

## Portrait provenance

The 100 transparent PNGs in `portraits/000.png` through `portraits/099.png`
were extracted **directly from the original game files supplied by the user**:

- Archive: `st_pack_progress_pt_ps3.afs`.
- AFS entry **872**, member `chara_chip_tex.spr`: texture metadata and native-ID names.
- AFS entry **873**, member `chara_chip_tex.vram`: the actual texture pixels.
- Original texture names: `sc_chara_000.png` through `sc_chara_099.png`.
- Original size: **128 × 128**, DXT5/BC3 texture compression.
- Conversion: decode the original DXT5 pixels to RGBA PNG with Pillow.
  No resizing, cropping, redrawing, AI generation, or replacement artwork.

`portrait-manifest.json` records the source SPR/VRAM SHA256 hashes, every
original texture offset and texture hash, and every exported PNG hash.
The portrait number is a **native character/form ID**, not a preset ID.
For example, `062.png` is Majin Buu, `063.png` is Super Buu, and `066.png`
is Kid Buu. Each preset resolves its appearance row before selecting a portrait.

The SPR/TX2D and PS3 DXT5 interpretation was cross-checked against
[adsl14/Raging-tools](https://github.com/adsl14/Raging-tools), commit
`7727960be491aa76ccf125d00d53773d8ff37743`, especially `VEF.py` and
`lib/vram_explorer/functions/auxiliary.py`. The decoder used here is a small
independent extraction script and Pillow's DXT decoder. The bundled portraits
are game artwork belonging to their respective rights holders; they are not
covered by an editor source-code license.

## Catalog sources and ID namespaces

`js/data.js` defines `RB2.DATA`. Its `sources` field includes the relative
CSV paths and SHA256 hashes used to build it:

| Array | Records | Meaning of `id` |
|---|---:|---|
| `characters` | 100 | Native character/form ID; includes portrait and original default move selectors |
| `items` | 381 | **Equipment array index** from `item_parameter.dat`, not a save or localization ID |
| `moves` | 690 | Local move selector for the row's `native`; 666 consistently resolved, 24 flagged |
| `stages` | 14 | Stage ID |
| `music` | 56 | Resolved music ID; unknown numeric IDs must remain editable and preserved |
| `objectives` | 33 | Mission objective type, not merely a cosmetic title |
| `rules` | 63 | Stored **one-based** description selector; zero means no description |
| `actions` | 112 | Native Perfect Action detector ID, with parameter mode |
| `handicaps` | 13 | Battle Zone handicap code |
| `stamps` | 13 | Battle Zone challenge-stamp criterion |
| `nativeTransforms` | 100 | Native form's four action slots, targets and cancel bits |

Additional arrays provide the documented mission category and displayed
difficulty labels. `notes` describes the important limitations in plain English.

The item catalog comes from `research/item-catalog-BLES00978-EN.csv`.
Its `item_index_decimal` field is the value that belongs in equipment slots.
`textId` is retained only as display provenance and must **never** replace `id`
when saving an equipped item.

Move names come from `research/advanced/LOCAL_MOVE_IDS_EN.csv`, reconstructed
using both the battle HUD and pause-menu tables. Unresolved/inconsistent rows
remain explicitly marked with `resolved: false`. The editor does not claim
that selecting another character's local move index transplants that move.

For Perfect Actions, native detectors 0–107 use the corresponding original
English action labels. Native 106 is unnamed. Native 108–111 remain explicitly
unresolved: English `A_Just` text IDs 108 and above are controller glyph strings
and must not be presented as names of these native detectors. The documented
direct-parameter IDs are 81, 82, 88, 100, 102, 108, 109 and 110; expression
parameter IDs are 94–97 and 106. Other IDs use no parameter in the observed
loader. This describes the loader, not a complete behavioral verification of
every detector.

Rule selectors label a description; selecting a label alone does not create
its described effect. Mission objective type, equipment modifiers, parameters
and other mission data may be needed. Original labels do not constitute a
tested recipe for all objectives. Other game settings can override Battle Zone
music. Native transformation slots choose the action/animation, while the
preset links select the destination appearance and equipment.

## Rebuilding developer assets

The developer commands below are run from the full research repository, which
contains the referenced scripts and CSVs. They are not needed to use the standalone ZIP.

The application itself accepts individual MMD/DAT files and does not require
AFS/PAK inputs. This optional **developer-only** command rebuilds the bundled
catalog from the repository CSVs:

```console
python tools/build_editor_reference.py
```

To re-extract the original portraits, install Pillow and supply the original
progress archive to the developer script:

```console
python tools/build_editor_reference.py --game-afs "path/to/st_pack_progress_pt_ps3.afs"
```

The script reads the archive, extracts only the two required members, validates
all 100 native-ID texture names and their format, and writes PNG assets plus a
hash manifest. It does not modify the source archive or include it in the app.

## Original Galaxy interface textures (0.5)

`game-ui/` contains 16 unmodified top-level BC3 textures decoded from the original progress AFS entries 872 (SPR) and 873 (VRAM). Sources include `chara_sele_icon.spr`, `galaxy_mode_personal_score.spr`, `galaxy_mode_key_plate_l.spr`, `just_action_list.spr`, and `galaxy_zon_BG_base.spr`. The game nameplates, miniature selector frames, fighter frames and window lines are recomposed with live English editor text and portraits. Screenshot text/records were not baked into these assets. Every SPR/VRAM, compressed-pixel and exported PNG hash is recorded in `game-ui/manifest.json`. Rebuild with `tools/build_studio_ui_assets.py` and the original user-supplied progress AFS.

## Original title-screen logo (0.7)

`game-ui/title-logo.png` is decoded directly from the supplied BLES00978 progress AFS,
entry1935 `TitleDummy.spr`, entry1936 `TitleDummy.vram`, texture
`main_title_logo_HOKUBEI.png`. It is the western title mark, stored as a Morton-swizzled
1024×512 ARGB8 texture. The extractor unswizzles pixels and converts ARGB to RGBA,
retaining original transparency and texture dimensions, without cropping or redrawing.
The region-named OUSHU placeholder contains Japanese artwork, so it is not used.
Provenance and checksums are in `game-ui/title-logo-manifest.json`.
Developer-only rebuild: `python tools/extract_title_logo.py PROGRESS_AFS --output
editor/assets/game-ui/title-logo.png`. The installed application needs no Python.

## Multilingual tutorial preview text

`js/help-languages.js` contains the original 85 tutorial strings in each of six language packs (US/IT/FR/DE/SP/JP), read from supplied BLES00978 `st_pack_battle_others_pt_ps3.afs` entries 106/100/98/96/104/102 respectively. All six `G_Tutorial_XX.pak` members contain `TUTO_000_XX.txt` through `TUTO_084_XX.txt`, UTF-16LE with BOM and NUL terminators. `tools/build_help_languages.py` rebuilds the bundled previews from privately extracted packs; source hashes are in `help-language-provenance.json`. The UI preserves controller tags. No whole PAK, AFS or game binary is bundled.
