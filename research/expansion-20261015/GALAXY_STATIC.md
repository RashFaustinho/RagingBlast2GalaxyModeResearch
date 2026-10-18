# Additional Galaxies: data path and original-executable limits

This report describes the original European BLES00978 executable and data.
The executable was read, not patched. Structural findings below have now been
followed by a controlled runtime selection, battle and victory for mission498.
Detailed runtime JSON/screenshots are recorded alongside this report.

## Three different counts

The original `galaxy.mmd` has **100 owner slots**, **66 populated Galaxies**,
and **66 world-map icon records**. The empty owner slots are transformed forms,
including Goku SSJ, SSJ2 and SSJ3. The 66 native IDs in the world map exactly
match the 66 populated owners. An owner row alone is therefore insufficient
to create a selectable Galaxy.

`cs_form.dat` in progress-AFS entry1891 also has66 rows, but it describes the
character selection groups and forms. It is **not the Galaxy world-map list**.
The GX19A probe does not modify `cs_main.dat`, `cs_form.dat`, or any boot table.

## Newly identified world-map descriptor

`MAIN` header `+0x18` selects the world-map icon descriptor. In the original
Galaxy MMD it is descriptor3666: count66, stride28, original file offset
156964 (`0x26524`). Descriptor offsets are payload-relative as elsewhere in
MAIN. Each world icon has this observed layout:

| Relative offset | Type | Meaning |
|---|---|---|
|00,04,08|three BE float32|World-map X/Y/Z position|
|0C|BE u16|Native character / owner ID|
|0E|BE u16|Visual category, original values0/1/2|
|10|BE u16|Grouping value, original0..6; exact presentation role not fully isolated|
|12,14,16|three BE u16|Unknown, original zero; preserve|
|18|BE u32|Conditional navigation-neighbor list descriptor|

The neighbor list has8-byte rows `[u32 expressionDescriptor, u32 iconIndex]`.
This is neither a mission list nor a native-ID list. The examined original
neighbor entries use expression0, meaning unconditional. Code at1D7C14 resolves
the descriptor, evaluates each entry via2F43B0, then finds a world icon by its
index. Separate sorted cycling at1D9160 walks native IDs0..99 and links each
visible icon to the previous/next native ID.

The MAIN loader at2F2F10 stores the resolved icon data at model+14 and its
count at model+24. The world-menu population routine1D6E74 iterates this
count. It also checks whether the corresponding native character is unlocked;
an empty owner becoming populated does not unlock the character automatically.

For debugger inspection, the world-screen controller's+3C points to the icon
manager, and+50 points to the current icon. A world icon stores its28-byte
MMD record pointer at+08 and its icon index at+14 (accessors206408/206400).
The similar mission-node fields+04/+10 use different accessors2063F8/2063F0;
do not confuse these two record types.

## A genuine additional-Galaxy probe

`galaxy-static/build_gx19a.py` creates the GX19A fixture from the exact original
Galaxy archive. It:

- activates previously empty owner3, Goku Super Saiyan3;
- appends world icon66 (the67th icon) near the original Goku icon;
- appends independent mission498 (Ascend) and499 (Descend), each using objective29;
- connects only the two new missions with new edge515;
- preserves all498 original mission roots, all515 original edges, all66 original
  world-icon rows and all99 other owner rows byte-for-byte;
- preserves `tutorial.mmd`, uses original presets, and needs no boot/EBOOT edit.

New world position is(-4.0,-1.5,5.67779541015625); original Goku's icon is
(-2.5,-1.5,5.67779541015625). The probe leaves original navigation lists intact.
The new icon points to original Goku/Vegeta icons53/56; sorted native cycling
can include native3 between Goku0 and Kid Gohan4 when the icon is visible.

This adds a Galaxy for an existing native form. It does not create native
character100 or demonstrate an arbitrary unlimited list of campaigns.

## Why the extra icon is still an experiment

The original menu constructor allocates exactly **67 icon objects**, using
object-pointer slots+30 through+138. The loop at1D70E0 compares the running
offset against108 before stepping by4; this includes slot66. The destructor
also handles0..66. Thus the first additional icon fits the examined UI pool,
while a68th icon exceeds it.

The persistent **Galaxy aggregate table has only66 records**, however. It
starts at save-memory+8148+36B0, with28 bytes per icon. Record66 begins at
save-memory+BF30, which is already the global last-selected-native field;
its+4 overlaps global flags atBF34. Menu/result functions read/write these
addresses for different purposes. The spare UI object is not a spare save slot.

Consequently GX19A must be tested on a backed-up disposable save. Selection,
launch or even a victory would not prove independent safe persistence. Do not
ship it as a normal save-compatible expansion unless the collision is solved.

**The collision was reproduced at runtime.** The new Galaxy was selectable;
mission498 launched with owner/native3, Krillin as opponent, objective29 and
Ascend action1. Completing Ascend through ordinary controller inputs produced
an A++ victory and mission score338993. The global last-selected-native word
then contained338996: the old native ID3 plus the new mission score. This is
the exact aggregate-score write predicted above, not a hypothetical concern.
See `GX19A-498-intro.json`, `GX19A-498-victory.png`, and
`GX19A-save-collision-runtime.json`.

The static read-only save pointer chain is `manager = u32BE[0x757534]`, then
`saveBase = u32BE[manager]`. In this runtime it resolved to saveBase30000020,
so the overlapping global words began at3000BF50. These heap addresses can
change between runs. The pointer slot comes from original function3179C0 and
TOC6E8D90; no debugger writes are needed to inspect it.

The mission-record table independently holds **500 records**. The original
file uses498, leaving precisely IDs498 and499 inside the verified persistent
capacity. Appending mission500 or higher requires additional engine/save work.

Finally, several owner accessors compare the native ID against99 and route
out-of-range inputs to owner1. Appending owner100 to the MMD cannot by itself
create a working101st owner. The exact checks include1D67CC,1F0AB8 and1F0BEC.

## Evidence and scope

`GALAXY_STATIC.json` records the original owners/icons and the evidence
addresses. `GALAXY_OWNER_SLOTS.csv` and `GALAXY_WORLD_MAP_ICONS.csv` are readable
exports. The aggregate-save layout was independently traced by the save-bound
research task. GX19A's manifest records archive hashes and preservation checks.

These findings establish a concrete way to construct and expose one additional
Galaxy for runtime investigation, plus clear original-engine limits. They do
not establish a production-safe feature to add unlimited Galaxies in the editor.
