# Galaxy and Battle Zone: advanced modding research

**BLES00978, European PS3 release. Research update: 15 October 2026.**

Read this alongside [the corrected beginner guide](../GALAXY_MODDING_BEGINNER_GUIDE_EN_V2.md).
The beginner guide covers extracting archives, HxD, equipment, CPU settings,
native transformation slots, and repacking. This supplement covers moves,
allies, action objectives, Battle Zone and adding missions.

A preset's move set really is in `preset_appearance_table.dat`. Allies use a
second roster on the player's side. Tutorial tasks are data-driven lists of
existing native action detectors. Battle Zone uses its own preset tables and
`ZONE` mission files. Galaxy's menu is a graph, with editable coordinates and
categories; adding a new root record alone is insufficient.

## What counts as evidence

- **Runtime:** observed in RPCS3 with the original executable, separately
  identified archive revisions, and screenshots or read-only RAM captures.
- **Static:** original file structures agree with the instructions that load
  and use them. This establishes fields and reference chains; it does not
  mean every possible value was played through.
- **Unresolved:** a plausible interpretation without a sufficiently complete
  consumer trace or gameplay control. Preserve these fields.

All file offsets below are hexadecimal unless explicitly marked decimal.
IDs and CSV row numbers are decimal unless the column says HEX. Numbers in
MMD/DAT structures are **big endian**; AFS directory offsets are little endian.
All AFS entry numbers are **zero-based**. Container filenames from a community
AFL can be wrong; identify entries by their extracted contents.

No executable patch is needed for the documented archive edits. Executable
addresses in the evidence section are read-only analysis references.

## 1. Files to extract

All AFS files are under `PS3_GAME/USRDIR/data/PS3/`.

| AFS / entry | Extracted content | Use |
|---|---|---|
| `st_pack_boot_pt_ps3.afs`, 22 | virtual `boot/resident/boot_resident_ALL_m.pak` → `game_resident_param_m.pak` | Appearance, strength, items, all preset namespaces |
| `st_pack_progress_pt_ps3.afs`, 872 | `galaxy.zpak` → `galaxy.mmd`, `tutorial.mmd` | Galaxy graph, teams, mission objectives, tutorial tasks |
| `st_pack_progress_pt_ps3.afs`, `8 + 14*k`, k=0..15; also232,234 | outer container → `battle_zone_param_m.pak` | Sixteen Battle Zone MMDs and `zone_item_open.dat` |
| `st_pack_battle_others_pt_ps3.afs`, 53 | resident container → `pause_menu_ALL_m.pak` → `pause_menu_param.pak` → `move_list_blast_exp_table.dat` | Pause-menu move-name and description bindings |
| same outer53 | `battle_screen_main_ALL_m.pak` → `font_convert.kth` | HUD move-name bindings |
| same outer53 | `battle_resident_param_m.pak` → `tutorial_message_table_01.dat` through09 | Tutorial help-message ordering |
| same outer53 | `com_param_m.pak` → `tut_type_1.cmr` through20, `tut_logic_list.dat` | Tutorial CPU behavior; not fully decoded |
| `st_pack_progress_pt_ps3.afs`,1903; or battle-others106 | localized text containers | English move names, mission/rule/action labels |

Boot entry22 is called **`db_font_pad_PS3_s.zpak`** in the supplied community
AFL. Its internal resource path and its community label identify the same
entry in this game build.

The **inner** `battle_zone_param_m.pak` was byte-identical in all18 locations
listed above. Their **outer** archives contain other resources and differ.
Which outer copy is loaded depends on the current menu/resource context.
For a general Battle Zone release, replace the inner PAK in every applicable
copy, preserving its siblings. Editing one arbitrary copy can appear to do
nothing. The CSV/JSON validation records the checked inner hashes.

In boot parameters, some filenames are truncated to32 characters:

```text
preset_character_galaxy.dat
preset_character_tutorial.dat
preset_character_battle_zone_nor
preset_character_battle_zone_spe
preset_appearance_table.dat
preset_strength_table.dat
```

`nor` is normal Battle Zone; `spe` is Ultimate Zone. Keep the stored filenames
when repacking.

## 2. Change Super and Ultimate moves

### The five selectors

Appearance DAT header:16 bytes. Each appearance row:32 bytes (`0x20`).
For appearance index **A**, its file offset is:

```text
row = 0x10 + A * 0x20
```

| Row-relative offset | Type | Meaning |
|---|---|---|
| `+00` | u32 | Native character/form ID |
| `+04` | u32 | Costume index |
| `+08` | u32 | Costume-selection mode;1 enters random-selection logic |
| **`+0C`** | **u32** | **Super: right stick Up** |
| **`+10`** | **u32** | **Super: right stick Right** |
| **`+14`** | **u32** | **Super: right stick Down** |
| **`+18`** | **u32** | **Super: right stick Left** |
| **`+1C`** | **u32** | **Ultimate: right stick Push** |

These are **local move indices belonging to that native character/form**.
They are not text IDs, item IDs, appearance indices or preset indices.

For example, original Goku base appearance0 has:

```text
native=0, costume=0, costume_mode=0
moves=0,2,5,7,10
Kamehameha / Kaioken Finish / Kaioken / Solar Flare / Spirit Bomb
```

Our research ally instead uses:

```text
moves=3,4,6,8,11
x20 Kaioken Kamehameha / Meteor Combination / Instant Transmission /
Give Me Energy! / Large Spirit Bomb
```

All five changed values reached the ally's live actor in a running Galaxy
battle. This is runtime evidence of the complete appearance→preset→actor
chain. It is not a casting test of every move listed in the reference CSV.

### HxD example

To change appearance0's Up move from Kamehameha to x20 Kaioken Kamehameha:

1. Extract `preset_appearance_table.dat` from boot entry22's parameter PAK.
2. Ctrl+G → hexadecimal **`1C`** (`10 + 0*20 + 0C`).
3. Check the four existing bytes are `00 00 00 00`.
4. Overwrite with **`00 00 00 03`**.
5. Repack parameters → resident container → boot AFS.

Appearance0 can be shared. For an isolated mission, duplicate the appearance
row, increment the DAT count, point a dedicated preset at the copy, and edit
that copy. The beginner guide explains appending DAT rows. For appearance373,
the row is`2EB0`, and its Up selector is`2EBC`.

Use **[LOCAL_MOVE_IDS_EN.csv](LOCAL_MOVE_IDS_EN.csv)** and filter by native ID
before choosing a move. For Goku SSJ2/native2, Ultimate7 is Super Kamehameha;
for Vegeta SSJ2/native20, Ultimate6 is Final Flash. A native2 selector cannot
be interpreted with native0's list.

The export contains690 native/local bindings. **666 resolve consistently in
both HUD and pause-menu text tables.** The remaining24 are unassigned or
inconsistent and are flagged. Do not treat those rows as validated moves.
Even a consistent name binding is not proof that every slot/category
combination can execute. Start with moves normally belonging to that form
and keep an Ultimate in the Ultimate slot.

Changing these numbers does not import another fighter's animation, projectile
or voice assets. Cross-character move transplantation requires separate
character-resource research.

### How the names were rebuilt

- `font_convert.kth`:12-byte rows `(u32 native, u32 localMove, u32 nameTextID)`.
- `move_list_blast_exp_table.dat`:16-byte header, then100 characters ×14
  entries ×4 bytes. Each entry is `(u16 nameTextID, u16 descriptionTextID)`.
- Entry offset:`10 + (native*14 + localMove)*4`.
- Name text comes from the original English `L_Skill_US.pak`.

Native/form names in **[NATIVE_CHARACTER_IDS_EN.csv](NATIVE_CHARACTER_IDS_EN.csv)**
come from `cs_main.dat` and the game's `K_CharacterName_US` text bindings,
rather than guessing the roster order.

### Transformations and moves

A transformation destination is another preset in the **current mode's
preset namespace**. That preset selects another appearance row, including
its five move selectors, and another strength row. Therefore a form change
can change equipment **and** moves. Configure each destination explicitly.
Native transformation slots still control the action/animation; pointing a
cancellation slot at an advanced form does not make it a normal transformation.
The previous Goku SSJ2→SSJ3 animation problem remains explained by that slot
mismatch, not by these move selectors.

## 3. Put companions on the player's team

The mission root is92 bytes. Two fields use the same ordinary group format:

```text
root +24 : ally group descriptor
root +28 : enemy group descriptor
```

A normal group body is8 bytes:

```text
u32 tag=0 | u32 rosterDescriptorIndex
```

Each roster candidate is8 bytes:

```text
u16 presetIndex | u16 opaque | u32 conditionExpressionDescriptor
```

The last word is a **condition**, not padding. Zero means unconditional.
The loader evaluates each candidate's condition before appending it to the
active team. Allies are added to player-side slots1 onward; the player's
selected character occupies slot0.

**Capacity:** one player plus up to4 active allies; up to5 active enemies.
A conditional candidate list can be longer than the active roster. Do not
copy an original six-candidate list and remove all its conditions: that can
exceed the five-slot context.

A straightforward new ally is:

```text
roster body:  PP PP 00 00 00 00 00 00
              preset    always included

group body:  00 00 00 00 RR RR RR RR
              tag=0     roster descriptor index
```

Append both payload bodies/descriptors, then write the new group descriptor
index at root+24. Descriptor references are32-bit indices; the preset is16-bit.
Use a Galaxy preset for `galaxy.mmd`, and a Tutorial preset for `tutorial.mmd`.
The same numeric index can name different fighters in the two files.

### The original Goku versus Hatchiyack mission

It is **node491**, original root offset`21FE0`. The node is shared by several
Galaxies. Ally group3381 points to roster3380, containing five candidates:

| Candidate | Galaxy preset | Fighter |
|---:|---:|---|
| 0 |18| Vegeta Super Saiyan |
| 1 |11| Piccolo |
| 2 |6| Teen Gohan Super Saiyan |
| 3 |25| Trunks (Fighting Teen) Super Saiyan |
| 4 |1| Goku Super Saiyan |

For the **Goku/native0 Galaxy**, the first four conditions are true and the
last is false: player Goku plus four companions. For **Hatchiyack/native99**,
none of these ally conditions is true; enemy candidate conditions select the
opposing Z-Fighters instead. The enemy candidate list has six records, but
not six simultaneous opponents.

The original node is owned by natives0,5,11,17,24,99. The full candidate
conditions are in **[GALAXY_ALLY_CANDIDATES_EN.csv](GALAXY_ALLY_CANDIDATES_EN.csv)**.
Twenty-six original Galaxy nodes contain ally lists. All original ordinary
rosters were evaluated for their owning Galaxies and fit the active capacities.

Tutorial node4 has Piccolo/preset6. Tutorial node5 has Vegeta/preset7,
Kid Trunks/preset8, Goten/preset9 and Piccolo/preset24. These use the Tutorial
preset table, with unconditional roster records. See
[TUTORIAL_ALLY_CANDIDATES_EN.csv](TUTORIAL_ALLY_CANDIDATES_EN.csv).

## 4. Conditions are tiny postfix programs

An expression descriptor points to8-byte tokens:

```text
u32 tokenKind | s32 operand
```

| Kind | Meaning |
|---:|---|
|0| End |
|2| Push literal integer |
|1| Execute operator whose ID is the operand |

For example, this checks whether the selected Galaxy native is Goku0:

```text
00 00 00 02 00 00 00 00    push argument0
00 00 00 02 00 00 00 05    push queryType5
00 00 00 01 00 00 00 10    operator16: QUERY(type5, argument0)
00 00 00 00 00 00 00 00    end
```

A numeric parameter of5 is simply:

```text
00 00 00 02 00 00 00 05
00 00 00 00 00 00 00 00
```

| Operator, decimal | Meaning |
|---|---|
|16| Query; pops query type first, then argument |
|33,34,35,36| Add, subtract, multiply, signed integer divide |
|37,38| Boolean OR, AND |
|39,40| NOT, numeric negation |
|41,42| Equal, not equal |
|43,44,45,46| Less, greater, less-or-equal, greater-or-equal |

Query5 compares the selected Galaxy native ID with the argument. Query4
returns0; query6 returns its argument. Query1 reads runtime statistics through
a sub-dispatcher. In the installed MAIN progression context, query2 reads
`nodeFlags[argument] & 0x08`, and query3 reads
`nodeFlags[argument] & 0x02`. These use a mission node index, not a native
character ID. Node498 had both bits set after its successful completion.
The consumers install callbacks, so preserve the context distinction; the
static helper still requires supplied state for these queries. Do not
evaluate a query2 unlock program as if it were a Galaxy-native check.

The native VM has room for32 stack values. Unknown/reserved operators, missing
terminators, bad indices and empty-stack operations are unsafe inputs for the
game. The supplied decoder rejects unsupported expressions rather than
inventing a result. Query0 is not a safe generic query.

`tools/mmd_condition_research.py` provides a parser, formatter and limited
static evaluator. It deliberately requires context for unknown runtime queries.

## 5. Tutorial and Perfect Action objectives

### A task sequence

Root **+3C** references a list of **12-byte records**:

```text
u32 nativeActionID | s32 directParameter | u32 parameterExpressionDescriptor
```

The list's descriptor count is the number of steps. Original tutorial0 has15
steps, IDs0 through14. This is why increasing a nearby character count in an
unexpanded binary can accidentally consume the task list as roster data.

These IDs select existing native detectors: movement, Ascend, attacks,
transformations, switches, combo requirements and so on. The game monitors
combat events, then advances the sequence and displays the next request.
They are not raw PlayStation button codes. A transformation task can require
a native transformation action, rather than merely a particular final model.

Examples with matching original action labels:

| Native action ID | Action |
|---:|---|
|0| Normal movement |
|1| Ascend |
|2| Land using Descend |
|53..56| Super Up / Right / Down / Left |
|57| Ultimate |
|60| Transformation |
|61| Quick transformation |
|62| Switch |
|63| Switch to a different character |
|64| Quick switch |
|65| Fusion |
|79| Reduce enemy health to0 |
|80| Use a Super |
|81| Use a specific Super |
|82| Hit with a Super |
|83| Use an Ultimate |
|84| Hit with an Ultimate |
|94| Attack damage requirement |
|95| Combo hit-count requirement |
|96| Combo damage requirement |
|97| KO damage requirement |

**Parameters are action-specific.** The loader copies directParameter for
IDs81,82,88,100,102,108,109,110. For94..97 and106, it evaluates the expression
as a numeric parameter. For many other IDs, the direct word is ignored and0
is passed onward. Copy an original record of the same action type before
changing its parameter.

To request a5-hit combo, use native action95 and an expression that evaluates
to5. Put the expression's descriptor index in the record's final word.
Writing5 directly into that final word means “resolve descriptor5.”

The configuration array has **20 task slots**, not an unlimited list. Keep
new sequences within that capacity. Longer task campaigns need additional
mission nodes or further native capacity research.

### The objective type matters too

Root **+10** is a16-bit **objective type**, which also selects the mission
wording. It is not merely cosmetic text. Important values:

```text
0  (00 00): defeat the appearing enemy
1  (00 01): defeat all enemies
28 (00 1C): battle ends when a team member is defeated
29 (00 1D): complete all Perfect Actions
```

For an action-based Galaxy mission, combine the list at+3C with objective29.
Category2 at+0A selects the usual Perfect Action menu category, but category
alone does not replace the victory objective.

A controlled research comparison used the same one-step Ascend list with
objective0 versus29. RevisionC's objective0 displayed the action request
while retaining the defeat-enemy objective. RevisionE used29 and reached
victory after Ascend: A++, score336650, Perfect Action bonus10000. The enemy
still had40000 HP. The map then marked new node498 completed with its new
record. After a full RPCS3 process restart and save reload, node498 still
showed score336650, A++ and completion; the live MMD hash and node flags2E
were rechecked. Detailed evidence is in `RUNTIME_VALIDATION.json`.

[GALAXY_OBJECTIVE_TYPES_EN.csv](GALAXY_OBJECTIVE_TYPES_EN.csv) exports the
original English labels for0..32. Some types depend on equipment, numeric
parameters, special enemy groups or survival logic as well. The text binding
alone is not a complete recipe for every special mission.

### Help messages and CPU behavior

The action detector list, explanatory tutorial text, controller glyphs, and
tutorial CPU script are separate resources. The resident
`tutorial_message_table_01..09.dat` files contain a16-byte header followed by
u16 help-message IDs. `G_Tutorial_US` supplies their text.

`A_Just_US` contains action labels and controller-glyph strings. Its entries
108 onward include glyph text; native action IDs108..111 also occur. These
are different namespaces. Do not name detector108 after text108's glyph.
Likewise, tutorial-help text60 describes switching, while native action60 is
transformation. The separate CSV files preserve this distinction.

Existing detectors can be selected, reordered and parameterized. Creating a
brand-new detector, inventing arbitrary button prompts, or scripting arbitrary
cutscenes is **not established** by the decoded list format.

## 6. Galaxy's map: position, circles and new missions

### Mission root fields

| Relative offset | Type | Meaning / status |
|---|---|---|
|+00,+04|f32| Menu X,Y coordinates |
|+08|u16| Stage selector |
|+0A|u16| Mission category;4 Boss,2 usual Perfect Action |
|+0C|u16| BGM selector |
|+0E|u16| Displayed difficulty |
|+10|u16| Gameplay objective type and mission-wording selector |
|+12,+14|u16| Rule-description selectors;0 absent, otherwise one-based |
|+16..+1B|mixed| Preserve; not completely decoded |
|+1C|u32| Raw time-limit seconds, converted to the game's supported time settings |
|+20|u32 ref| **Incident-edge index list** |
|+24|u32 ref| Ally group |
|+28|u32 ref| Enemy group |
|+2C|u32 ref| Conditional reward records; preserve when modifying an existing mission |
|+30,+34|u32 ref| Progression expressions: reveal/availability gates in the native update path |
|+38|u32 ref| OR list of `(u16 queryType,u16 argument)`, ending with queryType0 |
|+3C|u32 ref| Just/Perfect Action sequence |
|+40|u32 ref| Numeric parameter for the objective |
|+44,+48|u32 ref| Numeric parameters for rule descriptions1/2 |
|+4C|u32 ref| u16 item-index list loaded as battle modifiers |
|+50,+54|u32 ref| u16 item lists used by the mission UI; exact effect scope unresolved |
|+58|u32| Opaque configuration word; preserve |

The Galaxy loader translates **30,60,90,120,180,240,300,600,900 seconds**
to native timer settings1..9. Unrecognized values enter default setting0;
writing an arbitrary duration does not create an arbitrary timer. The simple
donor uses raw0. Reuse a supported setting for a timed fight. Zeroing a whole
root also destroys graph and roster links.

### Category is not difficulty

Displayed difficulty at+0E uses:

| Value | Label |
|---:|---|
|0| Tutorial |
|1| Very Easy |
|2| Easy |
|3| Normal |
|4| Hard |
|5| Very Hard |
|6| Ultimate |

The original Kid Buu Boss has4 at **both** +0A and+0E. They are independent:
our modified Boss retained category4's large circle while showing Easy with
+0E=2. This corrects the first edition's category/difficulty conflation.
Neither field replaces the strength table's CPU level/type and CPU items.

Category also selects a node/asset pool and menu behavior. Known categories:
2 Perfect Action,3 Bonus,4 Boss,5/6 Common variants,8 Tutorial. Other ordinary
values0/1 occur. Their complete visual distinctions are not yet isolated.
Boss-related code treats4 specially, and `galaxy.zpak` contains node assets
such as `star_A` through`star_G` and `mission_boss`.

For the large Boss circle, keep category4. Editing this field changes more
than a radius: it can affect title prefixes, node placement and mode handling.
There is no verified independent “circle radius” word in the92-byte root.
Arbitrary circle graphics/sizes require investigating the corresponding UI
assets, not guessing a spare integer in the root.

### How connections actually work

`MAIN` has a36-byte header and8-byte descriptors. Header+10 names the root
array; header+14 names the **global edge array**; header+1C names the100-row
Galaxy-owner array. Descriptor offsets are relative to the payload.

Each global edge is8 bytes:

```text
u16 endpointA | u16 opaque | u16 endpointB | u16 opaque
```

Root+20 references that node's list of incident edges. Each list entry is:

```text
u16 EDGE INDEX | u16 opaque
```

**It is not a list of prerequisite mission IDs.** The loader resolves the
edge, then chooses the opposite endpoint. Both endpoints must include the
edge in their local lists. This was checked across all515 original Galaxy
edges and the complete tutorial graph.

Each Galaxy-owner row is12 bytes:

```text
u32 auxiliaryReference | u32 nodeListDescriptor | u16 startingNode | u16 opaque
```

The node list uses4-byte entries `(u16 nodeID, u16 opaque)`. A node can belong
to several Galaxies. The first auxiliary reference is not the global edge
list; its complete purpose is still unresolved. Preserve it.

### Unlock gates and the separate query list

The progression update uses root+30 to set a reveal-related node flag and
combines root+34 with the query list at+38 when enabling a node. Adjacency
also participates in propagation. The complete new-save behavior of every
flag is not exhausted, but the original byte programs and consumers are
identified.

The+38 list is **not postfix code**. It contains4-byte
`(u16 queryType,u16 argument)` pairs, terminated by queryType0. A nonempty
list succeeds if **any** query succeeds; an empty terminated list succeeds.
For original node117 it contains `(2,113),(2,114),(0,0)`.

Original node491 combines a+38 OR-list of six mission-state queries with a
+34 postfix expression requiring all six. This lets the engine distinguish
partial prerequisite progress from the complete requirement. Keep both
representations when cloning a complex unlock sequence. The graph's edge
indices at+20 are a third, separate mechanism.

### Add a genuinely new mission

The original file has498 root records, numbered0..497. The research demo adds
**node498** and makes it Kid Buu's tenth mission. The old roots remain present.

A reproducible structural procedure is:

1. Parse the header/descriptors; do not assume rebuilt payload offsets remain
   equal to the original ones.
2. Copy a known92-byte simple root, such as original node238.
3. Set its stage, music, category, displayed difficulty, objective and rosters.
4. Give it sensible nearby X/Y coordinates. The demo uses **64.0,18.5**.
5. Append it to the root array and change that descriptor's count498→499.
6. Append node498 to Kid Buu/native66's node list; count9→10.
7. Connect it in the graph, updating the global edge array **and each affected
   node's incident-edge list**.
8. For a neutral demo reward setup, use no new rewards. Reusing another
   mission's reward/unlock references can share unwanted progression logic.
9. Update descriptor-table/payload lengths, rebuild STPK/STPZ, replace the
   progress AFS member, and cold-boot RPCS3.
10. Verify selection, launch, objective completion, return to map and save
    behavior before expanding the campaign further.

The demo splits original edge493, **489↔117**, into:

```text
edge493: 498↔117
edge515: 489↔498  (new global edge)

node117 incident list:493,247,329,492  (unchanged)
node489 incident list:515,20,464       (493 replaced)
node498 incident list:493,515         (new)
```

This preserves the original Boss's degree4 rather than adding a fifth menu
connection. The complete graph checker rejects dangling or missing reciprocal
edge references.

In HxD, coordinates are32-bit big-endian IEEE754 floats. For the demo:

```text
64.0  = 42 80 00 00
18.5  = 41 94 00 00
```

For simple position changes, overwrite only these eight bytes. For an added
mission, inserting bytes without updating descriptors is not enough. Use a
builder or calculate every changed offset, count, table size and payload size.
`tools/mmd_edit_research.py` offers append/relocate and checked resizing for
unaliased payload ranges; it does not validate all gameplay semantics.

**Expansion limits remain open.** A499th mission is a concrete probe, not proof
of unlimited missions or new playable Galaxies. The owner table remains100
entries. Save arrays, UI capacities, reward IDs, graph degrees and resource
loading impose additional limits that must be studied before large expansions.

## 7. Other Galaxy conditions: three separate sources

1. **Objective type and parameters:** root+10 and+40 choose victory/scoring
   logic such as defeat, time attack or Perfect Actions.
2. **Mission modifier items:** root+4C is a u16 item-index list, copied into a
   battle modifier bitmap. These are item IDs, not item-property indices.
3. **Preset equipment:** each opponent/form can independently carry hidden
   effects, transformations, switching triggers and CPU items.

Rule descriptions at+12/+14, with parameters+44/+48, supply additional wording.
They do not by themselves prove that a matching modifier was equipped. For
example original Kid Buu node117's rule selector38 corresponds to English
rule text37, opponent High Tension at the displayed health threshold; its
parameter is constant3, but its+4C list is empty. Equipment and actual native
consumers still need checking.

The original tutorial's modifier list `011D 0123 00DC` names Super Health
Recover X, Super Ki Recover X and Health 1 Survive. Their item bitmap reaches
the battle packet. The exact side/scope of every possible modifier was not
exhaustively tested. Do not assign arbitrary property IDs in this list.

The exports separate objective types, rule descriptions, each original
mission's expression parameters and item lists. A mission can use special
enemy-group tag`FFFFFFFF`, including repeated/spawned-opponent layouts. Those
groups follow different code from the ordinary tag0 roster and are not yet
covered by a safe wave-editing recipe.

## 8. Battle Zone and Ultimate Zone

### Preset namespace

Normal mode uses **106 presets**, Ultimate uses **149** in the supplied files.
Both refer to the shared appearance and strength tables and use the same
44-byte preset structure, including form links. In the normal Green Square
first-fight load, a breakpoint captured preset index0 and a live table that
matched all106 original normal-preset rows byte-for-byte. The initialized
enemy was Saibamen/native74, preset0, level7, with the expected move selectors
and no equipment. The mode selects which
preset table to expand. A Battle Zone preset index is not a Galaxy index.

See [BATTLE_ZONE_PRESETS_NORMAL.csv](BATTLE_ZONE_PRESETS_NORMAL.csv) and
[BATTLE_ZONE_PRESETS_ULTIMATE.csv](BATTLE_ZONE_PRESETS_ULTIMATE.csv). Equipment
and moves can be changed using the same dedicated-row method as Galaxy.
A form link must point into that same mode's table.

### ZONE format

Sixteen MMDs cover eight normal and eight Ultimate maps:

```text
Normal:  zone_green_square.mmd, zone_red_triangle.mmd,
         zone_blue_lozenge.mmd, zone_yellow_spiral.mmd,
         zone_violet_circle.mmd, zone_aquamarine_sphere.mmd,
         zone_crimson_liner.mmd, zone_final.mmd
Ultimate:zone_ultimate_square.mmd, zone_ultimate_triangle.mmd,
         zone_ultimate_lozenge.mmd, zone_ultimate_spiral.mmd,
         zone_ultimate_circle.mmd, zone_ultimate_sphere.mmd,
         zone_ultimate_liner.mmd, zone_final_ultimate.mmd
```

`ZONE` differs from`MAIN`:

```text
header size:14 hex (20 bytes)
+00 ZONE
+04 version00010000
+08 descriptor-table byte size
+0C payload byte size
+10 root descriptor index

descriptors:8 bytes, same BE count/stride/payload-relative-offset scheme
root stride:38 hex (56 bytes)
```

Every root is a fight, including stage-kind0; do not discard it as a decorative
start node. The16 files contain128 root records in total.

| Root offset | Type | Meaning |
|---|---|---|
|+00,+04|f32| Menu position |
|+08|u32| Stage kind:0..7 normal sequence,8..15 secret variants |
|+0C|u32| Enemy preset index, in normal or Ultimate table |
|+10|u32| Persistent stage/progress ID |
|+14|u32| Handicap code,0..12 |
|+18|u32| Raw time limit in seconds; originals use180 orFFFFFFFF |
|+1C|u32| Stage selector |
|+20|u32| Raw music word; see music caveat below |
|+24|u32| Opaque variant word; originals0/1/2 |
|+28|u32 ref| Challenge Stamp criterion-ID list, u32 entries |
|+2C|u32 ref| Conditional reward records,8 bytes each |
|+30|u32 ref| Stored condition metadata; traced stock secret-route check uses native per-zone requirements instead |
|+34|u32 ref| Next-node indices, u32 entries |

Normal persistent IDs are1..38; Ultimate50..87. Parallel route nodes can share
an ID. Cloning a row while reusing its ID can link its saved progress to an
existing stage. Allocating arbitrary new persistent IDs is not validated.

Original stage kinds0..7 correspond to stages1..6, Climax and Last. A secret
variant adds8; not every theoretical code occurs in the original data.
This describes the stage-kind namespace, not the selected arena.

Root+28 is **not an enemy roster**. Its IDs select optional stamp conditions.
Root+2C is **not a companion roster**: records are
`u16 rewardKind, u16 rewardID, u32 conditionExpressionDescriptor`.
All observed reward kinds there are8. Reward IDs have their own namespace;
they must not automatically be treated as equipment IDs.

### Handicap codes

| Code | Applied effect |
|---:|---|
|0| No item handicap; special label lookup |
|1| Pursuit Attack Loss — itemBD |
|2| Rush Attack Down — itemBE |
|3| Ki Consumption Up — itemC9 |
|4| Amount of Ki Restricted — itemCA |
|5| Ki Charge Speed Down — itemCB |
|6| All Dash Ki Consumption Up — itemCD |
|7| Defense Power Down — itemDA |
|8| Super Health Power Down — itemDB |
|9| Super Attack Power Down — itemEB |
|10| Ultimate Attack Power Down — itemEC |
|11| Super Attack Sealing / R3 Seal — itemED |
|12| Health carries over; special native HP-transfer behavior |

This mapping is backed by the native lookup table and its item-application
consumer. It is not inferred merely from similar-looking mission descriptions.
Code12 follows a separate path that preserves previous health rather than
adding an equipment item.

Challenge Stamp criteria0..12 form a **different enum**, starting with Supers
unused, stat-bonus item unequipped and Defense Down equipped. Use the separate
CSV; handicap code7 and stamp criterion7 do not name the same effect.

### Arena, music and time caveats

The arena converter uses the known stage table, with15 falling back to0.
Correction (18 October 2026): original Zone roots use varied arenas, as already
listed in BATTLE_ZONE_MISSIONS_ORIGINAL.csv. Only Green Square uses13 for every
fight. The earlier all-13 statement incorrectly generalized that one file.
Setup reads root+1C at271714, converts the selector through26CEA0 and passes it
to the battle configuration; music follows a separate path.

**Correction (18 October 2026):** every original Zone root stores music56,
but the stock battle-setup routine does not read root+20 for song selection.
It calls26F740, which chooses from native ordinary/Climax/Last pools, with fixed
special-zone cases. Changing+20 alone does not force a different song.
Music30/31 are Battle of Omega (Solo Guitar)/(Full), not Random/???.56 is
the random sentinel: Galaxy maps it to6; Tutorial passes it to the sound resolver.
See MUSIC_SELECTOR_NATIVE_EVIDENCE.json and the editor's MUSIC_SELECTORS_EN.md.

The Ultimate Zone text explicitly states that time-up is a loss and the enemy
must be knocked out. Normal/Ultimate mode and the native time-limit settings
must be considered together when changing a timed battle.

The Battle Zone data tables and load paths are decoded. The normal first-fight
load also has the live full-table comparison above; the runtime validation
file states which additional Zone controls were actually performed. No claim
is made that every handicap, secret route or reward condition was played.

## 9. Optional read-only Python helpers

Run these from the research package root using Python3. The inspection tools
use the standard library. Only executable disassembly requires Capstone.

```bat
py tools\mmd_inspect_advanced.py galaxy.mmd --node 491 --selected-native 0 --parameters parameters
py tools\mmd_inspect_advanced.py tutorial.mmd --node 5 --parameters parameters
py tools\mmd_graph_research.py galaxy.mmd
py tools\mmd_inspect_advanced.py zone_green_square.mmd --node 0 --parameters parameters --preset-table preset_character_battle_zone_nor
```

The address book prints real file offsets for roots, descriptors, roster
candidates, presets, appearances and strengths. It also shows local move
selectors, tasks and formatted expressions. Some expressions need runtime
context; the helper reports that instead of guessing.

A small optional builder creates a clean499th-mission experiment from the
**original** Galaxy ZPAK, preserving every original92-byte mission root:

```bat
py tools\build_galaxy_extra_mission.py galaxy.zpak --ally-preset 0 --output extra_mission
```

Its new node asks Kid Buu to Ascend against Krillin, with original Galaxy
preset0/Goku as an ally. It emits a ZPAK, extracted MMD and hash/graph manifest;
replace progress entry872 with the ZPAK. It does not modify boot or EBOOT.
The clean builder was checked for graph/archive consistency and original-root
preservation. The runtime experiment described above is the separately named
ADV18E fixture, whose comparison setup also changes original node117. Do not
confuse the two archive hashes or label the clean output as a separately
played-through revision.

Graph consistency checks file references, not save compatibility or all game
limits. A successfully repacked archive still needs a cold-boot gameplay test.

## 10. Evidence and remaining questions

Selected guest-code addresses, for the exact supplied ELF SHA256
`8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892`:

| Address/range | Relevant evidence |
|---|---|
|12D3E4..12D678| Preset expansion, appearance move-selector copy |
|172FC..17320| Expanded selectors copied into the live actor |
|1ED938..1ED9BC| Ally condition evaluation and player-side insertion |
|2F4C0C| Roster candidate condition consumer |
|1EDBFC..1EDD14| Action-list loading and parameter dispatch |
|1EDEE8| Expression-based action parameter |
|F3F30; F4898..F4BFC| Objective pointer and victory logic, including objective29 |
|2F5848;2F57C4| Expression interpreter and QUERY operator |
|2F3C28;2F3C88| Query dispatch and selected-Galaxy-native check |
|2F41F0;2F4AFC| MAIN query2/query3 node-state callbacks |
|2F3884;2F4430| OR query list and progression-gate update |
|2F2BEC;2F2A30| Incident-edge lookup and opposite endpoint |
|1F0D88;1F47CC| Category-dependent node pool/Boss handling |
|1EDBAC| Separate difficulty field+0E |
|1C9D0;1CA704..1CA768| Battle Zone preset-table selection and expansion |
|2F34B4;2F33FC| ZONE parsing and56-byte root addressing |
|26C800;26C944| Handicap lookup and item-index mapping |
|27175C;2718F0| Health-carry-over path |
|272B34..272B7C| Conditional Zone rewards |
|26F740| Zone BGM setup using global configuration |

The updated `elf_evidence.py` can reproduce selected disassembly ranges from
the user's own unmodified ELF. No ELF or full game installation is distributed
inside the documentation package.

Still unresolved: the full lifecycle semantics of runtime/save query flags, every special
wave/spawn group, a general arbitrary tag-destination setting, all circle-asset
variants, Zone music overrides, new Zone persistent IDs, and large Galaxy/save
expansion limits. These are concrete boundaries for the next research pass,
not reasons to treat the decoded ordinary rosters and presets as guesses.

## Condition and route correction (18 October 2026)

Reward query(type1,argument14) is remaining health percentage. Next-node +34
links and reward conditions are separate. Native26FA18 calls26F8C8, latches
success at Zone context+70;2767B0 stores its result at menu context+668. The
route selector271ED0 uses that latch to select a secret-kind destination, or
ordinary destination selection otherwise. The traced secret check does not
evaluate root+30. Do not promise arbitrary secret requirements by editing this
metadata. Result flags11/12/13 are mapped to statistics+60/+64/+68, but exact
gameplay labels remain unverified. Combo argument3 and health-percent14 are
readable in the editor. See BATTLE_ZONE_CONDITION_NATIVE_EVIDENCE.json and the
editor guide CONDITIONS_AND_BATTLE_ZONE_EN.md. No executable changes were made.
