# KB15: native form slots and ordered tags

Build: BLES00978, RPCS3 0.0.43-20291. All HP/aura interventions below are controlled data probes, not naturally played victories.

## Proven archive correction

The native transformation table and Galaxy preset links are separate layers. Native Goku SSJ2 (2) slot0 is base (0), flagged as cancellation; slot1 is SSJ3 (3), flagged as normal transformation. KB14A's item153 selected slot0 while its preset destination was SSJ3: the user reported cancellation animation followed by SSJ3 identity.

KB15B uses item156, the second native entry at three bars. Its preset retains the original developers' duplicate-link pattern [1059,1059,F,F], but the automatic item requests slot1. The native flags are not modified.

In the controlled KB15B session, Goku SSJ2 at29000 HP/aura50 requested slot1, loaded preset1059/native3, and consumed30 aura. Goku SSJ3 at19000 HP requested slot0 and loaded preset1060/native0 with its own nine items. The base link already existed in KB14A; no new SSJ3-to-base link was required. This establishes the working corrected route; it does not separately isolate every internal state responsible for KB14A's subsequent cancellation failure.

See kb15b-g2-slot1-request.json, kb15b-g3-confirmed.json, kb15b-g3-cancel-request.json, kb15b-g0-confirmed.json. Three complete resident tables matched KB15B byte for byte (kb15b-resident-table-equivalence.json); that session began from KB15A with one guarded resident-link correction, rather than a cold boot of the KB15B archive.

## Tag timing and destination are separate

At9000 HP, Goku base's switch item did fire, but the active party index became2 (Fat Buu). Vegeta in slot1 was still alive, preset1061/native20, HP40000. Therefore a switch item does not guarantee the next roster entry. See kb15b-g0-switch-check.json.

Executable evidence: ordinary tag request path8A31C reads CPU+AC (selected ordinal); AC8AC resolves CPU+8C+4*ordinal into a party index;8A35C calls3A9A4 with that index. The tag packet uses the existing target actor and stores the requested index at SceneTeam+21C. It is independent of the preset's form links. No verified MMD-only arbitrary partner-order field has been found.

## Delivered result

KB15B contains only galaxy.zpak, the boot AFS, installation notes and its manifest. No executable is delivered or required for the documented form correction. A separately prepared executable experiment was stopped at the user's request before any battle test; it is not part of this result. The temporary working game's original EBOOT was restored.

Vegeta base now has item15D (switch at one bar). Its presence was verified in the archive; no further gameplay test of that addition was performed. The user had already confirmed Vegeta's cancellation worked in the preceding build.

The demonstrated Goku chain is SSJ2 -> SSJ3 -> base. Subsequent teammate selection remains controlled by the game and can skip Vegeta. KO-entry buffs require an actual preceding KO; an ordinary health-triggered tag does not satisfy that trigger.

Archive checks: all40 other boot-AFS member bodies and offsets unchanged; the Galaxy archive retains tutorial.mmd and the intended MMD changes. The mod ZIP was read back with CRC validation and frozen before sharing. Its top-level runtime_validation records the current controlled results; inherited packaging status/limits text in that build manifest predates gameplay observations.
