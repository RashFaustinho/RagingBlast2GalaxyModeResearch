# File formats and ID namespaces

All offsets in this document are hexadecimal. Indices/counts are decimal unless
marked `0x`. Indices are zero-based. Multi-byte configuration values are big endian;
the AFS directory and STPZ chunk-size fields are exceptions, using little endian.
Unknown fields and opaque payloads must survive roundtrips unchanged.

## MMD header and descriptors

MAIN and ZONE use a 0x24-byte header. A descriptor is eight bytes:

```text
u16 count | u16 stride | u32 payload-relative byte offset
descriptor[i] = file + 0x24 + i*8
payload_base = 0x24 + BE_u32(file+0x08)
body[i] = payload_base + descriptor[i].offset
logical_body_length = count * stride
```

Offsets are **bytes**, not GSC-style word offsets. A subordinate reference is a
descriptor index, not a file address. Descriptor 0 is the null reference in the
researched paths; do not reclaim all zero-looking payloads automatically.

| Header offset | Meaning |
|---:|---|
| +00 | MAIN / ZONE signature |
| +04 | Preserved format/version words; do not invent semantics for every bit |
| +08 | Descriptor table byte length |
| +0C | Payload byte length |
| +10 | Root-array descriptor |
| +14 | MAIN global graph-edge descriptor |
| +18 | MAIN world-icon descriptor |
| +1C | MAIN native-owner descriptor |
| +20 | Preserved additional header word |

The original supplied `galaxy.mmd` has 498 roots, 515 edges, 100 owner rows and
66 world icons. Root stride is 0x5C. Original Tutorial has nine roots. Original
ZONE files use root stride 0x38. Their header tables are not interchangeable.

## MAIN root: 92 bytes

| Offset | Type | Meaning |
|---:|---|---|
| +00/+04 | float32 | Map X/Y |
| +08 | u16 | Arena selector |
| +0A | u16 | Mission/circle category |
| +0C | u16 | Music selector |
| +0E | u16 | Displayed difficulty; not a universal CPU-level field |
| +10 | u16 | Victory objective |
| +12/+14 | u16 | One-based rule-caption selectors; zero means none |
| +16/+18/+1A | u16 | Opaque |
| +1C | u32 | Time limit |
| +20 | descriptor | Incident **edge IDs**, not neighboring root IDs |
| +24/+28 | descriptor | Ally/enemy group |
| +2C | descriptor | Conditional rewards |
| +30/+34 | descriptor | Reveal-related/availability expression |
| +38 | descriptor | Unlock OR-query rows |
| +3C | descriptor | Native action-request sequence |
| +40 | descriptor | Objective parameter expression |
| +44/+48 | descriptor | Rule-caption parameter expressions |
| +4C | descriptor | u16 item indices applied to player team |
| +50/+54 | descriptor | Separate mission-menu item-icon lists |
| +58 | u32 | Opaque |

Owner rows are 12 bytes: auxiliary reference, membership reference, u16 entry
mission, u16 opaque value. Membership rows are four bytes; world-icon rows are
28 bytes with the native owner at +0C. Global edge rows are eight bytes and
incident lists must refer consistently to both endpoints. An owner, mission,
world icon and save aggregate are distinct structures.

An ordinary group is `(u32 tag=0, u32 rosterDescriptor)`. A candidate is eight
bytes: `(u16 preset, u16 opaque, u32 conditionDescriptor)`. Candidate counts can
exceed active-team capacity when conditions exclude different rows. Special
tag-FFFFFFFF groups are not covered by this ordinary format.

## ZONE root: 56 bytes

| Offset | Type | Meaning |
|---:|---|---|
| +00/+04 | float32 | Map X/Y, also used to calculate saved cell |
| +08 | u32 | Stage kind; 0–7 ordinary, 8–15 secret |
| +0C | u32 | Enemy preset in Normal/Ultimate namespace |
| +10 | u32 | Displayed LV, **not progress-record ID** |
| +14 | u32 | Handicap code |
| +18 | u32 | Time limit |
| +1C | u32 | Arena selector |
| +20 | u32 | Stored music word; stock Zone music uses native selection instead |
| +24 | u32 | Opaque |
| +28 | descriptor | Challenge Stamp criteria; retain a valid donor list |
| +2C | descriptor | Conditional rewards |
| +30 | descriptor | Stored expression; not an established secret-unlock override |
| +34 | descriptor | Directed next-stage root IDs |

## DAT tables

| Table | Header | Row size | Known fields |
|---|---:|---:|---|
| preset_appearance_table.dat | 16 | 32 | native +00, costume +04, costume mode +08, five local moves +0C..1C |
| preset_strength_table.dat | 16 | 88 | CPU-level word +00, AI-type word +04, 20 item indices +08..54 |
| preset_character_* | 16 | 44 | appearance +00, strength +04, opaque +08, four form links +0C..18, four fusion links +1C..28 |
| item_parameter.dat | **0** | 84 | name-text ID +00, description-text ID +04, property metadata; equipment uses row index |

Normal DAT headers contain the BE32 row count followed by preserved words. For
headered tables, row N starts at `0x10 + N*stride`; item row N starts at `N*84`.
Original counts include Appearance 367, Strength 777 and Galaxy presets 1058.
Preset link/item empties commonly use FFFFFFFF. Do not normalize arbitrary unknown
values or confuse an empty high-bit representation with a valid row reference.

Tutorial message-order DATs and raw `cs_main.dat`/`cs_form.dat` have separate codecs.
Raw cs_main uses 80-byte rows; cs_form 36-byte rows. Tutorial TXT resources use a
UTF-16LE BOM and NUL termination; the editor preserves no-edit bytes and terminators.

## Postfix expressions

Each token is `(u32 kind, s32 operand)`: kind 2 pushes a literal, kind 1 executes
an operator, kind 0 terminates. Query operator 16 pops the query type, then argument.

```text
Number 38 → Number 5 → Operator 16 → End 0
QUERY(type=5, argument=38) = playing Raditz's Galaxy
```

Operators 33–36 are +, −, ×, ÷; 37/38/39 OR/AND/NOT; 40 negation;
41–46 ==, !=, <, >, <=, >=. Native stack capacity is 32. Stored expressions need
End: 0 and exactly one final result. Query type 0 is unsafe. Preserve unedited
programs and trailing opaque data; never silently replace a complex query with a
guessed simple condition. See the [condition guide](../editor/docs/CONDITIONS_AND_BATTLE_ZONE_EN.md).

Executable addresses are guest virtual addresses, not file offsets. Runtime heap
pointers, container offsets and extracted-file offsets must also remain separate.
The JS codecs in `editor/js/mmd.js` and `presets.js` provide executable schemas;
their tests are a useful companion to these tables.
