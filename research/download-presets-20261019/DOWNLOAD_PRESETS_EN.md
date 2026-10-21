# Download presets: legacy Enabler, scoped unlock and regional executables

19 October 2026. This follow-up distinguishes exact native-code evidence, the
supplied author's history and the runtime test. It adds research tools and profiles,
**not a new Galaxy Studio build or an implemented EBOOT GUI**.

## What the supplied legacy patch actually changes

The smaller user-supplied ZIP contains three resigned SELF/EBOOT files and three
savedata sets. Its README explicitly requires the supplied savedata. The game
executables were decrypted using the existing RPCS3 `--decrypt` command. No game
binary, savedata or firmware is published with this research.

For Europe, comparison against the independently supplied original decrypted ELF
finds exactly **one changed instruction in the entire file**:

```text
guest318D80: EBC100E0  ld r30,0xE0(r1)
        -> 60000000  nop
```

Three bytes differ inside that word. All other bytes, file length and segments
match. Restoring the word reproduces the original SHA256 exactly. The author
confirmed that USA and Japan also contain only this one modification, so their
reference images were reconstructed by restoring the corresponding instruction.
European reconstruction has independent byte-for-byte confirmation; the USA/Japan
reconstructions additionally rely on that explicit author confirmation.

The affected function tests membership in a fixed 26-entry list. It uses r30 for
its local stack-array address and must restore the caller's r30 before returning.
The legacy NOP removes that restore on the **true** branch; the false branch still
restores r30. Thus the successful-load cleanup caller subsequently uses a pointer
to the function's stack scratch instead of its savedata bitmap. This prevents the
intended save-bit clearing as an accidental consequence of breaking the calling
convention. It does not create missing unlock bits.

There is also a Battle Zone caller of this predicate. The NOP affects its register
state too, making this an unnecessarily broad and fragile intervention. This is
static evidence of invalid register preservation, **not a claim that every use of
the old Enabler crashes**. No old-Enabler gameplay regression was replayed here.

## The real bitmap and fixed list

The cleanup runs after successful save loading. It visits IDs0..99 and clears a
bit when the predicate finds the ID in its fixed list:

```text
save bank = SYS-DATA +0xCD20
word = BE32(bank +4*(ID//32))
mask = 1 << (ID%32)
original operation = word & ~mask
```

The list is identical in all three supplied executables:

```text
0,1,2,3,5,6,7,11,12,13,17,18,19,20,22,23,34,35,37,54,55,67,68,69,70,78
```

These are26 native/form entries, not necessarily26 distinct base characters.
The four word masks are `00DE38EF 00C0002C 00004078 00000000`.
Only the low100 bits belong to this namespace; unknown upper bits must survive.

Original `preset_character_download.dat` has100 rows. For these rows the download
index equals the native/form ID. Their Appearance records select fixed alternate
costumes: for example, Goku0 uses Appearance235/costume7. See the
[decoded list](LISTED_DOWNLOAD_PRESETS_EN.csv). This is a separate namespace from
ordinary character unlocks and the Galaxy enhanced-character reward group.

The located predicate copies a fixed list and compares IDs. It does **not itself
query DLC ownership/files**. Other registration/install code exists elsewhere;
the older narrative about a generic missing-DLC check is therefore an approximate
description, not the literal algorithm of this routine. The supplied Xbox360
checksum-glitch account was not tested or established by this PS3 investigation.

## Two cleaner, mutually exclusive policies

| Policy | Code change | Effect |
|---|---|---|
| Preserve saved availability | NOP the single call to the fixed-list cleanup | Keeps the save's existing bits. Does not unlock entries whose bits are0. Register restoration remains intact. |
| Unlock the26 listed entries | Change `andc r0,r0,r11` to `or r0,r0,r11` inside the cleanup | The same loop sets the listed bits instead of clearing them. Other bits and the predicate's register handling remain intact. |

The second policy meets the request to avoid distributing a pre-unlocked save.
It does not bypass the checksum, install absent resources, unlock unrelated base
characters or give every item/mission/reward. A normal valid save is still required
for this tested successful-load path. Fresh-game creation without first saving and
reloading is a separate, untested initialization path.

If the old Enabler is recognized, the research tool restores its broken r30 reload
**before** applying either policy. Original and legacy inputs then produce identical
clean output. It also accepts unrelated modifications when all feature-local
checks pass, as described below; a lone matching instruction is insufficient.

## Exact regional sites

All values below are **guest virtual addresses**, not raw offsets in EBOOT.BIN.

| Feature | BLES00978 EU v1 | BLUS30581 USA, revision unidentified | BLJS10085 Japan |
|---|---|---|---|
| Restore legacy r30 reload | 318D80 | 318968 | 3169B8 |
| Cleanup function | 31CBCC | 31C7B4 | 31A4C8 |
| Preserve-policy call site | 31B28C | 31AE74 | 318D28 |
| Force-policy ANDC -> OR | 31CC40 | 31C828 | 31A53C |
| Galaxy player costume argument | 1ED890 | 1ED598 | 1ED3D4 |
| Galaxy player's fixed Custom3 argument | 1ED888 | 1ED590 | 1ED3CC |
| Main TOC | 6E8D90 | 6E8D90 | 6E8C48 |

The costume/Custom argument span matches exactly across the three reference images.
The download patch additionally verifies its predicate, loop, bank, fixed IDs and
flag getter. Each profile has exact legacy/reference/output hashes in
[EXECUTABLE_PROFILES.json](EXECUTABLE_PROFILES.json).

There is **no constant regional offset** that can port every patch. Examples of
other matched spans are the Zone music-choice routine (EU26F740, US26F448,
JP26F084), secret-requirement routine (EU26F8C8, US26F5D0, JP26F20C), and a Zone
setup span (EU271700, US271408, JP271470). See
[the span comparison](CROSS_REGION_SPANS.json).

That comparison masks external branch destinations and TOC displacements while
preserving opcodes and internal branch layout. It establishes a useful candidate
mapping, **not identical semantics of every masked external callee/table**. Those
dependencies need tracing before making a new music/route patch. The JP audio data
is especially not assumed to be the European audio data.

## Runtime control: force-unlock without pre-unlocked savedata

The European force-policy ELF differs from the original in one byte, inside the
single targeted instruction (`7C005878` -> `7C005B78`). r30 restoration is original.
Its SHA256 is `dcfb522df9f0ee194c59b9e0c545294f8730df72314c6f5e6e7b009fed19e621`.

A separate RPCS3 profile used the original game AFS archives and a private valid
55,000-byte save. All100 download bits were explicitly cleared in that fixture;
normal progress and padding bits were preserved. There were no guest memory,
register, HP or code writes through the debugger.

After the game reported successful save loading:

- Input download IDs: none. Loaded IDs: exactly the26 listed above.
- Bank changed from `000000000000000000000000FFFFFFF0` to
  `00DE38EF00C0002C00004078FFFFFFF0`.
- Full55,000-byte buffer comparison found only seven changed bytes, all inside
  this bitmap: CD21/CD22/CD23/CD25/CD27/CD2A/CD2B.
- Live cleanup instruction is the intended OR, and the live r30 reload is original.

See [runtime report](RUNTIME_REPORT.json) for the final scope and observations.
RAM-bit success is not automatically a native save/cold-load test, an all26-costume
playthrough, or USA/Japan gameplay certification. The European control establishes
that preexisting unlock bits are unnecessary for the modified load path.

## Reproduce or generate a research copy

Use your own matching decrypted input; the output must be a new path:

```console
python tools/download_preset_research.py --elf path/to/EBOOT.elf
python tools/download_preset_research.py --elf path/to/EBOOT.elf --policy unlock-listed --output-elf path/to/new-copy.elf
```

`--parameters` optionally points to the original extracted preset DAT directory to
rebuild the26-entry catalog. Read-only comparison of the three regional spans:

```console
python tools/executable_regions_research.py --legacy-directory path/to/decrypted-legacy-files
```

The portable app does not need Python. These are research tools outside its normal
workflow; encrypted/signed SELF import/export is not implemented by these scripts.
Do not overwrite or rename an ELF into a console-ready SELF and assume signing
compatibility. Physical PS3 behavior of the new patch was not tested.

## Five game variants, and what a future Studio module should recognize

The owner supplied this compatibility matrix:

| Game variant | Audio family | Input status here |
|---|---|---|
| European v1 | First release OST | Supplied European executable, independently verified |
| European v2 | Tenkaichi2 replacement OST | No separately identified executable yet |
| USA v1 | First release OST | Supplied USA executable has not been classified as v1/v2 |
| USA v2 | Tenkaichi2 replacement OST | Same revision-identification limitation |
| Japan | Anime OST | Supplied Japanese executable reconstructed from the confirmed legacy change |

This does not imply exactly five different executable hashes: asset-only differences
could share code, while mods can create further executable variants. Region alone
is insufficient. A future module should identify known code hashes, use audited
feature-local checks for modified inputs, and separately identify the game's
audio/reference assets.

In particular, a song selector should retain its numeric identity and obtain its
displayed title from the actual copy's localized BGM resources. Do not relabel all
USA games as first-OST or map Japanese music names through a European fallback.
The v2 subtitles/boot-logo changes described by the user are another reason not to
infer code compatibility merely from similar MMD/DAT layouts.

For Studio, sensible options are **Preserve saved download presets** and **Unlock
the26 restricted download presets**, with automatic repair of the recognized old
Enabler. Save-mutating unlocks can persist on later native saves; disabling a code
feature is distinct from erasing progress. The original game's cleanup may clear
these26 bits again when loading without the patch. Save a source copy and log the
exact profile, policy and output identity.

Costume and Custom-slot options can reuse the regional sites above, after dedicated
runtime controls. The D2/save/RAM expansion must remain separate: hundreds of code,
table, pointer and size consumers are involved, and none of this proves that its
European329-instruction delta ports by applying a single regional offset.


## Compatibility with already-modded executables

A different whole-file hash must not automatically reject an otherwise compatible
EBOOT. The download-preset research tool now separates whole-file identification
from **feature-local layout verification**. It operates on a decrypted ELF:

1. Record the input hash to identify the exact input and make the result auditable.
2. Read ELF load mappings and reject overlapping memory segments or ambiguous
   layouts. Check the actual entry descriptor and segment permissions.
3. Recognize only the three owned instruction states: original, legacy Enabler,
   clean preserve policy, or clean unlock policy. Unknown hooks and mixed policies
   are conflicts; they are not overwritten.
4. Normalize those recognized owned instructions in a temporary copy, then verify
   nine spans per regional profile: the successful-load caller, complete cleanup
   function, complete list predicate, flag getter, fixed26-ID table, TOC table
   pointer, entry descriptor, save-getter dependency span and copy-import stub.
5. Require exactly one matching audited regional layout. Apply the selected policy
   to that copy, retaining every byte outside the owned instructions. Record both
   the actual input/output hashes and the matching reference profile.

The matcher uses the audited guest addresses and ELF mappings. A relocated function,
new v2 layout, or modified dependency requires another audit/profile. It does not
blindly scan for one opcode, accept arbitrary hooks or prove that distant changes
cannot affect global game state. Dependencies are checked over the documented
spans; this is not a recursive proof of the entire executable.

Nine automated tests use all three private regional fixtures. They check the
original/legacy equivalence, native instructions/list, preservation of a synthetic
unrelated mutation and the separate costume instruction edit, rejection of conflicting code/table changes and mixed policies,
idempotent application, policy switching, and refusal to overwrite existing output.
Synthetic preservation tests are not gameplay tests of third-party mods. The runtime
control above used the clean European reference plus the one-instruction unlock.

For a future Studio GUI, each feature should independently report **Known build**,
**Compatible local layout**, **Already applied**, or **Conflict / unsupported**.
An unsupported expansion patch should not disable an independently compatible
costume/download option. Reversal should restore only that feature's logged bytes
when they still match its known output, preserving other mods.
