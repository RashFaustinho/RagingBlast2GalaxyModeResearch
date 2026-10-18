# Conditions without guessing numbers

The editor offers a **readable condition builder**. Choose one or more Galaxy characters,
a mission flag, or a battle statistic and comparison. **Use simple condition**
prepares a draft; **Apply expression** writes it. Existing custom programs stay
unchanged until you explicitly replace them. Individual tokens remain under
**Individual tokens (advanced)**. The same builder is available for reward
conditions and Battle Zone metadata.

## What mission483 means

This shared mission has different candidates depending on the selected Galaxy.
In Nappa's Galaxy, an allied Nappa candidate says **Playing Galaxy: Raditz**.
That condition excludes that candidate when playing Nappa; Raditz is handled by
the other candidate. The program is about whose Galaxy you are playing, not
which preset you are fighting or which character happens to be active in battle.

| Displayed token | Meaning                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| Number38        | Argument: native character38, Raditz. Not mission38 or preset38.               |
| Number5         | Query type5: compare the selected Galaxy's native character with the argument. |
| Operator16      | Execute Query using the preceding argument and type; push its result.          |
| End0            | Required final terminator. MUST be added to a stored expression.               |

Each token also has a kind: **2=Number**, **1=Operator**, **0=End**. The number
beside the kind is its operand, which has a different meaning for each kind.
The program uses a stack (postfix order), so the argument comes before the type.
The example asks `QUERY(type5, argument38)` and returns true for Raditz's Galaxy.

The simple builder always adds **End:0**. Applying a manually edited nonempty
program also appends it if missing. Other malformed programs are rejected;
reading an existing file does not silently change its tokens.

## Queries and comparisons

| Type | Meaning                                                                              |
| ---: | ------------------------------------------------------------------------------------ |
|    1 | Read battle/result statistic selected by the argument.                               |
|    2 | Has the specified mission been cleared? MAIN clear-history bit 0x08; returns 8 or 0. |
|    3 | Is the specified mission unlocked / available? MAIN bit 0x02; returns 2 or 0.        |
|    4 | Return zero.                                                                         |
|    5 | Compare the selected Galaxy character; argument is a native character ID.            |
|    6 | Return the argument unchanged.                                                       |

Types2/3 use callbacks; their MAIN meanings must not be assumed in arbitrary
other modes. Offline preview cannot invent saved progress or battle statistics.
Unknown values stay unknown rather than incorrectly including/excluding a fighter.
Operators41–46 compare two stack values (equals, not equal, less, greater,
less-or-equal, greater-or-equal);16 is Query, not a comparison. Operators37/38/39
are OR/AND/NOT. Complex programs remain editable in the token submenu.

**Cleared is not the same as available.** Type 2 is suitable for “unlock this
battle after winning mission N.” Type 3 can already be true before mission N's
first victory. Availability comes from the MMD's eligibility gates and progression;
visibility/reveal uses a separate state bit. These queries inspect a mission by ID,
not whichever fighter or circle is currently selected.

The native callbacks return masked values **8** and **2** when true, not normalized
boolean 1. Use a truth test; a raw expression `query == 1` will not mean “is true.”
See `research/MAIN_PROGRESSION_FLAGS_NATIVE_EVIDENCE.json` and the reproducible
`tools/main_progression_flags_research.py`. The same MAIN query labels/help appear
where the shared builder edits Teams, rule parameters and progression expressions.

Known statistic arguments:

| Argument | Meaning                     | What is required                                                                    |
| -------: | --------------------------- | ----------------------------------------------------------------------------------- |
|        3 | Maximum combo hit count     | Compare with a hit threshold, such as 20.                                           |
|       11 | Win with a Super Attack     | The finishing attack must be a Super. Merely using one earlier is insufficient.     |
|       12 | Win with an Ultimate Attack | The finishing attack must be an Ultimate. Merely using one earlier is insufficient. |
|       13 | Win while in Raging Soul    | Raging Soul must be active when victory is recorded.                                |
|       14 | Remaining health (%)        | A threshold of 30 means 30%, not 30,000 HP.                                         |

Arguments 11–13 are **used**, including by stock secret routes. Their names are
now established by static cross-checks: Perfect Actions 87/89 read the same Super/
Ultimate win bits copied to result queries 11/12. The Raging Soul expiry objective
identifies the state bit tested when result flag 13 is recorded. This is native
code evidence, not a claim that all secret routes were played in this session.
See `research/BATTLE_ZONE_OUTCOME_FLAGS_NATIVE_EVIDENCE.json` and the reproducible
`tools/zone_outcome_flags_research.py` in the research repository.

For mission 491, the simple builder now recognizes a group such as **Piccolo or
Teen Gohan or Trunks (Fighting Teen) or Goku**. Check every applicable character.
**Playing any of the selected Galaxies** joins them with OR; **Except** excludes
the entire selected group. Searching hides rows without clearing selections.
Choose **Use simple condition**, then **Apply expression**. End:0 is added once.
Merely opening the builder or changing its draft leaves the stored file intact.

## Battle Zone rewards are not route switches

A reward record at root+2C contains a reward type, target, and condition.
`QUERY(1,14) >= 30` means **remaining health is at least30%** in the result flow.
It does not mean30,000HP or “take route30.” Originals also use other thresholds.
An absent expression removes the extra requirement at that reward step; it does
not bypass the surrounding victory/result flow.

## What chooses a fork

1. **Next stage nodes (+34)** lists possible destination mission indices.
2. Ordinary destination kinds0–7 participate in ordinary route selection. More
   than one ordinary destination lets the player choose between them.
3. Secret destination kinds8–15 are handled separately. The traced stock code
   uses the current Normal/Ultimate Zone slot and battle results to determine
   whether the secret route opens, and can latch that success during the run.
4. The condition at **+30** mirrors requirements in original files, but the
   traced secret-route check does **not evaluate that stored expression**.
   Editing it alone is not a verified way to change a secret-route requirement.
5. Conditional rewards run separately after battle; they do not select a route.

## What you can edit without an executable patch

Use **Route → Next stage nodes** to redirect, add or remove links to missions
within the same Battle Zone MMD. **Edit next-stage links** opens that tab directly.
A fork with several ordinary destinations gives the player a choice. The destination's
**Battle → Stage kind** marks it ordinary (0–7) or secret (8–15). These are real,
editable links; Battle Zones do not have to remain unchanged. Enemy presets,
arenas, handicaps, displayed level, Challenge Stamps and reward expressions are
also data fields. Existing native grid/save/menu capacities still apply.

For example, original Red Triangle mission 1 links to mission 3 (secret) and
mission 2 (ordinary). You may change those destination IDs. Its native secret
requirement remains **win with a Super Attack**. Yellow Spiral uses **win while in
Raging Soul**, Violet Circle uses **win with an Ultimate Attack**, and Crimson
Liner uses a combo of at least 20 hits. The current slot's requirement also applies
if you move the secret destination to another fork. The original code can keep
an unlock latched during the run. The editor shows the mapped Normal/Ultimate
requirement; renaming a file does not change the engine's Zone slot.

Changing **which achievement activates a secret route** has no verified MMD-only
method. That specific native rule is distinct from editing the route links.
Galaxy Studio does not patch the executable.

## Adding a new fork: choice versus secret route

The Battle Zone **Route** tab shows a prominent **Secret routes — entire Battle
Zone** banner, even when the mission preview is hidden. The banner and **Where
this stage can lead** appear only in Route; Conditions & rewards keeps the reward
and stored-expression editors. It shows the stock slot's
requirement or explicitly reports no native trigger / an unknown slot. The banner
applies to all battles in that Zone, including newly added forks; it is not a
per-mission condition. Ordinary route choices do not require this achievement.
The unlock may remain active after being triggered, so repeating the action at
every subsequent fork is not necessarily required. The editor does not infer the
current in-game unlock state from MMD files.

The action that opens a secret route **cannot be changed in Galaxy Studio**.
It is selected by the executable's Normal/Ultimate Zone slot, not by the source
battle's identity or its stored +30 expression. A fork added to an ordinary
battle in Red Triangle therefore still uses Red Triangle's Super Attack victory
requirement. A previously activated unlock may stay latched during the run.

- **Two ordinary destinations:** the player can choose between them.
- **An ordinary and a secret destination:** while the secret unlock is inactive,
  the ordinary destination is used. The secret destination participates in the
  native secret-selection path when the Zone unlock is active; it is not simply
  added as another ordinary choice.
- **A Zone slot with no native trigger:** adding a secret link does not create a
  requirement or activate the secret branch. To make both branches accessible
  as a player choice, set both destinations to ordinary Stage kinds (0–7).

The stock slots without a native trigger are Normal Green Square, Blue Lozenge,
Aquamarine Sphere and Final, and Ultimate Lozenge and Sphere. Unknown/modded
filenames are labeled unknown rather than assumed to have no trigger. Filename
labels assume import back into the corresponding original slot.

Keep an ordinary continuation when experimenting with a secret fork. A graph
with only secret destinations has no ordinary continuation; stock fallback
behavior must not be used as an authored unlock mechanism.

## What is the stored +30 expression for?

This field exists in the original MMDs and mirrors the native secret requirements.
The selected-stage setup copies it into the stage snapshot, along with other
fields, at 0x271DD8–0x271DE4. Copying it is not evaluating its expression.
The secret-check → latch → destination-selection path instead reads the native
per-Zone checks; it does not evaluate +30. Conditional Rewards at +2C follow an
actual expression-evaluation call separately.

**No active evaluator or intended design purpose has been established for +30.**
It may be retained authoring data or vestigial logic, but those are hypotheses.
Do not describe it as globally proven unused, or promise that changing it unlocks
a route. The editor preserves the bytes and keeps the field under the collapsed
**Stored +30 expression (advanced research)** section for inspection and deliberate
experiments. Use **Route → Next stage nodes** for functional route changes.

## Arena and music are separate

The previous claim that every original Battle Zone arena was13 was incorrect.
Only Green Square uses13 throughout. Red Triangle uses11/4/3; Blue Lozenge
uses0/6/1; other Zones also vary. The existing original-mission CSV already
contains those varied values.

Battle setup reads the arena at **+1C** and converts it through the stage table
(15 falls back to0). The editor edits that word and updates the arena preview.
This native read path is distinct from music: the stock Battle Zone music
routine does not use the stored **+20** word to choose its song.
See [Music selectors](MUSIC_SELECTORS_EN.md). Runtime test status is recorded
separately in the research evidence; an editor preview is not a gameplay test.

Arena runtime follow-up (18 October2026): an isolated AFS changed only Green
Square node0 from arena13 to8 and was independently decoded back to the exact
edited MMD. RPCS3 reached the title screen, but game input could not be made to
advance in this session; the fight was not reached. **This is not a successful
in-game arena validation.** The arena read path above is static-code evidence.

## Tutorial / Practice arena selector 14

All nine root missions in the supplied original `tutorial.mmd` use selector 14.
The user identifies the arena as Tutorial / Practice. The catalog now names it
**Tutorial / Practice (Tutorial selector)** instead of Unlisted / raw value.
This descriptive name is not a newly extracted localized NAS label. It does not
prove that the tutorial arena can be selected normally in every other mode.
In particular, the traced stock Battle Zone converter accepts 0–13 and falls
back to Wasteland for values above 13.
