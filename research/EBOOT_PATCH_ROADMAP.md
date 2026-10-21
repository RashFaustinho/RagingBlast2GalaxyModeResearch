# Executable patch research and a possible Studio patch manager

Updated 19 October 2026. This is a feasibility and evidence map, **not a list of
released Galaxy Studio features**. The portable editor still edits data only.
Read [confidence levels](FINDINGS.md), the [baseline hash](AI_HANDOFF.md) and
the [current follow-up summary](executable-followup-20261019/STATUS_EN.md).

## Main player's costume in Galaxy

The selected main player takes a different setup path from preset allies/enemies.
Galaxy setup at `1ED6B0` calls `1CDAE8` for side0/slot0, passing the selected native
identity in r7 and **literal zero in r8**. The latter becomes the costume:

```text
1ED890  li r8,0
    -> setter 1CDAE8
    -> battle config +70 (side0/slot0)
    -> getter 1CDCE4 returns config +68
    -> 1CC5D8 loads +8, and 1CC5F0 stores parameter row +8
    -> 172E4 / 172F0 copy parameter row +8 to actor +4
```

In the original mission238 control, the main player has ordinary configuration
index2/flags01; the original Galaxy menu describes this as saved **Custom3**.
That2 is not Galaxy preset2. Enemy Krillin has Galaxy preset496/flags41.

Allies and opponents instead call `1E6C18` and copy an expanded preset. Changing a
random Appearance row is therefore not a demonstrated way to change the main
player's starting costume. No researched MAIN field overrides that literal.
Replacing the costume0 model/texture assets is another kind of mod, but changes
the assets used by that slot and is not an independent Galaxy costume selector.

The smallest code candidate changes one instruction:

| Meaning | Value |
|---|---|
| Original decrypted ELF SHA256 | `8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892` |
| Guest virtual address | `0x001ED890` |
| File offset in that ELF only | `0x001DD890` |
| Original word | `39000000` — `li r8,0` |
| Candidate word | `39000001` — `li r8,1` |
| Candidate ELF SHA256 | `0bea38dfba3f003959b1a8c30b9e03c0784ad7f3c4450884a485f73319e1838e` |

Indices are zero based: 1 means costume2. This immediate is **global to the Galaxy
main-player setup**, not a finished per-character/per-mission setting. Characters
can have different valid costume sets. Do not force an unsupported slot globally.
The instruction does not allocate extra savedata or implement a selection menu.
It also does not certify costume handling through every transformation, fusion,
retry, damaged model, movie and result scene.

The read-only reproducer is `tools/galaxy_player_costume_research.py`; its 27
instruction checks establish the path and candidate bytes. It writes JSON to stdout,
not a patched executable:

```console
python tools/galaxy_player_costume_research.py --elf path/to/original-decrypted.elf
```

The [runtime report](costume-20261019/RUNTIME_REPORT.json) records separate
full-process controls of original mission238 (Goku against Krillin). Both used the
original unmodified AFS archives and the same restored private input save. The
original main-player config and actor held costume0; changing that instruction
made both hold costume1, while Krillin remained native12/preset496/costume0. In
active combat, CPU attacks naturally reduced Goku to39,264/40,000 HP and his costume
index remained1. The original control was stopped during its stage introduction. The
main-player config slice differed at the costume byte only. Debugger logs contain
no guest code/register/HP/aura/data writes.

This is runtime proof of the loaded costume index. The software renderer produces
black character models in both sessions, so it is not a reliable visual texture
comparison. The report explicitly separates initialization from later observations
and does not claim a completed victory/save path or form-chain coverage.

A practical first Studio option would be a **per-native costume policy**, defaulting
to the original behavior for unspecified characters. A hook could choose r8 from a
patch-owned lookup table using the selected native ID; a per-mission table could
also use the selected root. The later [scoped follow-up](executable-followup-20261019/RESEARCH_EN.md) implements
this table for the exact European G100 prototype and checks native3/costume1 and
native0/costume0 in configuration and initialized actors. It still needs broader
valid-costume discovery, form-chain controls and alternate-EBOOT identification. A live in-game wardrobe menu would additionally need UI/input work.

## Feasibility map

| Proposed function | Evidence so far | Feasibility / remaining work |
|---|---|---|
| Change Galaxy main-player starting costume | Exact one-instruction change passed original/patched runtime config and actor checks; see costume report | Strong small-scope candidate. Per-character fallback and transformation coverage are separate work. No save expansion needed for a fixed policy. |
| Choose saved Custom1/2 instead of the fixed Custom3 for the Galaxy main player | Same caller explicitly sets ordinary customization index2 at `1ED888`; config+80 -> parameter+18 -> actor+8 traced | Good small static candidate. Changing `38000002` to `38000000`/`38000001` would request Custom1/2. Not runtime-tested; costume control retains Custom3. This is not a Galaxy preset index. |
| Honor a Battle Zone node's stored music selector | Original setup ignores root+20 and uses native pools; consumers and sentinel56 semantics decoded | Good next isolated patch candidate: honor explicit selector0..55 and retain native choice for56. Must preserve final-Zone special cases, region audio tables and decide menu-caption behavior. The scoped follow-up now verifies explicit0/6 on two roots with initialized actors and a56-to9 native-pool fallback; Null audio, not listening coverage. |
| Change a Zone slot's secret-route achievement | Native `26F8C8` selects known Super/Ultimate/Raging Soul/combo predicates by mode and slot | Good targeted candidate. Change the predicate or introduce a separate table, then test latch, ordinary forks and return flow. Not an existing editable per-node feature. |
| Give individual Zone nodes different secret requirements | Root+30 is stored/copied, but the traced stock secret flow does not evaluate it | Pursuable larger change: connect an evaluator with the correct completed-battle context and define latch/reset behavior. Blindly calling the VM is not a complete design. |
| Fix the destination of an item-triggered CPU teammate switch | `8A31C`, `AC8AC`, `8A35C` -> `3A9A4` identify separate target selection. KB15C was built with a narrow next-partner hook | Research prototype only. KB15C was stopped at the user's request and **never battle-tested**. Generalization must handle dead/missing targets, teams, ordinary switches and unrelated modes. |
| Raise mission-circle budgets / map node capacity | Stock shared32-node object and separate category pools traced. D2 relocated/grew the shared object to64 | Technically plausible; not solved by one count. Tutorial full64-visible fixture exhausted category2 circles; C64 now targets those pointers and the renderer pool, but the full-map runtime attempt fails in resource initialization before the map. Sparse D2 root63 persistence remains a separate narrower result. Constructors, traversal, destruction, animations and every unlock state need matching capacity. |
| More than500 Galaxy mission results | D2 configured1040 rows; natural root1039 victory, native save and cold reload recorded | Demonstrated boundary prototype, **not1040 fully played missions**. Requires coordinated executable/save conversion, bitmap, caller stack and menu work. GS512 has known missed old-bank readers. |
| More than9 Tutorial result rows | D2 sparse root63 naturally completed, saved and cold-loaded | Demonstrated sparse boundary prototype. Full64-visible map failed on circle budget. Fixed-nine readers, objective masks, stack and map capacities must be audited together. |
| More than66 independent Galaxies | The original-executable67th icon aliased unrelated globals; corrected G67/G100 layouts now isolate their aggregates | G67 demonstrates a native win/save/cold reload with67 aggregates. G100 adds world-array/bitmap growth and now has a natural world99/root531 win, engine save and exact cold reload. Exact European research layouts, not released Studio options; see the19October follow-up. |
| More than21 physical progress cells per Zone | D2 expanded banks, but added-boundary controls failed before a persisted result; out-of-grid cell53 overwrote internal scene members | Blocked research. A larger savedata bank is insufficient. Stamp access, visual grid, native node objects, routing and failures must be isolated first. No supported added-cell claim. |
| More than8 standalone Zone slots per mode | Menu/loader/run-state use fixed eight-slot structures | Large unresolved expansion, separate from extra fights inside existing Zones. No working extra selectable Zone patch. |
| Native roster beyond100 character/form IDs | Ordinary owners/lookups and several bitmaps are fixed; Studio can label extra mod catalog entries | Needs the actual modded executable and its new sentinels/counts/arrays. A larger reference catalog does not expand the game. No universal patch known. |

The D2 prototype doubles savedata from55,000 to110,000 bytes. Its successful
Galaxy/Tutorial results and its Battle Zone failures are detailed in
[Save/RAM and expansion](SAVE_RAM_AND_EXPANSION.md). The configured1040/64/54 sizes
share one storage budget and are not three proven playable campaign maxima.

## Features that already work without an executable patch

- Move an existing Galaxy to an empty native/form owner, reusing its world icon and
  aggregate. The original-EBOOT transfer has a native victory/save/cold-load control.
- Add or change missions **within** the original engine's independent capacities;
  edit teams/presets, equipment, local moves, native form links, objectives and prompts.
- Change Galaxy stage/music and edit ordinary Battle Zone routes, destination kinds,
  handicaps, stamps and reward conditions. Zone arena selection is read from data;
  an arena-only combat control remains incomplete.
- Give preset allies/enemies a costume through Appearance. This is distinct from
  the selected main-player setup described above.

Do not add EBOOT toggles for problems the existing data editor already solves.
For more than66 independent Galaxies and general expansion, use the precise failure
reports rather than the earlier broad claim that "about1000 missions works".

## Suggested integration order

1. Small nonpersistent options: scoped costume policy, explicit Zone music, per-slot
   secret achievement. Each needs its own original/changed/restored controls.
2. Per-node secret requirements, with explicit state/latch behavior and
   compatibility tests. CPU switch destination is excluded from the current task.
3. Save/RAM expansion as a separate experimental profile with conversion/rollback,
   not an ordinary checkbox bundled with appearance changes.

## Requirements for a future executable editor

- Identify the actual **decrypted ELF** by hash and ELF geometry. `EBOOT.BIN` can be
  an encrypted/signed SELF container; ELF offsets are not SELF offsets. Import/export
  handling for that container is a separate requirement. No PS3-hardware/signing
  compatibility was established by the RPCS3 tests.
- Keep a profile per supported region/version/mod. Match expected old instructions
  and surrounding function/control-flow evidence. A matching short byte pattern
  alone is not enough; fail closed on ambiguous builds. New EBOOTs must be studied.
- Produce a new file, preserve the source, and record input/output hashes, changed
  guest ranges, original bytes, feature versions and dependencies in an English log.
- Before enabling/disabling features, check overlapping patches and helper-segment
  ownership. Reversal restores only bytes owned by that feature after checking their
  current values. Do not overwrite another mod with a generic "stock" image.
- Distinguish stock, recognized-patched, compatible local layout and conflicting
  inputs per feature. The download-preset research tool now checks nine audited
  local spans and preserves unrelated bytes even when the whole-file hash differs.
  Old exact-original expansion/costume delta tools remain more restrictive; this
  does not automatically give them the same compatibility guarantee.
- Save format is a dependency: refuse an incompatible engine/save pair, supply a
  copy-based converter, preserve normal-range progress and disclose extra progress
  lost on downgrade. Cold load, new game, retry, return/save and other modes need
  separate tests. Engine capacity and save capacity must be validated together.
- Ship patch definitions and reproduction tools, **not game executable binaries**.
  A future GUI must clearly label static candidates, runtime controls and supported
  release features instead of presenting every research idea as equally complete.

## Evidence references

- [Costume native evidence](GALAXY_PLAYER_COSTUME_NATIVE_EVIDENCE.json).
- [Music native evidence](MUSIC_SELECTOR_NATIVE_EVIDENCE.json).
- [Secret-route and arena evidence](BATTLE_ZONE_CONDITION_NATIVE_EVIDENCE.json),
  [outcome flags](BATTLE_ZONE_OUTCOME_FLAGS_NATIVE_EVIDENCE.json).
- [Transformation/switch analysis](PRESETS_ITEMS_AND_TRANSFORMATIONS.md).
- [Save and RAM experiments](SAVE_RAM_AND_EXPANSION.md).
- [Existing-owner transfer](galaxy-transfer-20261016/TRANSFER_EN.md).


## Download-preset follow-up and modded input compatibility

See [the detailed native and runtime analysis](download-presets-20261019/DOWNLOAD_PRESETS_EN.md).
The historical Enabler NOPs a nonvolatile-register restore. A scoped replacement
sets the26 fixed-list availability bits on successful save load while retaining
normal register handling. A European valid-save load with all100 bits initially0
produced exactly those26 bits; only seven bytes in the entire loaded55,000-byte
buffer differed. No guest debugger writes were used. USA/Japan are statically
mapped, with their original images reconstructed from the confirmed single change.

Whole-file hashes remain useful provenance and fast identification, not mandatory
identity for every feature. The research patcher also accepts unknown full hashes
when its complete relevant functions, dependency spans, table, TOC pointer and
entry descriptor match exactly one audited local profile. Known owned patch states
are normalized; other bytes survive. Nine private-fixture automated tests include
coexistence with the costume instruction edit, unrelated-byte preservation,
idempotence, policy switching and conflict rejection. This is not runtime validation
of arbitrary third-party mods or a generalized relocator for unstudied revisions.

A future GUI should show compatibility separately for each option. An unrelated
mod or unsupported expansion should not block an otherwise locally compatible
small feature. The region/version/audio matrix has five user-reported variants;
the supplied USA executable is not yet classified as v1/v2, and region alone is
not sufficient to identify code or music resources. EBOOT SELF import/export and
signing remain separate integration work.
