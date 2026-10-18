> **Historical report.** Read the [audited current findings](../SAVE_RAM_AND_EXPANSION.md) first.
> Pending statuses, fixture counts and some early interpretations below were
> superseded. GS512 missed later-discovered readers; D2 Zone cell21 ultimately
> failed its minimal control. This report does not establish a safe maximum.

> **2026-10-15 correction:** original ZONE files use X=0,1,2, not−1,0,1. The traced cell formula remains `(intX+1)+3*(6-intY))`. All original positions fit cells0–20, but (2,0) computes21 and is excluded. Standard coordinates address cells1–20; cell0 requires a nonstandard position. See `../limits-20261015/BATTLE_ZONE_FREE_CELLS.json`. Earlier grid-range wording below is historical.

# Save and allocation bounds for new Galaxies and Battle Zones

Scope: original European BLES00978 executable, SHA-256 `8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892`. This is read-only static research, checked against the save files from the already completed ADV18E test. No executable or personal save was changed for this analysis. Runtime results from the new expansion tests are reported separately.

## Galaxy missions: exactly 500 persistent records

The original file has 498 roots. The save reserves **500 mission records, indices 0–499**, at `SYS-DATA + 0x8148 + missionIndex × 0x1C`. Therefore **498 and 499 are the two unused mission indices** in the original file. Existing ADV18E already proved that 498 can complete and persist across a full emulator restart. This analysis does not separately claim runtime verification of 499.

Evidence:

- `0x1D2FDC..0x1D3018` loops exactly 500 times over `save + 0x8148 + index × 28`.
- `0x309BAC..0x309BE0` independently scans the same 500 records.
- `0x3196B8..0x319824` processes 500 mission records, then a separate 66-record aggregate table beginning at relative `0x36B0`.
- `0xF8310..0xF8328` writes the mission score at record `+8` using the mission index directly, with no index-to-save remapping.
- In the supplied post-ADV18E save, mission 117 is at `0x8E14` with score 636558 (matching the original screenshot), and new mission 498 is at `0xB7C0`, score 336650 at `0xB7C8`.

**Mission 500 would address `0xB7F8`, the first existing Galaxy aggregate record.** A parser accepting a 501st root does not make that root safe for persistent use.

## Galaxy icons: 66 aggregate save records

The table immediately after mission storage is **66 records × 28 bytes**, at `save + 0xB7F8 + galaxyIconIndex × 28`. This is the Galaxy selection icon index; it is a different namespace from a character's native ID and the 100-row owner table.

Known fields are aggregate score `+0`, flags `+4`, and last selected mission `+8`. The initializer `0x3190D4` zeroes the entire Galaxy save section (`0x3E80` bytes), then initializes 66 aggregate last-mission words to -1 (`0x319104..0x319124`). Menu population at `0x1D6E74` reads aggregate flags using the icon loop index. Normal score handling at `0xF8334..0xF8360` writes aggregate score, and `0xF8220..0xF8244` writes the boss-completion flag.

**Appending icon 66 does not provide a new independent save record.** Its calculated record starts at `0xBF30`, exactly the global last-selected-native field (`Galaxy section +0x3DE8`). Its `+4` aliases the global flags at `0xBF34` (`+0x3DEC`). Its `+8` addresses a following unclassified save word.

`0x1E8CB8..0x1E8CBC` writes the global selected native, while `0x1E8CD4..0x1E8CEC` writes the aggregate last-mission field. A 67th icon may be useful as an isolated compatibility probe, but selection, launch, victory, or even a successful reload cannot by themselves establish independent save storage: these addresses are already shared.

## Dynamic menu memory does not enlarge the save

`0x2F4938` obtains MAIN's parsed root and edge counts, stores them in the progression context, and allocates one byte per root and per edge (minimum one byte for zero counts). Consequently a larger MAIN can fit the menu's dynamic flag buffers. This explains why adding a root is not blocked at the allocation layer.

A separate launch structure is fixed: `0x1CDA20` clears 16 u32 words at battle config `+0x0C..+0x4B`, giving 512 bits. `0x1CDA48` sets a bit without a bounds check; `0x1F0A04` iterates all roots and copies flags into it. Index 512 would write at config `+0x4C`, which holds the selected native character. This is a second limit, although the 500-record save bound is reached first.

## Owner table lookup stays within 0–99

`0x1F0AB8`, `0x1F0BEC`, and `0x1D67CC` compare the owner ID with 99. An out-of-range value uses offset 12, i.e. owner record 1. Appending an owner record numbered 100 therefore does not produce an independently addressable galaxy through these paths. Existing owner 99 must not be treated as an empty spare: it already has original content.

## Battle Zone save layout

Independent save-base inspection confirms `save + 0x5E20 + mode × 0x1060 + zone × 0x20C`. Mode is read at the Battle Zone singleton `+4`, zone at `+8` (`0x2729AC..0x2729D4`; index arithmetic `0x272C60..0x272C78`).

The parallel Battle Zone analysis traces the cell formula and setters: each zone has a **3×7 grid of 21 cells**, each 24 bytes, with `cell = (integerX + 1) + 3 × (6 - integerY)`. There are **8 zones per mode and 2 modes**. See [BATTLE_ZONE_STATIC.md](BATTLE_ZONE_STATIC.md) for the full read/write disassembly and UI constraints.

A ninth normal zone aliases Ultimate zone 0 because `8 × 0x20C = 0x1060`. Reusing coordinates shares cell progress. **ZONE root +0x10 is the displayed LV, not a persistent save ID.** The parallel analysis traced root +0x10 through `0x271CB8` → scene +0x4C4, then the UI formatter at `0x2775FC..0x27761C`, using English text 40, `LV<DIG=●>`. Progress in the verified save path is keyed by mode, zone and coordinates.

## Corrections for future documentation/editor versions

Do not modify the already released ZIPs. Add these findings to a new version:

1. Galaxy append must enforce the 500-record save boundary. A new mission index 500 or higher is not safe merely because its MMD structure validates.
2. The ADV18E example remains valid at index 498. It demonstrates one additional mission, not unlimited expansion.
3. Warn against presenting icon 66 or owner 100 as a supported independent Galaxy. Icon 66 aliases existing global save words; owner 100 falls back to owner 1.
4. Keep the three Galaxy indices distinct: native/owner ID, selection icon index, and global mission root index.
5. Battle Zone coordinate editing must warn about shared save cells and stay inside the 21-cell grid. New zone indices cannot be assigned independent save storage by appending another MMD member.
6. Relabel ZONE +0x10 as **Displayed level (LV)**; do not promise unique save progress from changing that value.
7. Static fit is a necessary constraint, not proof that every unused slot supports every menu/character combination. Each candidate expansion needs selection, gameplay, save and cold-reload checks on a disposable research profile.

Evidence ranges and concise numeric checks are recorded in [SAVE_LIMITS.json](SAVE_LIMITS.json). Full disassemblies are retained in the research scratch directory `expansion-20261015/save-static/`.
