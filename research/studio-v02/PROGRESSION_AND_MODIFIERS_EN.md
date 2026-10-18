> **Historical report.** Read the [audited current findings](../SAVE_RAM_AND_EXPANSION.md) first.
> Pending statuses, fixture counts and some early interpretations below were
> superseded. GS512 missed later-discovered readers; D2 Zone cell21 ultimately
> failed its minimal control. This report does not establish a safe maximum.

# Progression, rewards and mission modifiers — 0.2 research notes

European PS3 BLES00978. This update uses the original files, English game text
and read-only analysis of the original executable. No new RPCS3 playthrough was
performed for this editor release. Existing earlier runtime controls remain
separately documented.

## Three related fields, three different jobs

Original Galaxy mission **496** confirms the relationship reported during editor
feedback:

| Field | Original value | Role |
|---|---|---|
| Rule description at root +12 | 10 | “Player Health constantly decreases” |
| Battle modifier list at +4C | 296 / 0x128 | Health Auto-Loss V, mission effect input |
| UI item list A at +50 | 296 / 0x128 | Mission-menu item icon |
| UI item list B at +54 | Empty | No second list in this example |

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

The downstream native consumers determine how each effect is used. This update
has **not** completed the side/filter trace for every effect, so it deliberately
does not invent a “give mission item to player/enemy” toggle. In particular,
the absence of an entry target does not establish that every effect applies to
both sides identically. Item text alone is not a complete consumer trace.

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

| Type | Meaning | Target encoding |
|---:|---|---|
| 0 | Super move unlock | native ID × 100 + local move selector |
| 1 | Ability item / inventory unlock | equipment item array index |
| 2 | Costume unlock | native ID × 100 + costume index |
| 3 | BGM unlock | music index |
| 4 | Transformation form available in Galaxy | target native form ID |
| 5 | Increase maximum Limit Points | amount, for the current character |
| 6 | Stage unlock | stage index; no original Galaxy reward uses type 6 |
| 7 | Dragon Ball reward path | original target is 0; game/save eligibility also applies |
| 8 | Museum picture | picture collection index |
| 9 | Galaxy / base-character availability | native base-character ID |
| 10 | Enhanced character reward | character-select group index from `cs_form.dat` |

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

| Original mission | Type | Target | Meaning |
|---:|---:|---:|---|
| 238 | 4 | 1 | Goku / Super Saiyan available in Galaxy |
| 239 | 4 | 2 | Goku / Super Saiyan 2 available in Galaxy |
| 243 | 4 | 3 | Goku / Super Saiyan 3 available in Galaxy |
| 245 | 10 | 0 | Enhanced Goku group reward |

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
