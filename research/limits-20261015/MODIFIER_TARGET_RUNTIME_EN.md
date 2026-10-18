# MAIN mission modifiers: player-team merge confirmed

Earlier static trace0x12C83C..0x12C9CC merges the game packet’s shared mission-item bitmap at+0xE0 into team0 candidates only, then rebuilds effects. There is no per-entry target word in the u16 mission list.

A runtime control under the mission-capacity-only GS512-r2 executable set MMD root511’s+0x4C modifier list to296 (Health Auto-Loss) and+0x50 UI icon list to296, retaining original player and Krillin presets. Snapshot `M512-511-intro.json` shows:

| Participant | Native | Preset | Live equipped IDs |
|---|---:|---:|---|
| Player Kid Buu |66|2|296|
| Enemy Krillin |12|496|224,225|

No RAM equipment masks were changed. Thus the data-level mission modifier went to the player, while the enemy kept only its Strength equipment. The executable delta in this control changes save capacity, not the modifier merge. This confirms the original traced path for this control; it does not establish every item’s effect, Seal counteraction, other mode callbacks or arbitrary modified executables. UI icons alone still do not equip items.
