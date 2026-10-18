# Progression, rewards and mission modifiers — 0.2 research notes

European PS3 BLES00978. This update uses the original files, English game text
and read-only analysis of the original executable. No new RPCS3 playthrough was
performed for this editor release. Existing earlier runtime controls remain
separately documented.

## Three related fields, three different jobs

Original Galaxy mission **496** confirms the relationship reported during editor
feedback:

| Field                        | Original value | Role                                     |
| ---------------------------- | -------------- | ---------------------------------------- |
| Rule description at root +12 | 10             | “Player Health constantly decreases”     |
| Battle modifier list at +4C  | 296 / 0x128    | Health Auto-Loss V, mission effect input |
| UI item list A at +50        | 296 / 0x128    | Mission-menu item icon                   |
| UI item list B at +54        | Empty          | No second list in this example           |

Changing the sentence does not equip an item. Showing an icon does not apply
its effect. Preset equipment is a fourth, separate source of fighter effects.
This is why a mission can describe an opponent effect while having an empty
mission-modifier list: the opponent's preset can implement it.

Galaxy Studio explains these layers and offers **Match UI list A to battle
modifiers** as an explicit edit. It does not silently synchronize arbitrary
missions: some original combinations are deliberately different. Icons help
players understand relevant mission items and countermeasures such as Seal;
the editor does not claim that every item has the same Seal interaction.

## Player versus opponent scope

The +4C descriptor stores two-byte item indices. There is no per-entry player,
team, actor-slot or target word. The loader at **1EDD28–1EDDB0** sends every entry
to **1CDC1C**, which sets the corresponding bit in a single 384-bit mission
bitmap at battle-config **+A00**. The +50/+54 lists follow separate menu display
paths around **1E72xx/1E73xx**. They are not two target equipment lists.

Follow-up static trace for0.3 resolves the **original Galaxy assignment**:

1. The loader's12 words are copied into the game-parameter packet at `0x1CB9B8–0x1CB9EC`.
2. At battle creation `0x12614` calls `0x12C83C`.
3. For Galaxy packet types1/2, `0x12C8B8` selects the shared bitmap at parameter `+0xE0`.
4. The loop starts at team0's candidate array (`+0x2AC`, count at `+0x5A4`). At `0x12C944–0x12C950` it ORs each candidate's own item-ID bitmap with the shared mission bitmap.
5. It rebuilds equipment effects through `0x12C61C`, then applies resulting properties through `0x12BF74`. The loop advances by candidate stride0x98. It does **not** advance to the enemy team at stride0xBE8.

Consequently this original Galaxy path applies the MMD battle modifiers to the **player's team**. It has no per-item MMD enemy target. An enemy condition can instead be implemented by that enemy's preset Strength items, and the rule captions/UI icons describe it separately. This is a traced assignment path, not a playthrough of every effect or every Seal interaction. Modified executables can change the consumer.

The original effect rebuild scans exactly381 item definitions (`0x12C75C`, last ID0x17C). The bitmap has384bits. A larger item DAT alone is insufficient for extra items; ID384+ can also overflow the original item bitmap. See MOD_SUPPORT_EN.md.

For a precise fighter assignment use **Teams → Edit character preset → Strength
& equipment**. That assigns the item to that particular candidate's preset.
Allies and enemies can reference different presets, and each transformation
can load different equipment. Some special native effects can still have
context-specific requirements.

## Reward records

Root **+2C** resolves to records of:

```text
u16 rewardType | u16 rewardTarget | u32 conditionExpressionDescriptor
```

The original Galaxy file has **1,266 reward records**. The executable dispatch
at **1EA228–1EA788**, the corresponding save bitsets and original English
`T_Get_US.pak` messages establish the following namespaces:

| Type | Meaning                                 | Target encoding                                          |
| ---: | --------------------------------------- | -------------------------------------------------------- |
|    0 | Super move unlock                       | native ID × 100 + local move selector                    |
|    1 | Ability item / inventory unlock         | equipment item array index                               |
|    2 | Costume unlock                          | native ID × 100 + costume index                          |
|    3 | BGM unlock                              | music index                                              |
|    4 | Transformation form available in Galaxy | target native form ID                                    |
|    5 | Increase maximum Limit Points           | amount, for the current character                        |
|    6 | Stage unlock                            | stage index; no original Galaxy reward uses type 6       |
|    7 | Dragon Ball reward path                 | original target is 0; game/save eligibility also applies |
|    8 | Museum picture                          | picture collection index                                 |
|    9 | Galaxy / base-character availability    | native base-character ID                                 |
|   10 | Enhanced character reward               | character-select group index from `cs_form.dat`          |

Type 10 is particularly easy to mislabel. It follows **character-select group
order**, not native ID order or world-map icon order. Group 0 is Goku; group 51
is Android #13. The world-map icon for Goku is 53 in the original MMD, which is
not its enhanced-reward target. The editor bundles the original 66 group/native
bindings for names. It does not modify `cs_form.dat`.

Original game messages independently distinguish new moves, items, costumes,
BGM, Galaxy transformation forms and Limit Points (`GET_009` through `015`),
pictures (`026`), characters (`028`), and enhanced characters (`147–148`).
Names/bitset traces are static evidence; this update did not play every reward.

## Goku's form progression, concretely

| Original mission | Type | Target | Meaning                                   |
| ---------------: | ---: | -----: | ----------------------------------------- |
|              238 |    4 |      1 | Goku / Super Saiyan available in Galaxy   |
|              239 |    4 |      2 | Goku / Super Saiyan 2 available in Galaxy |
|              243 |    4 |      3 | Goku / Super Saiyan 3 available in Galaxy |
|              245 |   10 |      0 | Enhanced Goku group reward                |

These form unlocks are different from programming an enemy preset's automatic
transformation. The latter uses native action slots, preset form links and
its equipment. Reward type 4 changes saved availability for the player's form.

The named reward editor offers type-specific choices and retains raw encoding.
Unknown IDs can still be inspected. Picture IDs currently have collection
numbers, because individual picture titles have not been mapped. Selecting a
new reward type can propose its first valid known target; review the target
before export.

## Conditions and existing saved unlocks

A reward condition is evaluated in the result/unlock flow. Reference 0 means
unconditional **in that flow**, not “grant as soon as the editor opens the file.”
The engine also checks previous ownership and type-specific limits. Complex
result-query conditions are retained and exposed in the expression editor;
the app does not invent meanings for every runtime statistic.

Whole-Galaxy selection checks saved native-character availability. Type 9
rewards set its availability bit; type 4 uses the separate Galaxy-form flag.
The **Unlock sources** panel scans the loaded MMD so it follows the actual
edited records, rather than only a static list of original missions.

There is no verified single MMD “start this entire Galaxy locked” field in
this work. Initial flags also come from new-save initialization and other game
systems. Changing a reward does not remove an unlock already stored in an
existing save. The editor therefore explains the distinction and does not
pretend to reset saved progress.

## Readable progression queries

- **Type 2 / 0x08 — mission has been cleared**. Use this for a predecessor that
  must be won before another mission opens. It returns 8 when set, otherwise 0.
- **Type 3 / 0x02 — mission is unlocked / available**. This can be true before
  the first win. It returns 2 when set, otherwise 0.

Availability is derived from the mission's gates and progression, rather than
being identical to the saved clear flag. Reveal/visibility is separate again.
Use these masked integers as truth tests, not comparisons with literal 1.
The editor now explains the distinction in every shared MAIN condition builder.
See CONDITIONS_AND_BATTLE_ZONE_EN.md and MAIN_PROGRESSION_FLAGS_NATIVE_EVIDENCE.json
in the research repository for the native callback/writer evidence.

## Mission visibility and availability

These controls apply to individual mission nodes:

- **Reveal (+30)** contributes to whether the node appears on its map.
- **Availability (+34)** supplies an eligibility expression.
- **OR queries (+38)** are a separate eligibility list; any successful query
  satisfies that list. Empty/absent data follows the original loader semantics.
- **Graph links (+20 and global edges)** connect circles; they are not an
  automatic substitute for an explicit prerequisite expression.

The guided mission wizard makes both the connection and the chosen
clear-condition. Its “after this mission” expression uses the original MAIN
query-2 node-state path, and keeps the numeric mission root behind the map
selection. The simpler Progression control can change that gate separately.
These paths require game testing after a new custom progression is authored.

## Limits that the editor now reports

Original Galaxy uses 498 roots. The original save table has **500** mission
records, indices 0–499. Adding root 498 or 499 stays inside that table but still
needs progression testing. Creating root 500 or above overlaps other saved
data. Creation beyond the original count asks for confirmation; counts above
500 and unsafe imported/raw states also produce an explicit export warning.
A research override is not a claim of safe gameplay compatibility.

There are 66 independent Galaxy aggregate rows. An extra world icon at index
66 collides with global save fields; that collision was observed in GX19A.
Battle Zone stores progress in two modes × eight routes × 21 integer grid
cells. Its root +10 is displayed **LV**, not a persistent ID. These limits are
separate from binary descriptor capacity.

## Initial character and Galaxy-form availability —0.3 follow-up

The new-save initializer `0x31A300` clears the0x5DC0-byte character section, initializes100 native rows and then sets native availability bit1 for a **hardcoded60-native list** at `0x5F67B0` (pointer table0x5F6550 +0x260). That list includes some forms, so it must not be described as60 base characters. It separately calls `0x31895C`, which sets the Galaxy-form flag0x01000000 for66 native IDs from another list. Reward kinds9 and4 set those different flags later.

The mission MMD does not supply those new-save initialization lists. Editing an availability expression or removing an unlock reward therefore cannot reliably make an already available whole Galaxy start locked. A custom initial save could clear the relevant native availability flag at `SYS-DATA +0x20 + native×0xE8`, keeping other bits intact and rebuilding the checksum. That also affects native character availability; it is not an isolated Galaxy-only flag. The editor does not edit savedata or silently change this flag. No executable unlock patch is included.

SYS-DATA has an internal checksum over bytes8 through the end. For original55000-byte saves, sum alternating little-endian16-bit values modulo2^32; store sum>>8 as the big-endian word0 and sum&255 as big-endian word4. The exact original algorithm was independently matched against the supplied save. A mismatched checksum can prevent the save from loading even when edited fields are otherwise valid. The separate research converter handles it for the proposed GS512 format.

##0.4 research corrections and user verification

The user confirmed character/Galaxy coupling experimentally: removing all playable characters except Goku also removes every Galaxy except Goku’s. This independently supports the kind9/native availability trace above.

Battle Zone on-disk X is0,1,2 in original files, not−1,0,1. The original native saved-cell formula still contains `x+1`. All16 original ZONE files now pass checks. Standard map positions cover saved cells1–20; `(2,0)` computes21 and must be excluded. The21 allocated records include cell0, whose use would require a nonstandard coordinate. Earlier supported-grid wording was too restrictive and the earlier free-cell inventory included this nonstandard cell.

Tutorial uses its own block at SYS-DATA+0xBFC8. Several progression and completion scans process exactly9 records of28bytes, and action masks support20 tasks per mission. Its0x140-byte cleared allocation is not evidence that every trailing byte is unused. The editor warns for additional Tutorial roots independently from Galaxy’s500-record boundary. No Tutorial expansion patch is provided.

See [Conditional teams](CONDITIONAL_TEAMS_EN.md) for the491 walkthrough and the readable query selector.
