# Replacing a Galaxy owner without changing the executable

The Goku → Goku SSJ2 test reassigns an **existing** Galaxy. It does not add an
independent 67th selection icon. The original BLES00978 EBOOT.BIN was used unchanged
(SHA256 `da28849b6dafc65c0de74d79f3bd1c54ff19f0368ffb728faa5d97ce77a03c30`).

## Data changes

`galaxy.mmd` has separate owner rows and world selection icons. For the tested
replacement, owner0's ordered mission membership, entry238, opaque owner data and
auxiliary reference move to empty owner2. Owner0 becomes empty. World icon53 keeps
its index, position, neighbors and other properties; its native owner at row+0x0C
changes from0 to2. The icon count remains66 and the mission count remains498.
There is no mission renumbering or new persistent result slot.

Selected-Galaxy QUERY type5 literals in transferred missions must also follow the
new owner. The implementation checks root expressions, ordinary roster candidate
conditions, reward/action conditions and unlock OR-query lists. Changed programs
and their enclosing lists are detached from shared descriptors; original payloads
and trailing opaque expression bytes are preserved. Mission-state queries and
character/form reward targets are not globally changed. Opponent preset DATs are
unchanged. Original shared mission491 keeps the same six team perspectives, with
owner2 replacing only the former owner0 perspective.

The source must have missions and exactly one world icon. The target must be empty,
within native IDs0–99, and have no existing world icon. The target also needs to be
playable/unlocked in the actual game save. The source character remains playable,
but loses its Galaxy. Existing mission records and Galaxy scores are inherited.

Special spawned enemy group layouts and computed selected-Galaxy queries remain
unsupported and fail atomically. A static sweep accepts45 original donors and
rejects21 with special enemy groups. This is **not** a claim that every donor/target
combination has been replayed in RPCS3.

## Native test

The private progress AFS used the tested transfer module. A diagnostic variant of
entry238 additionally requires one natural Ascend action (objective29/action1),
uses stage8 and clears extra gates, modifiers and rewards. The ordinary Krillin
opponent is retained. This isolates a short native victory/save path; it is not an
unchanged playthrough of every original donor mission.

The disposable original-format55000-byte save preselects native2/entry238. Only
entry238's result was cleared before the test; the inherited aggregate was retained.
No score, HP, code, actor state or registers were written during play.

Observed in the original executable:

- The world menu selects Goku SSJ2 in the reused icon, with its correct portrait/name.
- The transferred personal map and entry238 open normally.
- The battle configuration has owner2, node238, objective29 and one action.
- Active player is native2; Krillin is native12/preset496. Both initially40000HP.
- Normal keyboard L1/Ascend completes the action and triggers native victory.
- Result328618, gradeA++, appears on the returned mission map.
- The game writes a55000-byte save with a valid original checksum.

Only mission238 changes among500 mission rows: `[4097,1,328618,0,0,0,0]`.
Only aggregate53 changes among66 aggregates, from7061886 to7390504 (delta328618).
The whole global block atBF30..BFC7 is unchanged, including selected native2.
Outside this section the timestamp changes, and CD20's exact fixed26-bit cleanup
matches the original load routine31CBCC/list already documented in double-save
research. All remaining tail bytes, including Tutorial/Battle Zone result data,
are identical after accounting for that known native cleanup. Do not describe the
entire raw tail as literally unchanged.

The private rebuilt AFS grows by one2048-byte sector. An independent decoder confirms
all2176 other AFS entry bodies remain byte-identical and the replacement decodes to
the expected MMD. Original source archives/save remain untouched.

## Editor workflow

Enable **Show Empty Galaxies**, select the destination form and choose **Transfer
Galaxy from another Character**. Review a portrait-selected donor, then transfer.
Only the loaded Galaxy MMD is modified. Export it and rebuild the progress AFS with
**Import to game**. Undo/Redo and exported-file reopening are covered by browser tests.

**Create New Galaxy** remains a first-mission authoring workflow. It does not create
an additional world icon or expand the saved aggregates. Independent additional
Galaxies and extra native IDs above99 remain a separate research task.

## Complete-process cold reload

RPCS3 and its private debug client were terminated after the native save completed.
A new process used the same private save, original executable and progress archive,
without a savestate or resetting savedata. The game reported a successful load.
Its **entire55000-byte RAM save buffer** equals the engine-written file byte-for-byte:
SHA256 `17fb9def8e886f79ac351b0674adf0b91eec0cc9df223ed7d84798346eb5f92b`.
Mission238 retains328618, aggregate53 retains7390504 and selected native remains2.
The cold run changes only emulator settings (quoted Null audio,50% software rendering)
to reduce cloud overhead. No further post-reboot battle playthrough is claimed.
