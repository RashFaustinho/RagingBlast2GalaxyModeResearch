# Executable research: current results and remaining limits

Updated 19 October 2026. This work was produced predominantly with AI assistance;
retain the [project disclosure](../../README.md). The broad expansion results remain
research prototypes, not installable Studio options or a new portable release.
Selected small features are now implemented in the
[1.1 development workspace](../eboot-studio-20261019/EBOOT_MODS_RESEARCH_EN.md), with separate
[implementation tests](../eboot-studio-20261019/VERIFICATION_EN.md). Original game files,
executables, saves and RAM dumps remain private.

This page summarizes the current conclusions. The [detailed report](RESEARCH_EN.md)
retains experiment controls, negative results and corrections. Do not interpret an
older intermediate status as stronger evidence than the scoped results below.

## Results at a glance

| Requested capability | Evidence so far | What remains |
|---|---|---|
| More than 66 independent Galaxies | G67 and G100 have natural boundary victories, native saves and exact full-buffer cold loads | New-game initialization, complete campaign/UI coverage, global counters and other executables |
| Already-modded EBOOT support | The download-preset tool accepts audited local layouts while preserving unrelated changes; nine regional fixture tests pass | General patch ownership/composition and separate local profiles for the larger features |
| Automatic download/Enhanced availability | Valid-save loading sets the 26 restricted download bits and 66 Enhanced group bits from a cleared diagnostic input | Fresh-game path, all variants/resources and interaction with ordinary character unlocks |
| Individual Galaxy starting costumes | One table initializes native 3 with costume 1 and native 0 with costume 0, retaining ordinary Custom3 | Valid costumes, transformations, fusions, retries and regional/hardware coverage |
| Different music for individual Zone fights | Two roots initialize with explicit music 0 and 6; original 56 falls back to native pool choice 9 | Other slots/modes, final-Zone cases, invalid values and listening tests |
| Different secret-route requirements by Zone | A 16-entry mode/slot table and an exact existing-secret control are built | Existing-fork attempt failed before battle setup; predicate/latch/selection remain unverified |
| More map nodes/circles | D2 grows the shared map to 64 nodes; C64 additionally expands category 2 and renderer capacity | Full-map attempt failed in resource initialization before the map; other category budgets remain original |
| More Galaxy/Tutorial mission records | Historical D2 root 1039 and sparse Tutorial root 63 naturally completed, saved and cold-loaded | Full-map visibility and other readers are independent; these are boundary tests |
| More Zone cells or selectable Zones | Separate storage, visual-grid and slot consumers have been traced | No demonstrated added-cell persistence or ninth selectable Zone; keep this last |

All native gameplay observations here use the supplied European executable on
RPCS3. Static regional comparison and editor data compatibility are separate claims.
CPU teammate destination selection is outside this task.

## Independent Galaxies: what “100 works” means

The G100 fixture retains all 66 original world icons and 498 original mission roots.
It adds a one-mission Galaxy for each of the 34 native/form owners without one:
100 world icons and 532 roots in total. The patch reserves 600 mission-result rows
and 100 independent aggregate rows in a 110,000-byte save.

The highest added world, index 99, belongs to native 89 and launches root 531.
Normal controller input completed its Ascend objective for 339,000 points. The
native engine saved the result in row 531 and aggregate 99. A completely new
emulator process loaded the entire 110,000-byte buffer byte-for-byte equal to that
engine-written file. The active globals and inactive original Galaxy bank remained
unchanged in the audited transition.

See [the save audit](G100-save-audit.json), [cold load](G100-cold-load.json),
[exact instruction delta](G100-patch.json) and [diagnostic data recipe](G100-data.json).
The smaller [G67 control](G67-cold-load.json) independently demonstrated a 67th
aggregate without extending the world controller's existing spare pointer slot.

This is a boundary demonstration, not 100 completed campaigns. In particular,
[eight global score/completion scans](G100-remaining-aggregate-scans.json) still
iterate over 66 aggregates. Their bases are relocated, but their counts were not
expanded. They can omit added-world contributions from global calculations;
reading that subset is not itself evidence of an overwrite. Achievement policy
and every relevant caller need an explicit decision and further testing.

**100 is not a mathematical engine maximum.** It is the natural target supported
by the original namespace of 100 distinct character/form IDs. Going beyond it
requires more than another score row: owner lookup, roster IDs, unlock checks,
portraits, queries and selection must support new IDs or a separate logical
Galaxy identity. Duplicate icons for the same original owner do not establish
another independent campaign. An existing roster-expansion mod needs its own audit.

## Keep the save formats separate

| Profile | Mission rows | Galaxy aggregates | Tutorial / Zone banks |
|---|---:|---:|---|
| Original | 500 | 66 | Original |
| G67 | 500 | 67 | Original |
| G100 | 600 | 100 | Original |
| D2 | 1040 | 66 | Expanded research layouts |

G67, G100 and D2 all use a 110,000-byte file, but their layouts differ. D2 carries
a checked format marker/capacity tuple. The later private adapter adds a checked
marker for G67/G100; older unmarked files still require explicit selection. Native
G100 marked-load and acknowledged downgrade controls are documented in the
[adapter follow-up](../eboot-studio-20261019/VERIFICATION_EN.md). These do not certify
all campaigns or arbitrary expansion combinations.
Do not combine their patch lists or identify a format from file length alone.
Combining 100 aggregates with D2's larger mission/Tutorial banks needs a new layout
and coordinated relocation, not two checkboxes applied independently.

## Small features and their actual coverage

The [published scoped helper](SCOPED_FEATURE_CONTROL.json) implements a starting
costume table, explicit Zone music, a per-mode/per-slot secret table and post-load
availability changes. It composes with the exact G100 image; it is not an allocator
that can claim another mod's helper address or program header.

Costume indices are zero based: 1 means the second costume. The two-owner control
checks the actual initialized actors, while preserving the player's saved ordinary
Custom3 selection and the enemy's separate preset costume. Software-rendered models
are imperfect, so it does not certify every visible texture or form transition.

Download availability and Enhanced availability use different namespaces. The
clean download policy preserves the original register restore and changes the
fixed-list cleanup from clearing to setting its 26 bits. The Enhanced wrapper sets
66 group flags after successful valid-save loading. Neither installs resources,
unlocks unrelated ordinary characters, bypasses checksums or demonstrates a fresh
game before its first save/load. See [the load comparison](features-after-load.json).

The [music control](MUSIC_RUNTIME_RESULT.json) verifies native configuration and
initialized actors, rather than the menu's caption. With the same music helper,
root 0 passes explicit 0 and root 1 explicit 6; 56 retains native selection. The
return/advance between those roots used disclosed enemy HP/terminal interventions,
so it is not a natural victory. Audio was Null; no listening coverage is implied.
All other mode/slot/final-Zone cases still need their own controls.

The secret requirement remains a Zone-wide policy. The table offers Disabled,
Super win, Ultimate win, Raging Soul win, combo threshold and Always, while retaining
native eligibility and latching. This does not make MMD +30 a per-node evaluator.
Changing the requirement of an existing fork is distinct from adding a new secret
node type and proving its visual resources/route behavior. The narrowed
[existing-fork attempt](ZONE_EXISTING_SECRET_ATTEMPT.json) failed before battle
setup; it does not verify the predicate, latch or secret destination.

## Full Tutorial map: latest negative control

The C64 image layers29 matching instruction changes on the exact final D2 image:
64 category-2 circle pointers,99 renderer instances and shifted following-category
indices. The [fixture](C64-data-preparation.json) has64 Tutorial members, including
55 category-2 roots, with root63 as its starting node. All unrelated AFS entry bodies
remain identical in the [archive audit](C64-monotonic-AFS.json).

The game loads the matching110,000-byte D2 save and accepts normal input into
Tutorial, but fails in resource initialization before the map becomes visible.
The [capture](C64-runtime-attempt.json) records a main-thread null write with return
PC3C3FD4, after an allocation-helper call. All29 C64 instruction words match live
memory. There were no debugger memory/register writes, boundary victory, save or
cold-load result in this attempt. Allocation failure/resource heap exhaustion is a
candidate, not an isolated cause. The sparse root63 persistence result remains valid
within its original scope; it does not establish a full64-node map.

## Regional versions and modified inputs

| Input | What is established |
|---|---|
| European v1 | Independently matched original decrypted ELF; runtime baseline |
| Supplied USA | Reconstructed from the author's confirmed single legacy instruction change; v1/v2 not independently identified |
| Supplied Japan | Same reconstruction provenance; native code differs in relevant expansion consumers |
| European v2 / USA v2 | No separately identified executable controls here |

Five audio/revision variants do not imply five proven code layouts. Audio selector
names must come from the actual copy's resources. Japanese aggregate initialization
uses a different loop/frame/register arrangement despite agreeing storage offsets.
Even the mapped costume, music and save routines have different regional shifts;
there is no universal address delta. See [regional world spans](REGIONAL_WORLD_SPANS.json)
and [initializers](REGIONAL_INITIALIZERS.json).

A whole-file hash is a fast identity check, not the only possible compatibility
gate. The [download-preset patcher](../../tools/download_preset_research.py) accepts
unknown full hashes only when exactly one audited regional layout matches nine
local code/table/dependency/ELF checks after normalizing recognized owned states.
It preserves unrelated bytes, rejects conflicting hooks and is idempotent. A real
D2 composition and synthetic unrelated/costume edits have static preservation
checks; they do not certify arbitrary third-party gameplay changes.

The broad expansion reproducers remain exact-input tools. A future Studio patch
manager needs separate feature ownership, dependency checks, helper allocation,
versioned save migration and verified reversal. A decrypted ELF is not an encrypted
or signed SELF/EBOOT.BIN container; export/signing and physical PS3 compatibility
remain separate work.

## Negative controls and reproducibility lessons

- Keep menu appearance, navigation, stage setup, live combat, save and cold load
  as separate checkpoints. A selectable icon alone is insufficient.
- The cleared-availability fixture proves scoped load writes but is not an intact
  gameplay baseline. Restoring other availability bits correlated with a successful
  stock-Zone control; other negative runs also changed node types or visited the
  expanded Galaxy menu, so not every renderer failure has one established cause.
- An earlier probe hardcoded the published helper's hash while a restarted control
  used its default-table variant. They differ at exactly one owned table byte;
  [the identity audit](TABLE_VARIANT_COMPARISON.json) corrects the affected reports.
  Current Zone probes check live hooks and the entire helper segment.
- Localized Zone captions do not identify the loaded native slot reliably in these
  controls. An earlier slot2/Blue inference is withdrawn; native slot0 loads
  `zone_green_square.mmd`. The existing-secret control also failed before evaluation.
- Zone setup uses native getter 1CD534, not the MAIN mission config singleton.
  Earlier inactive-config zeros must not be interpreted as selected Zone music.
- Unchanged recompression of tested original Zone packs is byte-for-byte identical.
  These attempts did not establish a compression defect. The music-only fixture
  works while retaining original node kinds and geometry.

For exact reproduction, the repository provides `reproduce_aggregate_elf.py`,
`galaxy_aggregate_research.py`, `build_g100_control_mmd.py`,
`reproduce_feature_control_elf.py` and `reproduce_circle_control_elf.py` under
`tools/`. They create new research outputs from matching private originals;
read their help and the [tools guide](../../tools/README.md). No game binaries or
ready-to-install expansion are distributed. Preserve the original-engine warnings
in the released data editor until a supported integration is actually validated.


## Verification of the research tooling

The [reproduction report](REPRODUCTION_CHECKS.json) regenerates the exact G67,
G100, two scoped-helper and C64 ELF hashes, plus the diagnostic G100 MMD, from
matching private sources. These are static reproducibility checks, including the
variants whose gameplay failed. They do not turn a failed runtime control into
a successful one. The [tool test report](TOOL_TESTS.json) records16 passing tests
with no skipped cases:9 regional/local-compatibility,3 aggregate migration and
4 D2 migration controls. The portable editor itself was not changed or rebuilt.
