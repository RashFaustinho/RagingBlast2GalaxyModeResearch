# Executable patch and DB_SAVE adapter research

**Experimental executable changes can prevent booting, crash the game or make a
save incompatible. Back up the original executable and the complete save folder.**
The project is developed and researched predominantly with AI assistance. Retain
the project's disclosure when sharing these results.

The owner-only development workspace opens an executable, identifies supported modifications
and exports a new copy. It does not modify the files selected on your computer,
your AFS archives or the MMD/DAT editing workspace. Executables and saves are not
stored in `.rb2project` projects or included in ordinary MMD/DAT exports.

The newer editor implementation and portable package are private at the owner's request.
The public editor remains version 1.0. This research describes the private preview
and its scoped evidence; it is not a public download announcement.

## Supported inputs and outputs

- Disc APP `EBOOT.BIN` SELF containers using the tested revisions 4 and 10.
- The tested debug SELF wrappers and big-endian PowerPC64 ELF files.
- Original, legacy Enabler and clean-policy regional layouts whose audited local
  code/dependency/table checks match. Unrelated minor changes can be preserved.

An unsupported revision can be decrypted using your installed RPCS3's
**Tools → Decrypt PS3 Binaries**; open the resulting ELF here. Decryption alone
does not establish patch compatibility. Conflicting local code, overlapping ELF
segments, mixed policies and an occupied helper address/header block modification.
The USA executable's v1/v2 revision is still unidentified. EU v2 and USA v2 are
not automatically certified because another regional input worked.

**The exported `EBOOT.BIN` is a debug SELF for RPCS3.** It is not a retail-signed
executable for a physical PS3. The input's original signed/encrypted container is
retained exactly in the bundle's backup folder. NPDRM/PSN license decryption and
physical-console resigning are outside this preview.

## Selectable modifications

| Modification | Current compatibility | Effect and limit |
|---|---|---|
| Download preset cleanup/unlock | Audited supplied EU/USA/Japan layouts | Original cleanup, preserve existing flags, or set the 26 restricted download-native flags after valid-save loading. Resources and ordinary character unlocks are separate. |
| Per-Galaxy starting costume | Audited European layout | A 100-entry table keyed by original native/form owner. Index 0 means costume 1; index 1 means costume 2. Only select costumes present in your game. No complete transformation/fusion costume-continuity certification. |
| DLC costumes in ordinary VS | Audited European v1 layout | Exposes the existing extra costume of the 14 DLC characters, including 26 native forms, in the ordinary costume selector. Does not write save unlock flags or equip Download preset items. |
| Per-battle Battle Zone music | Audited European layout | Uses the MMD stage's explicit music word 0–55; 56/invalid retains the native picker and final-Zone handling. Edit that word in the normal Battle Zone section. |
| Enhanced preset auto-unlock | Audited European layout | Sets the 66 Enhanced group bits after loading a valid save. This is a separate namespace from download/native IDs. Fresh-game initialization is not covered. |

The old Enabler removes a nonvolatile register restore. Its state is detected and
can be replaced by a clean policy. This preview cannot newly install that unsafe
legacy implementation. Enhanced auto-unlock shares the successful-load call with
preserve-existing cleanup; select Original cleanup or Unlock 26 for that combination.

“Installed” means the supported patch was found in the input. Checking a box
selects the desired output; it does not change that input status. Other mods may
exist outside the supported catalog. Local layout matching is not whole-game
certification of an arbitrary modified executable.

### Ordinary VS DLC costumes

The game already distinguishes an ordinary costume count from a total count in
`game_resident_character_param.dat`. For the original table, these differ exactly
for the 26 native forms used by the 14 DLC characters. The patch uses that total
and adds a read-only exception for those specific extra indices in next/previous
costume selection. Other locked ordinary costumes still require their normal unlocks.

- Goku and his three Super Saiyan forms: **Costume 8**.
- Krillin and Android 18: **Costume 4**.
- Teen Gohan, Piccolo, Yamcha, Vegeta, Trunks (Sword), Vegito, Bardock, Android 17,
  Broly, Super Gogeta and Turles, with their supported forms: **Costume 3**.

Select **Normal** or a regular **Custom** slot in the game; selecting the costume
does not load the Download preset's equipment. The Download preset unlock option
is independent and is not required for this selector patch. The patch does not
create costume resources. Games/mods that remove or replace those resources need
their own checks.

This option neither writes costume-unlock bits nor changes the save layout, so it
requires no save conversion. The game can normally remember selections or update
its own statistics; this is separate from the patch writing unlock flags. Removing
the option restores its two instructions and removes its helper when unused.
The full 26-form resource/transform/fusion matrix and physical PS3 are not certified.
See the [native evidence and control notes](../vs-costumes-20261019/VS_COSTUMES_EN.md).

## Savegame adapter

The decrypted **DB_SAVE/SYS-DATA payload format is common across regions**, as
independently checked by the project owner. A filename or regional title ID does
not select a save format. The internal checksum must be valid; the adapter does
not guess how to repair corrupted or encrypted saves.

The selectable small patches above **do not change the save layout**. An original
55,000-byte save already fits, so loading a save in this panel is optional. The
adapter reports “No conversion is needed” and retains every byte in that case.

Experimental expansions have separate formats:

| Layout | Bytes | Galaxy mission rows | Independent aggregate rows | Tutorial / Zone storage |
|---|---:|---:|---:|---|
| Original | 55,000 | 500 | 66 | Original |
| G67 research | 110,000 | 500 | 67 | Original |
| G100 research | 110,000 | 600 | 100 | Original |
| D2 research | 110,000 | 1040 | 66 | Expanded research banks |

The same length does not identify G67/G100/D2. Newly adapted G67/G100 outputs
contain a checked version/capacity marker in reserved trailing space. D2 uses its
existing checked marker. Older unmarked G67/G100 files require an explicit known
source layout; do not guess. Historical GS512 files require their separate converter.

The output target follows the **identified loaded executable**. It is not an
arbitrary capacity control. Known research executables are inspection-only; their
recognition lets you adapt a corresponding save, not install their experimental
expansion on an ordinary game. For a minor-modified European input, 388 critical
save/map instruction sites are checked in addition to the download-feature spans.
Unidentified save/map changes block conversion. Unknown modified USA/Japan layouts
can still qualify for a local download patch without being certified as stock save
layouts; automatic save conversion stays blocked in that case.

Returning to Original copies the current first 500 mission records, 66 aggregates,
globals and the original Tutorial/Zone progress back into their original banks.
The adapter explicitly reports added progress that would be discarded. It requires
acknowledgement before discarding it or resetting selection fields that reference
an added owner/mission. Ordinary retained records are not reset. Expanded-to-expanded
conversion is deliberately not automatic: return to Original first and review loss.

An adapter does not expand the engine, build the required MMD maps or make an
unverified Zone cell playable. Keep each expanded save paired with its exact
executable and matching data. Keep `PARAM.SFO` and the other files in the save folder;
replace only the corresponding decrypted payload.

## Review and install a copy

1. Open **EBOOT.BIN Mods** and select your executable. Read the detected region,
   supported patch states and compatibility information.
2. Choose modifications. For costumes, add an owner and its zero-based costume index.
3. Optionally load your decrypted save, then choose **Check / adapt save**. Resolve
   any format or downgrade warnings before export.
4. Choose **Review changes**. The output is re-inspected and its debug SELF wrapper
   is decoded again to verify that it contains the intended ELF.
5. Download the mod bundle. It contains the new `Game/PS3_GAME/USRDIR/EBOOT.BIN`,
   original backups, a hash/settings report and, if checked, the save payload.
6. Close RPCS3 completely before replacing files. Do not resume a savestate created
   with another executable. Keep the bundle and backups for reversal.

To remove supported patches, reopen the exported executable, choose Original
cleanup and clear the helper features, then review/export again. With no unrelated
tail changes this restores the original ELF exactly. If third-party data would be
lost, removal is refused. The backup restores the original container as well.

## Research-only catalog entries

100 independent Galaxies, larger mission/Tutorial maps, secret-route requirement
changes, extra Zone cells and ninth selectable Zones are not installable checkboxes
in this preview. Boundary successes, unresolved global counters and failed full-map
or route controls are documented in the [current research summary](../executable-followup-20261019/STATUS_EN.md).

## Verification and format references

The focused suite tests four actual encrypted BIN inputs against independently
RPCS3-decrypted ELF oracles, regional policy states, all sixteen helper combinations,
exact removal, conflicts, preservation and save migration. Browser checks use real
file pickers/downloads, inspect ZIP content, reload exported patches and test the
downgrade acknowledgements. The actual browser-generated BIN is byte-identical to
the native RPCS3 valid-load control.

Native checks separately cover the generated small-feature BIN with an original
save, a full 110,000-byte G100 marker load, and a downgraded 55,000-byte save loaded
by the original executable. These are load/configuration controls, not a new full
campaign, all-regional gameplay, native Windows session or physical PS3 test.
See [the implementation evidence](../eboot-studio-20261019/VERIFICATION_EN.md).

The JavaScript container reader is independently implemented using Web Crypto and
bounded browser decompression. Public SELF format/revision constants were checked
against RPCS3's [unself.cpp](https://github.com/RPCS3/rpcs3/blob/master/rpcs3/Crypto/unself.cpp),
[unself.h](https://github.com/RPCS3/rpcs3/blob/master/rpcs3/Crypto/unself.h) and
[key_vault.cpp](https://github.com/RPCS3/rpcs3/blob/master/rpcs3/Crypto/key_vault.cpp).
No RPCS3 implementation source is vendored in the editor. There are no network
requests, license-service lookups or firmware/game binaries in its distribution.
