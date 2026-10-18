> **Historical report.** Read the [audited current findings](../SAVE_RAM_AND_EXPANSION.md) first.
> Pending statuses, fixture counts and some early interpretations below were
> superseded. GS512 missed later-discovered readers; D2 Zone cell21 ultimately
> failed its minimal control. This report does not establish a safe maximum.

# Editor follow-up from expansion research

These are recommended changes for a future release. **No application source or released ZIP was edited by this audit.** References below refer to the current Galaxy Studio 0.1 files and line numbers. The new evidence is in [SAVE_LIMITS.md](SAVE_LIMITS.md), [SAVE_LIMITS.json](SAVE_LIMITS.json), and [BATTLE_ZONE_STATIC.md](BATTLE_ZONE_STATIC.md).

## 1. Correct Battle Zone +0x10 everywhere

Confirmed meaning: **Displayed level (LV)**. It is not a persistent progress identifier, and changing it does not allocate independent progress. The read/display path is `0x271CB8` → scene `+0x4C4` → `0x2775FC..0x27761C`, with text `LV<DIG=●>`.

| Current location | Recommended correction |
|---|---|
| [editor/js/mmd.js](../../editor/js/mmd.js#L50), line 50 | Rename schema label `Persistent progress ID` to `Displayed level (LV)`. Rename internal key `progress` only after checking saved workspace/API compatibility; the serialized offset remains 16. |
| [editor/js/mmd-ui.js](../../editor/js/mmd-ui.js#L214), lines 214 and 229 | Replace the persistent-ID explanation and field label. Suggested help: `Shown as LV in the Battle Zone menu. Enemy strength comes from the selected preset. Saved progress uses mode, zone and grid position.` |
| [editor/js/mmd.js](../../editor/js/mmd.js#L405), line 405 | Remove the claim that a duplicated stage retains a persistent ID. Warn about duplicated save cells and copied route links instead. |
| [editor/js/mmd-ui.js](../../editor/js/mmd-ui.js#L367), line 367 | Replace the same incorrect duplication warning. |
| [editor/js/app.js](../../editor/js/app.js#L730), line 730 | Remove `New persistent progress IDs`; explain that normal/Ultimate mode and zone slot remain fixed, and grid positions select saved cells. Retain the separate music-override caveat. |
| [editor/README_EN.md](../../editor/README_EN.md#L93), lines 93 and 100 | Correct the field and duplication instructions. |
| [editor/tests/mmd-core.test.cjs](../../editor/tests/mmd-core.test.cjs#L48), line 48 | This test currently requires the incorrect `persistent progress ID` warning. Replace that expectation with the actual coordinate/save-cell behavior. |

## 2. Fix Battle Zone creation coordinates before recommending duplication

The current **New X defaults to donor X +15** at [editor/js/mmd-ui.js](../../editor/js/mmd-ui.js#L358), line 358, for both Galaxy and Battle Zone. This is unsuitable for Battle Zone's fixed grid. The handler at line 369 checks only finite float range. Map dragging at line 437 also writes unrestricted floating-point positions.

The original executable converts coordinates to integers and uses:

```text
cell = (integerX + 1) + 3 * (6 - integerY)
```

The supported grid is **X = -1, 0, 1; Y = 0..6**, with 21 cells. Each saved cell is selected by `(normal/Ultimate mode, zone slot, cell)`. Coordinates outside this grid can alias another cell or adjacent state; fractional values can truncate to the same cell.

Recommended changes:

- Branch the new-mission coordinate default by format. Keep free positioning for Galaxy; for ZONE, propose an unoccupied valid grid position.
- Snap ZONE dragging to the grid and preview its cell index. Do not treat ZONE coordinates as cosmetic layout.
- In [editor/js/app.js](../../editor/js/app.js#L685), the Zone validation block beginning at line 685 currently checks enemy presets and route targets. Add finite/integer/range checks for X/Y and report duplicate cells across the current route.
- A duplicate cell should produce an explicit shared-progress warning, with the affected root indices; do not silently renumber or modify existing files. Distinct cells are required for the new independent fights demonstrated by the expansion control.
- Do not simply cap root count at 21: 21 is the number of independent saved grid cells. Any deliberate alternate records sharing a position require separate semantics and clear warnings.
- Add the same checks to mutation/export paths, so raw edits and workspace imports cannot bypass the guided UI's constraints.

## 3. Enforce the established Galaxy mission boundary

[editor/js/mmd.js](../../editor/js/mmd.js#L392), line 392 currently allows duplication up to 65,535 roots. That is a binary descriptor limit, **not the game's persistent Galaxy capacity**. Original BLES00978 reserves 500 records. Mission index 500 aliases the first Galaxy aggregate record.

Recommended behavior for an identified Galaxy document:

- Allow creation at new index 498 or 499 when available.
- Reject a mutation producing index 500 or higher in the normal supported editor workflow, with a message such as `The original game stores Galaxy mission records 0–499. Creating mission 500 would overlap other saved data.`
- Keep parsing structurally valid research files for inspection, while marking incompatible game limits during validation and blocking a normal game-ready export. A separate research override, if ever added, must not be presented as safe.
- Recheck this in [editor/js/app.js](../../editor/js/app.js#L607), near line 607, and the export path at lines 850–855. A constructor/descriptor-only check is insufficient because raw descriptor edits and workspace loading also exist.
- Update the general messages at [editor/js/mmd.js](../../editor/js/mmd.js#L413), line 413; [editor/js/mmd-ui.js](../../editor/js/mmd-ui.js#L357), line 357; [editor/js/app.js](../../editor/js/app.js#L1339), line 1339; [editor/README_EN.md](../../editor/README_EN.md#L56), line 56; and [editor/TESTING.md](../../editor/TESTING.md#L61), line 61.

**Apply the 500-record finding specifically to Galaxy.** `MAIN` also includes tutorial.mmd; do not label this number as a newly verified tutorial save limit. Preserve the distinction between file geometry, mode-specific native constraints and runtime verification.

## 4. Separate owners, world-map icons and missions

[editor/js/mmd.js](../../editor/js/mmd.js#L410), line 410 already warns that populating an empty owner is not proof of a playable new Galaxy. Retain that caution and make the reason concrete:

- Owners are addressed by native IDs 0–99; out-of-range values fall back to owner 1 in verified native lookups.
- The world selection icons are a separate descriptor at MAIN header +0x18.
- Aggregate saved data has only **66 icon records**, indices 0–65.
- A 67th icon at index 66 may be visible in an isolated experiment but aliases the global saved native/flags words. It is not a supported independently saved Galaxy.

The current owner API at [editor/js/mmd.js](../../editor/js/mmd.js#L309), lines 309–324 uses the file's owner count only. Add mode-specific validation for owner IDs beyond 99. The general validator at lines 173–184 and [editor/js/app.js](../../editor/js/app.js#L607), near line 607, should inspect world-icon count for Galaxy and report index 66's save alias. Do not silently discard an experimental extra icon when opening it.

Use clear labels in future world-map editing: `Native character / owner ID`, `Galaxy selection icon index`, and `Mission root index`. They are not interchangeable. Existing native 99 has original content and must never be advertised as an unused owner.

## 5. Do not imply new standalone Battle Zones are discoverable from an extra file

Opening/editing a standalone ZONE MMD remains useful. A new archive member alone is not selected by the original menu. The game uses two modes with eight slots each. Normal zone slot 8 aliases Ultimate slot 0 in both the verified save arithmetic and the selector path.

Any future `Create new Battle Zone` UI should distinguish an editable MMD document from an independently selectable game slot. The safe demonstrated direction is adding fights to unused grid positions of an existing route while keeping original fights. Do not promote an appended file as a ninth independently saved Zone.

## Required regression cases for the next release

1. Original Galaxy roots 498 → add 498 → add 499; next append is rejected with the persistent-bound explanation and no partial mutation.
2. Import a synthetic 501-root MAIN Galaxy: parsing for inspection can succeed; supported export reports the incompatible save boundary.
3. Import the GX19A 67-icon probe: report the icon 66/global-field alias without confusing it with a mission-count error (its 500 roots fit).
4. ZONE new-mission default selects an unused valid grid cell; dragging snaps within X -1..1 / Y 0..6.
5. Two ZONE roots sharing a grid cell produce a warning even when +0x10 differs. Two different cells with identical +0x10 do not falsely share progress.
6. Changing `Displayed level (LV)` preserves the exact +0x10 encoding and leaves preset selection unchanged.
7. Export validation catches unsupported coordinates/counts introduced through raw editing or an imported workspace.
8. Existing original files roundtrip without changes, and released 0.1 packages remain archived unchanged.

These changes should be released with updated instructions and fresh tests; the audit did not claim that the current application already implements them.
