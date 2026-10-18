# Verification and developer notes

## Release scope

The application is vanilla HTML/CSS/JavaScript using classic scripts. All catalogs and artwork are local assets; there are no fetch calls, CDN dependencies, npm runtime packages, remote fonts or accounts. A Content Security Policy disables connection requests. File loading uses browser File objects and output uses downloaded Blobs.

The Windows launcher opens the local HTML page in the default browser. Browser automation for this release ran on **Linux Chromium**, using a temporary **127.0.0.1 static server**, because the managed cloud Chromium policy blocks `file://` URLs. A native Windows browser session and Windows double-click launch have **not** been exercised here. The implementation avoids ES-module/file-fetch features that require a server, so ordinary Windows Edge/Chrome can open the extracted HTML locally.

These checks certify editor behavior and binary structure, not every possible game modification. Earlier research demonstrated added Galaxy nodes and separate action/victory fields in RPCS3; the editor's newly generated sample edits have not been replayed as complete game archives in this release.

Recorded results are under `verification/`. No test fixture MMD/DAT or saved workspace is included in the distribution.

## Version 1.0 release checks

Current top-level reports bind the first GitHub release sources. Historical preview
reports stay in the source repository; the portable ZIP contains current reports
only. Full release inputs were private originals, never committed to Git.

- 133 Node tests, zero failures/skips, and 42 Python helper tests, zero failures/skips.
- All 14 browser suites pass on the same production hashes. The Route-only regression
  checks 16 original Zones across five battle/tab/preview combinations per file, plus
  unknown filenames and narrow panels, with no MMD mutation.
- ESLint 9.39.0 and Prettier 3.6.2 pass. Four packaging regressions cover stale/incomplete
  source evidence and excluding repeated history/tests from the portable package.
- Selected native MAIN/Zone/music proofs and exact D2 delta reproduction were rerun
  for the research publication; historical gameplay was not replayed.
- The actual ZIP is checked through CRCs/file hashes and tested after extraction to
  a path containing spaces. Packaged-app browser results are in the release sidecar.

## Version 0.10 release checks

Historical 0.10 preview reports are retained in `verification/0.10/`. Previous
0.9 reports are retained in `verification/0.9/`; unreleased snapshots record their
own earlier source hashes and are historical evidence.

- **133 Node tests**, zero failures and zero skips, using all original MMD/DAT,
  tutorial-language and roster fixtures. New regressions cover shared loose/AFS
  roster input validation and context-sensitive Battle Zone token explanations.
- **14 browser suites** cover the baseline editor, tutorial tables, guided creation,
  mod profiles, conditional teams, archive extraction/import, refinements, mission
  management, Galaxy transfer, code-review regressions, release features, music,
  accumulated feedback and the Zone-wide requirement banner.
- The new banner suite visits all 16 original Zones across four battle/tab/preview
  combinations each, distinguishes the six stock no-trigger slots from active
  ones, checks renamed files remain unknown, tests a narrow panel and verifies
  that merely viewing the editor changes no original MMD bytes.
- ESLint 9.39.0 with strengthened checks and Prettier 3.6.2 pass. Three Python
  packaging regressions reject changed sources, missing coverage and incomplete runs.
- Release packing requires successful source-bound reports, validates extracted
  artwork hashes and verifies ZIP CRCs and every packaged file against its manifest.

The packaged app is unpacked into a path containing spaces and its music/conditions
and Zone-banner browser suites are rerun. These remain Linux Chromium/local-HTTP
checks; native Windows launch and newly authored fights inside RPCS3 are not tested
by this release workflow. No executable or savedata changes are included.

## Automated tests

Requires Node.js 20+ for tests only:

```console
node --test editor/tests/*.test.cjs
```

Tests remain in the source checkout; the 1.0 portable app ZIP omits development suites.

Synthetic tests have no game dependencies. Real-file tests expect `RB2_TEST_FIXTURES` to point to a private directory of extracted originals. Without the fixtures, those cases skip explicitly; skipping is not a successful real-file check.

For the main fixture set provide:

- `galaxy.mmd`, `tutorial.mmd` and all 16 `zone_*.mmd` files;
- `preset_appearance_table.dat`, `preset_strength_table.dat`;
- Galaxy, Tutorial, download, normal Battle Zone and Ultimate Battle Zone preset tables.

The help-table tests document their optional nine-file fixture directory separately. Tests only read the source fixtures and edit in-memory copies.

The integration checks use independent raw byte offsets for exact-change expectations. They cover unknown headers, conditional Hatchiyack rosters, tutorial allies/actions, shifted descriptors, mission duplication, reciprocal edge updates, namespace separation, local moves, form links, error rollback, signed postfix arithmetic and native stack/sequence limits.

## Browser tests

Requires Python Playwright and an installed Chromium (development only):

```console
python editor/tests/browser_smoke.py --http --chromium /usr/bin/chromium --fixtures /path/to/extracted-originals --output /tmp/rb2-editor-qa
```

Omit `--http` to exercise a local-file URL in an environment that permits it. The browser test verifies actual downloaded MMD/ZIP/workspace contents, not only labels on the page. It also checks every original file remains unchanged and that no external network request occurs.

The test output directory contains private game-derived exports and a project; do not bundle that whole directory in a release. Only the JSON verification record and selected application screenshots are included here.

## Architecture

| File | Role |
|---|---|
| `js/app.js` | Local file import, workspace, undo/redo, validation, ZIP/file downloads, navigation and reference library |
| `js/mmd.js` | MAIN/ZONE binary reader/writer, graph/owner and subordinate-list operations, expression validation |
| `js/mmd-ui.js` | Mission, route, teams, action, condition and advanced panels |
| `js/presets.js` | Lossless DAT tables and preset/appearance/strength/item editing |
| `js/help-tables.js` | Tutorial help-message table reader/writer and editing |
| `js/data.js` | Bundled game-derived English catalogs and native form-slot hints |
| `assets/portraits/` | Original game character/form portraits |

No-edit serialization is byte-identical. Structured subordinate-list edits detach shared references; untouched/unknown payload data is retained. This can grow an edited MMD. A repacker must handle changed lengths. Direct Advanced descriptor edits deliberately operate on shared data and say so in the UI.

Unknown bytes and behaviors are not assigned invented meanings. The binary APIs validate bounds/geometry, while game semantics such as arbitrary save capacity require separate runtime research.

## Version 0.2 verification

The current verification records are for the 0.2 source hashes. The frozen 0.1
ZIP retains its original reports unchanged.

`authoring.test.cjs` adds independent tests for guided donor construction,
reciprocal links and prerequisite expressions, atomic rejection, the distinction
between original498 and capacity500, the additional-icon collision, valid Zone
cells, new character row geometry/defaults and reward ID namespaces. In the
release environment all **63 tests** run with the real original fixtures,
including the nine help tables; no tests are skipped.

`browser_guided.py` exercises all35 supported original files, a named Galaxy
portrait chooser, visual predecessor selection, cancellation of creation/export
warnings without mutation, embedded Appearance export bytes, character tabs,
new complete presets, new linked shared rows, missing dependency file pickers,
unassigned draft completion, undo/redo and return-to-mission navigation.
It also verifies that source fixture hashes stay unchanged and no external
network request occurs. Its outputs include private original-derived files;
only the verification JSON and selected UI screenshots belong in a release.

The original browser smoke workflow still verifies direct edits, raw panels,
conditional rosters, mission duplication, copied optional action sequences,
ZIP/CRC readback and workspace restore. The help browser workflow verifies all
nine explanatory-message tables. All three reports bind their tested JS hashes;
the package builder refuses to package changed, untested production scripts.

These remain Linux Chromium browser tests. Windows double-click launch has not
been directly exercised in the cloud. No new RPCS3 playthrough was run for 0.2;
newly generated custom battles still need a separate game test.

## Version0.3 mod support checks

The0.3 suite adds9 independent Node tests (72 total with all original fixtures), covering catalog isolation, native replacements, local move namespaces, missing-default rejection, matched Appearance fallback, strict CSV/profile validation, raw character-select groups and enhanced reward names. `browser_mod_support.py` exercises actual file pickers, catalogs, extra-native preset creation, failed missing-default creation without partial rows, profile/workspace downloads and restoration. Synthetic native120/121 are editor tests, not game compatibility claims.

The separate GS512 save converter has4 Python tests (`python -m unittest discover -s tools -p test_galaxy_save_extension.py -v`), including independent little-endian checksum expectations, all500 original rows, the complete relocated aggregate/global tail, exact reversible migration, malformed data rejection and deliberate loss of500–511 progress on downgrade. These tests verify the converter; executable runtime evidence is reported separately under research/limits-20261015.

##0.4 regression coverage

79 Node tests passed with all original fixtures,0 skips. The conditional-roster suite checks all six perspectives of original mission491, unknown runtime-state handling, named query filters, exact undo, all16 original ZONE coordinate/save checks, and rejection of computed record21. Browser regression covers the actual Teams preview/filter controls, Normal and Ultimate preset navigation, X=2 edits/undo, and the distinction between file warnings and informational notes. Reports are bound to hashes of the tested production files.

Earlier0.2/0.3 checks incorrectly rejected original X=2 rows. The earlier baseline browser test only asserted zero **structural errors**, so it missed those false save-coordinate warnings. The0.4 regression explicitly checks all16 originals for coordinate/save warnings as well. This is a correction to test coverage, not a claim that the old warnings were genuine game-file problems.

## 0.5 archive and visual verification (historical release)

The frozen 0.5 package retains six browser reports bound to its production sources.
Historical counts above describe earlier releases. The 0.5 Node run passes all
**91 tests, zero skips**, with both `RB2_TEST_FIXTURES` and `RB2_HELP_FIXTURES` set.

`archives.test.cjs` covers independently encoded literal/overlap compression fixtures,
malformed bounds/names, compressed and nested containers, resized siblings, AFS sector
insertion and filename metadata, no-edit identity, repeated copies, cancellation and
nonzero-padding rejection. Internal engine names ending in a dot are retained; only
safe supported leaf names become filesystem outputs. `game-preview.test.cjs` checks
original mission491 from all six perspectives, unresolved conditions, description
selectors and nonmutating visual drafts. The donor-Stamp regression covers creation,
copy-on-write editing and rejection before partial mutation.

`browser_archives_preview.py` selects all three original AFS files, extracts the 35
supported files, verifies actual ZIP members/CRC/SHA against independent private
fixtures, opens them, exercises the character rail and live previews, and rebuilds
a real progress AFS with a resized Galaxy MMD. An independent Python archive decoder
checks every sibling in the rebuilt Galaxy pack. Changing an input invalidates the
previous import plan. The directory workflow is exercised with an in-memory
FileSystemDirectoryHandle test double; actual native Windows directory dialogs were
not exercised. No source AFS is written. The 1.3GB output is composed from Blob/file
slices; tests keep only changed members, rather than writing a second full game archive.

The optional `archive_real_roundtrip.cjs GAME_PS3_DIR PRIVATE_OUTPUT_DIR` separately
updates a Battle Zone file in all **18** original copies, a Strength DAT in boot, and
a Tutorial help DAT in battle_others. Independent Python decoding confirms 20 target
replacements and **961 unchanged neighboring leaf members**. Binary checks do not
constitute a new game playthrough. See `verification/archive-roundtrip.json`.

The archive bridge uses only classic local scripts, File/Blob APIs and optional
File System Access APIs. No worker, backend, network service, Python or Node runtime
is needed by the installed app. Folder output requires modern Edge/Chrome and a
user-selected destination. ZIP/download fallback remains available. The normal
Linux-browser regression suites also cover older editing, workspace and export flows.

Original UI asset hashes are checked during packaging. The release builder refuses
existing output ZIPs, wrong version badges, changed untested production sources or
changed extracted PNGs. The 0.4 ZIP remains frozen and retains its original evidence.

## Unreleased gap-preserving growth fix

The working source now inserts aligned space instead of rejecting a growing member
when the consumed part of its gap contains nonzero bytes. Regression coverage checks
AFS and nested STPK gaps, offsets, filename metadata, untouched siblings, and a later
grow after an earlier shrinking import. All **92 Node tests** pass with real fixtures.

A private integration test uses the original boot AFS with two explicit synthetic gap
markers and appends one linked Appearance/Strength/Galaxy preset record. The frozen
0.5 implementation reproduces the exact entry22 error; the corrected source preserves
all 1104 gap bytes, inserts 2048 bytes, retains all 40 other AFS bodies and imports all
three tables. Independent Python decoding checks the three replacements and 30 unchanged
nested leaves. The actual browser download matches that output byte for byte. These
are archive tests, not an in-game playthrough or analysis of the user's exact failing AFS.
This fix is included in 0.6. The original 0.5 package remains frozen with its historical evidence.

## 0.6 verification

The current release includes 96 passing Node tests, zero failures and zero skips,
plus seven browser reports bound to the shipped production source hashes. This adds
regressions for preserved nonzero archive gaps, per-category menu-circle budgets,
AFS export destinations and first-mission authoring for empty native Galaxy owners.

The updated archive browser check exercises the actual **Download Extracted Zip**
and **Download Patched AFS** controls, asserts that removed output controls are
absent, opens the extracted files through the normal file picker, and independently
decodes the downloaded 1.3 GB progress AFS to compare the changed Galaxy member and
all neighboring members. Temporary large outputs stay outside the release package.

`browser_refinements.py` checks the default-off empty-Galaxy flag, all 100 native
slots with the Goku transformed-form images loaded, All Missions last, no decorative
medals, the chooser, a first mission without a predecessor, and undo/redo. It then
checks a downloaded edited-files ZIP spanning all three destination AFS folders:
exact member paths, every binary byte, only modified files, and the manifest paths.
The baseline suite also checks grouped exports and workspace restoration.

Browser tests use Linux Chromium. The portable package also receives a direct
`file://` launch smoke check; native Windows launch is not run in this environment.
No new RPCS3 playthrough is part of these editor checks. Empty native owner editing
is not proof of additional playable Galaxy icons or expanded save/menu capacity.

## 0.7 verification

104 Node tests pass with zero failures/skips. Eight browser workflow reports bind the
shipped production source hashes. In addition to 0.6's editing/archive coverage, new
checks cover mission movement, explicit deletion and free ID reuse without renumbering,
nested dependency redirection, original zero-record preservation, shared memberships,
entry replacement, neighbor bridging and atomic rollback after invalid edits.

`browser_mission_management.py` exercises the actual move/delete dialogs, redirects
progression, reconnects the source and destination maps, checks undo/redo and Cancel,
and moves a battle into an empty transformed native owner. It deletes that battle,
downloads the actual MMD, opens it in a fresh app session, and creates another battle
using freed ID 498 at the full 500-record limit. Export/reopen of free slots is also
covered independently at the binary document layer. Repeated low-ID reuse does not
shift unrelated records. Existing original unassigned zero records remain untouched.

Visual checks confirm the original extracted logo loads, the header is absent, the
command bar starts at the top, Quick guide still opens, and preview scrolling works
at 980/1400/1700px. The title-logo provenance manifest records original SPR/VRAM entries,
source hashes and decoded PNG hash; packaging checks that PNG as well as prior assets.

These are editor and archive checks in Linux Chromium, not a new RPCS3 playthrough.
Native Windows execution remains untested. Direct file:// launch is restricted by this
managed browser; the extracted package is checked through ordinary loopback HTTP.
Old saved progress for reused IDs cannot be erased by editing the MMD alone.

## Unreleased whole-Galaxy transfer

The updated source passes **108 Node tests, zero skips**, using the original fixture
and help-table sets. Four new core tests cover whole-map/icon reassignment, shared
mission491 from all six perspectives, descriptor copy-on-write, retained IDs/edges,
preview/repeated transfers, unsupported/dynamic rejection with exact rollback, opaque
expression tails and unchanged character/form reward targets.

`browser_galaxy_transfer.py` covers both empty-Galaxy buttons, portrait donor choice,
nonmutating preview and Cancel, special-group rejection, transfer, undo/redo and actual
MMD download/reopening. Mission-management and refinements browser regressions pass
against the same source hashes. Reports are under `verification/galaxy-transfer/`.
The released0.7 ZIP is unchanged; these are source changes, not a new distribution.

The independent RPCS3 test uses the original executable and an isolated progress AFS
for Goku → Goku SSJ2, with a diagnostic one-action mission238. Menu selection, active
player identity, natural victory328618 and native original-format save are verified.
See `research/galaxy-transfer-20261016/TRANSFER_EN.md` for exact scope and save audit.
The original-file static donor sweep accepts45 of66; special spawned groups block
21 sources, rather than silently guessing their behavior. Windows-native execution
and a playthrough of every donor/target combination are not claimed.

The native transfer test also passes a complete-process cold reload: all55000 RAM
save bytes match the game-written file. Mission238, aggregate53 and selected native2
persist. Normal timestamp/load-cleanup writes are explicitly audited; this is not
an expanded save or an executable patch.

## Version 0.8 review and release checks

The application still has no runtime dependencies. Developers can run the static checks
from `editor/` with these pinned tools (npm is only needed for development):

```console
npm exec --yes --package eslint@9.39.0 -- eslint js
npm exec --yes --package prettier@3.6.2 -- prettier --check "js/*.js" styles.css index.html eslint.config.mjs
```

`.prettierignore` excludes generated catalogs, assets and historical verification files.
ESLint checks undefined/unused bindings, unreachable code, duplicate keys/arguments and
invalid operators. No lint suppression was added to hide an application error.

The release includes one additional archive unit regression for early/late cancellation
and retry. `browser_review.py` verifies the shared element factory, consecutive renamed
DAT layout dialogs/Escape, availability OR-query removal with exact Undo, and cancellation
of an actual AFS scan, late manifest-hashing cancellation and a verified retry ZIP download. The standard nine browser
suites are also rerun against the same current source hashes.

The release builder now rejects incomplete reports, missing coverage for a newly added
source file and stale hashes. Run its three Python checks from the repository root:

```console
python -m unittest discover -s tools -p test_package_galaxy_studio.py -v
```

`CODE_REVIEW_EN.md` records the review findings and deliberate scope limits. No new
RPCS3 game playthrough is claimed for this code cleanup.

Final 0.8 results: **109 Node tests passed, zero failures/skips; all 10 browser suites
passed; lint/formatting and 3 release-verification Python tests passed**. The ten root
browser reports and `unit-tests.json` bind all current production source hashes.

## Version 0.9 release checks — 18 October 2026

This release includes the features described in
[Release preparation](docs/RELEASE_PREPARATION_EN.md). The distributed0.8 ZIP
is frozen; its original reports are archived under verification/0.8. The new
top-level verification reports describe0.9; unreleased-20261018 retains the
earlier source-only preparation results.

`release-features.test.cjs` tests bounded/exportable diagnostics, metadata
sanitization, UTF-16LE preservation and invalid Unicode, six complete tutorial
catalogs, actual game-native name bindings, missing translations and ambiguous
or unsupported roster layouts. Supply `RB2_LOCALIZATION_FIXTURES` with the 510
original TUTO TXT files and `RB2_ROSTER_FIXTURES` with cs_main/cs_form/Appearance
and the 137 original CharacterName TXT members to run every real-file case.
These inputs remain private. `tools/build_help_languages.py` regenerates language
previews from six privately extracted G_Tutorial packs.

`browser_release_features.py --fixtures /path/to/original-fixtures --output
/tmp/private-feature-qa` exercises language previews without mutations,
localized edits/download/undo/redo, separate interactive form/fusion diagrams,
reference pagination/filter resets, native roster preview/apply, workspace
restore and downloadable error logs. That fixture directory also contains
`localized/` and `roster/` subdirectories matching the unit inputs above.

The archive UI suite now verifies all 545 extracted original resources,
a complete 545-file workspace roundtrip, and importing an edited Italian text
through the actual battle_others AFS. An independent Python decoder checks
exact edited bytes, every nested sibling and all other language entries.
The new text display has not been replayed in RPCS3; these checks establish
editor/file-format behavior. NTSC compatibility is the user's import/export
confirmation, separate from the European developer fixtures.

Final0.9 verification: **124 Node tests passed, zero failures/skips**, with all
private original-file fixtures available. Twelve browser suites cover the same
25 production files, including the new release-feature and music/conditions
checks. Lint and formatting pass, as do3 Python release-gate tests. Browser
coverage includes exact music-field export bytes, mode-specific56 semantics,
live Handicap/arena updates, readable health-percent reward edits, ordinary
versus secret destinations, mission483 token explanations, automatic End0 and
Undo. The review suite reads the application's version metadata when checking
extraction manifests, so a release bump is not mistaken for a format failure.

Native findings are independently reproducible with tools/music_selector_research.py
and tools/zone_condition_research.py (original private ELF/resources, capstone5.0.7).
These static checks are distinct from a gameplay/listening test. The isolated
RPCS3 arena-only fixture was rebuilt and decoded successfully, but this session
could not advance game input past the title screen; no arena playthrough is
claimed. Result flags11/12/13 retain explicit unmapped gameplay names. Native
Windows execution has not been exercised; browser tests ran on Linux Chromium.
