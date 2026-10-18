# Optional action prompts in Galaxy battles

**Yes: the original game already combines on-screen action requests with ordinary combat victory conditions. These requests can also be put into a new Galaxy mission.** The action sequence and the victory objective are separate fields in `galaxy.mmd`.

This follow-up inspected every original Galaxy mission, checked the original executable's victory branch, and added editor integration tests. It uses the earlier ADV18C/ADV18E runtime experiments as its in-game control; the original donor fights below were not replayed during this follow-up.

## Original battles to look at

These are global, zero-based mission indices, not the order of the circles within a character's Galaxy. All four use category **2: Perfect Action** in the menu.

| Mission | Galaxy | Enemies | Actual victory objective | Prompts |
|---:|---|---|---|---:|
| 97 | Majin Buu | Super Saiyan Goten, Super Saiyan Kid Trunks, Majin Vegeta | 1 — Defeat all enemies | 6 |
| 174 | Frieza, 1st Form | Piccolo, Vegeta (Scouter) | 1 — Defeat all enemies | 8 |
| 300 | Meta-Cooler | Recoome, Guldo, Captain Ginyu, Jeice, Burter | 1 — Defeat all enemies | 9 |
| 239 | Goku | Yamcha, Tien | 30 — Defeat the Z-Fighters | 9 |

There are **20** original Galaxy missions with a nonempty action sequence. All 20 have a victory objective other than 29, which is the specific “Successfully pull off all Perfect Actions” objective. Three use the plain “Defeat all enemies” objective shown above. The complete list, including enemies, parameters and offsets, is in [OPTIONAL_ACTION_PROMPTS_EN.json](OPTIONAL_ACTION_PROMPTS_EN.json).

Goku's mission **239** is a convenient example in a familiar Galaxy. Its sequence is:

1. Hit with Rush Blast — native action 45.
2. Do a combo dealing at least 1,000 damage — action 96, expression value 1000.
3. Do a combo dealing at least 2,000 damage — action 96, value 2000.
4. Do a combo dealing at least 3,000 damage — action 96, value 3000.
5. Hit with Smash Attack: 4 — action 24.
6. Do a combo dealing at least 4,000 damage — action 96, value 4000.
7. Do a combo dealing at least 6,000 damage — action 96, value 6000.
8. Do a combo dealing at least 8,000 damage — action 96, value 8000.
9. Reduce the enemy's health to zero — action 79.

The battle's objective is still to defeat the opposing Z-Fighters. An action can itself describe a KO, but that does not make the entire action list the battle's victory condition.

## A small, concrete donor

Mission **97**, Majin Buu's battle, has only six requests:

| Step | Native action | Parameter | Request |
|---:|---:|---|---|
| 1 | 22 | None | Hit with Smash Attack: 2 |
| 2 | 96 | Expression = 3000 | Combo dealing at least 3,000 damage |
| 3 | 96 | Expression = 7000 | Combo dealing at least 7,000 damage |
| 4 | 96 | Expression = 15000 | Combo dealing at least 15,000 damage |
| 5 | 86 | None | Hit with signature skill |
| 6 | 89 | None | Win with Ultimate Attack |

Its ordinary objective is **1**, “Defeat all enemies.” It also has a separate mission modifier, item `0x03F` / High-Tension Start, and the matching rule caption. Copying its action list alone does **not** require copying that modifier or its enemies.

Useful offsets in the **original BLES00978** `galaxy.mmd`:

| Data | Value |
|---|---|
| Mission 97 root | File offset `0x19248`, 92 bytes |
| Category at root +`0A` | `00 02` |
| Objective at root +`10` | `00 01` |
| Action list reference at root +`3C` | Descriptor 666 / `0x29A` |
| Descriptor 666 | File offset `0x14F4` |
| Descriptor geometry | 6 entries × 12 bytes |
| Action list body | File offset `0xA6A8` |
| Numeric expression descriptors | 663, 664, 665, evaluating to 3000, 7000, 15000 |

Offsets change after a file grows. The descriptor reference remains the way to locate the list; do not treat an old absolute offset as universal.

Frieza's mission **174** is another useful donor. It has no mission modifier list, but its enemy presets start in Raging Soul and its caption reflects that. Its eight requests include a transformation, combo thresholds, a specific Super hit and a Super victory. The specific-Super direct parameter is **5003**. Retain it only when the target character can perform that original action; it is not an arbitrary local-move slot.

## How to make optional prompts in a new mission

1. Create or duplicate a Galaxy mission, choose its Galaxy owner, and connect the new node to the map. The editor maintains the global edge table and both nodes' incident-edge lists.
2. Set **Category = 2 / Perfect Action**. This is the category used by all original examples and by the runtime controls.
3. Set **Objective = 0 / Defeat the appearing enemy**, or **1 / Defeat all enemies** for a team battle. Keep this selection independent of the prompt list.
4. Add the desired **Perfect Action sequence**. For a portable first experiment, use Ascend, Land using Descend, then a five-hit combo.
5. Use opponents and player forms that permit the requests. A transformation request needs an available native transformation; a switch request needs another team member. A character-specific Super request cannot be assumed to work with an unrelated character.
6. If a simple battle is intended, clear inherited rule captions, their numeric parameters, the objective parameter if unneeded, and the mission modifier list. Inspect preset equipment separately: removing a mission caption does not remove an item effect from an enemy preset.
7. Export the MMD and repack it normally. Preset DAT files need changing only if the characters, moves, equipment or form links also change.

The three portable example records are:

```text
Native action 1   | direct -1 | expression 0             Ascend
Native action 2   | direct -1 | expression 0             Land using Descend
Native action 95  | direct -1 | expression = constant 5  Five-hit combo
```

Here “expression = constant 5” is an authoring instruction. On disk, the last word is the **descriptor index of a postfix expression**, not the number five. A constant-five expression is:

```text
00 00 00 02  00 00 00 05   literal 5
00 00 00 00  00 00 00 00   END
```

Each action record is 12 bytes, big-endian:

```text
u32 nativeActionID | s32 directParameter | u32 parameterExpressionDescriptor
```

Keep sequences within the native **20-action capacity**. Copying a sequence between different MMD files also requires copying its referenced expressions and updating the references. A descriptor number in `tutorial.mmd` does not identify the same data in `galaxy.mmd`.

If you instead want completing the requests to **win the battle immediately**, deliberately choose **Objective = 29 / Complete all Perfect Actions**. Changing the requests alone must not silently change this field. The editor tests cover both directions.

## Why we can separate the two controls

The original executable's routine at `0x000F4898` checks the objective. The branch at `0x000F49A8..0x000F49FC` compares the completed action count against the configured count specifically for objective **29**. Objectives **0** and **1** instead follow the ordinary team-defeat checks. This was a read-only inspection of the unmodified executable.

The earlier runtime controls used a newly added Kid Buu mission, node **498**, with one request, **Ascend**:

| Control | Category | Objective | Observed result |
|---|---:|---:|---|
| ADV18C | 2 | 0 | Action 1 loaded and its prompt displayed while the defeat-enemy goal remained active. |
| ADV18E | 2 | 29 | Performing Ascend won with the enemy still at 40,000 HP. The new node's completion survived a full process restart. |

ADV18C still had prototype map-graph defects, corrected before ADV18E. These do not change its recorded combat action/objective values, but ADV18C should not be distributed as a finished mission fixture. The new editor creates reciprocal graph links and its exports are checked structurally; the editor-generated optional sequence has not yet been played in RPCS3.

Evidence: [ADV18C-battle-config.json](ADV18C-battle-config.json), [RUNTIME_VALIDATION.json](RUNTIME_VALIDATION.json), and [ADV18E-after-action-victory-actors.json](ADV18E-after-action-victory-actors.json). The editor's `optional-actions.test.cjs` checks original donor detection, independent action/objective editing, a new connected mission, expression relocation, and rejection of a 21-step sequence before mutation.

## What this does and does not expose

These are existing **combat-action detectors**, with game-provided labels and some numeric or move-specific parameters. They are editable and transferable. They are not arbitrary button codes, custom cutscene scripting, or a general QTE programming language. Native action IDs and tutorial-help/controller-glyph text IDs are separate namespaces.

The Battle Zone root has a different layout. Its `+28` list contains **Challenge Stamp criteria**, not a Galaxy-style Perfect Action sequence. The current research does not establish how to put Galaxy's timed prompt display into Battle Zone, so the editor exposes the confirmed Battle Zone criteria separately.

Original file provenance: `galaxy.mmd` SHA-256 `c0a12c58b22cb4b2884bcfe8c550a1f5a25f60c192986c6f1fd9bd3eccb155a7`. No original MMD, DAT, executable, previously released report or fixture was modified for this follow-up.
