# Save, RAM and expansion: audited current status

This document supersedes stale pending/success implications in the chronological
GS512/D2 reports. It describes research prototypes, **not supported Studio options**.
No full game binary or save is distributed. Addresses apply to the exact original
European decrypted ELF recorded in [the handoff](AI_HANDOFF.md).

## Independent stock limits

| System | Original structure | Why appending data is insufficient |
|---|---|---|
| Galaxy results | 500 × 28 bytes at SYS-DATA +8148; 498 original roots | Root 500 aliases aggregate 0 at +B7F8 |
| Galaxy aggregates | 66 existing records, followed by globals at +BF30 | A 67th icon can overwrite selected-native/global state |
| Native owner lookup | 100 slots, 0..99 | A larger editor roster does not extend lookup or unlock consumers |
| Launch availability snapshot | 512-bit bitmap at config +0C..4B | Root 512 writes config +4C, selected native |
| Shared map object pool | 32 nodes | Count-driven MMD allocations elsewhere do not extend this pool |
| Circle pools | Independent per-category budgets | A valid node can receive a null circle when its pool is exhausted |
| Tutorial result scan | Nine rows at save +BFC8, stride 28 | Separate fixed-nine scans and neighboring region +C108 |
| Tutorial actions | 20 entries, bits 12..31 of progress word | Extra tasks do not create another action array/mask |
| Battle Zone | 2 modes × 8 routes × 21 physical cells | Native loading/menu, coordinate keys, UI grid and run state are separate |

Stock save length is 55,000 / 0xD6D8 bytes. The checksum scans little-endian 16-bit
words from byte 8 to end, sums modulo 2^32, then stores `sum>>8` and `sum&255` as
BE32 at offsets 0/4. This is not a CRC. Padding and an initializer clearing more
than the visible row count are not proof of spare supported progress records.

The original Tutorial initializer clears 0x140 bytes, but not every trailing byte
is mapped. Root 11's record +12 reaches the next section at C108. Roots 9/10 are
not certified safe merely because they fit inside that clear range.

## GS512: historical limited prototype

GS512 relocates the Galaxy section to appended +D6D8, retaining the old bank as an
inactive copy. It has 512 mission rows, the same 66 aggregates/globals, length
0x116A8, and a 97-instruction r2 exact-input delta. The launch bitmap remains 512
bits. Natural mission 502 persistence/cold reload and separate boundary 511 controls
are recorded in [the runtime report](limits-20261015/GS512_RUNTIME_EN.md).

**GS512 is not a complete current recommendation:** D2 later found further old-bank
base-minus-eight readers at F85E8, 1CF400 and 1F0ED4. Earlier successful score writes
did not prove every menu/summary consumer was relocated. Preserve this experiment
as evidence of progress, not as a fully audited general patch. The proposed RPCS3
YAML deployment was not itself exercised; direct patched-ELF tests are distinct.

## D2: exactly double-sized save

The final recorded revision reserves:

| Bank | Offset | Layout |
|---|---:|---|
| Galaxy | D700 | 1040×28 bytes plus original 2000-byte tail |
| Tutorial | 150B0 | 64×28 bytes plus original 68-byte tail |
| Battle Zone | 15820 | 54 physical cells/route, 16 routes, retained whole-bank tail |

The format is exactly 110,000 bytes. It retains old banks, A5 guard gaps and a final
marker/capacity record. Budgets compete for the same extra 55,000 bytes; do not add
three separate theoretical maxima. With this deliberate inactive-bank/guard design,
the arithmetic is `58352 + 28*G + 28*T + 384*C`. That is storage geometry, not a
proof of playable mission counts.

The final 329-instruction exact-input delta adds 500 authored helper bytes in a
4096-byte RX segment at 01000000 and updates fixed-offset consumers and sizes.
Patched ELF SHA256:

```text
9f24ca8d05758e112d0a649a09da7519df45a06de947e2855bdfa615bf59d028
```

The patch manifest, helper payload, matched old words and reproduction checks are
in [double-save evidence](double-save-20261015/). Reproduction was rechecked during
publication; the generated ELF remains private and is not included in the release.

## What worked, and under what conditions

- Galaxy table: 1040 slots, with 498 originals and 542 additions distributed among
  existing Galaxies. **Root 1039** naturally won through Ascend, scored **338793/A++**,
  autosaved and survived a full-process restart. Only its row changed in the active
  mission array, with its expected aggregate update.
- Tutorial table: 64 slots, but the successful sparse map displayed only the nine
  originals plus **root 63**. It naturally won through Ascend, scored **398737/S**,
  autosaved and survived a full-process restart. It does not demonstrate 64 visible
  playable Tutorial missions.
- The complete 110,000-byte cold-loaded buffer containing both results matched the
  native engine-written file: SHA256
  `52f74932b9fe4a9ea397181d7c8600dded561c4c6ab9c09725a4572862e7da34`.
- Other active/inactive banks, A5 guards and marker stayed unchanged in those audited
  transitions. Normal timestamps, a native bitfield update and a fixed 26-bit cleanup
  at CD20 were accounted for separately. It is false to claim literally no other
  original byte changes.

These natural completions did not inject HP, objective, score, instructions or
registers during play. Diagnostic preselection/fixtures and other controlled tests
are recorded separately. LLVM cold-load evidence is not a claim of supported LLVM
breakpoints; native PPU breakpoint controls used the interpreter.

## Failures that reveal separate RAM limits

1. Putting all additions in one Galaxy exhausted the shared 32-node menu pool at
   the 33rd displayed node. The patch grew/relocated the object and every known
   constructor/destructor/traversal consumer to a 64-node arrangement.
2. A 251-instruction revision could win Tutorial but returned up to 55 pointers
   into an original 32-entry caller stack array at 1F07F4. Saved registers/LR were
   overwritten before autosave. The final revision grows both callers' frames by
   128 bytes, moves saved state and fixes all six returns. Outer heap canaries had
   not detected that stack corruption.
3. The full visible Tutorial clone map then exhausted category-2 circles. The
   allocator returned null and later animation dereferenced it. Sparse root 63
   isolated the persistence success. Balanced Galaxy categories were statically
   audited, not played through for every future unlock combination.

## Battle Zone: no demonstrated added-boundary persistence

The stock Green Square map control passed with the D2 environment. Enlarged and
sparse boundary fixtures did **not** produce a demonstrated added-cell native win,
save and cold reload. In particular:

- Cell 53 at (1,−11) exceeded a separate 5×13 visual grid. Its transformed flat
  index was 73; writes reached unrelated members inside the scene object. Larger
  save banks and outer canaries do not fix that internal overwrite.
- Several canonical cell-21 variants failed before combat in video-thread code
  at 4F6ED0. Forward-only links, preserved graphical offsets and preserved Stamp
  data did not universally resolve the failure. Its full cause remains unresolved.
- A separate append-parameter variant reached 271CF4 and exposed a real null Stamp
  getter path. This explains that observed failure, **not every video failure**.
- The final minimal control changed only first-root X to 2 in two original Zones,
  preserving sizes, presets, criteria and links. It still failed before a new native
  result. A proposed save-cell migration was written but never executed.

The old validation matrix still says canonical21 pending; the later handoff and
recorded minimal-control outcome supersede it. The [history index](EXPERIMENT_HISTORY.md)
marks that report as historical. Do not advertise 848 playable Zone fights or a
1952-mission combined campaign from configured fixture arithmetic.

## Conclusions and remaining coverage

There is no demonstrated absolute maximum for a fully rewritten engine and no
supported "double save" toggle in Studio. Standalone Zone slots were not solved by mission-bank relocation. A later isolated
G67 prototype now demonstrates a67th independent Galaxy aggregate with a natural
win, native save and exact whole-buffer cold reload. G100 additionally demonstrates
world index99/root531 with the same full-buffer persistence check. Both layouts
are distinct from D2; their successful Galaxy controls do not certify Battle Zone
transitions under the combined feature prototype.
See [the19October follow-up](executable-followup-20261019/RESEARCH_EN.md). Physical PS3, encrypted-save
import, fresh-game initialization, all unlock states, every UI reader and arbitrary
mod combinations remain outside the demonstrated coverage.

Converters write new files and validate geometry/checksums. Downgrade discards extra
progress while preserving the current original-range records and relevant tails.
Never mix D2 and GS512 executables/saves or apply exact-input deltas to another
region/mod. Keep original-engine warnings active in the ordinary editor.
