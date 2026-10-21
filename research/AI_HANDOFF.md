# Handoff for humans and AI

## EBOOT workspace preview — 19 October implementation update

The private development checkout includes separate `eboot-container`, `eboot-data`,
`eboot-mods`, `save-adapter` and `eboot-ui` classic-script modules. Start with
[the executable/save guide](eboot-studio-20261019/EBOOT_MODS_RESEARCH_EN.md) and
[current implementation evidence](eboot-studio-20261019/VERIFICATION_EN.md).
Supported small features are selectable; G67/G100/D2/C64 and secret-route/Zone
expansions remain research-only. No expansion installation or new release is implied.

The exact browser-exported debug SELF boots in RPCS3 and loads the original 55k
save with only the expected availability-bit changes. The new G100 footer marker
survives an exact full 110k native load. Explicit G100 downgrade with added-progress
loss and owner-selection reset loads byte-identically under the original engine.
These are separate native-load controls, not new full campaign or cross-region
gameplay runs. Do not replace their scopes with the broader old D2/G100 claims.

An unknown full hash is not a layout detector. The EU UI additionally audits 388
critical stock/known-expanded save/map words; unknown changes block adaptation.
Other regions can qualify for a local DLC patch while leaving save layout unknown.
The adapter accepts decrypted payloads by content/checksum, not regional filename.
Do not mix same-length expanded formats or silently drop added progress on downgrade.

## Start here

1. Read [current findings](FINDINGS.md) and [open questions](OPEN_QUESTIONS.md).
2. Follow the topic guide in [the index](README.md); use its evidence links.
3. Read [history](EXPERIMENT_HISTORY.md) before interpreting a negative old test.
4. Match inputs using hashes and regenerate evidence where possible.

This handoff replaces scattered chronological personal notes as the entry point.
It is not authorization to start an emulator, patch a game, publish a release or
reapply an old rollback journal. Those actions depend on the current user's task.

## Facts that prevent repeating days of failed experiments

- Native ID, preset index, Appearance index, Strength index, root ID, world-icon
  index, equipment index, item text ID and property-bit index are separate namespaces.
- Boot entry 22's virtual resource path is not a disc directory. Its supplied AFL
  name `db_font_pad_PS3_s.zpak` is misleading but refers to the right archive entry.
- The supplied community item labels were wrong in important special-item ranges.
  Rebuild from item_parameter records and original localized strings. No constant
  offset translates every item or every PDF column.
- Goku SSJ2's slot 0 is cancellation to base; slot 1 is SSJ3. Item 0x156, not 0x153,
  requests slot 1 at three bars. Preset links alone do not set the animation.
- Cancellation can load the base destination preset. The earlier claim that it
  always preserves the transformed preset was wrong.
- CPU MAX and empty item slots were not established causes of failed flow items.
  A heavy CPU MAX setup subsequently transformed and reverted.
- Team-switch timing is not team-switch destination. The CPU can choose a later
  live roster member. The user's remembered-button theory is unproven.
- A mission caption does not implement its effect. MAIN mission items target the
  player team; enemy equipment is a separate Strength path.
- Conditions are postfix programs. End: 0 is required. MAIN query masks are 8/2,
  not boolean 1. Offline unknown state must remain unknown.
- More MMD roots do not expand save records, launch bitmaps, icon pools or stack
  buffers. A correct checksum and untouched outer canaries do not prove RAM safety.
- Battle Zone +10 is displayed LV. Its save key comes from coordinates, not root ID.
  Original X values include 2; earlier validation rejecting them was an editor bug.
- Zone ordinary links are editable. Native secret requirements are mode/slot-wide;
  +30 is not a demonstrated route override, and reward expressions are separate.
- A sparse boundary success is not evidence that every allocated slot works.

## Reproduction baseline

European BLES00978; recorded RPCS3 version 0.0.43-20291-ffba2bf0. Original decrypted ELF:

```text
8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892
```

Main TOC in the analyzed ELF: `0x006E8D90`. Instructions are guest virtual addresses,
not offsets in EBOOT.BIN or host process pointers. The analysis helpers translate
file-backed ELF segments. Heap addresses in archived snapshots change between runs.

Debugger observations used an isolated profile and matched actor identity/preset
before HP/aura controls. A full-process restart is required for cold-load evidence.
A title-screen or pre-START zero buffer is not a successful or failed save load.
Avoid simultaneous debugger command producers: earlier overlapping batches mixed
responses and produced incomplete reads. Re-derive live pointers instead of trusting
archived PIDs, addresses, installation journals or emulator state.

## Executable patch follow-up (19 October 2026)

The owner requested costume research and a recap for a future executable editor.
Start with [the patch roadmap](EBOOT_PATCH_ROADMAP.md) and its evidence. Main-player
Galaxy costume is a literal0 in setup, separate from Appearance-based preset allies
and enemies. The one-instruction costume1 override reached active combat under
natural CPU attacks (Goku39264/40000HP); source archives stayed original and the
debugger made no memory/register writes. Black software-rendered models limit visual
texture checks. A per-character policy and an in-game selector are distinct future
features. New executable inputs require their own identity and consumer audit; data
format compatibility across regions does not make these instruction addresses portable.

## Download presets and pre-modded EBOOTs (19 October follow-up)

Read [the detailed report](download-presets-20261019/DOWNLOAD_PRESETS_EN.md) and
its regional profiles/runtime report. The old Enabler removes a nonvolatile r30
reload; the clean unlock changes ANDC to OR in the load cleanup. European cold
process / valid-save load with all100 download bits cleared produced exactly26
fixed-list bits, with seven changed bytes entirely inside CD20..CD2F. No debugger
writes. This is not a save/cold-reload, all-costume, new-game or USA/Japan playtest.
The isolated emulator/helper/display processes were stopped.

The owner confirmed one changed instruction in each legacy executable. European
restoration independently matches the original entire ELF. US/JP references were
reconstructed; supplied USA v1/v2 is still unidentified. Five audio/revision
variants do not automatically imply five code layouts. Do not use one regional
delta for all features; mapped candidate spans have different shifts.

`tools/download_preset_research.py` accepts unknown whole-file hashes only when
nine feature-local spans match one audited regional layout after normalizing the
recognized owned instruction states. It preserves unrelated modifications, detects
conflicts and supports idempotent clean-policy changes. Nine fixture-dependent
tests pass, including coexistence with the separate costume instruction edit.
This compatibility mechanism is not yet a Studio GUI or a port of D2 expansion.
Keep full ELF/save/RAM private. Encrypted/signed SELF export remains unimplemented.

## What is deliberately excluded

Original archives, extracted game fixtures, saves, firmware, executables, full RAM
dumps and transient process/session logs remain outside the repository. The evidence
inventory states what is included. Some old reports mention private scratch paths;
those identify historical inputs, not downloadable repository files. Where important
evidence was missing, the publication audit imports the corresponding structured audit.

All content needed to understand a conclusion should be reachable from the English
topic guide and evidence index. If a claim lacks a consumer trace or reproducible
observation, keep its status unresolved rather than inferring what the user expects.


## Independent Galaxy follow-up (active19October research)

[Current summary](executable-followup-20261019/STATUS_EN.md) and
[detailed follow-up](executable-followup-20261019/RESEARCH_EN.md): G67 is now a
successful European80-instruction research prototype with67aggregates, native
root498 victory339000, engine save and exact110000-byte cold reload. Original
Tutorial/Zone banks are retained. This supersedes the earlier lack of any safe67th
aggregate result. G100139-instruction prototype extends world pointers and launch
bitmap; world index99/root531 naturally won339000, saved and cold-loaded with an
exact110000-byte match after a monotonic AFS rebuild. An appended nonmonotonic AFS caused an initial startup crash;
that packaging failure must not be reported as a count limit.

Regional initializer code differs despite agreeing storage offsets: JP walks byte
offsets0..71C with helper calls, where EU/USA use CTR66. Some constructor byte
patterns are ambiguous even in the same executable. Read the small regional JSON
proofs before porting. The layered costume table now initializes native3/costume1 and native0/costume0;
the Enhanced/download helper sets only the two measured availability bitmaps after
valid load. A separate direct-to-Zone control now verifies explicit per-root music0
and6 reaching initialized actors; Null audio, controlled enemy terminal-state return,
not a natural KO or listening test. The existing-secret control still fails before
evaluation; no successful predicate/latch/fork claim.
Eight aggregate score/flag scans still count66 in G100; see the follow-up report.
Zone selection appearance and actual navigation must be controlled separately. The current private runtime handoff
is intentionally not a public operational dependency.

The full C64 Tutorial attempt loads its matching D2 save but fails in resource
initialization before rendering the64-member map (main return PC3C3FD4). All29 C64
words match live memory. Do not upgrade old sparse root63 persistence to full-map
success. G100 and D2/C64 share110000-byte file size but DIFFERENT bank layouts.
Caption-based Zone identities were also corrected: use native state and loaded
member, not “Zona a losanga” artwork. Eight global aggregate scans still count66.
The private experimental emulator/helper processes were stopped after capture.

## Ordinary VS DLC costume option (later 19 October)

Read [the scoped report](vs-costumes-20261019/VS_COSTUMES_EN.md) and its native JSON.
Raw `game_resident_character_param.dat` is 100 x 56 bytes: +20 ordinary costume
count, +2C total. Exactly the 26 Download-native forms differ; the DLC index equals
the ordinary count. Do not confuse this with cs_main+0C (related-form count).
EU count getter174790 returns +20 at17480C; change that load to+2C. Next/previous
selector174818 skips unavailable save bits; hook1748D8 to the authored read-only
helper1000140, table1000900, selective for the exact native/DLC index. Existing
save bank+20+native*E8, bit costume+1 needs no expansion; this patch writes no bits.
Normal-input VS control: original Goku wraps1->7; patched wraps1->8 and Vegeta1->3.
Initialized ordinary actors use costume7/2 with presetFFFFFFFF. Full loaded55k
save equals disk. Software materials remain black, so don't claim all textures.
The production patch matches the runtime control ELF byte-for-byte. Studio's new
vsCostumes flag has exact reversible two-word ownership; older zero-filled helper
extensions upgrade without overwriting foreign modifications. USA/JP span matches
are static only; their option remains disabled. No official release was built.
