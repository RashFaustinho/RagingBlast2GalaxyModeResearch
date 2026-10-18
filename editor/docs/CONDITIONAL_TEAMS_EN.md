# Conditional teams and shared missions

A MAIN mission can belong to several Galaxies. Its ally and enemy lists contain **candidates**, each with a preset, an opaque u16, and an optional condition-expression reference. The game evaluates each condition for the selected Galaxy before copying participants into the battle. A long candidate list is not necessarily a large active team. The active limits remain one player plus four allies, and five enemies.

## Mission491: one record, six perspectives

| Selected Galaxy | Player | Additional allies | Opponents |
|---|---|---|---|
| Goku (native0) | Player’s Goku | Vegeta, Piccolo, Teen Gohan, Trunks | Hatchiyack |
| Teen Gohan (5) | Player’s Gohan | Goku, Vegeta, Piccolo, Trunks | Hatchiyack |
| Piccolo (11) | Player’s Piccolo | Goku, Vegeta, Gohan, Trunks | Hatchiyack |
| Vegeta (17) | Player’s Vegeta | Goku, Piccolo, Gohan, Trunks | Hatchiyack |
| Trunks (24) | Player’s Trunks | Goku, Vegeta, Piccolo, Gohan | Hatchiyack |
| Hatchiyack (99) | Player’s Hatchiyack | None | Vegeta, Piccolo, Gohan, Trunks, Goku |

The exact forms, moves and costumes on candidate fighters come from their presets. The selected player can choose an unlocked form; the comparison still uses the selected Galaxy’s native owner ID.

For example, ally preset18 is included when the selected Galaxy is11,5,24 or0. It is excluded for Vegeta’s own Galaxy17, because the player already fills that role, and for Hatchiyack’s Galaxy99. Enemy preset1031 is included for any of the five hero Galaxies. Enemy presets1032–1036 are included only for Galaxy99. The editor now resolves all six perspectives instead of presenting every candidate as an unconditional participant.

## Editing without writing a token program

1. Open galaxy.mmd and the Galaxy preset, Appearance and Strength DATs.
2. Select the mission and open Teams. Choose the Galaxy, or a Preview Galaxy in All Missions.
3. Read the resulting player/opponent teams. Unresolved entries need save or runtime context and are not assumed absent.
4. On a candidate, expand Choose Galaxies for this candidate. Select Always, Only in selected Galaxies, or Except selected Galaxies.
5. Check character names and click Apply Galaxy rule. Only this candidate’s expression changes. Undo restores it.
6. Review every Galaxy that owns this mission. A candidate rule does not add the mission to another owner list, nor change unlock/progression gates.

Replacing a custom expression removes its other requirements. Preserve it with Advanced condition if it also checks mission progress. Preview is read-only and never flattens conditions in the exported MMD.

## Native expression format

Each postfix token is eight bytes: big-endian u32 kind, signed i32 operand. Kind2 pushes a number; kind1 executes an operator; kind0 ends. QUERY is operator16. **Push argument, then query type**, because the native dispatcher pops type first. For native0: `number0, number5, QUERY, END`. OR combines several matching Galaxies; NOT inverts the result. The stack limit is32. Reference0 means no gate / always include for these rosters.

| MAIN query type | Meaning / evidence limit |
|---|---|
|1|Runtime statistic; requires battle/callback context|
|2|Mission index’s progression flag0x08|
|3|Mission index’s progression flag0x02|
|4|Always0 in the traced MAIN dispatcher|
|5|Selected Galaxy native ID equals the argument|
|6|Returns the argument value|

Do not infer that every use of flags0x08/0x02 is an identical user-facing “completed” state. The editor keeps the flag identity explicit. Likewise, Battle Zone condition callbacks are not assumed to share MAIN’s query semantics. Native pointers and condition descriptor numbers are not character IDs.

## Galaxy availability follows character availability

Reward kind9 sets the character-availability flag also used to show its Galaxy. The user independently verified this with save editing: leaving only Goku playable leaves only Goku’s Galaxy available. This differs from mission availability gates and from kind4 Galaxy transformation-form rewards. See the progression guide for the initializer and save checksum.

## Battle Zone coordinates: correction to0.2/0.3

Many original ZONE rows use X=2. All sixteen originals pass the0.4 coordinate/save check without editing any input. The native routine0x26FAF8 truncates each root float toward zero;0x318BE4 computes `(x+1)+3*(6-y)`. Saved records are0–20. Original X=0..2,Y=0..6 combinations actually used by the game fit; `(2,0)` does not. A fractional or unusual coordinate is preserved on import and checked by its computed record, with a warning about truncation or menu navigation. It is not silently rounded or rewritten. Wizard/drag tools use standard integer positions and exclude out-of-range records.

There are21 physical records per route. Standard coordinate ranges address20 of them (1–20); record0 would need a nonstandard position such as(-1,6). The editor does not advertise that as an ordinary spare fight position. Shared record warnings can be intentional conditional alternatives. A clean file check still does not simulate gameplay or prove every new route works.
