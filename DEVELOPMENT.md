# Development and release workflow

Galaxy Studio is classic-script HTML/CSS/JavaScript. Its runtime has no npm packages,
server, network calls or build transpiler. Edit `editor/`, then open `index.html`.
Use this checkout; a worktree is not required for environment setup.

## Tools used for verification

- Node.js 24 and Python 3.12 in the recorded release environment.
- ESLint 9.39.0, Prettier 3.6.2; development checks only.
- Playwright 1.62.0 with Chromium for browser tests.
- Optional analysis: Capstone 5.0.7 and Pillow 12.3.0.

`requirements-dev.txt` records Python analysis/browser dependencies. The app itself
does not need any of these tools. Python helpers use only the standard library
unless their own instructions say otherwise.

## Checks without game files

From the repository root:

```console
node --test editor/tests/*.test.cjs
python -m unittest discover -s tools -p "test_*.py" -v
python tools/verify_research_publication.py
```

Fixture-dependent cases explicitly skip when private inputs are missing. Such a
run validates synthetic cases; it is not the complete release check. CI has no game
files and must not pretend those skipped integration cases ran.

Run formatting/lint from `editor/` so that relative ignore/config paths apply:

```console
npm exec --yes --package=eslint@9.39.0 -- eslint js/ --config eslint.config.mjs
npm exec --yes --package=prettier@3.6.2 -- prettier --check "js/*.js" styles.css index.html eslint.config.mjs
```

## Full checks using your own extracted originals

Set these environment variables to private directories outside the repository:

| Variable | Required contents |
|---|---|
| RB2_TEST_FIXTURES | galaxy.mmd, tutorial.mmd, all 16 original zone MMDs and preset DATs |
| RB2_HELP_FIXTURES | tutorial_message_table_01.dat through 09 |
| RB2_LOCALIZATION_FIXTURES | All 510 original TUTO_###_XX.txt members in six languages |
| RB2_ROSTER_FIXTURES | cs_main.dat, cs_form.dat, Appearance and one language's CharacterName TXT members |

Then rerun both Node and Python test commands. Tests read originals and write copies
under temporary output directories. Release tests must have zero failed/skipped
fixture cases. Do not commit the fixture directories or downloaded game edits.

Browser suite usage is documented in `editor/TESTING.md` and each script. Some
older suites use the original cloud fixture layout; they need those private paths
or an adaptation before running elsewhere. They are not dependencies of the app.
Modern standalone examples:

```console
python editor/tests/browser_smoke.py --http --fixtures path/to/originals --output path/to/private-output
python editor/tests/browser_release_features.py --fixtures path/to/originals --output path/to/private-output
python editor/tests/browser_zone_banner.py --fixtures path/to/originals --output path/to/private-output
```

Original archive UI tests also require the three AFS archives. Browser outputs can
contain game-derived files/workspaces. Copy only intended JSON reports and selected
screenshots to source verification, never the entire private output directory.

## Package a release

Update the application version/build metadata and guides, then run the full checks.
Top-level `editor/verification/` must contain successful reports bound to **all current
production source hashes**. The packager rejects stale/incomplete coverage and checks
all extracted artwork hashes before writing a new ZIP.

```console
python tools/package_galaxy_studio.py --version 1.0 --output path/to/RB2-Galaxy-Studio-1.0-Windows-Portable.zip
```

Existing outputs are refused. Portable 1.0 includes the app, English guides, current
verification and current previews. Tests/development configuration and repeated
historical screenshots stay in Git rather than inflating each app ZIP. ZIP CRCs and
every file's SHA256 are checked; `FILES.sha256` is included.

Extract the ZIP to a path containing spaces and rerun browser checks against that
actual app. `browser_music.py` and `browser_zone_banner.py` accept `RB2_EDITOR_ROOT`
as an override for this purpose. These Linux/local-HTTP checks do not certify a
native Windows launch. Preserve previous distributed ZIPs and record a separate
final release-validation report with the archive digest and packaged-app results.

For a future GitHub release, prepare code/docs/checks/package first, then publish
the reviewed commit/tag and exact ZIP. Do not silently change repository visibility.
