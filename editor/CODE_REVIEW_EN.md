# Galaxy Studio 1.0 publication review

The 0.10 code review below is retained as implementation history. The official
release additionally places both Zone guidance panels only in Route, makes
Tutorial fixtures private/configurable in Python tests, separates portable app
contents from development/history files, and publishes curated English research.
All current source-bound checks are recorded in verification/.

# Galaxy Studio 0.10 code review

Reviewed the handwritten shell, mission/preset/help UI, condition interpretation,
mod catalogs and roster readers, binary codecs, archive bridge, history/workspaces,
styles and packaging. Generated catalogs and extracted artwork were inspected as
inputs; they were not hand-rewritten.

## Changes made for 0.10

- **Context-sensitive token help.** The raw token explanation used MAIN mission
  progression meanings for callbacks 2/3 even inside Battle Zone. It now keeps
  Battle Zone callbacks explicitly unmapped, matching the readable condition summary.
- **Roster parsing outside the UI.** Loose files and AFS members now share the
  `GameRoster.fromFiles` selection/validation contract. The dialog handles file pickers,
  asynchronous reads and progress; the core handles recognized names, duplicates,
  required inputs and profile construction. Loose-file size limits and AFS conflict
  checks are retained. Removed a native-ID guard made unreachable by the row limit.
- **Shared existing helpers.** Mod profile downloads use the shell's existing Blob
  download helper, and imported/selected files use one kind-to-tab mapping.
- **Prevent repeated maintenance mistakes.** Extended lint checks for constant
  expressions, unused expressions, self-assignment and redundant control flow.
  Release packaging checks the selected version's build tag and requires the new
  feedback and all-Zone banner browser reports as well as prior release suites.
- **Central route labels.** Route cards and the new Zone-wide banner use one native
  requirement lookup, distinguishing all 16 stock files from an unknown mod filename.

## Retained deliberately

Binary layouts, opaque payloads, copy-on-write handling, transaction rollback and
Undo remain distinct responsibilities. Combining those guards would weaken failure
recovery. No speculative simplification of native transformation links, save limits
or Battle Zone callbacks was made. Larger UI modules could be split in a later
maintenance task; there is no new framework or runtime dependency in this release.

## Validation

See the 0.10 section of `TESTING.md` and current top-level `verification/` reports.
Tests bind production source hashes. Browser checks run in Linux Chromium through
local HTTP; they are not a Windows launch or complete gameplay certification.

---

# Galaxy Studio 0.8 code review

Reviewed the handwritten editor scripts, styles, binary document readers/writers,
archive bridge, workspace/history workflows and release tooling. Generated catalogs
and original extracted artwork remain unchanged.

## Changes made

- **Four element factories had diverged.** Mission, preset, help and shell panels now
  use one browser-only `js/ui.js` factory. It preserves input properties, datalist
  attributes, nested children and event handlers. Pure binary classes still work in Node.
- **Retired UI left unused code.** Removed old header/branding and decorative hero-card
  CSS, unused expression-preview and field helpers, unused constants/state and a file-kind
  inference branch whose result was always null. Unknown DAT layouts still ask explicitly.
- **Availability query removal was broken.** The Remove action called an undefined `read`
  function. It now removes from the current query rows and retains the terminator. A real
  browser check verifies the other row and exact-byte Undo.
- **Cancellation had inconsistent behavior.** Archive code threw an ordinary Error while
  the dialog expected AbortError; cancellation could arrive during the final progress
  callback or yield. Consistent checks now reject that operation before returning output,
  restore the controls and permit retry without changing the source AFS. A final dialog
  check also discards results if cancellation arrives during asynchronous manifest hashing.
- **Maintenance and rendering work.** Handwritten scripts/styles are formatted consistently;
  mission rendering reuses one free-ID set, and exports read the version from HTML metadata.
- **Release evidence was too permissive.** The 0.8 builder requires every mandatory report
  to finish with PASS and cover every current production source. Missing coverage for a new
  JS file, incomplete runs and changed sources fail before creating the ZIP. Three Python
  regression tests verify these cases.

## Preserved deliberately

The binary schemas, opaque fields, savedata limits, item/character namespaces and
transformation mappings were not redesigned as part of cleanup. Transaction rollback
inside standalone document operations remains necessary even when the UI also has Undo.
Module-specific field/panel wrappers remain where they express different behavior.
No framework, server, npm runtime dependency or executable patch was added to the app.

The larger mission/preset modules could later be separated by editor section. That is a
maintenance option; this release concentrates on confirmed duplication and defects while
retaining the existing offline/classic-script model and binary compatibility.

## Validation and limits

See `TESTING.md` and `verification/` for source-bound release results. Coverage includes
original MMD/DAT roundtrips, pending edits and Undo/Redo, presets, conditional teams,
mission deletion/reuse/moving, Galaxy transfer, mod profiles, actual archive downloads
and independent decoding of rebuilt progress data. New checks exercise cancellation
and availability-query removal in the complete app.

Browser automation runs in Linux Chromium. Native Windows double-click execution and
arbitrary custom battles are not certified by those checks. The previous original-EBOOT
transfer experiment remains documented separately; cleanup does not expand its supported
donor set or any native game limit.
