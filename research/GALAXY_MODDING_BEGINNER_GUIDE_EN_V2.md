> **Current reading:** start with [the research index](README.md). This detailed HxD
> guide retains original-build examples; current Battle Zone, progression and capacity
> conclusions are linked from the index.

# Dragon Ball Raging Blast 2: a beginner's guide to editing Galaxy battles

**Revision 2 — 15 October 2026. For the European PS3 release, BLES00978.** Written from the supplied game
files, the original English item texts, executable analysis, and controlled
RPCS3 experiments. You can perform the edits in Windows with HxD. A debugger
is not required for the editing workflow.

This guide explains existing stages, music, characters, equipment, opponent
counts, basic battle rules, and form-specific presets. It does not claim that
every special battle condition or fusion rule has been decoded.

**Start with section 5: changing the stage.** It is a small edit that teaches
the extraction, editing and repacking process before you create new presets.

## 1. Tools and files

You need:

- [HxD](https://mh-nexus.de/en/hxd/), for editing extracted files;
- AFS Explorer, for extracting/replacing entries in an AFS;
- [Raging Tools](https://github.com/adsl14/Raging-tools), especially **Pak
  Explorer**, **Utilities → Packer**, and **Utilities → Compressor**;
- a working copy of your game and backups of the original archives.

The Python scripts supplied with this guide are optional alternatives for
extraction, offset lookup and repacking. They use standard Python 3; the
ordinary editing tools do not require Capstone or RPCS3.

The game archives are in:

```text
PS3_GAME\USRDIR\data\PS3\
```

| Archive | What we use it for |
|---|---|
| `st_pack_progress_pt_ps3.afs` | `galaxy.zpak`, which contains `galaxy.mmd` and `tutorial.mmd` |
| `st_pack_boot_pt_ps3.afs` | Resident preset, appearance and equipment tables |
| `st_pack_battle_map_pt_ps3.afs` | Existing stage assets; selecting a stage does not require editing these |
| `st_pack_battle_character_pt_ps3.afs` | Existing character assets; selecting a character does not require editing these |
| `st_pack_sound_pt_ps3.afs` | Audio assets; selecting existing music does not require replacing audio |

An **AFS is an archive**, not a battle configuration. A `.zpak` is a compressed
container, identified by `STPZ`. Its decompressed `.pak` usually begins with
`STPK`. The extracted `galaxy.mmd` begins with `MAIN`.

### Two entries that matter

All entry numbers below are **zero-based**: entry 22 is the 23rd entry.
These positions apply to the supplied original European archives.

| Archive entry | Contents / identification |
|---|---|
| boot AFS, **22** | Resident archive; community boot AFL calls it **`db_font_pad_PS3_s.zpak`** |
| progress AFS, **872** | **`galaxy.zpak`**; verify that extraction contains both Galaxy and tutorial MMDs |

The boot archive is referred to internally as
`boot/resident/boot_resident_ALL_m.pak`. That is a **virtual game resource
path**, not a directory you need to find on the disc. The community AFL can
give its AFS entry a different name. Identify it by its entry and contents.

The resident container includes `game_resident_param_m.pak`. Inside it, we edit:

```text
preset_appearance_table.dat
preset_character_galaxy.dat
preset_strength_table.dat
```

`item_parameter.dat` defines the items. Normally you **read it**, rather than
modify it: assigning equipment means writing item indices into a strength row.
Some STPK filenames are truncated to32 characters; keep the exported names.

## 2. The four numbers you must keep separate

A Galaxy opponent is selected through this chain:

```text
galaxy.mmd: mission → enemy group → participant list
                                      |
                                      | preset index
                                      v
                         preset_character_galaxy.dat
                           /            |           \
                  appearance index  strength index  form links
                       |                |               |
            native character/costume   equipment     other presets
```

| Number | Meaning | Example |
|---|---|---|
| Native character ID | Actual character **and form** | 2 = Goku SSJ2 |
| Appearance index | Row containing native ID, costume and other appearance data | Custom appearance367 contains native 2 |
| Strength index | Row containing CPU configuration and up to20 equipment slots | Custom strength 777 |
| Galaxy preset index | Row combining appearance, strength and form links | Custom preset 1058 |

**The participant list contains a preset index, not a native character ID.**
Writing native ID2 directly into that list selects Galaxy preset 2. It does
not mean “use Goku SSJ2 with my new equipment.”

One preset can be used in several missions. Several presets can share the same
appearance or strength row. Editing a shared row affects every user of that
row. Use dedicated copies for an isolated custom battle.

## 3. Extract before editing

With the GUI tools:

1. Extract entry 872 from the progress AFS and entry 22 from the boot AFS.
2. Open each extracted container in Raging Tools/Pak Explorer, or decompress
   it with Utilities/Compressor, then unpack the resulting PAK.
3. From the Galaxy container, keep both `galaxy.mmd` and `tutorial.mmd`.
4. From the boot container, unpack `game_resident_param_m.pak` to obtain the
   three DAT tables listed above.
5. Keep the `.typ` files produced by Raging Tools' Packer. They describe
   packing/alignment details needed when rebuilding the containers.

The equivalent optional commands, run from the tutorial package folder, are:

```bat
py tools\afs_research.py extract st_pack_progress_pt_ps3.afs --index 872 --output galaxy.zpak
py tools\zpak_research.py extract galaxy.zpak --output galaxy_files
py tools\afs_research.py extract st_pack_boot_pt_ps3.afs --index 22 --output boot_resident.zpak
py tools\zpak_research.py extract boot_resident.zpak --output boot_files
py tools\zpak_research.py extract boot_files\game_resident_param_m.pak --output parameters
```

Put the two AFS copies in that working folder, or provide their full paths.
Use new output names/directories: these scripts intentionally refuse overwrites.

### HxD basics

- **Ctrl+G → hexadecimal** takes you to a file offset.
- Edit in the left-hand **hexadecimal byte pane**.
- For an ordinary replacement, use **overwrite** / **Paste write**. In HxD,
  Paste write is normally **Ctrl+B**. Inserting bytes in the middle shifts
  every later offset.
- **Ctrl+E** selects a block. Choose hexadecimal and enter its length when
  following examples such as `5C` or `58` bytes.
- When a later section explicitly tells you to **append**, insertion at the
  end of the file is intentional. Also update the relevant counts/sizes.

An offset such as `0x19980` is a position **inside extracted `galaxy.mmd`**.
It is not an offset inside the AFS, the compressed ZPAK, or emulator RAM.

Most configuration integers here use **big endian**:

```text
16-bit stage8:          00 08
16-bit preset 1058:      04 22
32-bit item 153 HEX:     00 00 01 53
32-bit empty slot:      FF FF FF FF
```

The **AFS directory itself** uses little endian. You do not need to edit that
directory by hand when using an archive tool.

## 4. Find the mission you want

Use [GALAXY_MISSION_INDEX_ORIGINAL.csv](GALAXY_MISSION_INDEX_ORIGINAL.csv).
It lists all 498 physical nodes, their owning Galaxy native IDs, stage/music
values, enemy counts, preset IDs and native character IDs.

Filter `galaxy_native_ids` for the Galaxy you want, then compare the opponents
and stage with the battle in the game. A node can belong to more than one
Galaxy. A **physical node number is not the mission's displayed number**.
Some nodes are unlock/reward nodes rather than ordinary fights.

Useful examples from the original supplied files:

| Galaxy / fight | Physical node, decimal | Root file offset |
|---|---:|---|
| Kid Buu: final fight against Goku SSJ3 and Vegeta SSJ2 | **117** | **`19978`** |
| Goku: simple starting fight against Krillin | **238** | **`1C4F4`** |
| Goku: five Saibamen | **246** | **`1C7D4`** |

Kid Buu's native ID is66; Goku base is0. For other characters, use the native
ID of the Galaxy owner, rather than an item/text ID or opponent preset ID.

For offsets calculated from **your currently extracted files**, use:

```bat
py tools\galaxy_address_book.py --galaxy galaxy_files\galaxy.mmd --parameters parameters --node 117
```

It prints the stage/music positions, participant positions, and offsets of
every referenced preset, appearance, strength and first equipment slot.
All command-line node numbers are decimal. Printed offsets are hexadecimal.
For a conditional roster, the older address book's `enemy_count` is the
**candidate count**. Use the advanced inspector to examine the conditions
before deciding how many fighters will actually spawn.

### How the MMD address calculation works

You can follow the same chain manually in HxD:

| Header field | Meaning |
|---|---|
| `+00` | `MAIN` signature |
| `+08` | Descriptor-table size, 32-bit BE |
| `+0C` | Payload size, 32-bit BE |
| `+10` | Descriptor index for the mission-root array |
| `+1C` | Descriptor index for the Galaxy-owner array |

The header is **`0x24` bytes**, not24 decimal bytes.

```text
Descriptor table starts at:       0x24
Descriptor entry N starts at:     0x24 + N × 8
Payload starts at:                0x24 + header's table size
```

A descriptor is8 bytes:

```text
u16 element count | u16 element size | u32 offset RELATIVE TO PAYLOAD
```

For the original European `galaxy.mmd`:

```text
Table size:       0x7298
Payload base:     0x72BC
Root descriptor:  3465 decimal
Root-array base:  0x16F6C
Root stride:      0x5C = 92 bytes
Mission117 root:  0x16F6C + 117 × 0x5C = 0x19978
```

Do not assume these constants apply to every rebuilt MMD. If a descriptor
table grows, recalculate its payload base. The address-book script does this.

## 5. First exercise: change the stage

The stage field is a **16-bit BE value at mission root +`0x08`**.

For original Kid Buu node 117:

1. Open extracted `galaxy.mmd` in HxD.
2. Ctrl+G, hexadecimal, `19980`.
3. Verify that the two bytes are **`00 09`**: Cave.
4. Overwrite them with **`00 08`**: Supreme Kai's World.
5. Save a new MMD, rebuild the Galaxy ZPAK, and replace the Galaxy entry in
   the progress AFS as explained in section14.

This edit does not require a boot AFS change.

### Stage IDs

Names come from the game's original `O_Map_US.pak` / `NAS_NNN_US.txt` texts.
The Kai8 and Cave9 mappings were also confirmed in gameplay.

| Decimal | Two bytes to write | Stage |
|---:|---|---|
| 0 | `00 00` | Wasteland |
| 1 | `00 01` | Rocky Land |
| 2 | `00 02` | Planet Namek |
| 3 | `00 03` | Ruined Planet Namek |
| 4 | `00 04` | Ruined City |
| 5 | `00 05` | Cell Game Arena |
| 6 | `00 06` | Island |
| 7 | `00 07` | World Tournament Stage |
| 8 | `00 08` | Supreme Kai's World |
| 9 | `00 09` | Cave |
| 10 | `00 0A` | Temple |
| 11 | `00 0B` | Glacier |
| 12 | `00 0C` | Underworld |
| 13 | `00 0D` | Planet |

Later localized strings include “Select Randomly”, “???” and button labels;
they are **not additional stages**. In the analyzed Galaxy launch code,
stage value`000F` falls back to stage0. Use an actual stage ID for a fixed battle.

Downloadable reference: [STAGE_IDS_BLES00978_EN.csv](STAGE_IDS_BLES00978_EN.csv).

## 6. Change the music

The music selector is a **16-bit BE value at root +`0x0C`**.
For node 117, the file offset is **`19984`**.

Example: overwrite original `00 09` with **`00 0E`** to select index 14,
whose original English name is **Gallant**.

| Decimal | HEX bytes | Original English title |
|---:|---|---|
| 0 | `00 00` | Selection |
| 1 | `00 01` | Cosmic Battle |
| 2 | `00 02` | Space Museum |
| 3 | `00 03` | Online Fighters |
| 4 | `00 04` | BUDOKAI |
| 5 | `00 05` | Battle of Omega |
| 6 | `00 06` | The Great Expectation |
| 7 | `00 07` | Challenger |
| 8 | `00 08` | Soldiers' Sorrow |
| 9 | `00 09` | Speedster |
| 10 | `00 0A` | The Dawn Of The Extreme Battle |
| 11 | `00 0B` | Get Out |
| 12 | `00 0C` | Force Of Justice |
| 13 | `00 0D` | Pathos |
| 14 | `00 0E` | Gallant |
| 15 | `00 0F` | Ultra Energy |
| 16 | `00 10` | Dangerous Zone |
| 17 | `00 11` | The Hero |
| 18 | `00 12` | Brave |
| 19 | `00 13` | Yin-Yang |
| 20 | `00 14` | Rivals |
| 21 | `00 15` | The Strong Enemy |
| 22 | `00 16` | The Anthem Of Lives |
| 23 | `00 17` | Accelerator |
| 24 | `00 18` | Weird Atmosphere |
| 25 | `00 19` | Nose To Tail |
| 26 | `00 1A` | Katharsis |
| 27 | `00 1B` | Harlequin |
| 28 | `00 1C` | Defiance |
| 29 | `00 1D` | Critical Power |

This is a **static title binding**, not an audio listening test of every song.
Use [MUSIC_IDS_BLES00978_EN.csv](MUSIC_IDS_BLES00978_EN.csv) for the 56-row
US stream table plus sentinel56. **Correction (18 October 2026): selector30 is Battle of Omega (Solo Guitar), and31 is Battle of Omega (Full).** The old Random/??? labels confused audio-stream IDs with native name-text bindings. Selectors32–55 have titles corresponding to6–29.
The launch code treats value56 (`00 38`) as a fallback to index 6.
Do not confuse a BGM text-file number with the table index, especially above29.

The JP and US resident BGM tables differ. These names and bindings use
`game_resident_bgm_table_US.dat` from the supplied European game. Replacing
audio with a custom song is a separate project.

## 7. Change an opponent

### The quickest method: select an existing preset

Find an existing preset for the character/form you want in the mission CSV or
address-book output. Overwrite the participant's first two bytes with that
preset number. This also selects that preset's equipment and form links.

For original node 117:

```text
Root +0x28 → group descriptor 789
Descriptor789 body → tag0, roster descriptor 788
Descriptor788 body starts at 0xAF50, with two8-byte participants

0xAF50: 03 2F 00 00 00 00 00 00   preset 815, Goku SSJ3
0xAF58: 03 30 00 00 00 00 00 00   preset 816, Vegeta SSJ2
```

The next two bytes are still opaque. The final four bytes reference a
condition expression: zero means always include this candidate. A nonzero
condition can filter the candidate out for the selected Galaxy. Preserve the
condition when changing an existing participant unless you intend to change
that filtering. See the advanced guide for the Hatchiyack team example.

If the group tag is `FFFFFFFF`, stop using this ordinary-list recipe: it is
a special group representation, not the tag0 structure described here.

### Change identity while keeping custom equipment

Follow the preset to its **appearance row**. For a new fighter, clone an
appearance belonging to that native character/form, including its move
selectors. Use a dedicated appearance/preset if the original row is shared.
Changing only the native ID can leave incompatible local move selectors.

| Extracted DAT table | Header | Record size | Record N file offset |
|---|---:|---:|---|
| Appearance | `0x10` | `0x20` /32 bytes | `0x10 + N × 0x20` |
| Galaxy preset | `0x10` | `0x2C` /44 bytes | `0x10 + N × 0x2C` |
| Strength | `0x10` | `0x58` /88 bytes | `0x10 + N × 0x58` |

All three tables have their **32-bit BE row count at file offset 0**.
Preserve the remaining 12 bytes of each header.

An appearance row starts with:

```text
+00: u32 native character/form ID
+04: u32 costume index
+08: u32 costume-selection mode;1 uses random-selection logic
+0C: u32 local Super Up selector
+10: u32 local Super Right selector
+14: u32 local Super Down selector
+18: u32 local Super Left selector
+1C: u32 local Ultimate selector
```

Costumes are zero-based in this table: **costume index 1 means costume2**.
Use a costume that exists for that character/form. The five move selectors
are local to that native character. See the advanced guide and its English
move CSV before editing them.

Some useful native IDs:

| Native ID decimal | HEX | Character/form |
|---:|---|---|
| 0 | `00` | Goku base |
| 1 | `01` | Goku Super Saiyan |
| 2 | `02` | Goku Super Saiyan2 |
| 3 | `03` | Goku Super Saiyan3 |
| 11 | `0B` | Piccolo |
| 12 | `0C` | Krillin |
| 13 | `0D` | Yamcha |
| 14 | `0E` | Tien |
| 16 | `10` | Vegeta (Scouter) |
| 17 | `11` | Vegeta base |
| 20 | `14` | Vegeta Super Saiyan2 |
| 62 | `3E` | Majin Buu / Fat Buu |
| 63 | `3F` | Super Buu |
| 66 | `42` | Kid Buu |
| 74 | `4A` | Saibamen |

For a character outside this short list, copy its appearance from an identified
original preset. Do not substitute its CharacterName text ID for its native ID.

## 8. Change equipment and CPU configuration

A preset's **32-bit value at +`0x04`** is its strength index. Follow it to
`preset_strength_table.dat`.

```text
Strength row:
+00  u32 CPU level word
+04  u32 AI-type word
+08  u32 item slot 0
+0C  u32 item slot 1
...
+54  u32 item slot 19
```

Equipment-slot S in strength N is at:

```text
0x10 + N × 0x58 + 0x08 + S × 4
```

Write **item array indices** as32-bit BE values. Empty is **`FFFFFFFF`**.
There are20 slots in this preset format; they do not all need to be occupied.
The ordinary player customization menu's restrictions are a different layer.

Example item bytes:

| Item | Equip HEX | Bytes in a strength slot |
|---|---|---|
| Max Computer / CPU MAX | `AD` | `00 00 00 AD` |
| Defense Up L | `4F` | `00 00 00 4F` |
| Defense Up M | `4E` | `00 00 00 4E` |
| Defense Up S | `4D` | `00 00 00 4D` |
| Health Up L | `51` | `00 00 00 51` |
| Everyone's Spirit | `79` | `00 00 00 79` |
| Raging Soul Start | `13C` | `00 00 01 3C` |

Max Computer produced **runtime level 29** in the controlled custom battles,
including after form changes. The source level words20/10 were retained.
The AI-type word was `FFFFFFFF`, the retained default in these presets.
Do not invent an AI-type number or confuse menu difficulty with this field.

### A small equipment exercise with a known result

Original Goku node 246 uses preset 519, which references strength 330.
Strength 330 starts at **`7180`** in the extracted strength DAT. Its slot 2 is
at **`7190`**. Replace **`00 00 00 E3`** (Health Down S) with
**`00 00 00 51`** (Health Up L).

This is the edit for which the user's gameplay test confirmed that the
Saibamen had substantially more health. Preset 519 is also used in node 315,
so this quick edit affects that mission as well. Section9 explains isolation.

### Use the reconstructed item catalog

[ITEM_LIST_EN.md](ITEM_LIST_EN.md) and
[item-catalog-BLES00978-EN.csv](item-catalog-BLES00978-EN.csv) contain 381 entries
bound to the original game names/descriptions.

There are three separate values:

```text
equip index → item_parameter.dat row → name/description text IDs and property bits
```

`item_parameter.dat` has **no header**: each definition is`0x54` /84 bytes.
Its first32-bit word is the **name text ID**, not a second equip index.
For special items the name text ID often differs from the equip index.
Neither that text ID nor an internal property-bit number belongs in an
equipment slot.

The old Italian community list mislabels several flow items. For example,
`157` is the **third transformation entry at one bar**, not the first entry at three bars;
`15E`/`15F` are **switch items**, not cancellation items.

## 9. Create isolated presets

For each form you want to configure independently, create:

1. an appearance row identifying the character and costume;
2. a strength row with the desired equipment;
3. a Galaxy preset row linking those two rows.

In HxD, select and copy a complete suitable row, go to EOF, and **append**
the copy. Edit it there. Increment the row count at offset 0 by one.
Appending a row without updating the count leaves it outside the declared
table. Increasing the count without adding a complete row is also invalid.

The original supplied tables have:

| Table | Original count | First appended index | First appended file offset |
|---|---:|---:|---|
| Appearance | 367 | 367 | `2DF0` |
| Strength | 777 | 777 | `10B28` |
| Galaxy preset | 1058 | 1058 | `B5E8` |

These are **original-file values**. KB14A/KB15B already have six extra rows in each
table. Its next free indices are373,783,1064 respectively. Read the current
count instead of reusing an occupied row.

A Galaxy preset is44 bytes:

| Relative offset | Size | Meaning |
|---|---:|---|
| `00` | 4 | Appearance index |
| `04` | 4 | Strength index |
| `08` | 4 | Additional parameter selector; preserve a suitable known baseline |
| `0C` | 4 | Form-link slot 0 |
| `10` | 4 | Form-link slot 1 |
| `14` | 4 | Form-link slot 2 |
| `18` | 4 | Form-link slot 3 |
| `1C,20,24,28` | 4 each | Fusion-link slots; preserve/disable as appropriate, not decoded fully here |

The custom presets in the supplied setup retain value99 at`+08` and use
`FFFFFFFF` for unused form/fusion links. Clone the documented custom baseline
for the same kind of NPC configuration; do not erase unknown fields blindly.

Finally, write the new **preset index** into the MMD participant list.
Changing the preset's appearance alone does not redirect all its form links.

## 10. Form-specific equipment and transformations

Each form can have its own preset and strength. The controlled NPC preset
route loads the destination preset's equipment when the form changes.
It does not simply merge every form's item list.

Our linked example uses:

| Form | Preset | Strength | Form links, slot 0 through3 |
|---|---:|---:|---|
| Goku SSJ2 | 1058 | 777 | 1059,1059,F,F |
| Goku SSJ3 | 1059 | 778 | 1060,F,F,F |
| Goku base | 1060 | 779 | F,F,F,F |
| Vegeta SSJ2 | 1061 | 780 | 1062,F,F,F |
| Vegeta base | 1062 | 781 | F,F,F,F |
| Fat Buu | 1063 | 782 | F,F,F,F |

Here **F means `FFFFFFFF`**, an absent link. Do not assume every character's
slot order is universally “base→SSJ→SSJ2→SSJ3”. There are two layers to match:
the preset's destination links and the character's **native transformation
slots**, stored in `game_resident_transformer_info.d` (truncated filename).

For **Goku SSJ2**, native slot 0 is the return to base and native slot 1 is SSJ3.
The engine reads the native slot's transformation/cancellation flag when
choosing the action/animation. Changing a preset link does not change that
native flag. An earlier KB14 configuration linked slot 0 to SSJ3: the user
observed cancellation animation followed by the actual SSJ3 identity. The
executable's separate slot-flag and preset-target paths explain that mismatch.

The corrected setup therefore selects **slot 1 to1059** and uses
**item 156: the second transformation entry at three health bars**. This selects
the second available menu position; it does **not** mean “perform two power-ups”.
From SSJ2, that second entry is the single power-up to SSJ3. Goku SSJ3's native
slot 0 is the return to base, so its link to1060 is appropriate.

The example retains the original developers' duplicated first/second preset
link pattern, also present on the original Teen Gohan SSJ→SSJ2 presets.
The automatic item request must use **slot 1**; deliberately invoking slot 0
with this duplicated mapping would still be a mismatched cancellation route.
A prototype with the first link empty was not established as a reliable
configuration; do not treat empty earlier slots as universally interchangeable
with the original pattern. No global native-table edit is included.

In the corrected controlled request, the debugger observed slot 1 and preset 1059;
the resulting actor was native 3 with the SSJ3 equipment. Aura 50 became 20,
consistent with native slot 1's 30-point cost. The earlier cancellation-slot
request instead used the 10-point slot. Visual identity and native action data
therefore need to be checked separately.

Use the same rule for other characters: identify the native entry you want,
put the destination preset in that slot, and equip the matching first/second/
third-entry item. Editing the native transformer table itself would affect
the character globally and is not needed for this example.

### Find a native slot yourself in HxD

The exported `game_resident_transformer_info.d` has **no header** and contains
100 records of **33 bytes /`0x21`**. Native character N's record starts at
`N × 0x21`. At relative`+03..+06` are four one-byte native destinations;
**100 decimal /`64` HEX means no destination**, not character100.
Relative`+0B..+0E` contain the four slot flags. The low bit selects the
cancellation route in the examined action-selection code.

For Goku SSJ2, native 2's record begins at **`42`**. At file offsets`45`/`46`
you read `00`/`03`: base and SSJ3. At`4D`/`4E` the corresponding flags are
`01`/`00`: cancellation versus normal transformation. Match the second slot
with the second link in the Galaxy preset, not the first link.

[NATIVE_FORM_SLOTS_BLES00978.csv](NATIVE_FORM_SLOTS_BLES00978.csv) exports all
100 records' slot targets and cancellation bits. Use it as a lookup; it does
not imply that every listed fusion/absorption transition has been tested.

In the tested CPU item route, “Cancel Transformation” also selected a linked
destination preset. Therefore the transformed preset needs a valid link to
the desired base preset. That base preset supplies the base equipment.
**Do not generalize this to manual cancellation or the player's normal VS
customization route:** the executable has separate paths.

### Correct flow-item indices

| Intended effect | One bar | Two bars | Three bars |
|---|---|---|---|
| 1st transformation entry | `151` | `152` | **`153`** |
| 2nd transformation entry | `154` | `155` | `156` |
| 3rd transformation entry | `157` | `158` | `159` |
| Cancel Transformation | `15A` | **`15B`** | `15C` |
| Switch teammate | **`15D`** | `15E` | `15F` |

The original game's descriptions use health-bar counts. In our controlled
battles one bar was10,000 HP; probes used29,000 /19,000 /9,000 HP to get clearly
below the three/two/one-bar thresholds. These HP writes were debugger probes,
not edits included in the released archives.

| Additional item | Equip index |
|---|---|
| Raging Soul Start | `13C` |
| Raging Soul on KO Switch entry | `160` |
| High-Tension on KO Switch entry | `161` |
| No Transformations | `169` |
| No Switch-Outs | `16A` |

The original descriptions of 169/16A explicitly allow effects through items;
they are not a proven universal way to block every scripted transition.
A KO-entry buff requires entry after a teammate's KO, not an ordinary HP-based
switch. Its presence in an equipment list alone does not prove activation.

Already-active timers/states can be separate from the new equipment bitmap.
Removing a Raging Soul item from the destination strength does not, by itself,
prove that an already-active Raging Soul state is immediately cleared.

### The corrected KB15B configuration

All indices below are equipment indices in HEX. Unused slots are FFFFFFFF.

| Form | Equipment |
|---|---|
| Goku SSJ2 | AD,4F,4E,156 |
| Goku SSJ3 | AD,4F,4E,4D,15B |
| Goku base | AD,4F,15D,161,71,79,F0,3E,B4 |
| Vegeta SSJ2 | AD,4F,4E,4D,13C,15B |
| Vegeta base | AD,4F,15D |
| Fat Buu | AD,4F,4E |

This version separates Goku's cancellation at two bars from the base-form
switch at one bar and adds the requested one-bar switch to Vegeta base.
KB14A was initially delivered without additional gameplay tests as requested;
the user's feedback then led to the native-slot correction. Archive validation
and controlled runtime observations are recorded in [KB15_NATIVE_SLOTS_AND_TAG_ORDER.md](KB15_NATIVE_SLOTS_AND_TAG_ORDER.md).
Goku's two form transitions were observed with this equipment. Vegeta base's newly added switch item is verified in the archive; that addition did not
receive a further gameplay test before delivery.

### Switching does not specify the next teammate

A health-based switch item chooses **when to request a switch**. It does not
encode a destination preset or promise the next roster entry. In a controlled
three-opponent test, Goku base switched directly to Fat Buu while Vegeta was
still alive at full health. Do not design a mandatory story sequence by
assuming that roster order alone enforces tag order.

The native request resolves a separate CPU-selected teammate index. This is
independent of the form-link slots described above. We have not identified a
verified MMD-only field that forces an arbitrary tag sequence.

The delivered KB15B archives therefore keep the game's teammate selection.
They correct the form slots and equipment without enforcing a tag destination.
This is a known limitation of the documented archive-only workflow.

## 11. Make a basic battle without extra effects

Battle behavior can come from **both** the mission record and the preset
equipment. Removing a mission's description text does not necessarily remove
its mechanics. Clearing equipment does not necessarily clear a mission rule.

For a plain fight, use a known simple mission as a template. In the supplied
original MMD, **Goku node 238, root`1C4F4`**, is the practical example:
“Defeat your opponent,” no extra rule text, one ordinary opponent.

To apply its combat setup to another mission:

1. Save the target's complete92-byte root, especially its position and
   references listed below.
2. Copy **`5C` bytes** from the simple donor root into the target root using
   overwrite, not insert.
3. Restore these fields from the target backup:

| Target-relative bytes to restore | Purpose |
|---|---|
| `00..07` | Two map coordinates |
| `20..23` | Incident-edge list reference: graph connections, not prerequisite node IDs |
| `28..2B` | Target's own enemy-group reference |
| `2C..2F` | Target's progress/reward reference |

4. Set stage`+08`, music`+0C`, category`+0A`, and displayed difficulty`+0E`.
   Keep objective type`+10` at0 for the donor's ordinary defeat-enemy objective.
5. Configure the target's enemy roster and dedicated equipment separately.
   To remove all item effects, make all 20 equipment slots FFFFFFFF.
6. Rebuild and replace the relevant archives.

This is the recipe used to reconstruct the simple Kid Buu battle. It retains
the node's map identity, graph connections and reward references while taking the
donor's other combat fields. More complex ally, unlock or special-node layouts
need their own investigation; this is a recipe for ordinary enemy-group fights.

### Battle category versus battle conditions

`+0A` is a16-bit **mission category**, separate from displayed difficulty.
Code4 selects the Boss category and its large node. Category2 is used by
Perfect Action missions. Do not use this field as a CPU-difficulty slider.

**`+0E` is displayed difficulty**: 0 Tutorial, 1 Very Easy, 2 Easy, 3 Normal,
4 Hard, 5 Very Hard, 6 Ultimate. The original Kid Buu Boss happens to have4
in both fields; that coincidence hid this distinction in the first guide.
A custom Boss retaining category4 was displayed as Easy with difficulty2.

**`+10` selects the gameplay objective as well as its description.** For
example0 means defeat the appearing enemy;29 means complete all Perfect
Actions. A task list alone does not change a defeat-enemy objective into a
complete-actions objective. The rule-description selectors at`+12/+14` are
separate: their wording is not sufficient evidence of an active item effect.

Root references`+3C`, `+4C`, `+50`, `+54` participate in additional rules and
modifier lists. Other fields also feed mission setup or descriptions.
We do **not** yet have a complete safe enum for every special battle type,
condition expression or field. The simple-template method avoids guessing
those values. Zeroing the whole root would also destroy map/progress references.

Hidden items such as starting Raging Soul, HP-based transformations and
switches are still effects if you intentionally equip them. A “plain mission”
can therefore have complex opponents through their dedicated presets.

## 12. Change the number of opponents

An ordinary roster contains **8 bytes per participant**. The runtime uses this
stride directly. Keep the descriptor's element size at **`0008`**.
The battle context has five opponent slots: keep **active opponents within
one to five**. Original conditional lists can contain six candidates, but
conditions filter them before spawning. An unconditional six-opponent roster
is outside the observed capacity. Allies occupy the player side: one player
plus at most four active companions. See the advanced guide for conditions.

**Changing the count alone does not allocate additional participants.** It
would make the game read the next structure as if it were another opponent.

For a larger roster, append a new list to the **MMD payload**, then redirect
the existing roster descriptor to that list. This avoids moving all existing
structures and does not require adding a new descriptor.

### Worked example: original Kid Buu two opponents → three custom opponents

The original MMD is`0x26C5C` bytes long. Its payload base is`0x72BC`.
The new list begins at EOF, so its payload-relative offset is:

```text
0x26C5C − 0x72BC = 0x1F9A0
```

Append these **24 bytes**:

```text
04 22 00 00 00 00 00 00   preset 1058: Goku SSJ2
04 25 00 00 00 00 00 00   preset 1061: Vegeta SSJ2
04 27 00 00 00 00 00 00   preset 1063: Fat Buu
```

These presets must exist in your modified boot table before you use them.
Appending this list does not create the preset rows automatically.

Update roster descriptor 788 at file offset **`18C4`**:

```text
Before: 00 02 00 08 00 00 3C 94
After:  00 03 00 08 00 01 F9 A0
        count stride relative-offset
```

Update the MMD **payload size at header offset`0C`**:

```text
Before: 00 01 F9 A0
After:  00 01 F9 B8   (old payload size +24 decimal /0x18)
```

The descriptor-table size is unchanged because no descriptor was added.
The new total MMD length is **`0x26C74`**. Rebuild the containing PAK and ZPAK
to update their member sizes and compression headers too.

For a second edit to an already-modified MMD, calculate using its **current**
EOF and payload base. Do not paste the original offsets blindly.

If reducing a roster, its count can be lowered to the desired number of
existing entries without deleting bytes from the middle of the file. Check
whether the roster descriptor is shared by another mission before changing it.

## 13. A complete custom-row address example

The six dedicated rows used by KB14A/KB15B have these offsets **inside their
respective extracted DAT files**:

| Form | Appearance index / offset | Preset index / offset | Strength index / offset |
|---|---|---|---|
| Goku SSJ2 | 367 /`2DF0` | 1058 /`B5E8` | 777 /`10B28` |
| Goku SSJ3 | 368 /`2E10` | 1059 /`B614` | 778 /`10B80` |
| Goku base | 369 /`2E30` | 1060 /`B640` | 779 /`10BD8` |
| Vegeta SSJ2 | 370 /`2E50` | 1061 /`B66C` | 780 /`10C30` |
| Vegeta base | 371 /`2E70` | 1062 /`B698` | 781 /`10C88` |
| Fat Buu | 372 /`2E90` | 1063 /`B6C4` | 782 /`10CE0` |

In the corrected Goku SSJ2 preset 1058, the first link at **`B5F4`** and the
second link at **`B5F8`** are both `00 00 04 23` (preset 1059).
Its strength 777 slot 3 at **`10B3C`** is `00 00 01 56`.

For example, Goku SSJ3's first item slot is strength 778 offset`10B80 +08`,
or **`10B88`**. Its fifth item slot, zero-based slot 4, is **`10B98`**:
`00 00 01 5B`, Cancel Transformation at two bars.

Vegeta SSJ2's strength 780 slot 4, **`10C48`**, is
`00 00 01 3C`, Raging Soul Start. Its slot 5 at **`10C4C`** is
`00 00 01 5B`, Cancel Transformation at two bars.

The new table counts are373 appearances,783 strengths,1064 Galaxy presets.
Their first four header bytes are therefore:

```text
appearance: 00 00 01 75
strength:   00 00 03 0F
preset:     00 00 04 28
```

## 14. Repack from the inside outward

For Galaxy edits:

```text
edited galaxy.mmd + unchanged tutorial.mmd
  → rebuild Galaxy PAK
  → compress to Galaxy ZPAK
  → replace progress AFS entry 872
```

For preset/equipment edits:

```text
edited appearance / preset / strength DATs + other unchanged parameter files
  → rebuild game_resident_param_m.pak
  → replace it inside the outer boot PAK
  → compress outer boot ZPAK
  → replace boot AFS entry 22
```

Raging Tools' Packer handles the folders and `.typ` metadata; its Compressor
handles STPK/STPZ compression. Keep all unchanged members and original names.
If an entry grows, use rebuilding/reallocation support. Do not paste a longer
file over an AFS slot and overwrite the next entry.

### Optional Python repacking commands

The supplied `repack_research_copy.py` handles member growth in the supported
containers, checks other member bodies, and writes a **new archive copy**.

Stage/music/MMD replacement:

```bat
py tools\repack_research_copy.py pak galaxy.zpak --member galaxy.mmd --replacement galaxy_modified.mmd --output galaxy_modified.zpak
py tools\repack_research_copy.py afs st_pack_progress_pt_ps3.afs --index 872 --replacement galaxy_modified.zpak --output st_pack_progress_modified.afs
```

For all three edited parameter tables:

```bat
py tools\repack_research_copy.py pak boot_files\game_resident_param_m.pak --member preset_appearance_table.dat --replacement appearance_modified.dat --output params_step1.pak
py tools\repack_research_copy.py pak params_step1.pak --member preset_strength_table.dat --replacement strength_modified.dat --output params_step2.pak
py tools\repack_research_copy.py pak params_step2.pak --member preset_character_galaxy.dat --replacement preset_modified.dat --output params_modified.pak
py tools\repack_research_copy.py pak boot_resident.zpak --member game_resident_param_m.pak --replacement params_modified.pak --output boot_resident_modified.zpak
py tools\repack_research_copy.py afs st_pack_boot_pt_ps3.afs --index 22 --replacement boot_resident_modified.zpak --output st_pack_boot_modified.afs
```

In your game copy, install the rebuilt AFS using the **original expected
filename**, e.g. rename `st_pack_boot_modified.afs` to
`st_pack_boot_pt_ps3.afs`. Keep the original backed up. Similarly install the
progress copy as `st_pack_progress_pt_ps3.afs`.

The simpler `zpak_research.py replace` only accepts an unchanged member size;
use the resizing repacker above for appended rows or larger rosters.

## 15. Reload and troubleshoot

**Fully stop and restart the game after archive changes.** Do not load an old
savestate. In our runtime controls, Retry reused cached configuration, and
returning to the Galaxy menu did not reliably reload a modified MMD from disk.
Re-entering a mission could refresh some parameter expansions while leaving
other resource caches intact. A clean restart removes that ambiguity.

| Symptom | Check first |
|---|---|
| Wrong character | MMD contains a preset index; inspect its appearance's native ID |
| Super Buu instead of Fat Buu | Native 63 versus native 62 |
| Costume wrong after changing form | Destination preset's appearance/costume |
| Equipment changes other missions | Shared strength/preset/appearance references |
| Old behavior after installing files | Correct AFS copy, correct entry, full restart, no savestate |
| New participant behaves nonsensically | Count, eight-byte roster allocation, relative payload offset |
| Crash after file growth | MMD payload size, table counts, enclosing PAK sizes/alignment, AFS reallocation |
| Transformation missing | Correct equip index, valid destination preset link, supported source/destination forms |
| Right form but cancellation animation on a power-up | Preset link placed in a native cancellation slot; align native slot and flow item |
| “Cancel” switches a teammate | `15E`/`15F` are switches; cancel indices are`15A`/`15B`/`15C` |
| Switch skips the next roster entry | A switch item supplies the trigger; the teammate target is selected separately |
| KO-entry buff does nothing on a normal switch | The intended trigger is entry after KO |
| Menu condition text changes but behavior does not | Description fields are not a complete map of runtime mechanics |

Do not conclude that CPU MAX breaks flow items merely from a failed attempt.
The controlled full-equipment probes verified transformation/cancellation
requests with CPU MAX present. The examined property-exclusion masks did not
disable these effects, and their working property bits remained present.

Some probes succeeded after HP was raised and lowered again, but time and
animation/entry phase changed too. That does **not** prove that re-crossing a
threshold is always required, or that the CPU chooses to delay the effect.
Treat such behavior as an open timing/state question until isolated.

## 16. Sources and the boundary of this guide

The files and offsets were derived from the supplied BLES00978 originals.
Original `galaxy.mmd` SHA256:

```text
c0a12c58b22cb4b2884bcfe8c550a1f5a25f60c192986c6f1fd9bd3eccb155a7
```

Original boot AFS SHA256:

```text
744abd145c0690d7f4c5d33fb5e175dcdb009c45a6006577797516d9ea655af7
```

Item names come from original `F_Item_US.pak`, bound to the item-definition
array. Stage/music names come from original `O_Map_US.pak`/`O_BGM_US.pak`,
with music indices resolved through the US resident BGM table. See
[STAGE_MUSIC_PROVENANCE.json](STAGE_MUSIC_PROVENANCE.json).

Container handling was cross-checked against Raging Tools commit
`7727960be491aa76ccf125d00d53773d8ff37743`. Its documentation explains the
Packer's `.typ` metadata and Compressor workflow.

The shared research records document actual preset expansion and linked form
changes. Fully enumerating every condition expression, fusion constraint,
runtime timer and manual VS equipment path remains unfinished research.
This guide gives reproducible ordinary-battle editing steps without treating
those unknowns as decoded settings.


## Revision 2 additions

The [advanced research guide](advanced/GALAXY_ADVANCED_RESEARCH_EN.md) explains
custom Super/Ultimate move selectors, player-side allies, the postfix
condition language, tutorial/Perfect Action tasks, Battle Zone, map positions,
node categories, and adding a499th mission. It includes English CSV references
and explicitly distinguishes runtime observations from static decoding.

The previously shared first-edition ZIP is unchanged. This revision corrects
category versus difficulty, incident edges versus prerequisite IDs, and
conditional candidates versus active battle slots.
