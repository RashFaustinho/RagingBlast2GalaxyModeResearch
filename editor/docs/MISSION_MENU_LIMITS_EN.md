# Mission menu limits and controller navigation

Mission category determines the graphical circle type. The original executable
preallocates these independent pools for a loaded map:

| Category | Circle capacity |
|---|---:|
| 0 · Ordinary A | 10 |
| 1 · Ordinary B | 3 |
| 2 · Perfect Action | 4 |
| 3 · Bonus | 5 |
| 4 · Boss | 1 |
| 5 · Common A | 3 |
| 6 · Common B | 3 |
| 7 · Unknown | 0 allocated |
| 8 · Tutorial | 8 |

These limits come from static inspection of the original European executable's
circle constructor and allocator. There is also a separate original 32-node map
object pool. They are independent of saved-mission capacity. Two simultaneously
visible Boss missions can leave an extra node with effects but no selectable circle.
Use a different category for the added battle. Studio warns about excess candidate
counts; mutually exclusive visibility might keep simultaneous usage within a pool,
but that arrangement is not certified by the warning.

Map edges and controller navigation are separate concerns. A valid connecting edge
does not guarantee convenient D-pad access: a new branch can compete with existing
neighbors. Leave a clear direction at the preceding node. In the user's added Frieza
mission, relocating the battle to a more suitable direction restored access. Diagonal
edges exist in the original game, so diagonals are not universally forbidden. The
exact native angle/distance priority has not been fully decoded.

Keep the other on-screen limits in mind: the original Galaxy save has 500 mission
records (0–499), of which the original file uses 498. Additional Galaxy selection
icons, Tutorial progression and standalone Battle Zone slots have separate limits.
Neither adding records nor importing them into an AFS extends the executable's pools.
