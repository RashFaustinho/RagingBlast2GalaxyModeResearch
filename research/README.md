# Research knowledge base

**This research was produced predominantly with AI assistance.** Start with the
[project disclosure](../README.md). The evidence labels below exist because early
AI interpretations were sometimes wrong and later controls changed the conclusions.

This is the curated English entry point for the work of 14–18 October 2026. It
replaces the original Discord exports and scattered personal working notes in the
current repository tree. At the owner’s explicit request, the previous Git history containing private Discord
exports is replaced by a clean root. Local transcript-bearing backups are removed;
server-side unreachable objects/caches may require GitHub Support. Game binaries, fixtures, saves and RAM dumps are
not distributed. Quoted original localized strings in evidence retain their source
language for identification; all current explanations and guides are English.

## Recommended reading order

| Read | Purpose |
|---|---|
| [Current findings](FINDINGS.md) | What is known, evidence levels and limits of each conclusion |
| [File formats](FILE_FORMATS.md) | MAIN/ZONE/DAT layouts, offsets, endian rules and separate ID namespaces |
| [Archives and reproduction](ARCHIVES_AND_REPRODUCTION.md) | Which AFS/PAK to inspect, repeated copies, input hashes and read-only commands |
| [Presets, items and transformations](PRESETS_ITEMS_AND_TRANSFORMATIONS.md) | Correct item IDs, native animation slots, destination loadouts and switch limits |
| [Teams, conditions and actions](TEAMS_CONDITIONS_AND_ACTIONS.md) | Shared mission perspectives, postfix queries, modifiers, rewards and prompts |
| [Galaxy graph and progression](GALAXY_GRAPH_AND_PROGRESSION.md) | Reachable new fights, circle pools, freeing IDs and transferring an existing Galaxy |
| [Battle Zone](BATTLE_ZONE.md) | Directed routes, per-Zone secret actions, rewards, arenas, music and grid keys |
| [Save/RAM and expansion](SAVE_RAM_AND_EXPANSION.md) | Stock boundaries, GS512/D2 outcomes, corruption paths and what remains unproven |
| [Experiment history](EXPERIMENT_HISTORY.md) | Failed controls, withdrawn observations and corrected assumptions |
| [Open questions](OPEN_QUESTIONS.md) | Unresolved consumers and useful next experiments |
| [AI/human handoff](AI_HANDOFF.md) | Resume without repeating disproven theories or stale operational instructions |

## Editing manuals

- [Detailed beginner/HxD guide, corrected revision 2](GALAXY_MODDING_BEGINNER_GUIDE_EN_V2.md).
- [Advanced moves, allies, actions and Battle Zone](advanced/GALAXY_ADVANCED_RESEARCH_EN.md).
- [Optional action requests: exact original examples and runtime controls](advanced/OPTIONAL_ACTION_PROMPTS_EN.md).
- [Current editor condition guide](../editor/docs/CONDITIONS_AND_BATTLE_ZONE_EN.md).
- [Progression, rewards and player-team modifiers](../editor/docs/PROGRESSION_AND_MODIFIERS_EN.md).
- [Music selectors and mode-specific behavior](../editor/docs/MUSIC_SELECTORS_EN.md).
- [Existing-Galaxy transfer: original executable, native save and cold reload](galaxy-transfer-20261016/TRANSFER_EN.md).
- [Studio user guide](../editor/README_EN.md) and [developer workflow](../DEVELOPMENT.md).

## Original-data catalogs

| File | Scope |
|---|---|
| [Mission index](GALAXY_MISSION_INDEX_ORIGINAL.csv) | 498 original roots, owners, file offsets and opponent references |
| [Native characters](advanced/NATIVE_CHARACTER_IDS_EN.csv) | 100 native character/form names and text bindings |
| [Equipment](item-catalog-BLES00978-EN.csv) / [readable list](ITEM_LIST_EN.md) | 381 equipment indices, original names/descriptions and property metadata |
| [Native form slots](NATIVE_FORM_SLOTS_BLES00978.csv) | Native destination/cancellation flags; separate from custom preset links |
| [Local moves](advanced/LOCAL_MOVE_IDS_EN.csv) | 690 native-local bindings; 24 unresolved rows explicitly marked |
| [Arena selectors](STAGE_IDS_BLES00978_EN.csv) | Ordinary stage labels plus the user-identified Tutorial selector 14 |
| [Music selectors](MUSIC_IDS_BLES00978_EN.csv) | Corrected native labels and sentinel 56 |
| [Galaxy objectives](advanced/GALAXY_OBJECTIVE_TYPES_EN.csv) | Original objective text bindings, not universal tested recipes |
| [Rule captions](advanced/GALAXY_RULE_DESCRIPTION_TEXTS_EN.csv) | One-based selectors and text IDs |
| [Native actions](advanced/JUST_ACTION_TEXT_IDS_EN.csv) | Native detector label bindings; not arbitrary button codes |
| [Zone roots](advanced/BATTLE_ZONE_MISSIONS_ORIGINAL.csv) | Original 16-Zone fields and varied arena selectors |
| [Handicaps](advanced/BATTLE_ZONE_HANDICAP_CODES_EN.csv) / [Stamps](advanced/BATTLE_ZONE_CHALLENGE_STAMP_CRITERIA_EN.csv) | Separate enum namespaces |

Further decoded tables, property snapshots and structured experiment captures remain
alongside those catalogs. The inventory identifies their role; an old snapshot's
derived label is not automatically authoritative over its raw indices/bit words.

## Native proofs and recorded runtime evidence

- [MAIN progression masks](MAIN_PROGRESSION_FLAGS_NATIVE_EVIDENCE.json),
  [Zone result flags](BATTLE_ZONE_OUTCOME_FLAGS_NATIVE_EVIDENCE.json),
  [Zone route/arena consumers](BATTLE_ZONE_CONDITION_NATIVE_EVIDENCE.json),
  [music consumers](MUSIC_SELECTOR_NATIVE_EVIDENCE.json).
- `kb10*`, `kb11*`, `kb13*`, `kb15*` JSON/JSONL: identified actors, form requests,
  equipment/property words and disclosed controlled interventions.
- `advanced/ADV18*`: added mission/action and native persistence observations.
- `galaxy-transfer-20261016/`: original-EBOOT existing-icon transfer, save and cold load.
- `double-save-20261015/`: D2 layout, exact delta, stack/circle/grid audits and
  persistence evidence. Start with the audited current save/RAM report, not an old
  pending matrix or transient handoff.
- `limits-20261015/`: historical GS512 work, original Tutorial boundaries and modifier
  runtime control. GS512's later-discovered missed consumers are documented above.

The publication audit reran selected read-only native proofs and exact patch
reproduction. It **did not replay every historical emulator experiment**. Some old
reports mention private scratch files that are not distributed; important missing
structured audits have been added, while transient logs and full game material stay
private. Missing artifacts are not replaced by invented evidence.

## Machine-readable entry points

- [CLAIMS.json](CLAIMS.json): stable finding IDs, evidence levels, source links and caveats.
- [EVIDENCE_INDEX.json](EVIDENCE_INDEX.json): included research files with roles and SHA256.
- [SOURCE_NOTE_AUDIT.json](SOURCE_NOTE_AUDIT.json): disposition/hashes of the previous
  note collection, including consolidation of Italian notes into English topics.
- [PUBLICATION_AUDIT.json](PUBLICATION_AUDIT.json): what was actually rechecked for
  publication, as distinct from historical observations.

Use [tools index](../tools/README.md) for reproduction helpers. Preserve confidence
levels when quoting conclusions. A configured table size, successful editor export,
selectable icon or valid checksum alone is not proof of a safe playable expansion.
