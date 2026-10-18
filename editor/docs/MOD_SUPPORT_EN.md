# Mod support

Enable **Overview → Mod support**, then use **Read mod roster from AFS…**, load loose roster files, or load a character CSV / Galaxy Studio mod profile. Continue opening the individual **modded MMD/DAT files** for editing. The AFS workflow reads references; it does not modify the archives.

## Read the roster directly from the mod's archives

1. Choose **Read mod roster from AFS…**.
2. Select the mod's **st_pack_progress_pt_ps3.afs** and **st_pack_boot_pt_ps3.afs** together.
3. Choose the language of the character names: US, IT, FR, DE, SP or JP.
4. Click **Extract and read roster**. Preview the IDs/names and missing translations.
5. Click **Use this roster** to apply the catalog. An existing custom profile is
   replaced only after confirmation; export it first if you need its custom data.

The reader extracts `cs_main.dat`, optional `cs_form.dat` and
`preset_appearance_table.dat`, and `CharacterName_###_XX.txt` from nested packs.
Original European progress entry 1891 provides the native roster; boot packs
provide names and Appearance defaults. Enable **Scan every entry** if the mod
relocates those resources. Full scans can be slower; skipped unreadable entries
are reported. Different copies of the same filename must agree; conflicts stop
import instead of silently mixing catalogs from different game installations.

Only the selected language is collected. No vanilla character name is substituted
for an absent mod translation. Source archives and loaded editable documents stay
unchanged. Export the generated JSON profile for reuse. This automates roster,
group and default-move references; it does not automatically identify custom
portraits, move names, animations or engine expansions. Supply those through
JSON/CSV as before. Different binary layouts require a matching parser.

## Start with the right namespace

A name list needs **native character/form IDs**. Character-select groups, Galaxy selection icons, Appearance rows and preset indices are different numbers. A mod's extra character-select slot does not necessarily equal its native ID.

A minimal UTF-8 CSV is:

```csv
id,name
120,"Example fighter, Extra Form"
```

`120` is an example only. It is not an unused slot guaranteed to work in the original engine. Use IDs from the installed mod. Each form needs its own name/ID entry.

For creation defaults, supply all five local move selectors:

```csv
id,name,super_up,super_right,super_down,super_left,ultimate
120,Example fighter,7,8,9,10,11
```

Without defaults the editor uses a matching native's row from a **loaded Appearance table**. If no matching baseline exists, creation stops with a useful error; it does not guess moves0–4. Existing rows can still be edited numerically.

A separate local move CSV uses:

```csv
native,id,name
120,7,Example Super
120,11,Example Ultimate
```

Names are display aids. This does not install move data, borrow animations or change native transformation code. Decimal and `0x` hexadecimal ID strings are accepted. Quote CSV names containing commas.

## JSON profiles

Download a template from the Mod support panel. Replace its example IDs with real mod IDs. Supported lists:

- `characters`: `id`, `name`, optional five-element `defaultMoves`, optional character-select `group`.
- `moves`: `native`, local `id`, `name`.
- `transformations`: native `id`, `slots` with explicit `slot`0–3, destination native `target` or null, and boolean `cancel`.
- `enhancedCharacters`: character-select group `id` and base `native`.
- `stages`, `music`, `items`: named `id` records.

A supplied character entry replaces the original move-name catalog, native slot hints, portrait and creation defaults for that native ID. This avoids showing Goku's moves for a modded replacement. Explicit `keepOriginalMoves: true` retains original move defaults/names and slot hints when appropriate; `useOriginalPortrait: true` independently retains its vanilla portrait. Explicit profile slot definitions override retained hints.

Custom portraits can be embedded PNG data URLs, with a350KB encoded limit per image. External URLs, SVG and arbitrary file paths are rejected. The editor remains offline. Names render as text, not HTML.

**Load cs_form.dat** accepts the researched raw36-byte-row layout, without a DAT header. It supplies character-select groups and group membership, not English character names. Different mod layouts are rejected; provide the mapping explicitly in JSON instead. Loading this catalog does not edit the game file.

Profiles can be exported separately and are included in saved `.rb2project` workspaces. Old workspaces without a profile still load. Disabling Mod support restores the original reference catalog without reverting binary edits.

## Engine limits still apply

This mode describes an already installed mod. It does not enlarge executable arrays or save storage.

Original BLES00978 has500 Galaxy mission save records,66 Galaxy aggregate save records and a512-bit mission launch bitmap. The native owner lookup accepts0–99. Native100 is a sentinel in some original form tables; a mod using it must change the corresponding engine consumers.

The original item-effect conversion loop at `0x12C61C` processes **381 item definitions (IDs0–380)**. Equipment ID bitmaps have384bits. Adding DAT rows alone does not expand them: IDs381–383 require a changed loop, and ID384+ can write outside the original bitmap. The editor warns even if a larger item DAT is loaded. Those warnings do not prove that an unknown mod has or has not supplied compatible engine patches.

Local move selectors100+ cannot be encoded as ordinary move-unlock rewards using `native × 100 + localMove`: they spill into the next native namespace. They remain usable as raw Appearance selectors when the installed mod supports them.

The editor's binary layouts also remain the researched layouts:32-byte Appearance,88-byte Strength and44-byte preset rows. A mod changing those layouts needs a separate parser; catalog import deliberately does not guess a new format.
