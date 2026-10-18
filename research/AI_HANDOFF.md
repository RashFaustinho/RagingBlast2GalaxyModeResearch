# Handoff for humans and AI

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

## What is deliberately excluded

Original archives, extracted game fixtures, saves, firmware, executables, full RAM
dumps and transient process/session logs remain outside the repository. The evidence
inventory states what is included. Some old reports mention private scratch paths;
those identify historical inputs, not downloadable repository files. Where important
evidence was missing, the publication audit imports the corresponding structured audit.

All content needed to understand a conclusion should be reachable from the English
topic guide and evidence index. If a claim lacks a consumer trace or reproducible
observation, keep its status unresolved rather than inferring what the user expects.
