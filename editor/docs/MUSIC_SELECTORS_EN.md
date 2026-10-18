# Music selectors — corrected native bindings

The music field stores a **selector**, not a localization text-file number or
an ADX audio-file number. Those three namespaces differ.

| Stored value | Correct meaning |
|---|---|
| 0–29 | Named tracks in the original catalog |
| **30** | **Battle of Omega (Solo Guitar)** |
| **31** | **Battle of Omega (Full)** |
| 32–55 | Additional selectors with titles corresponding to 6–29; audio banks depend on the resident JP/US table |
| **56** | **Random sentinel, with mode-specific behavior** |

The old “30 = Select Randomly” and “31 = ???” labels were incorrect. The first
word of a resident BGM record is a **stream index**, followed by a bank selector
and a preserved halfword. Treating that stream index as a localized-name ID
produced the wrong labels. Native name lookup has explicit cases: selector30
uses name text58, selector31 uses text59, and selector56 uses text54 (“Select
Randomly”). Selectors32–55 use name texts30–53. The corresponding stream rows
for 30/31 refer to JP-bank stream54/55; they are valid bonus themes.

## Galaxy and Tutorial

Galaxy reads music from mission root **+0x0C**, but converts value56 to **6,
The Great Expectation**, before building the battle configuration. Therefore
56 does **not** randomize Galaxy mission music.

Tutorial also reads root +0x0C, but passes56 through. The low-level sound
resolver recognizes56 and chooses among resident entries0–55. It is not a
57th audio-table row. The editor labels56 according to the selected mode and
shows this distinction beside the field and in the live preview.

## Battle Zone

The original Zone MMDs store56 at root **+0x20**, but the stock battle-setup path
does **not read that word to select the song**. It calls a separate Zone music
routine and writes that result into the battle configuration. A Zone containing
56 is not silent. Changing that word to a fixed selector alone does not force
the desired song either; the editor retains the raw field and explains this.

The native routine uses two music pools:

- Ordinary stage types: **7, 8, 9, 10, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 26, 27, 28, 29**.
- Climax/Last types6,7,14,15: **33, 35, 38, 39, 40, 41, 42, 45, 49, 51, 52, 55**.
- For those special types in Zone index7, the routine returns **48** in Normal
  mode or **51** in Ultimate mode instead of sampling the pool.

The live nameplate says **Automatic (Battle Zone)** rather than implying that
“Music56” names a missing song. Its tooltip retains the actual stored value.
The raw selector dropdown remains available to preserve and inspect mod data.
An executable mod can change these stock-game rules; these findings do not
silently patch the game or increase any mode limits.

## Evidence and scope

This correction comes from read-only analysis of the supplied original European
executable and resources. It is **not a listening test of every music track**.
No executable changes are required for the label correction.

- Native name dispatch: `0x1C07AC`–`0x1C08BC`.
- Galaxy56 fallback: `0x1ED7DC`–`0x1ED7F8`.
- Tutorial passthrough: `0x210BFC`–`0x210C04`.
- Low-level random sentinel: `0x3F7C3C`–`0x3F7CB0`.
- Stream/bank lookup and path choice: `0x3F7F34`–`0x3F819C`.
- Zone selection: `0x26F740`–`0x26F8C4`; consumer at `0x27172C` / `0x2717E0`.

`tools/music_selector_research.py` checks the exact ELF hash and critical
instructions before reconstructing names, stream/bank records and native pools.
The repository's `research/MUSIC_SELECTOR_NATIVE_EVIDENCE.json` records hashes
and disassembly, and `MUSIC_IDS_BLES00978_EN.csv` contains the corrected catalog.
Addresses are evidence for that executable, not cross-region patch addresses.
