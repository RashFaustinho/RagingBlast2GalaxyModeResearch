> **Historical report.** Read the [audited current findings](../SAVE_RAM_AND_EXPANSION.md) first.
> Pending statuses, fixture counts and some early interpretations below were
> superseded. GS512 missed later-discovered readers; D2 Zone cell21 ultimately
> failed its minimal control. This report does not establish a safe maximum.

# Doubled-save experiment — BLES00978 / RPCS3

Status: research in progress. The completed Galaxy result below is verified;
Tutorial sparse boundary63 completion/save/cold reload passed. Battle Zone
completion/reload checks are still pending.

## What is being tested

The decrypted original `SYS-DATA` is exactly 55,000 bytes. D2 is exactly
110,000 bytes. Merely extending the file is insufficient: the executable
allocates, reads, writes and checksums fixed lengths, and the three modes use
separate fixed storage layouts. Galaxy also has a separate launch bitmap in RAM.

The current mixed layout reserves 1,040 Galaxy records, 64 Tutorial records,
and 54 physical coordinate cells in each of the existing 16 Battle Zone routes.
The Battle Zone fixture uses cells 1–53, leaving cell 0 out of ordinary play:
848 fights across the routes, compared with 128 original fights. The initial combined
fixture contains 1,952 records/fights versus 635 originally (+1,317).
The full Tutorial roster later failed its graphical pool limit; these figures
must not be advertised as1,952playable missions. These are
**configured storage/fixture counts, not a claim that all fights have been played
or a mathematical maximum for every possible executable rewrite**.

`LAYOUT.json` contains the exact banks. Original unrelated save regions keep
their locations. The old three banks remain as inactive copies, allowing useful
comparisons. Inter-bank gaps contain A5 sentinels and a format marker survives at
the end. This deliberately trades some storage efficiency for isolation and
measurable corruption checks. The three capacities share the available space;
they are not three independent maximum budgets that can be added together.

Battle Zone routes contain a 4-byte header, cell records of 24 bytes, and a
16-byte footer. Original route size is 4 + 21×24 + 16 = 524 bytes. D2 size is
4 + 54×24 + 16 = 1,316 bytes. Both mode strides and folded addresses must move.
The 616-byte whole-bank tail, including the suspended-route state, is preserved.
Do not mistake the last four bytes of original cell 20 for footer data.

## Baseline versus experimental storage

| Storage | Original | D2 layout | What remains separate |
| --- | ---: | ---: | --- |
| Galaxy result rows | 500 (498 populated) | 1,040 | Per-owner visibility and circle pools |
| Tutorial result rows | 9 | 64 | Shared map buffers and circle pools |
| Battle Zone cells per route | 21 | 54 | Menu geometry, existing8routes×2modes |

Battle Zone cell0 is not included in the ordinary fixture. The original layout
therefore has20ordinary safe cells per route, rather than21ordinary battles.
The save offset follows the coordinate formula, not the MMD root number.
These storage budgets compete for the same extra55,000bytes. D2 deliberately
keeps old inactive banks and guards; it does not optimize the theoretical
maximum number of rows obtainable by repacking every other field.

## Executable and RAM changes

The current exact-input delta changes 329 original instructions. It supports
only original decrypted ELF SHA256
`8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892`.
Output SHA256 is
`9f24ca8d05758e112d0a649a09da7519df45a06de947e2855bdfa615bf59d028`.

Some new save offsets exceed a signed 16-bit displacement. They use matched
branch trampolines, not truncated immediates. A previously empty existing
PT_LOAD header maps an additional 4,096-byte executable segment at `0x01000000`,
containing 500 bytes of generated helper code. Helpers preserve LR/CR and any
scratch register; their temporary stack frame avoids the caller's ABI red zone.
They do not change battle mechanics. See `D2-patch.json` and
`PATCH_REPRODUCTION.json` for exact instructions, segment data and reproduction.
The portable apply tool never overwrites its input.

The launch object grows from `0xA80` to `0xB30`. Its original 512-bit bitmap at
+C moves to appended +A80; 33 words provide 1,056 bits. Original fields, including
selected native Galaxy at +4C and selected root at +50, keep their locations.
The final 44 bytes after the relocated bitmap remain zero in the tested battle.

A separate menu limit was discovered: the shared Galaxy/Tutorial map has only
32 pooled mission objects. The initial single-Galaxy stress fixture exhausted
this list at its 33rd displayed node (global root 521) and crashed at 1F0DE4.
The stress experiment distributes 542 added Galaxy fights across the original
66 Galaxies, with no more than 18 per Galaxy. To display the 64-mission Tutorial,
the shared pool is also expanded to 64: object allocation, pointer-array location,
constructor/destructor and all traversal loops must change together. Updating
only allocation/creation left another reader on the old array and was rejected
by the next runtime check. The 251-instruction revision opens both maps successfully. It is superseded by
the 329-instruction revision below; do not distribute the intermediate patch.

A second independent 32-node limit caused actual stack corruption. Function
1F07F4 writes a pointer per available map node into caller-provided storage.
The Tutorial64 exit returned 55 pointers into its original 32-entry stack array,
overwriting saved registers and the return address before autosave. Its two
callers (Galaxy1EA78C and Tutorial20B5CC) now reserve 64 entries: frames grow
by128bytes, saved registers/LR move by128, and every return restores the new
frame size. `STACK_ARRAY_AUDIT.json` checks all six return paths and buffer
separation. Runtime replay passed that stack return, then found the separate icon-pool
exhaustion described below. Tutorial persistence later passed with the sparse boundary fixture. File/heap sentinels
were intact during the failed exit: they alone cannot establish RAM safety.

Three original Galaxy base-minus-eight readers omitted by the earlier GS512
experiment were also found and relocated: F85E8, 1CF400 and 1F0ED4. A correct
score write alone does not establish correct menu/summary reads.

## Verified Galaxy result

All original 498 Galaxy fights remain, plus 542 additions in existing Galaxies.
Root 1039 was preselected through the new save metadata, opened through the
normal game menus and launched Kid Buu versus Krillin (native12, preset496).
Its original test objective29 required action1, Ascend.

An ordinary L1 press won the fight. There were **no HP, objective, result,
score, instruction or register writes in RAM** for this completion. The engine
awarded score338793, gradeA++, and wrote row1039 as:

```
[4097, 1, 338793, 0, 0, 0, 0]
```

Returning to the map produced a real 110,000-byte file with a valid internal
checksum. The UI showed the new record338793; the Galaxy aggregate rose from
5671356 to6010149. Only row1039 changed among the 1,040 mission rows. Aggregate21
changed as expected. Both other active banks, all three inactive original banks,
all A5 sentinels and the format marker stayed identical.

A complete process restart then loaded the save. The **whole 110,000-byte RAM
buffer**, not only the new score, matched the engine-written file byte-for-byte:
SHA256 `cd4b024673f037a42121a02db1c709c0e32203ca3ab13af68997740b7b388cc6`.
This is a cold load, not a savestate. Initial runtime used the static PPU
interpreter; the same ELF was cold-loaded using LLVM. No breakpoint claim relies
on LLVM's unsupported PPU breakpoint behavior.

### Other original bytes that changed

The audit does not hide unrelated-looking changes:

- Save date/time words changed.
- The ordinary original bitfield at5B78 gained mask6. Its existing unmodified
  writers are documented; this is not a numeric counter or an appended row.
- At CD20, 26 bits were already cleared before battle. The changed IDs match
  **exactly** the original fixed 26-entry cleanup list at5F6550+168, checked by
  318D18 and cleared by31CBCC during load (caller31B28C).

`old-field-normal-writes.json` binds that explanation to the actual changed
bits. Do not report that literally no original byte changes; distinguish normal
native writes from capacity overflow.

## Additional map rendering limit (current revision)

A Tutorial64 replay with329instructions again won naturally (395875/S).
Returning to the map passed the corrected stack path, but later crashed in
1F6054 when a node tried to animate its null circle pointer at+40. Circle
allocation1F2618/1F2500 returns zero on an exhausted per-type free list;
1F0E08 stores this unchecked pointer. Constructor1F2D40 onward allocates
only four circles of kind2, the kind used by the55 cloned Tutorial nodes.
The native capacities are type-specific, independently of the map node pool.
The full Galaxy fixture also requests more than four kind2 circles per owner
in its complete roster; actual allocation depends on simultaneous visibility.
The successful boundary1039 test is not evidence that all later unlock states
fit their graphical pools. `galaxy-circle2-capacity-audit.json` records this
static warning for every owner. A later balanced fixture assigns added nodes
within the native kind0/1/2/3 budgets(10/3/4/5) per owner, preserving all
original shapes and root1039kind2. All66rosters statically pass these budgets;
this still does not mean every possible unlock state has been played.
A sparse fixture (nine originals plus boundary63, kind0) now isolates save
index63. This does **not** prove64simultaneously visible Tutorial fights.
Do not call the64-root full Tutorial fixture a playable expansion.

## Tutorial result and failed exit (intermediate revision)

Tutorial root63 launched through ordinary menus and an ordinary L1 press
completed its Ascend objective. The engine awarded score398675, gradeS, and
wrote RAM row63 as `[4097,1,398675,0,0,0,0]`. The first nine Tutorial rows,
Galaxy data and the old inactive Tutorial bank stayed unchanged. This attempt
**did not persist**: leaving the Tutorial exposed the stack overflow above.
Do not count it as a successful Tutorial save/reload test.

## Verified Tutorial persistence (sparse boundary,329instructions)

With nine original Tutorial missions plus root63 in the visible owner roster
(ten visible entries), and root63 using circle kind0, ordinary L1/Ascend again
won naturally. Score398737, gradeS. No HP/objective/score/code/register writes
were used. The game returned to the map, displayed the correct record and
autosaved110000bytes with a valid checksum. Only Tutorial row63 changed:
`[4097,1,398737,0,0,0,0]`. Galaxy, Battle Zone, inactive old banks, all A5
guards and the format marker stayed unchanged. Original Tutorial rows0–8
are intact. The ordinary Circle/back input returned to the single-player menu
without a crash. A full process restart with329instructions then loaded the
entire110000byte RAM buffer byte-for-byte from the latest native autosave:
SHA256 `52f74932b9fe4a9ea397181d7c8600dded561c4c6ab9c09725a4572862e7da34`.
Both Galaxy1039/338793 and Tutorial63/398737 remain intact. Initial preload
reads only four bytes; compare the full buffer after the ordinary START input
and full110000byte load, not the zero initialized buffer on the title screen.

This is evidence for save index63, **not64simultaneously visible fights**.

## Battle Zone full-map attempt (not passed)

The53-root-per-route fixture with swapped starting root0/52 failed before
battle launch when confirming the normal Blue Lozenge carousel. Video thread
1000014 reported unmapped read0 in4F6ED0. The entire active Galaxy/Tutorial/BZ
save banks, inactive copies, guards and marker were still unchanged relative
to the preceding Tutorial autosave. This is **not** a successful boundary test,
nor evidence that the extra save records themselves caused the crash.

Two fixture variables remain: many extra nodes/extended coordinates, and the
root swap replacing the native starting kind0 with an intermediate kind1.
A first control restored all18Battle Zone outer archive entries to their original
bytes in the expanded slots, but startup failed in resource loading at2C87B0
before the save was read. Its zero RAM rows are not a failed persistence result.
The archive was then restored exactly (full SHA42de603448436921cb63b071cde05bdffd6a376964dceaa4b85ad31cd6ba35a7)
and repacked with only the Galaxy/Tutorial member872 changed. This removes
the enlarged Battle Zone slots from the control. This compact archive boots
correctly and supports the successful full cold load described above. The compact stock control also opens normal Green Square successfully:
mode0,zone0,root0, Saibaman/LV1, score6602; no renderer crash.
A sparse fixture now preserves the native starting root0, adds one intermediate
root per route, and changes the first next-link to0→new→original1.
Do not advertise848playable Battle Zone fights on the basis of the failed
full-map fixture.

## Battle Zone visual grid is separate from save cells

Native26CE88 converts integer MMD coordinates to visual grid coordinates:
`visualX = X+2`, `visualY = 12−2Y`. Callers26DE38 and26E400 index scene
storage directly using `(visualX*13+visualY)*16+0x90`, including writes.
For canonical Y0..6 the visual row is0..12. The attempted cell53 at(1,−11)
produces visual row34: it is not a valid row in this13-row visual grid.
The constructor276C98..276D04 creates exactly5×13=65records. The grid
ends at scene+4A0, where unrelated scene state begins. Attempted flat index73
is actually outside this grid: its flag/record-pointer writes reach scene+524,
+528,+52C before a later null object dereference. A whole-allocation canary
cannot detect corruption of another member inside the same scene object.
`bz-visual-grid-evidence.json` records the exact sites. A sparse replay with only one extra node and preserved native starting kind0
failed at270F80: scene3AA89E40, selected bad grid record3AA8A360
(flat index73) had a null object pointer. Original root0 visual cell38 had a
valid object. The bad row34 is also visible in registerr0=0x22.
This removes the full53-node count and initial-role swap from that failure.
Save routine318BE4
uses a separate formula. Extending its serialized banks does not extend this
menu structure or its associated graphics.

## A boundary inside the stock Battle Zone menu grid

Canonical coordinate(2,0) gives save cell21. It was invalid for the original
21physical cells(indices0–20), but its visual grid coordinate(4,12) is valid.
In the original layout, its24byte result starts at the16byte route footer
and extends into the next route; simply using this coordinate would corrupt
unrelated progress without relocation.
The canonical21fixture preserves all original nodes, adds one intermediate
node per route at(2,0), and sets first progression0→new→original1.
The first attempt used a same-row0→new edge and failed in the video thread
before entry; it is not a valid positive result. All112original edges in the
16stock MMDs increaseY. The corrected fixture uses a new first root0 at
(2,0), keeps the first-node kind0, moves the old first Green Square fight to
new root4 atY1, and shifts the other three old Green Square rows upward by1.
All four original Green Square fight identities remain; there are now five.
Ultimate Final only moves its existing first root0 to(2,0), keeping identity
and original successor lists. All edges in both modified routes increaseY.
The other14routes are unchanged. This corrected-data variant also failed
in video thread4F6ED0 before entry. Thus forwardYalone is not a demonstrated
fix. A stamp-preserving variant was built but not runtime tested; no claim
that empty Stamp lists caused the crash is justified. The next differential
keeps the exact same failed inner data and only appends the parameter PAK
at the end of each outer STPK, leaving every graphical member at its original
offset. This isolates an archive-layout variable. It passed the previous video failure
and reached a precise main-thread read0 at271CF4. The save pointer there is
valid(30015A38); native2F35E0 is inlined into this path and dereferences a
null Stamp-list pointer when root+28=0. All128original roots have nonzero
Stamp references(count histogram3:4,4:12,5:112). A strict next differential
changes only two bytes in the inner PAK: root0/root4 Stamp refs0→original1.
No other mission data changes. The same append layout is retained. Runtime
The stamp-restored append variant still failed in video thread4F6ED0.
The null Stamp getter is a concrete independently unsafe path, but it does
not explain every video failure; append packing is not a demonstrated general
fix. A minimal next control patches only the original first-root X floats
in Green Square and Ultimate Final to2.0. All MMD counts/descriptors/sizes,
all STPK member positions/sizes and original Stamp lists remain unchanged.
This separates cell21/save relocation from record addition.

The stock3×7canonical coordinate set contains21positions per route:
336across16routes, versus320save-safe canonical positions in the original
layout and128populated original roots.336is a conditional upper bound for
one unique fight per canonical cell; it is **not** proof all336were played,
nor an absolute limit after arbitrary menu/coordinate rewrites.

## Test environment and interruptions

Tests use the isolated RPCS3 profile and working game copy, never the uploaded
originals. Software Vulkan rendering has pre-existing black models/text issues;
actor/configuration memory supplies the character/index evidence.

An initial attempt appended replaced AFS members out of physical order. Startup
failed in resource loading. Repacking with monotonic offsets passed startup;
this packaging failure is distinct from save capacity. The streaming repacker
has an exact inverse and checks the full pre-test archive hash on restoration.

A chat transport disconnect later closed the debugger helper's PTY. The next
stdout write failed and dropped the debug connection, triggering RPCS3's known
GDB disconnect failure. The earlier successful Galaxy save/cold load is retained.
The Tutorial attempt was restarted; the helper now writes stdout to a durable
file and tolerates terminal output errors while retaining its JSON log.

## Tools and limits of the claim

`tools/double_save_research.py` inspects, expands and downgrades decrypted
original/D2 saves. It validates length and checksum, recognizes the D2 marker,
and creates new output files exclusively. Four tests cover lossless migration,
current original progress/footer preservation, independent boundary rows and
corruption rejection. Downgrade drops added mission progress.

`tools/apply_double_save_elf.py` reproduces the exact executable delta, rejects
other inputs and corrupt deltas, and creates a new output only. GS512 and D2 are
incompatible research formats; do not combine patches or use an unconverted save.

No physical PS3, encrypted-save import, new-game initialization, every mission,
every achievement, every menu route or every possible RAM write has been tested.
Galaxy Studio0.4's original-engine warnings remain unchanged. Additional native
Galaxies, character IDs, world icons and standalone Battle Zone routes have
separate limits; doubling save storage does not automatically extend them.
