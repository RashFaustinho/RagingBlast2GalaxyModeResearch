# ⚠️ PREDOMINANTLY AI-DEVELOPED AND AI-RESEARCHED

**Galaxy Studio and the research in this repository were produced predominantly
with AI assistance. This is a central fact about the project, not a minor tooling
credit. AI generated much of the code, reverse-engineering analysis, documentation
and test automation. Human work supplied the game files, research questions,
direction, independent gameplay tests and corrections.**

**AI output can be wrong.** Early explanations in this project were wrong and were
subsequently corrected. The research distinguishes observed gameplay, controlled
RAM experiments, static code evidence, file structure and unresolved hypotheses.
Passing an editor test is not proof that every custom fight works in the game.
Please retain this disclosure when sharing the project or its conclusions.

# Raging Blast 2 — Galaxy Studio

An English, offline editor for **Dragon Ball Raging Blast 2 on PlayStation 3**:
Galaxy and Tutorial missions, character presets, equipment, local move selectors,
transformation/fusion links, Battle Zone routes, conditions and tutorial messages.

**[Download the first GitHub release](https://github.com/RashFaustinho/RagingBlast2GalaxyModeResearch/releases/latest)**
· **[Research index](research/README.md)**
· **[User guide](editor/README_EN.md)**
· **[Findings and confidence levels](research/FINDINGS.md)**

## Run on Windows

1. Download the portable ZIP from Releases and extract the entire folder.
2. Double-click **Launch Galaxy Studio.cmd**, or open **index.html** in an updated
   Microsoft Edge or Google Chrome.
3. Open several extracted MMD/DAT files together. Alternatively, Overview can
   extract editable members from your own AFS archives and build patched copies.

There is no installation, Python/Node runtime, server, account or internet
requirement for using the app. Source files are read locally; outputs are downloads.
The launcher opens a browser application, rather than a native Windows executable.
Keep its `js` and `assets` folders beside `index.html`.

## What it edits

- Galaxy/Tutorial missions: teams, maps, links, arenas, music, rules, objectives,
  optional action requests, rewards and progression expressions.
- Preset containers, shared Appearance/Strength tables, equipment and form links.
- Existing Normal/Ultimate Battle Zone encounters, directed links, handicaps,
  Challenge Stamps and evaluated reward conditions.
- Tutorial message order and six localized text sets.
- Mod-specific reference catalogs, including roster extraction from game AFS files.

## Limits to understand first

| System | Original engine constraint |
|---|---|
| Galaxy progress | 498 original mission records; storage for 500 total |
| Independent Galaxies | 66 world icons/score aggregates; transfer reuses one |
| Native owner lookup | 100 original character/form slots; a mod catalog does not expand the engine |
| Visible mission circles | Separate category pools, including one Boss circle per map |
| Tutorial | Nine original result rows and independent fixed-count consumers |
| Battle Zone | Two modes × eight selectable Zones; coordinate-based result cells |
| Action requests | 20 native detector entries, not arbitrary QTE scripting |

Battle Zone links are editable. The action unlocking a secret route is selected
by native code for the whole Normal/Ultimate Zone slot; Studio cannot redefine it.
The **Route** tab explains the applicable requirement and ordinary route choices.

Save/engine expansion prototypes are documented separately. They are **not enabled
by Galaxy Studio**, and the research has not established an unlimited campaign or
a safe maximum for every mode. See [Save and RAM limits](research/SAVE_RAM_AND_EXPANSION.md).

## For researchers and future AI sessions

Start with [Research index](research/README.md), then
[AI/human handoff](research/AI_HANDOFF.md). The repository includes English manuals,
original-file catalogs, recorded experiment outcomes, disassembly-based evidence,
reproduction scripts and editor regression tests. The index identifies historical
reports whose pending statuses or interpretations were superseded.

Original game archives, MMD/DAT fixtures, executables, firmware, saves and full RAM
dumps are not distributed here. Reproduction requires your own matching inputs;
native addresses are bound to the recorded European executable hash.

## Validation and compatibility

The user confirmed PAL, NTSC-U and NTSC-J import/export compatibility, including
v2.00. Developer checks use the supplied European BLES00978 data. This does not
make European executable offsets portable to other releases or roster mods.

Editor automation runs in Linux Chromium. Windows double-click launch and every
arbitrary exported battle have not been independently certified by those checks.
See [Testing](editor/TESTING.md), [code review](editor/CODE_REVIEW_EN.md) and the
source-bound reports in `editor/verification/` for the release's exact scope.

See [development](DEVELOPMENT.md) to run tests and package the app,
[credits and provenance](NOTICE.md) for community references and game artwork,
and [open questions](research/OPEN_QUESTIONS.md) for useful next research tasks.
