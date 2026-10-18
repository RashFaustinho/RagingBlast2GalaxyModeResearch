# From the game to Galaxy Studio and back

All processing stays on your computer. These are optional Overview workflows;
you can still open individual MMD and DAT files directly. AFS/PAK/ZPAK files
are handled by the archive bridge, not loaded as editable mission documents.

## Export from game

1. Open Overview and click **Export from game**.
2. Select one or more AFS files from your game's `USRDIR/data/PS3` folder:

   | AFS | Editable files |
   |---|---|
   | `st_pack_progress_pt_ps3.afs` | `galaxy.mmd`, `tutorial.mmd`, all 16 normal/Ultimate `zone_*.mmd` routes |
   | `st_pack_boot_pt_ps3.afs` | Appearance, Strength and all five preset containers, plus `item_parameter.dat` |
   | `st_pack_battle_others_pt_ps3.afs` | The nine `tutorial_message_table_01.dat` … `_09.dat` files |

3. Click **Find editable files**. The original European files yield 35 distinct
   editable filenames. Detection uses internal archive contents, not AFL community names.
   For original-sized named progress/battle_others archives, known BLES00978 locations
   are scanned first. Select **Scan every entry** for a mod with relocated content.
4. Click **Download Extracted Zip**. Unpack the `extracted/` folder into your Studio
   folder (or another location of your choice).
5. Click **Open MMD / DAT files** in Studio and select the unpacked files to edit.
   To switch revisions of an existing filename, save and close the workspace first.

Identical repeated copies are extracted once. The extraction manifest records their
AFS indices, nested member paths and SHA256. If the same filename has different
contents, each variant is saved in its own `variants/` subfolder; no variant is
automatically chosen for editing. Review those variants deliberately.

## Import to game

1. Finish editing and click **Export current file**, or **Export ALL edited files** and
   unpack it. A saved workspace/project is not a game input. Include all edited shared
   DAT files when changing presets, Appearance or Strength.
2. Open Overview → **Import to game**. Choose one target AFS and the saved MMD/DAT
   files that belong in it. Repeat for the other AFS if the edit spans several archives.
3. Click **Review import**. The plan lists the number of matching copies per file.
   All matching copies are replaced: for example original Battle Zone definitions
   appear in 18 parameter packs. Replacing only one can leave stale routes in game.
4. After reviewing the selected revisions, click **Build patched AFS**.
   The bridge validates the input layouts and retains original save-capacity warnings.
   Invalid files or names that do not exist in the chosen AFS are rejected.
5. Click **Download Patched AFS** to download the verified `.modded.afs` copy.
6. With the game closed, keep the original AFS as a backup and put the patched copy
   into the game using the **original AFS filename**. A downloaded `.modded.afs` must
   be renamed before replacing the game's file. Boot archives are normally cached
   during startup: fully restart the game to test preset changes.

The source AFS is read only. This workflow builds a separate output; it does not
overwrite the input, modify EBOOT, extend savedata or fix unsupported campaign limits.
Unsaved editor changes are not silently substituted for the files you select.

## Export ALL edited files

The top toolbar button downloads a ZIP containing every document changed from its
opened original, including edited shared preset dependencies. Its folders are:

```text
st_pack_progress_pt_ps3.afs/       galaxy.mmd, tutorial.mmd, zone_*.mmd
st_pack_boot_pt_ps3.afs/           preset tables, item_parameter.dat
st_pack_battle_others_pt_ps3.afs/  tutorial_message_table_*.dat
Galaxy-Studio-export.json         file paths, target AFS, sizes and checksums
```

These are folders named after AFS archives, not rebuilt AFS files. Unpack the ZIP,
then import each folder's MMD/DAT files into its AFS using **Import to game**.
The grouping uses the original European BLES00978 layout, so it works even when you
opened loose files. Mods that relocate files may use different archives: verify the
chosen target with the import scan. Unrecognized names go into `Unassigned/` rather
than being assigned an invented destination. **Export current file** still downloads
one loose file.

## Repacking and limits

The implementation handles the observed PS3 AFS directory and nested STPK with
STPZ/0DCS/0LCS compression. Changed STPK members retain their names, unknown directory
words and sibling bodies. Compression is decoded and checked after encoding.
AFS growth inserts aligned sectors in physical order, updates moved offsets and the
filename-table pointer, and preserves unrelated original ranges as file slices.
Known filename size fields are updated only when their original value matched the
original member length; unrelated historical metadata is retained.

Version 0.6 preserves nonzero bytes between members by inserting aligned
space before the complete original gap. It does not overwrite or discard those bytes.
The frozen 0.5 release instead stops with “Growing AFS entry … would replace nonzero
padding”; this is an importer limitation, not evidence of invalid presets. Unsupported compression,
bad bounds, overlapping members, excessive nesting and oversized containers are
reported. Scans list skipped entries explicitly; a full scan is not a claim to support
every archive in every mod. MMD/DAT inputs are limited to 16 MiB and individual decoded
containers to 128 MiB. Full scans have a 1 GiB cumulative decoded-container budget.
The large source AFS is sliced instead of loaded as one JavaScript byte array, but
rebuilding very large archives can still need substantial browser memory/temp disk.

Verification covers binary structure, unchanged neighboring data and actual browser
workflows with the original European files. It does not replace testing your custom
battle in the game. Linux Chromium was exercised; native Windows pickers and PS3
hardware were not available for this release's checks.
