> **Historical report.** Read the [audited current findings](../SAVE_RAM_AND_EXPANSION.md) first.
> Pending statuses, fixture counts and some early interpretations below were
> superseded. GS512 missed later-discovered readers; D2 Zone cell21 ultimately
> failed its minimal control. This report does not establish a safe maximum.

# Save and RAM expansion research —15 October2026

BLES00978 original decrypted ELF SHA256 `8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892`. This continuation is authorized to change executable code **only for mission save-capacity expansion**. Other gameplay changes remain data-only. Uploaded originals and frozen releases are preserved.

## Original executable: two spare mission records

Original MAIN has498 mission roots. The persistent array reserves500 records, indexed0–499, stride28 at SYS-DATA+0x8148. Only two **additional independent mission progress records** fit while retaining all498 original records. Mission500 would alias Galaxy aggregate0. Repacking the MMD or increasing its descriptor count does not relocate this fixed table.

The working menu node and edge flags are dynamically allocated from parsed counts (`0x2F4938`); that allocation is not the limiting save array. The battle launch snapshot has a separate512-bit array at config+0x0C..0x4B. Its setter at0x1CDA48 is unchecked: index512 addresses config+0x4C, the selected native-character word. For513 or more roots, available flags can therefore overwrite a different **RAM** field even if save storage were enlarged. Index511 fits the final word at+0x48.

The66 Galaxy aggregate records and the100 native-owner lookup are independent limits. A67th icon aliases saved global words at0xBF30. The earlier GX19A runtime test directly reproduced the global selected-native being increased by the mission score. None of these additional-icon bounds are fixed by the mission-only prototype below.

## Checksums are part of the format

Original SYS-DATA is55000bytes (0xD6D8). The checksum routine0x318998 scans0xD6D0bytes after the8-byte header. It sums little-endian16-bit values modulo2^32, storing sum>>8 in big-endian word0 and sum&255 in big-endian word4. This matches the supplied original save independently. Editing a selection field without rebuilding it caused a load failure in an isolated research copy; the checksum-corrected copy loaded.

## GS512 research design

The prototype relocates the entire Galaxy save section to the **appended** offset0xD6D8. It preserves the existing55000-byte layout for all other systems, and retains the original Galaxy section as an inactive old copy. The appended section has512 mission rows, followed by the same66 aggregate rows and Galaxy globals:

| Region | Original file offset | GS512 file offset |
|---|---:|---:|
| Mission0 | 0x8148 | 0xD6D8 |
| Mission499 | 0xB7DC | 0x10D6C |
| Mission500 | Aliases aggregate0 | 0x10D88 |
| Mission511 | Already outside mission storage | 0x10EBC |
| Aggregate0 | 0xB7F8 | 0x10ED8 |
| Global selected native | 0xBF30 | 0x11610 |
| End of file | 0xD6D8 | 0x116A8 |

The97-instruction r2 delta updates matched Galaxy-base references, direct aggregate/global references,500-record bulk loops, allocator/clear sizes, file read/write sizes and checksum coverage. It does not enlarge or move the battle launch bitmap:512 total missions is the ceiling of **this proposed layout**, giving14 additional roots relative to the original498. It is not a demonstrated absolute maximum for a fully rewritten engine. Beyond512 requires another RAM-layout design as well as save changes.

`GS512-patch.json` records every old and new instruction and both ELF hashes. `apply_gs512_elf.py` rejects a different executable or mismatched bytes and writes a new ELF only. A matching RPCS3 patch YAML is a proposed deployment path; whether that YAML itself has been exercised must be read from the runtime report. Neither patch mode should be mixed blindly with a roster mod that changed the same instructions.

`galaxy_save_extension.py` validates decrypted saves and creates a new converted file. It never overwrites an existing output. Downgrade copies the current first500 mission rows and the relocated aggregate/global tail back into the old section, preserves current non-Galaxy data, drops records500–511 and rebuilds the checksum. Four independent Python tests cover geometry, every original row, exact reversible migration, independent checksum calculation and invalid-input rejection.

## Evidence levels

Binary construction, disassembly and Python tests do not establish a safe playable expansion by themselves. Read the companion runtime report for the exact tested count, forced-data controls, saved score, cold-reload result, old-region comparison and configuration bitmap checks. The executable and migrated format remain **research prototypes**, not a normal editor option. Natural mission502 completion, save, exact old-region comparison and a full-process cold reload have now passed; see [runtime evidence](GS512_RUNTIME_EN.md) for what was and was not exercised. Galaxy Studio0.4 continues to show original-engine save warnings even when a mod catalog is active.

Separate Battle Zone limits remain unchanged: two modes, eight selectable routes per mode and21 coordinate-keyed save cells per route. Additional branches in unused grid cells are a different operation from appending a ninth selectable route.


## Follow-up bounds: Tutorial and Battle Zone

Tutorial does not use Galaxy’s500-row save table. It has a separate nine-mission progress system at+0xBFC8 and a20-action mask, with independent fixed-count scans. See [Tutorial save bounds](TUTORIAL_SAVE_BOUNDS_EN.md); trailing cleared padding is not certified spare capacity.

The original16 ZONEs contain128 fights in total. Physical storage has336records (2modes×8routes×21cells), leaving208 unoccupied records. **Correction:** original on-disk coordinates use X=0,1,2, not−1,0,1. With the traced formula `(int(X)+1)+3*(6-int(Y))`, standard map ranges address only20 safe cells per route (1–20);(2,0) overflows. Thus **192** unoccupied records are reachable through standard coordinates across the16 original routes. Cell0 in each route needs a nonstandard coordinate and is not an ordinary wizard suggestion. This is a storage inventory, not a promise of192 fully validated playable additions; route navigation, secret conditions, stamps and aggregation still need runtime checks.

Studio0.4 fixes the original X=2 false warnings and preserves the original files. The old baseline browser test checked only structural errors, so its success did not establish absence of these save warnings; new tests explicitly examine all16.

The first95-instruction runtime revision loaded and saved mission502 but retained two old aggregate-minus8 readers at0x1D2638 and0xF8770. Revision2 relocates them too. Separate old/new manifests preserve this debugging evidence. Successful saved mission502 in r1 is not itself proof that every menu read was updated.
