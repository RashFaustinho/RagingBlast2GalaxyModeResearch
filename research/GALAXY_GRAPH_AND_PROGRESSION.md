# Galaxy maps, new fights and owner transfer

## A fight is more than a root record

A reachable new mission needs a valid root and its subordinate data, membership
in the intended native owner's list, a coherent starting mission, graph edges and
incident-edge references, and gates that allow it to appear/unlock. The global
root number identifies saved progress; coordinates only position the menu node.

Guided creation starts from a basic working donor and creates reciprocal incident
references. Ordinary edge data is separate from unlock expressions: a line does not
necessarily mean the predecessor's victory unlocks the destination. MAIN query 2
provides the cleared-predecessor test; query 3 means available, not already cleared.

Studio can free an explicitly deleted global mission ID, redirect known incoming
state queries, and reuse that ID on later creation without shifting other roots.
Deleting one membership of a shared mission does not free the global ID. Previously
saved progress can remain attached to a reused ID; the MMD cannot erase an existing
user save automatically.

ADV18E added root 498 in the existing Kid Buu Galaxy. A natural Ascend objective
completed while its opponent retained 40,000 HP, and native progress survived cold
restart. The diagnostic fixture also edited original root 117 for an ally comparison;
do not call it an all-original-battles-preserved campaign expansion.

## Circle pools and controller navigation

| Category | Original simultaneous circle pool |
|---|---:|
| 0 Ordinary A | 10 |
| 1 Ordinary B | 3 |
| 2 Perfect Action | 4 |
| 3 Bonus | 5 |
| 4 Boss | 1 |
| 5 Common A | 3 |
| 6 Common B | 3 |
| 7 Unknown | 0 allocated |
| 8 Tutorial | 8 |

The shared map also has a separate original 32-node object pool. The category
selects circle type; no independently verified arbitrary per-fight radius field
was found. Two visible Boss nodes can produce effects without a selectable circle
for the extra node. Mutually exclusive visibility can change simultaneous demand,
but candidate-count warnings do not certify every unlock state.

A valid edge does not guarantee convenient controller access. The user resolved
their added Frieza mission by moving it into a clearer direction. Diagonal edges
exist in the original game; they are not categorically forbidden. Exact angle and
distance ranking remains unresolved.

## Empty owner is not a new independent Galaxy

The original file has 100 native/form owner rows but 66 populated owners and world
icons. **Show Empty Galaxies** exposes existing empty rows. **Create New Galaxy**
authors that owner's first mission but does not create a separate world selection
icon, save aggregate or character unlock.

**Transfer Galaxy from another Character** reuses one existing icon and aggregate:

1. Move the donor's ordered membership, entry and preserved auxiliary owner data.
2. Reassign its existing world icon's native owner, keeping its index and neighbors.
3. Adjust literal selected-Galaxy queries in supported root, roster, reward/action
   and OR-list locations, detaching shared descriptors when needed.
4. Leave opponent preset DATs, mission-state references and character/form reward
   targets intact. Do not globally replace every occurrence of the native number.

The destination must be empty, have no icon, be within native 0..99, and be unlocked
in the actual game save. The donor must have one icon and supported ordinary groups.
The donor character stays playable but loses its Galaxy. Records/scores are inherited.
A static sweep supports 45 of 66 original donors and rejects 21 special-group donors;
that is not 45 complete gameplay trials.

The Goku → Goku SSJ2 replacement used the original EBOOT, passed menu/map/player
identity, naturally won a diagnostic action battle, saved score 328618, and cold-
loaded the complete 55,000-byte save exactly. Only mission 238 and aggregate 53
changed in their respective arrays; normal timestamp/cleanup changes were separately
accounted for. See [full transfer report](galaxy-transfer-20261016/TRANSFER_EN.md).

A 67th independent icon was tried separately. It could launch combat, but its score
overwrote globals at the next save region. A spare-looking menu object is not a spare
aggregate. Transfer is demonstrated; genuine additional independent Galaxies need
further engine/save work and are not enabled by the editor.
