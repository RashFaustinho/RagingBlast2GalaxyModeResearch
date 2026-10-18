> **Historical report.** Read the [audited current findings](../SAVE_RAM_AND_EXPANSION.md) first.
> Pending statuses, fixture counts and some early interpretations below were
> superseded. GS512 missed later-discovered readers; D2 Zone cell21 ultimately
> failed its minimal control. This report does not establish a safe maximum.

> **2026-10-15 correction:** original ZONE files use X=0,1,2, not−1,0,1. The traced cell formula remains `(intX+1)+3*(6-intY))`. All original positions fit cells0–20, but (2,0) computes21 and is excluded. Standard coordinates address cells1–20; cell0 requires a nonstandard position. See `../limits-20261015/BATTLE_ZONE_FREE_CELLS.json`. Earlier grid-range wording below is historical.

# Additional Battle Zone entries — original BLES00978 executable

A new standalone ZONE file can be created and appended to the parameter archive while preserving every original file. The original executable does **not** enumerate arbitrary additional ZONE files into the Battle Zone selector. Its menu, archive lookup, and save layout all assume eight routes per mode. This is a stronger constraint than merely observing sixteen original filenames.

This document records static evidence and the prepared additive fixture. The separate runtime experiment must be cited before calling its expected result an observed result. No executable was changed.

## Archive lookup is positional

The original inner `battle_zone_param_m.pak` has seventeen members: indices 0–7 normal routes, 8–15 Ultimate routes, and 16 `zone_item_open.dat`.

At `0x26CFC4`, the game retrieves the container. Instructions `0x26D024`–`0x26D050` calculate `mode * 8 + selectedZone`, multiply by the 48-byte STPK directory stride, read the relative data offset, and pass that payload to the ZONE parser at `0x26D054`. No filename search or directory-count enumeration occurs on this path. The selector's preview paths at `0x267164`–`0x2671B0` and `0x267868`–`0x2678B4` perform the same positional calculation.

Appending member17 therefore does not make a new selector entry. Inserting it at index8 would instead shift Ultimate Square and the other original routes. Index16 is already a different data type and cannot safely be treated as an extra route.

## The selector count is native

The navigation routine `0x265050` loads mode at `0x2650C4` and calculates its entry count at `0x2650D4`–`0x2650D8`: nine entries for mode0 and eight for mode1. **The normal selector's index8 is a special mode-switch action**, not a ninth route. The `selectedIndex == 8` branch at `0x26A7B4` leads to `0x26B44C`, which takes a separate transition path instead of storing it as the selected battle map.

Real route selection stores the index at global-state `+8` via `0x26A7D4`–`0x26A7DC`. In the original file, the native global-state pointer is read through the TOC entry `r2-0x260`; the resolved pointer address is recorded in the JSON evidence.

The completion scanner also explicitly processes zone indices0–7 at `0x26D548`, then two modes at `0x26D564`. Save aggregate code independently uses eight routes (`0x318C4C`) and two modes (`0x318C5C`). Menu positions and ordering additionally use native table `0x5F2050` rather than the added ZONE's root coordinates; root coordinates place fights *inside* an existing map.

## Save identity is also fixed

The primary per-map fight progress cell is selected by coordinates. Function `0x318BE4` computes:

```text
cell = (integerX + 1) + 3 * (6 - integerY)
```

The callers convert the root's floating-point X/Y to integers. `0x26FB58` updates the cell's flag at:

```text
saveBase + 0x5E20
         + mode * 0x1060
         + selectedZone * 0x20C
         + cell * 0x18
         + 8
```

The flags word is ORed with `0x20` at `0x26FBD4`. The corresponding record read is visible at `0x26FC04`–`0x26FCA4`. Aggregation traverses21 cells (`0x318B50`). Original grid positions map to X=-1,0,1 and Y=0..6. Fractional or overlapping positions can consequently collide in progress storage even if they look separate in a map.

**Correction to the earlier research wording: root `+0x10` is the displayed LV number, not a persistent progress ID.** `0x271CB8` reads that root word, `0x26CD88` stores it in scene field `+0x4C4`, and `0x27760C` reads it for formatting. Just before that, `0x2775FC` requests textID40, which is `ZON_040_US.txt = LV<DIG=●>` in the original `B_Zone_US.pak`. The numerical formatter is called at `0x27761C`. The actual CPU strength remains in the selected strength preset; the observed save cell uses mode, route index, and coordinates.

The ninth normal map would alias Ultimate Square's save block because `8 * 0x20C == 0x1060`. Raising a menu limit alone therefore cannot create an independent saved route. The original save layout, aggregate scans, menu assets/order, positional resource selection, and mode offsets would all need to be addressed by any future executable extension.

## Prepared additive two-fight fixture

`zone_research_additive.mmd` contains two new root records and a path0→1:

| Fight | Normal preset | Character | Grid position | Kind |
|---|---:|---|---|---:|
|0|5|Krillin|(0,0)|0|
|1|0|Saibamen|(0,1)|6 — Climax|

Both use the original Green Square stage/music defaults, no handicap, no reward entries, and no stamp criteria. Its `+0x10` values39/40 are displayed level labels. This prototype is intended to test discovery first, not to claim a completed new-route implementation.

The expanded `battle_zone_param_m-appended.pak` has18 members. All seventeen original member names, indices, payload bytes, and hashes remain identical; the new file is appended at index17. Its builder retains original opaque directory fields and padding. The source archive is untouched.

MMD SHA256: `66f57b45e63197e6f57f670ca77fdbfc3b356966c27ab278271196b55658dc07`.

A useful runtime control is to confirm the expanded parameter archive and appended member actually reached memory, then inspect the unchanged selector and stop at `0x26D054` to identify the selected payload. Loading the original map successfully is a control; it must not be described as having selected the new route.

The exact assembly, instruction hashes, original ELF hash, prototype manifest, and recommended breakpoints are in `BATTLE_ZONE_STATIC.json`.

## Additive branch control within an existing Zone

A second fixture expands Green Square from four to six fights. The original route0→1→2→3 stays present. Root0 gains another outgoing edge to new root4 (Krillin), followed by new root5 (Saibamen), then original root3. The new fights use previously unused coordinates(-1,1) and(-1,2), which map to separate save cells15 and12 within the established21-cell range. Original roots1,2,3 remain byte-identical; root0 differs only in its outgoing-list descriptor. Displayed levels2/3 are copied from the corresponding original stage donors.

`battle_zone_param_m-combined.pak` includes both this branch and the standalone file at member17. Its directory still preserves every original file index. The other sixteen original member bodies remain identical. `ZONE_BRANCH_MANIFEST.json` records hashes, grid cells, and the sole original root-field change. Runtime play of these added fights is reported separately.
