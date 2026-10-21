# Executable research follow-up: independent Galaxies and scoped feature hooks

19 October 2026. This is research outside the released Galaxy Studio editor.
No original executable, game archive, save or RAM dump is distributed.

## Priority and evidence discipline

The owner prioritized independent Galaxies above66, regional/modded executable
compatibility, download/enhanced unlocks, per-Galaxy costumes, per-battle Zone music,
per-Zone secret requirements, and map node/circle pools. The existing high mission
and Tutorial boundaries need verification, with Zone-cell/Zone-slot expansion last.
CPU teammate destination selection is explicitly outside this follow-up.

Static candidates, natural gameplay, controlled data probes, engine file writes and
complete-process cold loads are separate evidence levels. A configured capacity is
not a complete campaign playthrough or an absolute engine maximum.

## G67: a safely separated 67th Galaxy result

The earlier original-executable GX19A data fixture retained all498 original roots
and66 world icons and added native 3 (Goku Super Saiyan3), world index66, with roots
498/499. Its native aggregate 66 overwrote globals starting at save+BF30. That was
a persistent-layout failure, not proof that the menu could never display a 67th icon.

The world controller actually owns67 pointer slots, including a spare, at+30..13B.
Its destructor has an inclusive0..66 count and its other loops an inclusive byte
bound108. G67 therefore isolates persistence without changing this controller.

The new exact-original-European prototype changes80 instructions and has no helper
segment. It retains the stock500 mission rows, nine Tutorial result rows and stock
Zone bank geometry. Only the Galaxy bank is relocated/expanded, plus common save
allocation/serialization/checksum length:

| G67 structure | Location / capacity |
|---|---|
| Serialized save | 110000 bytes |
| Active Galaxy bank | D700 |
| Mission rows | 500 ×28 bytes |
| Aggregate rows | 67 ×28 bytes, starting10DB0 |
| Galaxy globals | 11504,152 bytes |
| Inactive original Galaxy block | Preserved at8148..BFC7 |
| World icons in fixture | 67; all66 originals retained |
| Native owner namespace | Original100 slots |

The matched relocation includes old aggregate-minus8 and mission-minus8 readers
that earlier GS512 work missed. Both aggregate initializer counts grow from66 to67.
All four original save allocator/file sizes and the checksum payload size match the
110000-byte layout. The original mission bitmap and local32-node pool are retained:
the new personal map needs only two nodes and never tests root 512.

### Native result, engine save and complete-process cold load

The private original-format save was converted, with diagnostic preselection of
native 3/root 498 and a clear result row. Game data used the existing GX19A fixture,
original opponent Krillin and an objective requiring one ordinary Ascend action.
No guest HP, objective, score, save, register or instruction writes occurred through
the debugger. Controller key input completed the objective naturally.

- Battle configuration: owner 3, root 498, objective29/action1.
- Player native 3, ordinary Custom3; enemy native 12/Galaxy preset496. Both40000HP.
- Native result row 498: `[4097,1,339000,0,0,0,0]`.
- Aggregate66 gained339000. No other mission row or aggregate changed.
- Active globals and the entire inactive original Galaxy section stayed unchanged.
- Native file length110000, original checksum valid. Timestamp/checksum bytes and
  the separately documented26-bit download cleanup changed normally.
- RPCS3 and its debug client were terminated and recreated, without a savestate,
  injected result or resetting the engine-written file.
- The **entire 110000-byte loaded RAM buffer** matches the engine-written save:
  `c7b68b6960b0ed2add59adb602a9c3415fd53d82bcba923dd9317d1c3f2fb639`.
- Root498 score339000, aggregate 66 score339000 and selected native 3 survived.

See [native result](G67-result.json), [save audit](G67-save-audit.json) and
[cold load](G67-cold-load.json). Renderer model shading was imperfect in the cloud;
this does not certify every texture, character, unlock state or physical PS3 path.

This demonstrates a working 67th independent saved aggregate. It does not establish
100 Galaxies, new-game initialization, arbitrary mod composition or all66 original
campaigns under the patch. The data fixture retained the originals; it did not replay
every one of them. A different save layout must never be loaded with another engine.

## G100: grow world objects without moving controller globals

The G100 prototype reserves600 mission rows and100 aggregates in the same 110000-byte
file, leaving Tutorial/Zone banks stock. It changes139 instructions:

| G100 structure | Research layout |
|---|---|
| Galaxy bank | D700 |
| Mission rows | 600 |
| Aggregate base | 118A0 |
| Globals | 12390 |
| World pointer array | Appended at controller+280,101 slots |
| Controller allocation | 420 bytes; original fields keep their offsets |
| Launch bitmap | Config+A80,19 words/608 bits; extended allocation/clear |

Both constructor clears, creation/destruction, world pointer readers and inclusive
loop bounds must agree. Appending the pointer array avoids shifting selected-owner,
resource, animation and linked-list fields inside the original controller.

The data fixture retains498 original mission records and all66 original world
icons, and gives each of the34 empty native/form owners a new one-mission Galaxy.
It contains532 roots and100 icons. It adds an outgoing world neighbor from an
original icon into the new chain. Boundary preselection is native 89 (Future Gohan
Super Saiyan), root 531, world index99.

The first boot froze during startup UI parsing at2C87B0, before the Galaxy menu.
That archive installer had appended entry872 after the other entries, violating
monotonic AFS entry order. The same failure class was already recorded in older D2
packaging notes. The zpak independently decoded and the MMD graph validated, but
those checks did not certify native archive loading. A new control rebuilds in
order, shifts subsequent data/filename metadata and verifies every unrelated entry
body. The same G100 executable is reused to isolate packaging from capacity.
The monotonic control reached successful savedata loading with the same G100 ELF;
that isolates the first startup failure to archive packaging. See
[the archive audit](G100-monotonic-AFS.json). It still does not prove all world/menu
or battle consumers. Do not present that first failure as a100-Galaxy engine limit.

The monotonic control entered the100-icon world menu, selected the added
native 89/world index99, launched root 531 and naturally completed its Ascend action.
Native result339000/A++ was saved in row 531 and aggregate 99. The engine-written
110000-byte file has a valid checksum; only that row/aggregate and ordinary timestamp,
checksum and download-cleanup bytes changed. Globals and the inactive original
Galaxy bank are unchanged. See [result](G100-result.json), [save audit](G100-save-audit.json)
and [battle setup](G100-intro.json). A completely new RPCS3 process then loaded
all 110000 bytes exactly equal to the engine-written file, including row 531 and
aggregate 99 score339000 and selected native 89. See [cold load](G100-cold-load.json).
The native file/RAM SHA256 is
`37c2b2b86598f74c21298946155fd212a86d7a6ef8310be61151a1e441837496`.
No guest debugger writes were used in these G67/G100 controls. A later cold-run
control entered the100-icon world menu and returned normally to the main menu;
see [menu exit](G100-world-exit.json). No exhaustive per-member heap canary audit
was run, and not every controller path among100 icons was replayed.

This demonstrates the boundary of the100-Galaxy prototype, not a playthrough of
every original or added mission/owner.100 is a natural target because the current
native-owner table has100 distinct IDs. It is not a proven absolute maximum: going
past100 would also require roster/owner/unlock/portrait consumers to change. Merely
adding another world icon with a duplicated native owner is not another independent
owner. A mod that already expands the native roster needs its own executable audit.

## Reproduction and format separation

[Published exact G67 delta](G67-patch.json) and [G100 delta](G100-patch.json)
contain matched original/replacement instructions and input/output identities.
`tools/reproduce_aggregate_elf.py` reproduces a new decrypted ELF from the exact
original European input. `tools/galaxy_aggregate_research.py` builds a new research
save from an original checksum-valid55000-byte save. Neither is invoked by Studio.
The data fixture recipe above is separate from the ELF/save: the MMD must contain
the matching world/owner/membership/neighbor setup.

G67, G100 and D2 share a 110000-byte length but have **different layouts**. G67/G100
do not yet carry a self-identifying marker; D2 has its own checked marker/capacity
tuple. Supply the correct profile explicitly. The G67/G100 constructor refuses
already-large input and does not guess or silently downgrade an unknown save. A future user-facing format needs a versioned
marker, migration journal, consistent new-save initialization and rollback controls.

The reproduction checks matched both private ELF images byte-for-byte. Three save
construction tests check all old rows/aggregates/globals, unknown-byte preservation,
new boundary isolation, checksums and rejection of invalid inputs. These are storage
and reproduction checks, not additional gameplay observations.

## Scoped feature candidates under investigation

Separate private authored helpers have been built for:

- A 100-byte starting-costume table indexed by selected native/form owner. Only the
  costume argument changes; unsupported owner IDs fall back to0. Valid costume
  discovery and form-chain behavior remain separate checks.
- Honoring an explicit Zone node music word0..55.56 or an invalid value falls back
  to the original native picker, including its special final-Zone behavior.
- A 16-entry table for Normal/Ultimate ×8 Zone slots, selecting no requirement,
  Super win, Ultimate win, Raging Soul win, combo threshold or always accessible.
  It returns through existing epilogues; the stock route-latch/selection behavior
  remains in place. This is per Zone, not independently per node.
- Post-valid-save-load unlocks for66 enhanced **group** flags at save+5B80, plus
  the scoped26 download **native/form** flags at+CD20. These are different namespaces;
  neither installs resources nor promises unrelated ordinary base-character unlocks.

These are research prototypes, not supported Studio options. The unlock and costume
controls below give their individual runtime status; music/secret and map changes
need their own evidence, not an inference from G67/G100.

## Map circle follow-up

The node pool and category-circle pools are distinct. An additional renderer group
is also bounded: accessor2DA054 checks its+0A count, then addresses0x3600-byte
instance rows. The stock circle group allocates39 instances at1F2D28.

The C64 candidate appends64 category2 pointers to the manager, grows allocation and
both clear paths, updates creation/destruction and rendering readers, raises renderer
capacity from39 to99, and shifts later-category renderer instance IDs by60. This
addresses more consumers than merely changing the four-circle constructor count.
The 29-instruction candidate is based on the exact final D2 executable. A later
full-map attempt fails in resource initialization before map rendering; see the
final C64 control below. Other category budgets stay original. It is not a universal64-Boss patch.

## Previous mission/Tutorial boundaries and remaining Zone work

The final D2 delta was reproduced again against the known original:329 instructions
plus its authored helper segment, exact output identity unchanged. All four save
migration tests pass. The recorded native root 1039 and sparse Tutorial 63 victories,
engine saves and cold loads remain valid within their original scope. This follow-up
does not relabel them as1040 completed missions or64 visible Tutorial nodes.

Zone cell/standalone slot expansion remains last priority. G67/G100 intentionally
retain its original banks, so those unrelated earlier crashes cannot be attributed
to these new capacities without a separate control. No new added-cell native
save/cold-load success is claimed here.


## Regional differences that affect expansion work

Additional [world span comparisons](REGIONAL_WORLD_SPANS.json) locate the same
world-pool construction/destruction instruction layouts in EU, USA and Japan.
The full constructor scan is ambiguous in all three images: two equivalent wrappers
exist in each. Resolve the actual allocation caller; do not patch the first byte-pattern hit.

The [aggregate initializer comparison](REGIONAL_INITIALIZERS.json) finds a concrete
Japanese code difference. EU/USA use a CTR loop of66 iterations. Japan walks byte
offsets0..71C inclusive in steps of1C (also66 records), uses different registers and
a0x90-byte stack frame, and calls a helper between writes. Its clear span3E80,
aggregate last-mission field36B8 and selected-native field3DE8 still agree.
Thus the persistent layout can match while the patch instructions differ. A Japanese
port must change the relevant byte-bound/consumers, not copy the European LI66 edit.
This is static proof from the supplied images, not a Japanese expansion playtest.

The supplied USA revision remains unidentified as v1/v2. The five audio/revision
variants reported by the owner must be tracked separately from feature-local code
compatibility; no unprovided v2 image is silently certified.


Reproduce the additional layout comparison (read-only):

```console
python tools/executable_regions_research.py --legacy-directory path/to/decrypted-legacy-files --world-spans
```

An empty match list or multiple matches is a finding to investigate, not permission
to select a guessed address. The separate initializer disassembly above documents
why the Japanese initializer needs a semantic port despite its matching storage.


## Automatic Enhanced and download flags: successful load control

The combined European feature prototype was composed with the exact G100 profile.
A valid 110000-byte fixture retained the prior native 531 result, selected native 3/
root 500, and cleared only the66 Enhanced group and100 download-native availability
bits. Ordinary native unlock records and unknown padding were preserved.

The game loaded that normal checksum-valid file. Without debugger writes it set
all66 Enhanced group bits and exactly the same26 download-native flags as the
scoped cleanup policy. Full-buffer comparison found **16 changed bytes total**,
all inside those two identified bitmaps; no other byte changed. Root531 still holds
339000. Live r30 restoration is original, the cleanup uses OR, and the caller
branches through the authored post-load wrapper.

See [input preparation](feature-save-preparation.json), [loaded flags](features-after-load.json),
[feature settings](feature-settings.json) and [AFS copy audit](feature-AFS-install.json).
This is an availability-state control, not an all-costume gameplay test, fresh-game
initialization test or proof of absent resource installation. Later native saving
can persist unlocks; disabling code does not erase save progress.

The Enhanced wrapper and standalone preserve/force policies share ownership of the
successful-load call. A future manager must recognize and manage that shared hook.
The current standalone download research tool deliberately rejects an unknown wrapper
call rather than overwriting it. Unrelated code modifications remain a different,
locally compatible case.


The exact authored control can be reproduced on top of the exact G100 ELF with
`tools/reproduce_feature_control_elf.py` (read-only unless `--output` is supplied).
[SCOPED_FEATURE_CONTROL.json](SCOPED_FEATURE_CONTROL.json) includes all five original
instruction edits, owned helper bytes, table settings and program-header checks.
This is a layered research fixture, not a general helper-segment allocator: another
mod already owning that header/address needs explicit conflict/dependency handling.

## Per-Galaxy costume table: initialized actor control

The combined feature ELF uses a 100-byte table indexed by selected native/form
owner: native 3 requests costume 1 (the second costume), all other entries0.
In Galaxy3/root 500, the main-player config+70 and initialized actor+4 both contain1.
The player remains native 3 with ordinary Custom3 configuration2; enemy Krillin
remains native 12/Galaxy preset496/costume 0. The table was also read back in full.
No debugger writes were used. See [the actor/config capture](features-costume-3.json).

This checks the selected-owner table in the launch path, not every costume resource,
transformation, retry or visual texture. The generic probe's `globalNativeFlags`
field reads the inactive original bank and must not be interpreted as G100 globals.
The hook leaves the owner's identity and customization index unchanged.

A same-process contrast used ordinary base Goku (native 0/root 246), without changing
the ELF or table: config costume returned0 and ordinary Custom3 index 2 remained.
See [base-owner configuration](features-costume-0-config.json). This contrast was
captured on the VS/loading screen, before a live base-Goku actor was certified.

A later read also found the initialized native 0 player actor at costume 0, with
native 74/Galaxy preset519 enemy costume 0. See [the second actor capture](features-costume-0-actor.json).

Do not stack G100 and D2 blindly: their allocation/bank/bitmap hooks overlap and
G100's100 aggregates need more space than D2's66. A merged1040-mission/100-Galaxy
layout needs a new migration and consistently relocated Tutorial/Zone banks.
Neither prototype currently certifies that combined configuration.

## First Zone runtime attempt: pre-combat renderer failure

With the combined G100 feature ELF and modified18 Zone-parameter archive copies,
entering Zone selection failed in the video thread before Green Square combat.
The initial menu caption was Italian “Zona a losanga”. The early identification
as native slot2/Blue Lozenge was inferred from that caption and is withdrawn:
later native captures show slot0 loads Green Square despite this menu appearance.
This first failed run did not capture a reliable native selected-slot identity.
RPCS3 reports a null read with return PC4F6ED0; the stack pointer
is valid. That PC follows an indirect call, so the reported address alone does not
identify the instruction that dereferenced null.

[The small failure capture](zone-feature-first-failure.json) records this failed
control. It is not evidence that the music or secret hooks ran, nor that100 Galaxy
aggregates caused the crash. An original-ELF/original-AFS/original55k-save control
uses the same renderer/profile to separate environment, packaging and engine effects.

The original baseline restores the entire progress AFS, the independently matched
original European ELF and a valid original55,000-byte save, in the disposable
profile. The same software Vulkan renderer is retained. The original control reached the same Zone selection menu, selected Normal Green
Square, opened its stage map and initialized Goku and Saibaman in the battle scene.
See [the original control](zone-original-baseline.json). This establishes a working
original path in the same cloud profile; it does not by itself identify which
experimental component caused the other failure. A second control keeps the
combined feature ELF and G100 save but restores every original Zone parameter pack.


### Zone control interpretation after geometry-preserving failure

The next fixture keeps every MMD/STPK directory offset and length unchanged and
changes just three decompressed MMD bytes (two music selectors and one secret bit).
It also failed with video return PC4F6ED0 while attempting Left navigation from the
initial selection menu, before combat. The older slot2/Blue identification was
a caption-based inference, not a native state capture.
Unchanged recompression of checked original entries8/36/232 reproduces their entire
original compressed bytes exactly. No compression defect has been established.

The first stock-Zone-pack control only held the initial selection menu; it did not
exercise the same Left-navigation transition. Therefore its earlier positive menu
observation does **not** yet isolate archive changes as the crash cause. The next
control repeats that navigation with stock Zone packs and the same feature ELF/save.
Keep menu appearance, navigation, stage launch and combat as separate observations.


## Remaining aggregate-count consumers

The G100 boundary persistence result does not certify every global counter.
A later [static scan](G100-remaining-aggregate-scans.json) finds eight loops that
still inspect66 aggregate rows: a total-score sum at2618C4 and seven aggregate-flag
scans near3095C4..309AD8. Their record bases were relocated by G100, but their
iteration counts remain original. Reading that subset is not evidence of an
overwrite; it can omit added-world scores/completion from global calculations.

Do not blindly replace every literal66: other occurrences build strings or refer
to original character/reward groups. Decide which global achievements should include
added worlds, trace each caller, and test those policies separately. The published
G100 manifest and successful save/cold-load hashes remain historical exact inputs;
no untested revised image silently replaces them.


### Stock-pack navigation also fails; archive explanation withdrawn

The exact Left-navigation control also fails with entirely original Zone packs,
only entry872 replaced for G100, and the local-default 6dcb feature ELF/input save. See
[the navigation result](zone-stock-navigation-result.json). Modified Zone files,
resized STPK members and new grid cells are therefore **not necessary** to produce
this failure. No archive-format defect was established by these attempts.

The cleared-bit fixture used for the load proof removed all100 download flags;
the hook sets the26 restricted entries, leaving the other74 cleared. The original
valid save had those other bits set. A new checksum-valid input restores just those
74 flags from the preceding native G100 save, retaining the same26 listed flags,
Enhanced flags and every unrelated byte. See
[the preparation](zone-preserved-save-preparation.json). It is a discriminating
input-state control, not yet a demonstrated explanation for the crash.


### Preserved input succeeds; exact helper-table identity and music getter

The control restoring only the74 non-listed availability bits reached the Green
Square map and initialized Goku/Saibaman with the same local-default feature code.
See [the result](zone-preserved-result.json). The load hook itself does not clear
those bits; the earlier diagnostic input did. Do not reuse a deliberately cleared
availability fixture as an intact-save baseline for unrelated gameplay tests.

[The table-variant audit](TABLE_VARIANT_COMPARISON.json) also corrects an operational
identity mistake: these restarted controls copied the local default-table ELF
`6dcb6f4d1376836d7c61dca3e578836d49ee6465feafecc6d361bd94beb0767e`, while the probe
had hardcoded the published f8 identity. The two images differ at exactly one
byte: file730900/guest1000900, Normal Zone0 predicate0 versus5. Their authored code
is identical. Reports now identify the actual file, compare live hook words and
read back the entire4096-byte helper segment. The published f8 reproducer and
its earlier costume/unlock evidence are not silently replaced.

The early Zone probe also read the inactive MAIN config singleton755944. The
native Zone battle setup uses getter1CD534: TOC-234C ->75592C -> active config.
With the original Green Square music word56, that real config contains arena13
and music9, a member of the native ordinary pool. See
[the verified fallback capture](zone-music-stock56-verified.json). This is a
setup/initialized-actor control with Null audio, not a listening test.


### Further limits on the Zone explanation

The published f8 table5 control with the preserved flags and added Green secret
kind9 still failed before combat; this run had also visited the100-icon Galaxy
menu before entering Zone. See [the failed control](zone-f8-modified-failure.json).
Restoring74 flags correlates with a successful stock-Zone control, but is not yet
a complete one-cause explanation of all failures. Do not attribute every renderer
failure to flags, archive geometry, music or a capacity count. The next direct-to-Zone
fixture changes music only and preserves all original node kinds/links. Existing
secret routes are a separate control from adding a secret node to another Zone.


## Two per-root Zone music values: native setup control

The music-only fixture preserves all original kinds, links, counts and geometry.
It changes Green Square root0 music to0 and root1 to6 in each repeated parameter
pack. A direct-to-Zone run with the exact published f8 helper and preserved input
flags enters root0, initializes Goku/Saibaman and keeps active Zone config music0.
After a controlled terminal-state result, native result4862/advance reaches root1,
then initializes Goku/Zarbon with config music6. Both are outside the original
ordinary random pool. The earlier ordinary56 control chose9 through the same
music code's fallback path. See [the result](MUSIC_RUNTIME_RESULT.json).

The first HP1 intervention occurred before initialization finished and was reset.
An active HP1-only intervention also did not complete the battle during attempted
inputs. The later controlled flow writes the matched enemy HP0 and terminal bit;
the game generates result and progression. This is **not a natural KO** and does
not establish a normal finishing attack. No save, score, root, instruction or
register was injected. All interventions are linked from the result report.

[The subsequent file audit](ZONE_STOCK_CELL_SAVE_AUDIT.json) finds a valid110000-byte
native file with three changed checksum/timestamp bytes. Active/inactive Galaxy and
original Tutorial banks are unchanged. The original stage already had a higher
record, so this is not new boundary progress or an added-cell persistence claim.
Null audio prevents listening certification; the observations verify selected IDs,
native setup, initialized actors and the controlled return/advance path only.


## Existing secret-fork control: still blocked before evaluation

A narrower diagnostic uses the original Red Triangle secret root3/kind10,
original root count and original coordinates. Only one decompressed MMD byte
changes: root0 reuses root1’s original two-destination list [3 secret, 2 ordinary].
The exact 08300354… helper changes Normal slot1 from Super-win to Always while
keeping the other15 table entries stock. This separates existing-fork evaluation
from adding a new secret resource to a Zone without one.

The control opens the stock slot0 stage map, exits normally, then receives Right
and Cross at the selection menu. The caption changes to the sphere Zone, followed
by the same video-thread null read at return PC4F6ED0. Native state remains
mode0/zone0/root0: no slot1 battle, predicate, latch or fork was reached. See
[the negative capture](ZONE_EXISTING_SECRET_ATTEMPT.json). This does not validate
the requirement table or establish an expansion maximum. The discrepancy between
localized menu caption and native loaded file also means menu artwork alone is
insufficient to identify a selected slot in earlier failed runs.


## Full C64 Tutorial attempt: initialization failure, not a boundary result

The exact C64 image56614bcb… and matching D2 input savecd4b0246… were used with
the full64-member Tutorial fixture. The monotonic AFS rebuild changes only
entry872; every other entry body is verified identical. After native savedata
loading and normal Single Player/Tutorial menu input, main-thread resource
initialization fails with a null write at reported return PC3C3FD4. The captured
stack includes2156F0,21230C and20D4C8 in the Tutorial path. The instruction at that
reported PC follows a call to allocation helper5D95D4; r3/r4 are zero and r5 is4
in the paused exception snapshot. These observations do not isolate the initial
allocation argument or prove an exhausted heap.

All29 C64 words were compared to live memory. No guest data, registers, code,
results or scores were written through the debugger. The full map was not reached,
so no claim is made about visible64 nodes, root63 completion, destruction safety,
neighboring heap fields or persistence in this variant. See
[the capture](C64-runtime-attempt.json), [fixture](C64-data-preparation.json) and
[archive audit](C64-monotonic-AFS.json). A useful next control is an otherwise
identical sparse Tutorial fixture under C64, followed by circle-count increments
and resource-heap allocation tracing. Keep the older sparse D2 success separate.
