> Galaxy Studio **1.0** includes the feedback accumulated after 0.9: AFS roster
> extraction, multi-Galaxy conditions, named result queries 11–13, Tutorial selector
> 14, player-team modifier explanations and prominent Zone-wide secret requirements.
> See [Conditions and Battle Zone](CONDITIONS_AND_BATTLE_ZONE_EN.md).

# Galaxy Studio 1.0 feature guide

These features are included in Galaxy Studio **1.0**. Previous release ZIPs are
unchanged. Current verification is at the top level of `verification/` in the source checkout.
Historical snapshots are retained in Git and omitted from the portable ZIP.
Music selector corrections are documented in [Music selectors](MUSIC_SELECTORS_EN.md).

## Compatibility

The user confirmed import/export on NTSC-U and NTSC-J, including game v2.00.
Developer binary/browser checks use the supplied European BLES00978 files.
Compatibility of editor data import/export does not establish compatibility of
the separate experimental executable patches.

## Tutorial messages: order versus wording

**Tutorial messages** replaces the previous **Tutorial help** navigation label.
Two different resources are editable:

| Resource                                    | What it changes                                          |
| ------------------------------------------- | -------------------------------------------------------- |
| `tutorial_message_table_01.dat` … `_09.dat` | Ordered 16-bit message IDs; shared by the game languages |
| `TUTO_###_XX.txt`                           | The actual wording of one message in one language        |

Use Overview → **Export from game** on
`st_pack_battle_others_pt_ps3.afs`. The extracted ZIP now includes the nine order
DATs and 510 text members from the six `G_Tutorial_XX.pak` packages: US (English),
IT (Italian), FR (French), DE (German), SP (Spanish), JP (Japanese). Each original
language has message IDs 0–84. No PAK input is necessary in the editor.

Open order DATs and/or TXT files together. Order editing has a language selector
and uses loaded text edits in its preview. **Edit this localized text** opens
the matching loaded TXT. Select a TXT to edit its wording; export the saved TXT
and use **Import to game** on the battle_others AFS. Import matches the original
member filename and changes only its language package.

The writer preserves the UTF-16LE BOM and trailing NUL terminators. Unedited
texts roundtrip exactly. Keep `<PAD=…>` tags and other game markup intact.
Changing wording does not create new action detectors or a new game language.
Longer text can overflow the game's display; the browser preview is not an
in-game font/layout test. Runtime display of newly written messages has not
been tested in RPCS3 in this change.

## Local diagnostics

Use **Session log** in the sidebar, filter warnings/errors if needed, and select
**Download session log**. The JSON records ordered, timestamped file actions,
edits, rollback errors, validation, exports, mod-catalog changes, archive
operations and uncaught runtime errors. It includes the editor version/build
and the current workspace's file metadata. Export ALL edited files includes a
log copy alongside the edit manifest.

Logs stay in browser memory and are not uploaded. Download before closing or
reloading the page. They keep the newest 2,000 events and report how many earlier
events were discarded. Binary contents and localized text drafts are not
included. Metadata strings and collections are bounded. Workspace files still
contain actual game data, so sharing a log is different from sharing a workspace.

## Form and fusion diagrams

The preset page has two independent diamonds. Slots 1, 2, 3 and 4 appear on the
left, top, right and bottom respectively. Portraits resolve the destination
**preset**, through its Appearance row, in the current container. A missing
portrait/reference has a placeholder and an explicit accessible label.

Click a slot to focus its editable link. Draft changes update the diagram before
Apply. The numerical fields and byte offsets remain available. Form slots still
use the native action/animation rules; the diagram does not change those rules
or imply that every arbitrary fusion destination is executable.

## Read a mod roster from game files

Enable mod support in Overview and choose **Read roster from game files…**.
Select these loose resources from the same mod:

1. `cs_main.dat`: raw 80-byte native rows. Words +4 and +8 bind name/form text IDs.
2. `CharacterName_###_XX.txt` members extracted from `K_CharacterName_XX.pak`.
   Choose all name files from **one** language.
3. Optionally `cs_form.dat`: raw 36-byte character-select group rows.
4. Optionally `preset_appearance_table.dat`: existing local move selectors, taken from the first matching Appearance row for each native ID.

An archive tool such as Raging Tools can extract these resources. In the original European layout, `cs_main.dat` and a copy of `cs_form.dat` are in progress AFS entry 1891. Character-name localization packs also occur in the boot/progress archives; use the resources actually changed by the mod, rather than assuming these entry numbers apply to every release. The dialog
previews native IDs/names and missing translations before applying a profile.
Applying replaces the active mod profile after a confirmation when one exists;
loaded game documents are unchanged. Export the profile for reuse.

This is a reader for the researched layouts, not an arbitrary mod detector.
Missing names are marked explicitly. It does not invent move names or inherit
vanilla portraits/animation-slot assumptions for potentially replaced IDs.
Custom portraits, move names and native slot definitions can still be supplied
through the existing JSON/CSV support. Reading extra IDs does not expand the
game's save, menu, mission or asset-loading limits.

## Reference pages and Overview

Reference Library now uses 150 rows per page, with Previous/Next controls and
entry/page counts. Search, category and catalog changes reset the page; results
are clamped when a selection shrinks. The Overview copy and AFS list follow the
requested wording, and the sidebar no longer shows a region-specific game label.
