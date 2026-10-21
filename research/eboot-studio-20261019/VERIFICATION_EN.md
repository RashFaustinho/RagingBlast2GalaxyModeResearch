# Executable workspace and save adapter: implementation verification

19 October 2026. Predominantly AI-assisted development/research. These are scoped
tests of the 1.1 development checkout, not an official release or a general game
compatibility guarantee. Original executables, saves, archives and RAM stay private.

Read [the executable/save guide](../eboot-studio-20261019/EBOOT_MODS_RESEARCH_EN.md) for usage and
[the expansion summary](../executable-followup-20261019/STATUS_EN.md) for prototype limits.

## Native controls before integration

**Container decoding:** the original European disc BIN and all three supplied
regional Enabler BINs decode byte-for-byte equal to their independently
RPCS3-decrypted ELF oracles. Debug SELF export roundtrips the entire ELF.
No RPCS3 implementation source is vendored; public format references and reference
source hashes are in [FORMAT_REFERENCES.json](FORMAT_REFERENCES.json).

**Small-feature BIN:** the new implementation's output booted in RPCS3 with original
archives and a checksum-valid original 55,000-byte diagnostic save. Only the 26 listed
download bits and 66 Enhanced bits were initially cleared; other availability bits
were retained. After native valid-save loading, four hooks and the complete 4,096-byte
module match the generated ELF in live memory. The complete loaded save equals the
input with exactly the expected bit updates: 16 changed bytes and no progress-bank
changes. No debugger writes occurred. The earlier pre-START zero-buffer observation
was not a save-load result and is excluded. See [the completed load](SMALL_MODS_NATIVE_LOAD.json).

**New expanded marker:** the adapter's checked `RB2GS_SAVE1` marker/capacity tuple
was added, with a regenerated checksum, to the earlier engine-written G100 boundary
save. A fresh process with the exact G100 ELF/matching data loads all 110,000 bytes
identically. See [the marker control](G100_MARKER_NATIVE_LOAD.json). This is not a new
win, native rewrite, all-Galaxy playthrough or other-region control. D2 retains its
own checked marker; unmarked old G67/G100 layouts need an explicit known source.

**Downgrade:** the JS adapter converts that G100 save back to Original after explicit
acknowledgement of added-progress loss and selected-owner reset. A fresh process with
the original European ELF and original archives loads all 55,000 bytes exactly equal
to the converted input. Native owner 0 is confirmed. See [the downgrade](DOWNGRADE_NATIVE_LOAD.json).
This verifies native loading, not a replay of all retained progress.

The actual browser bundle's `Game/PS3_GAME/USRDIR/EBOOT.BIN` is byte-identical to
the native-tested small-feature BIN: [output identity](BROWSER_NATIVE_OUTPUT_MATCH.json).

## Current development checks

[DEVELOPMENT_CHECKS.json](DEVELOPMENT_CHECKS.json) binds the production source hashes:

- **150 Node tests, 0 failures/skips**, including 17 focused executable/save tests,
  all 18 original MMDs/seven preset tables, 510 Tutorial texts and 137 roster names.
- **54 Python tests, 0 failures/skips**, including research tools, migration and
  the existing package-rejection tests.
- The EBOOT browser suite opens encrypted files, selects four mods, checks an
  unchanged Original save, reviews/exports a ZIP and validates its backups/hashes.
  Reload detects installed states/table; clearing supported changes restores the
  exact original ELF. USA/Japan legacy inputs support clean download upgrades,
  with European-only helper controls disabled.
- Downgrade loss/reset controls require acknowledgement; the actual downloaded
  save matches the native-tested converter output. Known research executables
  stay read-only and determine the adapter target. Invalid/ambiguous inputs block output.
- The existing browser smoke suite passes original-file roundtrips, mission/preset
  edits, Undo/Redo, all 16 Zone panels, grouped ZIP exports and project reload.
- ESLint 9.39.0 and Prettier 3.6.2 pass. Browser reports have no JavaScript errors,
  external requests or input mutation.

Detailed source-bound check results are in [DEVELOPMENT_CHECKS.json](DEVELOPMENT_CHECKS.json).
The editor implementation, additional browser artifacts and portable build remain
private at the owner's request; the public editor stays at version 1.0.
Testing used Linux Chromium/local HTTP. Native Windows, `file://` and physical
PS3 signing/loading were not exercised. This is not the complete 14-suite/package
verification required for another official release; the 1.0 ZIP is unchanged.

## Limits that must remain explicit

Small selectable patches retain the existing save format. Local DLC compatibility
alone does not establish stock storage: EU additionally checks 388 critical save/map
words. An edited G67/G100 footprint stays research-only, and unknown save/map changes
block adaptation. Unknown minor-modified USA/Japan inputs can qualify for a local
download patch while retaining an unidentified save layout; conversion stays blocked.

New-Galaxy/mission/Tutorial/Zone and secret-route changes are not installable preview
checkboxes. The older research's unresolved global counters, full-map resource
initialization, existing-fork failure and added-Zone persistence limits still apply.
The native load controls above do not certify every costume, music track, fresh-game
path, arbitrary third-party mod or complete campaign. Earlier actor/music evidence
retains its own scope, including Null audio and software-renderer texture limitations.

Backups retain the exact input container, or the supplied ELF if that was the input.
Clearing all supported changes restores the ELF when unrelated tail data is not lost;
otherwise removal is refused. Retail resigning/NPDRM handling are not implemented.
