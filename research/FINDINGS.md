# Current findings and evidence levels

This is the current interpretation, audited for the first GitHub release on
18 October 2026. Older reports are retained where useful, but are not equally
authoritative. See [experiment history](EXPERIMENT_HISTORY.md) for corrections.

The 19 October [main-player costume follow-up and EBOOT roadmap](EBOOT_PATCH_ROADMAP.md)
add a separate exact-input code investigation; the published 1.0 application is unchanged.
The [ordinary VS DLC costume follow-up](vs-costumes-20261019/VS_COSTUMES_EN.md)
verifies Goku Costume 8 and Vegeta Costume 3 through normal selection and native
battle initialization. It is separate from Download preset availability and does
not write costume-unlock bits or enlarge saves.

## Evidence vocabulary

| Label | Meaning |
|---|---|
| File/code | Parsed original files and/or traced instructions agree on the claim |
| Controlled runtime | An identified running actor/configuration was inspected, with any HP, aura or resident-data interventions disclosed |
| Natural runtime | Normal input produced the tested result without injecting HP, score, objective, code or registers during completion |
| Persistence | Native save write plus a full-process cold reload; stronger than a menu screenshot or savestate |
| User observation | Independent report by the project owner; not silently relabeled as a cloud test |
| Editor test | UI/codec/validation behavior; does not by itself prove gameplay |
| Unresolved | Incomplete consumer trace, failed control or hypothesis |

## Architecture and ordinary editing

| Finding | Evidence | Main references |
|---|---|---|
| Mission fighters reference mode-specific presets, not native character IDs | File/code; initial equipment gameplay control | [Preset chain](PRESETS_ITEMS_AND_TRANSFORMATIONS.md), `elf-evidence.txt`, original preset catalogs |
| Appearance is 32 bytes, Strength 88, preset 44; normal DAT headers are 16 bytes | File/code; exact roundtrips | [Formats](FILE_FORMATS.md), editor codecs/tests |
| Strength contains 20 item-index slots | File/code; controlled loadouts | [Items](PRESETS_ITEMS_AND_TRANSFORMATIONS.md) |
| Appearance contains five local move selectors | File/code; all five custom selectors reached a live ally | [Advanced moves](advanced/GALAXY_ADVANCED_RESEARCH_EN.md) |
| Form changes can load the destination preset's equipment/moves | Controlled runtime; later user tests | `kb15b-g3-confirmed.json`, `kb15b-g0-confirmed.json` |
| Native form slots select action/animation independently from preset destinations | File/code; user animation report; controlled corrected requests | `NATIVE_FORM_SLOTS_BLES00978.csv`, [transformation analysis](PRESETS_ITEMS_AND_TRANSFORMATIONS.md) |
| Galaxy main player explicitly starts in costume0; a one-instruction costume1 override reached config and actor | File/code; separate-process RPCS3 control | [Costume and executable roadmap](EBOOT_PATCH_ROADMAP.md); visual textures and form continuity not certified |
| Shared missions use conditional team candidates | File/code; original mission 491; six-perspective editor regression | [Teams](TEAMS_CONDITIONS_AND_ACTIONS.md) |
| MAIN modifiers equip the player team, including allies; enemy items belong in Strength | Traced merge plus controlled runtime | [Modifier runtime](limits-20261015/MODIFIER_TARGET_RUNTIME_EN.md) |
| Rule wording, equipment and UI item icons are independent fields | File/code; original mission 496 control | [Progression/modifiers](../editor/docs/PROGRESSION_AND_MODIFIERS_EN.md) |
| Existing action requests can coexist with ordinary defeat-enemy victory | Original data; native victory branch; distinct ADV18C/ADV18E controls | [Optional actions](advanced/OPTIONAL_ACTION_PROMPTS_EN.md) |
| Tutorial texts exist in six languages; text IDs differ from action/glyph IDs | Files; lossless codec and AFS tests | [Tutorial messages](../editor/docs/RELEASE_PREPARATION_EN.md) |

## Maps, progression and Battle Zone

| Finding | Evidence | Limits |
|---|---|---|
| MAIN coordinates, incident-edge lists, membership and category are separate | Files/code; added node and editor tests | D-pad direction ranking is not fully decoded |
| Category selects an independent circle pool, including one Boss circle | Native allocator; user invisible-second-Boss observation | Simultaneous visibility matters; no universal radius field established |
| Playable-character unlock also gates Galaxy availability | Native reward path; user save edit | Creating membership alone does not create a world icon |
| Existing Galaxy can be transferred to a transformed form | Original-executable natural diagnostic victory/save/cold reload | Reuses one icon and aggregate; 45/66 original donors pass static supported-layout audit |
| MAIN query 2 means cleared, returning 8/0; query 3 available, returning 2/0 | Reproduced callback/writer trace | Do not compare true results with literal 1; Zone callback meanings are not inherited |
| Battle Zone +34 links and destination kinds can be edited | Files and traced selection path; editor link tests | Secret action is not an editable per-battle MMD override |
| Secret requirement belongs to Normal/Ultimate Zone slot; success can latch | Traced requirement/latch/selection routines | Do not promise it must repeat at every fork |
| Outcome flags 11/12/13 are Super win / Ultimate win / Raging Soul win | Reproduced cross-check with native action/result bits | Static proof, not a new playthrough of every secret route |
| Zone +30 stores an expression but the traced stock secret flow does not evaluate it | Traced flow; selected-stage copy | Not proven globally unused; preserve it |
| Zone arenas vary and are read at +1C; +20 music is ignored by stock selection | Original 16 MMDs; native code | Arena-only gameplay attempt did not reach combat |
| A scoped Zone music hook passes explicit0/6 from two roots into native setup;56 retains a native-pool fallback | Verified helper/config and initialized actors; controlled root0 finish/advance | Null audio; one Zone, not all songs/modes/final-Zone cases; see [follow-up](executable-followup-20261019/RESEARCH_EN.md) |
| Music 30/31 are the two Battle of Omega variants; 56 is mode-dependent | Original localization plus native consumers | No listening test of every song; regional audio tables differ |

## Capacity results: what was actually demonstrated

- Stock Galaxy has 498 roots and 500 result records. ADV18E's added root 498
  completed and persisted with the original executable. That is not a 501-record test.
- A 67th world icon was selectable and could launch combat, but its score aliased
  unrelated saved globals. That original-executable fixture was unsafe. The later
  G67 executable/save prototype isolates67 aggregates and now has a native339000-point
  win, engine save and exact full-buffer cold reload; see the
  [follow-up](executable-followup-20261019/RESEARCH_EN.md). G100 later demonstrated world index99/root531 with native save and exact cold reload; this is a boundary control, not100 fully played Galaxies.
- A replacement Goku → Goku SSJ2 Galaxy completed a natural diagnostic action win,
  saved, and cold-loaded with the original executable and existing 66-icon count.
- GS512 is a mission-only experimental format. Its limited successful runtime tests
  do not certify all readers; D2 later found further old-bank consumers.
- D2 doubled the save to 110,000 bytes. Galaxy root 1039 naturally completed, saved
  and cold-loaded. Sparse Tutorial root 63 did too, with only ten visible missions.
- The full 64-visible-Tutorial fixture failed a separate circle pool. D2 Battle Zone
  boundary fixtures failed before a demonstrated added-cell native save/reload.
- **No definitive safe maximum for an arbitrarily rewritten engine was established.**
  See [Save/RAM analysis](SAVE_RAM_AND_EXPANSION.md) for offsets, failure modes and scope.

## Cross-region scope

User tests confirm editor import/export with PAL, NTSC-U and NTSC-J, including v2.00.
Native code addresses, exact ELF deltas and save-expansion prototypes remain bound
to the original European ELF hash. These are different compatibility claims.
