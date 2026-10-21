# Research and release tools

Run Python tools from the repository root; use `--help` before providing private
inputs. Most scripts write new outputs and reject overwriting. Original game files
are not included. Read [reproduction](../research/ARCHIVES_AND_REPRODUCTION.md) and
[development](../DEVELOPMENT.md) for the supported baseline and dependencies.

## Core file inspection and editing

| Tool | Purpose |
|---|---|
| afs_research.py | Read AFS directory; extract or replace within a researched slot |
| zpak_research.py | STPK/STPZ token codec, extract, inspect and fixed-size replace |
| mmd_research.py | Descriptor geometry and guarded fixed-byte patches |
| mmd_edit_research.py | Resizable document representation used by research helpers |
| mmd_graph_research.py | MAIN graph consistency |
| mmd_condition_research.py | Postfix parsing/evaluation, explicit unknown runtime state |
| mmd_inspect_advanced.py | Teams, actions, rewards and local move inspection |
| preset_research.py | DAT table catalogs and guarded equipment edits |
| galaxy_address_book.py | Original mission lookup and HxD reference-chain offsets |
| ram_research.py / battle_snapshot_research.py | Inspect supplied guest-memory captures; do not assume host pointers |

These older Python repackers have stricter/different size/layout scope than the
current browser archive bridge. Do not assume every old helper supports Studio's
resized import workflow or arbitrary resource layouts.

## Read-only evidence and catalog rebuilds

- `elf_evidence.py`: original-hash checked PPC64 disassembly and segment mapping.
- `galaxy_player_costume_research.py`: read-only main-player costume argument,
  configuration and actor-copy proof; exact-original candidate metadata.
- `item_localization_research.py`: equipment row → localized name/description binding;
  choose `--language US` for English.
- `main_progression_flags_research.py`, `zone_condition_research.py`,
  `zone_outcome_flags_research.py`, `music_selector_research.py`: selected native proofs.
- `build_editor_reference.py`, `build_progression_reference.py`,
  `build_help_languages.py`: game-derived reference catalogs.
- `build_studio_ui_assets.py`, `extract_title_logo.py` and portrait mode of
  `build_editor_reference.py`: original artwork extraction with provenance manifests.
- `verify_research_publication.py`: evidence inventory, claim links and publication
  exclusions. It does not claim to rerun old gameplay or certify every historical label.

Capstone 5.0.7 is needed for disassembly helpers; Pillow is needed for artwork rebuilds.
No original ELF or texture resource is distributed.

## Historical controlled battle builders

`build_kid_buu_mod.py`, `build_ai_type_probe.py`, `build_cross_control.py`,
`build_flow_only_probe.py`, `build_kb07_controls.py` and later corrected/heavy/roster
builders document the KB experiment sequence. Early presets deliberately reproduce
old mistaken item labels/choices. **Do not use them as current item recipes.**
Use [the corrected analysis](../research/PRESETS_ITEMS_AND_TRANSFORMATIONS.md) and
[experiment history](../research/EXPERIMENT_HISTORY.md) to interpret their output.
Shared archive functions are retained because later helpers/tests import them.
`build_galaxy_extra_mission.py` records the added-node controls; archive validation
is not a universal gameplay or expansion-capacity claim.

## Experimental save and ELF work — separate from Studio

| Tools | Scope |
|---|---|
| galaxy_save_extension.py / apply_gs512_elf.py | Historical 512-mission format and exact-input ELF delta; later old-reader caveats apply |
| double_save_research.py / apply_double_save_elf.py | D2 110,000-byte save conversion and exact 329-instruction delta plus authored helper segment |

These tools are not invoked by Galaxy Studio. Applying them is not a normal editor
installation step. Read [current capacity results](../research/SAVE_RAM_AND_EXPANSION.md)
first. They need matching original decrypted data and produce new files; never mix
formats, regions or arbitrary prepatched executables. A reproduced ELF hash does not
establish all gameplay paths or new-game initialization.

## Tests and packaging

`test_*.py` covers codecs, malformed input, preservation, graph/condition behavior,
save migration and release verification. Private Tutorial fixtures are selected by
`RB2_TEST_FIXTURES`; without them those specific tests skip explicitly. The packager
is `package_galaxy_studio.py`; its exact gates are documented in DEVELOPMENT.md.


## Download-preset executable research

`download_preset_research.py` inspects the supplied regional legacy Enablers and
can create a **new decrypted research ELF** with either scoped preserve or unlock
policy. It repairs the recognized broken register restore. Whole-file hashes
identify known inputs; unknown hashes need all nine audited local checks, with
unrelated bytes preserved and local conflicts rejected. It does not resign SELF,
modify saves, implement a Studio EBOOT GUI or certify arbitrary mods.
`executable_regions_research.py` compares separately mapped regional candidate
spans; masked external dependencies still require their own audit.

Read [the report and profiles](../research/download-presets-20261019/DOWNLOAD_PRESETS_EN.md).
Tests use private decrypted fixtures, not repository game binaries:

```console
RB2_DLC_FIXTURES=/path/to/decrypted-legacy-files python -m unittest discover -s tools -p test_download_preset_patch.py -v
```


## Independent Galaxy aggregate prototypes

`galaxy_aggregate_research.py` constructs a new G67/G100 research save only from
valid original55000-byte input; `reproduce_aggregate_elf.py` reproduces their exact
European instruction manifests. Read [the follow-up](../research/executable-followup-20261019/RESEARCH_EN.md)
for native G67 evidence and current G100 status. These share D2's110000-byte length
but have different bank layouts. Explicit profile selection is mandatory; no
large-save autodetection, automatic downgrade, SELF resigning or Studio integration
is provided. Unknown whole-file compatibility is currently only audited for the
separate small download-preset feature, not for these broad expansion deltas.

`build_g100_control_mmd.py` reproduces the diagnostic G100 mission/world data from
the exact original European `galaxy.mmd`: all original roots, 34 added one-action
Galaxies, 100 icons and the new neighbor chain. It checks the complete output hash
against the private runtime fixture. Read-only unless `--output` names a new file.
The matching research executable and save are required; the MMD alone is unsafe
with the original 66-aggregate engine. Archive rebuilding remains a separate step.

`reproduce_feature_control_elf.py` reproduces the layered G100 scoped-feature control
from its exact manifest, without writing unless `--output` is supplied. Read the
per-feature runtime status in the research report. The authored helper header and
address are owned explicitly; this is not an automatic allocator for other mods.

`reproduce_circle_control_elf.py` similarly reproduces the C64 category-2 circle
control from the exact final D2 ELF, read-only by default. Its 29 instruction edits
also enlarge the renderer instance pool and move following category indices.
Other category budgets and the independent Galaxy count are unchanged. Consult
the follow-up report for its runtime status before interpreting the capacity.

`vs_costume_research.py` checks the exact European v1 ELF and raw
`game_resident_character_param.dat` without modifying either. It verifies all100
ordinary/total costume count pairs against the26 Download Appearance entries and
emits code-span hashes plus the relevant save-bit layout. Read the
[VS costume report](../research/vs-costumes-20261019/VS_COSTUMES_EN.md) for the
separate runtime controls and the reversible Studio implementation.
