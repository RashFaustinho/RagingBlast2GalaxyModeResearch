# Empty owners and selectable Galaxies

The original European game has 100 native character/form owner rows, 66 populated
owners and 66 Galaxy selection icons. Empty owners include Goku's Super Saiyan forms.
**Show Empty Galaxies** exposes those existing empty slots in Studio; it does not itself
add a selection icon to the game.

On an empty slot, Studio now offers:

- **Transfer Galaxy from another Character**: choose a populated donor. Studio moves
  its owner map and entry, reassigns its existing world icon, and adjusts literal
  selected-Galaxy queries in supported mission/team conditions. The donor loses its
  Galaxy, but remains playable. Mission IDs, progress, coordinates, links, opponent
  presets and native character/form reward targets are retained. This replacement
  stays within the original icon count and needs no executable patch.
- **Create New Galaxy**: create the first mission from a basic donor. This prepares
  the owner's battles but does not add the separate world-menu icon. Later missions
  can connect to the entry normally. Moving a single mission has the same icon limitation.

Transfer requires a native owner ID within 0–99, an empty destination without a world
icon, and a source with exactly one existing icon. The destination must already be
unlocked in the game save. Existing records and Galaxy scores are inherited. Export
`galaxy.mmd` and import it into the progress AFS; the preset DATs do not need changes
for the transfer alone. Preview and Cancel do not change the document; Undo/Redo work.

Some original Galaxies contain special spawned enemy groups that are not fully decoded.
Those sources, computed selected-Galaxy queries and unsupported geometry block the
transfer atomically. The original-file static audit accepts 45 of 66 donors; the other
21 are explicitly blocked, not claimed compatible. This is separate from the native
runtime check of the Goku → Goku SSJ2 replacement.

For manual inspection, the world icon list is a descriptor selected by MAIN header
+0x18, with 28-byte rows. A row stores XYZ float32 coordinates, native owner ID at
+0x0C, visual/group values and a conditional neighbor descriptor at +0x18. Neighbor
targets are icon indices, not native IDs. Transfer reuses the same icon index.

A genuine additional Galaxy requires an additional independent icon and saved result
aggregate. Appending icon 66 (the 67th icon) was tested: selection, battle and victory
worked, but the aggregate score overwrote an unrelated saved global field. The spare
menu object is not a spare save record. Do not treat this as a safe stock-game expansion.

Adding independent Galaxies without replacing existing ones therefore needs further
native save/menu work, separate from mission authoring. Extra modded native IDs above
99 also exceed original owner lookup limits. A larger roster catalog in Studio alone
does not change those executable limits.

The Goku → Goku SSJ2 replacement has now passed an original-executable RPCS3 test:
world menu, personal map, active player identity, natural diagnostic victory, native
55000-byte save and a complete-process cold reload whose whole RAM save buffer
matches the engine-written file. This validates replacement, not independent expansion.
