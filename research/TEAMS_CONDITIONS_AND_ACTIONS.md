# Conditional teams, progression, modifiers and action requests

## Shared battles are filtered candidate lists

Ordinary MAIN ally/enemy groups contain candidate preset IDs plus optional expression
references. The game evaluates the conditions before filling a team. Mission 491 is
shared among Goku, Vegeta, Piccolo, Teen Gohan, Fighting Teen Trunks and Hatchiyack.
It can legitimately contain the same hero names on both candidate sides: the selected
Galaxy chooses which candidates are active. Flattening the lists creates a false
"heroes versus heroes plus Hatchiyack" interpretation.

The player is separate from up to four allies; active opposing capacity is five.
A candidate list longer than those numbers can be valid when its conditions are
mutually exclusive. Unknown saved/runtime state must stay unknown in offline preview.
Special spawned group formats are preserved, not treated as ordinary rows.

## Readable queries

Mission 483's Raditz test is `38, 5, QUERY16, END0`: argument native 38, query type 5,
operator 16, terminator 0. Native 38 is Raditz; it is not preset 38 or mission 38.
The simple editor can represent OR lists and NOT(OR(...)); complex comparisons
remain raw and are not silently simplified. Applying a stored program adds its
required End: 0, while merely viewing it leaves bytes unchanged.

MAIN callback 2 tests clear-history mask `0x08`, returning 8 or 0. Callback 3 tests
availability mask `0x02`, returning 2 or 0. Visibility has a separate `0x20` bit.
Use query 2 for a cleared predecessor; query 3 may be true before first victory.
Use truth tests rather than `== 1`. These names are not assumed for Zone callbacks.
See [reproduced native evidence](MAIN_PROGRESSION_FLAGS_NATIVE_EVIDENCE.json).

## Unlocking a character, form or Galaxy

Mission visibility, eligibility, victory and reward execution are separate stages.
Character unlock state also controls which Galaxy is available. The user independently
confirmed that removing all playable characters except Goku leaves only Goku's Galaxy.
Transformations have their own unlock rewards; owners/world icons remain separate.

Known reward namespaces include item inventory, native form availability, playable
character/Galaxy unlock, Museum picture, Dragon Ball reward and enhanced-character
group. Enhanced-group IDs come from `cs_form.dat`, not native IDs or world-icon IDs.
The editor's named reward catalog and unlock-source view derive from
[PROGRESSION_REFERENCE.json](studio-v02/PROGRESSION_REFERENCE.json) and the traced
dispatch `1EA228..1EA788`. Unknown/opaque reward variants are not assigned invented
names. An existing save may already contain an unlock, hiding a changed gate's effect.

## Rule text, actual effects and icons

These are independent fields:

1. Rule-description selectors and parameter expressions describe the mission.
2. Root +4C contains equipment indices merged onto the **player's team**, including
   allied candidates, in the traced stock path.
3. Root +50/+54 contains mission-menu item icons; displaying an icon does not equip it.

Original mission 496 uses rule 10, Health Auto-Loss V / item 296, and UI list A 296.
This is a coherent original example, not an automatic synchronization rule. Give
enemy CPU bonuses through each enemy preset's Strength. The merge at `12C83C` and
the later runtime control establish player-team targeting. Every Seal interaction
and every exotic effect has not been separately played.

For an ordinary fight, start with known basic donor 238, choose defeat-enemy objective
0/1, clear unneeded captions, numeric parameters, mission modifiers and time limit.
Inspect enemy Strength separately. The editor's basic-setup action deliberately
retains opaque fields and offers to keep action prompts. "No displayed rule" is
not equivalent to "no effect anywhere."

## Optional action prompts and Tutorial messages

The action list is a sequence of existing native detectors, not arbitrary controller
glyphs or a general QTE language. Each 12-byte row is `(u32 action, s32 directParameter,
u32 parameterExpressionReference)`, with a known limit of 20 actions.

Category 2 controls the usual Perfect Action presentation. Objective 29 wins when
the action sequence completes; objectives 0/1 retain normal enemy-defeat victory.
Original missions 97, 174, 300 and 239 show optional requests. All 20 stock Galaxy
missions with action lists use an objective other than 29.

ADV18C loaded a prompt with objective 0; ADV18E used objective 29 and a natural
Ascend input to win while the enemy retained 40,000 HP. Root 498's result then
persisted through a cold restart. The controls are distinct and ADV18C still had
prototype map defects. See [complete optional-action evidence](advanced/OPTIONAL_ACTION_PROMPTS_EN.md).

Numeric expressions must be copied/rebound when transferring lists between files;
descriptor 12 in Tutorial is not descriptor 12 in Galaxy. Tutorial help-message
order uses separate DAT tables, while localized text lives in six G_Tutorial packs.
CPU `tut_type_*.cmr` and `tut_logic_list.dat` are a further system, not fully decoded.
Battle Zone Challenge Stamps are distinct from Galaxy action prompts.
