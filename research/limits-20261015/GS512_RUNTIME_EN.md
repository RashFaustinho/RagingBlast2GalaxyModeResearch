> **Historical report.** Read the [audited current findings](../SAVE_RAM_AND_EXPANSION.md) first.
> Pending statuses, fixture counts and some early interpretations below were
> superseded. GS512 missed later-discovered readers; D2 Zone cell21 ultimately
> failed its minimal control. This report does not establish a safe maximum.

# GS512 mission-capacity runtime experiment

**Research prototype, original BLES00978 only.** Tests use a disposable working game and isolated RPCS3 profile. User authorized executable changes specifically for save-capacity expansion. Uploaded game files and frozen Studio releases remain unchanged. This is not a patch for more Galaxy icons, extra character slots, Tutorial missions or Battle Zone routes.

## Original500-record control

498 original missions were retained and new roots498/499 added within Kid Buu’s existing owner66. Mission499 ran with the original executable. To isolate the save writer, the active test battle’s objective was temporarily changed in RAM from action-based29 to ordinary0, enemy health lowered and its native terminal flag set. No instruction, score or save bytes were written by this control. The engine computed score283155 and saved it at the expected499 record. Only record499 and Galaxy aggregate21 changed. This is a **controlled live-data completion**, not evidence that the original Descend prompt completed naturally.

The499 score survived a full process restart when loaded by the subsequently migrated GS512 format. A separate cold-reload into the original unpatched executable was not performed for499 in this session; earlier498 persistence is recorded in ADV18E.

## Natural new mission502 and real save/cold-load

The fixture contains512 roots, retaining all498 original missions and66 original selection icons. Fourteen appended roots use Kid Buu’s existing owner66. Newly added roots are basic one-enemy Perfect Action missions derived from an original ordinary battle; objective29 requires Ascend, action1. No whole Galaxy is added.

Revision1 changed95 executable instructions, relocated the Galaxy save block to file offset0xD6D8, allocated and serialized71336 bytes, and retained a stale inactive original Galaxy block. The game loaded the migrated save, selected **root502 via its normal menu**, launched Kid Buu versus Krillin and completed the Ascend task by ordinary L1 input. **No actor HP, objective, executable, result or score was modified in RAM in this run.** Engine result: win, score339187, appended502 row `[4097,1,339187,0,0,0,0]`.

After the result/menu/save sequence, SYS-DATA was71336 bytes with a valid independently verified checksum. Comparing against its pre-battle migrated save:

- Only appended mission502 changed among512 mission records.
- Only aggregate21 changed among66 Galaxy aggregates.
- The entire stale original Galaxy block remained identical.
- Original Tutorial and Battle Zone regions remained identical.
- Outside the appended Galaxy section and checksum, the only changed original byte was0x1B: timestamp minute30→49. No unrelated character/progression record changed.

The config’s last bitmap word was0xFFFFFFFF; the adjacent selected-native word remained66. This checks the512-bit snapshot boundary for the fixture; it is not a general proof of all game RAM accesses.

Revision2 adds two matched aggregate-minus8 readers (0x1D2638 and0xF8770) that still used the old aggregate area in revision1. It changes97 instructions total; exact decrypted ELF SHA256 `728b4824d98524a72a4483d5e876ced3b0fd4613beaad9cb7bda16277c6bd9d3`. After a completely new RPCS3 process, the persisted save loaded with502 score339187 and499 score283155 intact. The manually preselected aggregate last-mission511 was read correctly in memory. This validates a real expanded save read after restart, not a savestate.

The separate evidence JSON records the highest-root511 experiment status; do not assume its completion from the successful502 result. Loading512 roots and completing502 establishes expansion beyond500, but not exhaustive play of all14 additions.

## Converter and deployment limits

The stdlib `galaxy_save_extension.py` converter validates original/expanded length and checksum and writes a new output only. Expanding retains all500 original mission records; downgrading copies current first500 rows and aggregate/globals back into the original layout, preserves all other current bytes and drops progress500–511. Downgrade of the actual engine-written after502 save passed these comparisons and checksum validation. Four converter tests and exact-delta reproduction passed.

`apply_gs512_elf.py` accepts only the exact original decrypted ELF hash and checks each instruction against the manifest. It rejects encrypted BINs and mismatched executables/mods. The generated RPCS3 YAML is **not runtime-tested**; runtime testing booted patched ELF files directly. No encrypted EBOOT.BIN patch or automatic editor installer is provided. Do not load GS512 saves in the original executable, or ordinary55000-byte saves in this patched format.

512 total is the ceiling of this design, **14 additional roots compared with498 original roots**, because the existing RAM launch bitmap remains512 bits. Root512 would overwrite the adjacent native field in the original bitmap setter. A further extension requires redesigning that memory layout and its consumers as well. This is not an absolute mathematical limit of a fully rewritten executable. Studio0.4 retains original-engine warnings and does not assume that any imported roster mod includes this experimental save extension.

## Highest-root launch and mission-item target control

Revision2 selected and launched root511 from the normal menu after preselecting it in the migrated save. The config recorded node511, native66 and last bitmap wordFFFFFFFF. Root511’s MMD list+4C contains296(Health Auto-Loss); its UI+50 also lists296. Live player actor native66,preset2 had item296; enemy native12,preset496 had only224/225. Their HP started40000. This corroborates the static player-team modifier merge without modifying these actors or their RAM item masks. Completion/save of511 is tracked separately in the JSON and subsequent result section.

## Highest-root result boundary control

The automated Ascend input did not complete the task in the511+Health Auto-Loss run. No conclusion is drawn that the detector or modifier is broken: the input script is not a controlled gameplay test of that interaction. To isolate the **save boundary** instead, the live battle packet’s objective was changed29→0, Krillin’s HP40000→0 and its native terminal bit41→43. These three matched data writes are recorded in `M512-511-controlled-finish.json`; no instruction, register, score or saved-data row was directly written.

The engine completed the battle, awarded score360643 (gradeS), and updated appended row511 to `[4097,0,360643,0,0,0,0]`. Its result screenshot is retained. This is explicitly a controlledKO completion, unlike502’s natural Ascend win. Persistence and adjacent-region comparisons are tracked in the final audit. A separate cold-reload of511 is not claimed unless the JSON says it was exercised.

## Final persisted511 audit

After returning to the mission map, the engine-written71336-byte SYS-DATA has valid checksum and511 score360643 at+0x10EC4. Compared with the pre-511 save, only mission511 changed among512 rows; only aggregate21 changed among66 aggregates. The entire stale original Galaxy region, Tutorial and Battle Zone sections remained identical. Outside the checksum and appended Galaxy block, changed bytes0x17/0x1B are the timestamp hour/minute (12:49→13:07).502 score339187 remains intact. No511-specific subsequent cold reboot was run; the expanded format’s cold read was directly verified with502.

This supports the512-record **experimental design** and its last-row save boundary. It does not certify all14 added battles, new whole Galaxies, arbitrary mods, every RAM access, or indefinite campaign play. The original-engine practical allowance stays two extra roots; further capacity requires the matching executable and converted save.
