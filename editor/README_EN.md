# RB2 Galaxy Studio 1.0

## AI development and research disclosure

**This project was developed and researched predominantly with AI assistance.**
Human direction, original files, gameplay tests and corrections were essential.
AI-generated conclusions can be wrong; read the confidence levels and limits in
the research repository rather than assuming every exported edit is gameplay-tested.


An offline, visual editor for the researched battle formats in **Dragon Ball Raging Blast 2 for PS3**. The interface, item names, move names and built-in help are in English. PAL, NTSC-U and NTSC-J import/export compatibility, including v2.00, has been confirmed by the user; developer checks use the supplied European files.

Version 1.0 includes the accumulated condition and Mod support improvements, a prominent Zone-wide secret-route requirement, and a general code review. Read mod rosters directly from AFS, edit multi-character Galaxy conditions, and distinguish player-team mission effects from enemy preset equipment. See [Feature guide](docs/RELEASE_PREPARATION_EN.md). Previous release ZIPs remain unchanged.

**Music correction:** 30 = Battle of Omega (Solo Guitar), 31 = Battle of Omega (Full). 56 is a mode-dependent random/default sentinel. Stock Battle Zone ignores its MMD music word and selects its own music. See [Music selectors](docs/MUSIC_SELECTORS_EN.md).

## Run on Windows

1. Extract the **entire ZIP** into a folder. Do not run it from inside the ZIP preview.
2. Double-click **Launch Galaxy Studio.cmd**, or open **index.html** in a current Microsoft Edge or Google Chrome.
3. Click **Open MMD / DAT files**, or drag your extracted files onto the window.

No installation, Python, Node.js, server, emulator or internet connection is needed to use the app. It runs locally in your browser. The supplied launcher simply opens the HTML file in your default browser; this release is a portable browser application, not a native Windows EXE. Keep the `js` and `assets` folders beside `index.html`.

## Which files to open

| What you want to edit                              | Individual input files                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Galaxy missions and maps                           | `galaxy.mmd`                                                                              |
| Tutorial battle definitions                        | `tutorial.mmd`                                                                            |
| Normal and Ultimate Battle Zone routes             | The relevant `zone_*.mmd` files                                                           |
| Galaxy characters, form links, equipment and moves | `preset_character_galaxy.dat`, `preset_appearance_table.dat`, `preset_strength_table.dat` |
| Tutorial presets                                   | `preset_character_tutorial.dat` plus the same shared appearance/strength tables           |
| Normal Battle Zone presets                         | `preset_character_battle_zone_nor` plus the shared tables                                 |
| Ultimate Battle Zone presets                       | `preset_character_battle_zone_spe` plus the shared tables                                 |
| Advanced global item properties                    | Optional `item_parameter.dat`                                                             |
| Tutorial message order (shared across languages)   | `tutorial_message_table_01.dat` through `tutorial_message_table_09.dat`                   |
| Localized tutorial wording                         | `TUTO_###_US.txt`, `_IT.txt`, `_FR.txt`, `_DE.txt`, `_SP.txt`, `_JP.txt`                  |

Battle Zone preset filenames can have **no extension**. They are supported. Files renamed beyond recognition ask you to select their DAT layout. The reader checks geometry and version; it does not accept arbitrary binary formats.

You can open several files at once. Each preset table is a separate namespace: Galaxy preset 10 and Battle Zone preset 10 are different records. The appearance and strength tables are shared. When several revisions of the shared tables are loaded under different filenames, select the intended dependency in the preset editor.

Individual MMD/DAT inputs remain supported. Overview also offers **Export from game** and **Import to game** for local AFS extraction and repacking, including nested PAK/ZPAK members. No game MMD/DAT, executable, emulator or firmware is bundled. See [Game archive workflow](docs/GAME_ARCHIVES_EN.md).

## Galaxy & Tutorial

Choose a Galaxy owner to show its mission map. Click a circle to select a mission; drag it to change its coordinates. Mission numbers are global zero-based root indices, not the order of the circles within a Galaxy.

- **Battle:** coordinates, arena, music, category/circle type, displayed difficulty, victory objective and time limit. Objective type controls gameplay; it is not merely a title.
- **Teams:** allies and enemies, their preset IDs, candidate ordering, conditional inclusion and preserved opaque words. There can be four active allies in addition to the player, and five active enemies. A longer conditional candidate list can still select a smaller valid team.
- **Actions & rules:** native action requests and their parameters, independent victory selection, action-list copying from another loaded Galaxy/Tutorial MMD, rule descriptions, mission modifiers and the two UI item lists.
- **Progression:** reveal/availability expressions, the separate OR query list, and conditional rewards.
- **Map & owners:** reciprocal map edges, Galaxy membership, entry mission, owner metadata, and creation of a new mission from a donor.
- **Advanced:** opaque root words, descriptor references, raw root bytes and a shared descriptor inspector/editor. This area exposes incomplete research explicitly.

Category 4 is the large Boss circle. Displayed difficulty is a separate field. An independent arbitrary circle-radius control has not been discovered.

**Use basic defeat-enemies setup** sets objective 0 and clears rule captions, their numeric parameters, the objective parameter, mission item lists and the time limit. It keeps the preset equipment, unknown bytes, category, map links, rewards and progression gates. Existing prompts are kept when the checkbox is selected. Preset equipment can still add effects to a basic battle.

### Create a new Galaxy fight

1. Open `galaxy.mmd`. Use the portrait selector to choose a populated Galaxy; **All Missions** is at the end.
2. Click **Create mission…**. The wizard locates a basic ordinary donor (original mission 238 when suitable).
3. Choose the destination Galaxy by its picture and name, then click the preceding mission on its map.
4. Choose whether it unlocks after clearing that mission, then select arena, music, displayed difficulty and map position.
5. Confirm the save-compatibility notice. The app creates a new root, owner membership, a reciprocal map link and the selected eligibility expression. It clears inherited allies, rewards, prompts, modifiers and extra captions; it keeps a valid donor opponent.
6. In **Teams**, choose opponents or use **Create a new preset…**. **Edit character preset** opens the character workspace, with a button to return to this mission.

The original game saves **500** Galaxy mission records (0–499), while the original MMD uses 498. The first two extra roots fit the established table; further roots overlap other saved data. The app warns when you exceed the original count, and separately warns about the known corruption boundary during creation/export. A research-only confirmation does not make that edit safe for gameplay.

The older donor-duplication controls remain available in **Map & owners** for advanced edits. Whole new Galaxies have separate icon/save constraints; an unused native owner is not a safe independent campaign slot.

### Optional in-battle action requests

The original game already has these. **Goku mission 239** requests nine actions while the actual victory goal is to defeat the opposing Z-Fighters. **Majin Buu 97, Frieza 1st Form 174 and Meta-Cooler 300** have requests alongside the ordinary “Defeat all enemies” goal.

1. Select your new mission and open **Actions & rules**.
2. Add actions, or expand **Copy prompts from another mission**. Choose a loaded Galaxy/Tutorial MMD and a donor mission. Copying clones the referenced numeric expressions as well; a descriptor index cannot be copied blindly between files.
3. Choose the **optional Perfect Actions** button. It selects category 2 and objective 0. You can then choose objective 1 for the “Defeat all enemies” goal if preferred.
4. Keep the list within **20 actions**. Ascend, Land using Descend, then a five-hit combo are a simple initial sequence. For the combo, set native action 95 and its **numeric expression** to constant 5.
5. If completing the requests should win the battle instead, deliberately choose the **required actions / objective 29** button.

Not all requests fit every character: transformation needs an available form; a switch needs a teammate; a specific-Super condition may be tied to a particular native move. These are existing combat-action detectors, not arbitrary QTE scripts or keyboard codes. Tutorial explanatory-message IDs and controller-glyph IDs are separate from native action IDs. See `docs/OPTIONAL_ACTION_PROMPTS_EN.md` for the evidence and original donors.

## Character presets

Start with a **preset container**: Galaxy, Tutorial, normal/Ultimate Battle Zone or download presets. The container's character cards resolve through its shared Appearance and Strength tables. Each mode has its own preset indices.

Select a character, then use its tabs:

- **Preset & transformations:** Appearance/Strength references, additional preserved parameter, native slot guidance, destination presets and fusion links. Separate transformation/fusion diamonds show slots 1–4 on the left/top/right/bottom; click a slot to edit its destination.
- **Appearance & moves:** native form, costume and five local Super/Ultimate selectors.
- **Strength & equipment:** CPU level/type and all 20 item slots.

Clicking a tab without its shared table offers **Load preset_appearance_table.dat…** or **Load preset_strength_table.dat…**. You remain in the same character workspace. If the reference is unassigned or outside the loaded table, create a new record or link an existing one. A draft with missing references must be completed before game export.

**New character preset…** creates independent Appearance and Strength rows when those tables are loaded. Otherwise it can create an unassigned draft. It uses the selected native form's original moves, empty equipment and no assumed form/fusion links. **Create new appearance/strength for this character…** creates and links a new row in one undo step. **Make this appearance/strength independent** copies the current shared row and updates only this preset.

Standalone shared tables and global item definitions remain accessible from the file sidebar or **Shared tables & global item definitions**. They offer **Create new appearance…** and **Create new strength…**; item definitions remain an advanced global editor.

A form link chooses the destination preset and its equipment/moves. The native slot controls the transformation/cancellation animation. For example Goku SSJ2 needs the second native entry for SSJ3, not its cancellation entry. Cloning one preset does not automatically clone its entire transformation graph; use **Clone complete preset** and reassign the linked forms deliberately.

When editing an embedded Appearance or Strength tab, the single-file export button exports that table and names it accordingly. **Export ALL edited files** collects every modified dependency.

## Battle Zone

Open any normal or Ultimate `zone_*.mmd`. Use the matching normal or Ultimate preset table for character references.

- **Battle:** stage kind, enemy preset, displayed level (LV), handicap, time, arena and raw music selector. Edit character preset opens the matching Normal or Ultimate container; Create a new preset links the created row.
- **Conditions & rewards:** Challenge Stamp criteria, conditional rewards and availability expressions.
- **Route:** directed next-stage indices, draggable node coordinates and duplication from a donor.
- **Advanced:** opaque variant word and raw references/records/descriptors.

Challenge Stamp criteria have their own ID set. They are not enemy rosters and are not Galaxy Perfect Action sequences. The current research does not establish how to display Galaxy's command-request UI in Battle Zone.

Battle Zone progress uses mode, route slot and an integer grid: original file coordinates X=0,1,2 and Y=0..6. The native formula is `(int(X)+1)+3*(6-int(Y))`, with 21 saved records (0–20). Consequently X=2,Y=0 addresses record21 outside this route; the wizard excludes it. Twenty cells are addressable within those standard coordinate ranges. The guided tools propose unused cells and snap dragging to that grid. Original conditional alternatives can share cells intentionally; review the warning when duplicating. The field +0x10 is displayed LV and does not allocate progress. The original menu has eight routes per mode; an extra standalone MMD does not create a ninth route. Music can also be overridden by game settings.

## Apply, undo and export

Normal MMD fields apply when changed. Buffered text lists, expression programs and DAT forms have explicit Apply buttons. Pending valid edits are also applied before navigation or export; invalid edits keep the form open. A Discard/Reset button lets you abandon an invalid draft.

- **Undo / Redo** restores binary snapshots, including multi-file preset clones.
- **Check files** checks structure, map consistency and available references. Missing dependency files are reported separately from corrupt structure.
- **Export current file** downloads the selected MMD or DAT with its original name.
- **Export ALL edited files** downloads all modified files in folders named after their original target AFS, plus an export manifest. It contains loose MMD/DAT files, not rebuilt AFS archives. The originals on your computer are never overwritten. The modified marker remains because it compares against the imported original.
- **Save workspace** stores original and edited copies in a `.rb2project` file. It is a project file for this app, not a game file. Reopen it to continue later.

Browser downloads go to your normal download directory unless your browser asks for a destination. Reinsert each exported MMD/DAT into the same archive member from which it was extracted. Overview → Import to game can rebuild the AFS for you, including resized nested members and repeated Battle Zone copies.

Shortcuts: **Ctrl+O** open, **Ctrl+S** export current file, **Ctrl+Z** undo, **Ctrl+Shift+Z** redo. Input text fields retain normal text undo behavior.

## Research limits and verification

The editor preserves unknown bytes and unsupported complex wave-group content. It does not claim a complete decoder for tutorial AI scripts, arbitrary new action detectors, custom QTEs/cutscenes, or all mode-specific reward/query semantics. Advanced raw edits can intentionally alter shared data; the normal structured tools isolate their own list edits.

Tests cover synthetic malformed files, all 18 original MMDs and all seven original preset DAT namespaces/tables, byte-identical no-edit roundtrips, precise field patches, resized lists, conditional teams, reciprocal graphs, cloned missions, local move edits and exports. Real-browser automation covers opening files, editing, map dragging, cloning, undo/redo, copied prompts, atomic drafts, ZIP download and workspace restore. See `TESTING.md` and `verification/` for the recorded release checks and their limits.

The 100 character portraits are the original game's 128×128 textures, extracted directly from the supplied game. Version 0.5 also uses 16 original UI textures for character frames, nameplates and mission text windows; their provenance is in assets/game-ui/manifest.json. See `assets/ASSET_SOURCES.md` and `assets/portrait-manifest.json` for provenance. The logo/interface artwork is separate from the game portraits. This is a community research tool, not an official Bandai Namco application.

## Rule effects and unlocks

**Actions & rules** explains the relationship between rule wording, mission modifier items and UI icons. It offers an explicit command to match UI list A to the modifiers. There is no per-entry target field in the mission item list; for precise fighter equipment edit that candidate's preset Strength. In the traced stock Galaxy path the list applies to the player team, including allied candidates. Enemy bonuses belong in preset Strength.

**Progression** shows named reward types and targets, live sources for the selected Galaxy/form unlocks and simple mission prerequisites. An unconditional reward is eligible in the game's result flow, not granted when the file is opened. Changing rewards does not reset existing saved unlocks. No verified MMD-only “start an entire Galaxy locked” toggle is offered.

See **docs/PROGRESSION_AND_MODIFIERS_EN.md** for the eleven reward namespaces, Goku's original form progression, verified mission496 and the exact research limits.

## Mod support in0.3

Overview now offers an explicit Mod support mode. Import native character/form names as CSV or a JSON mod profile; optionally import local move names and raw cs_form.dat character-select groups. The active catalog follows you through presets, teams, references and named rewards, and is included in saved workspaces. Missing native move defaults use a matching loaded Appearance or are rejected with a clear explanation. See [MOD_SUPPORT_EN.md](docs/MOD_SUPPORT_EN.md).

Original save and RAM limits remain visible. A larger DAT or a user-supplied name does not prove the engine can handle extra IDs. The0.3 strength checks warn about the fixed381-item effect loop and384-bit equipment bitmap.

## Conditional teams in0.4

Teams now shows a **Battle from this Galaxy** preview before the complete candidate lists. Choose a Galaxy normally, or choose a preview perspective when viewing All Missions. Mission491 demonstrates why this matters: its six enemy candidates do not all enter the same fight. Conditions choose Hatchiyack against the heroes, or the five heroes against Hatchiyack. The selected player occupies the player slot separately. Previewing changes no bytes.

Each candidate has an Included / Excluded / Unresolved summary and a simple **Choose Galaxies for this candidate** control: Always, Only selected Galaxies, or Except selected Galaxies. Apply Galaxy rule explicitly replaces only that candidate’s condition. Advanced condition keeps the complete postfix editor for other logic. Save/runtime-dependent queries stay unresolved. See [Conditional teams](docs/CONDITIONAL_TEAMS_EN.md).

The original Battle Zone files use X=2 in many branches. Earlier0.2/0.3 checks incorrectly rejected that column.0.4 accepts all sixteen original files, checks their computed saved-cell bounds, and labels general format notes as Information. Tutorial expansion now also gets a separate research warning; its progression scans are fixed to the original nine missions.

## Galaxy interface

The left mission column is now a scrolling Galaxy character rail, in native character order, with **All Missions** last. Names remain visible under the original game portrait frames. **Find a mission** is a separate expandable panel above the mission workspace; the full list opens automatically in All Missions. The portrait dialog and creation wizard remain available.

**In-game preview** combines original extracted texture pieces with the current Galaxy perspective, condition-filtered opponents, allies, displayed difficulty, arena, music, objective and both rule captions. It updates with applied changes, and scalar drafts update during typing without changing the saved bytes. Buffered expression/list drafts still require Apply. Unknown runtime-dependent candidates show a question mark; unsupported team formats and missing preset/appearance dependencies are labeled. The nameplate shows Arena and Music instead of saved-game record/rank. Mod-profile portraits and names are honored.

The preview scrolls with the page; Actions & rules uses a compact text-only window. **Hide preview** lets you reclaim the space. Rule descriptions remain wording, separate from actual mission modifier items. Seeing text in the preview does not apply the described effect.

## Empty Galaxies and map limits

In Galaxy & Tutorial, enable **Show Empty Galaxies** to display native character/form
slots with no missions, including Goku's Super Saiyan forms and their portraits.
The flag is off by default and changes only the editor view. **All Missions** stays last.
An empty slot offers two workflows:

- **Transfer Galaxy from another Character** moves a populated Galaxy to the selected
  empty character/form. Pick the donor by portrait and review the transfer. Its existing
  world-menu icon is reassigned, so the new owner appears in the original game's menu
  without adding an icon or patching the executable. The donor loses its Galaxy and stays
  playable. Mission IDs, links, positions, entry mission and opponent presets are retained.
  Selected-Galaxy conditions are rewritten for the new owner, including ordinary shared
  team candidates. Character-unlock and form rewards retain their original targets.
- **Create New Galaxy** creates a first mission from a working basic donor. It becomes
  the empty owner's entry mission with no predecessor. This authors mission data only;
  it does **not** create the separate world-menu icon. Use Transfer for an existing-icon
  replacement.

Transfer requires native IDs 0–99, an empty destination with no existing world icon,
and a populated source with exactly one icon. The destination must already be playable
in the game save. Existing mission records and Galaxy scores are inherited, not reset.
Unsupported special enemy groups or computed selected-Galaxy queries block transfer
without changing the document; they need further research. Undo/redo is supported.

Only `galaxy.mmd` changes for a transfer. Export it and use **Import to game** to rebuild
its AFS. There is no need to edit the preset DATs unless changing opponents as well.

See [Mission menu limits](docs/MISSION_MENU_LIMITS_EN.md) for circle budgets and
controller navigation. The editor now warns when candidate counts exceed those pools.

## Delete and move missions

In **Galaxy → Battle**, use the red **Delete mission…** button. Delete from every
Galaxy to free the Mission ID; if the mission is shared, removing only one membership
keeps the ID in use in its other Galaxies. Choose a surviving entry when removing an
entry mission. **Undo** restores both the battle and its memberships.

New missions and duplicates use the lowest explicitly freed ID before appending a new
record. Free slots survive MMD export and reopening, and are shown in the document's
**free IDs** counter. Other mission IDs never change. Existing zero/unassigned game
records are not automatically considered free; only explicit deletion makes a slot
available. This lets you replace a deleted battle even at the original 500-record limit.
An existing game save can retain completion, score or other progress for a reused ID;
test with appropriate savedata. The editor does not reset the game's savedata.

**Move to another Galaxy…** selects a source and destination, a preceding mission on
the destination map, and optional replacement availability gates. Moving to an empty
owner makes the battle its entry. Other shared memberships, fighters, items and
coordinates remain intact. Review Teams conditions that compare the selected Galaxy.
Moving a shared mission does not create an independent copy of the battle.

Both dialogs show known dependencies on the mission's progress. Choose a replacement
to redirect literal query types 2 and 3, optionally connecting surviving source neighbors
through that replacement where they belong to the same source Galaxy. To free an ID,
known incoming dependencies must be redirected first. For moves and single shared
membership removals, explicitly keeping the old requirements is also supported.
Native/form queries are preserved. Dynamic query targets and special participant scripts
are listed for manual review; their behavior is not guessed. Remaining map paths need
review if you keep dependencies or do not reconnect neighbors.

An empty owner becoming populated does not automatically get a world-map icon. See
[Empty owners and selectable Galaxies](docs/EMPTY_GALAXIES_EN.md).

## Diagnostic logs and reference pages

Use **Session log** in the sidebar to view or download local diagnostics before closing the page. Export ALL edited files also includes a diagnostic JSON. Logs contain actions, file metadata and errors, not game-file contents; nothing is uploaded. The log retains the newest 2,000 events. Reference Library has Previous/Next controls for all entries, in pages of 150.

See [Conditions and Battle Zone routes](docs/CONDITIONS_AND_BATTLE_ZONE_EN.md) for readable queries, reward percentages, secret-route limits and the arena correction.
