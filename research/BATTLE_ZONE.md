# Battle Zone: editable data and native limits

Normal and Ultimate each have eight native Zone slots. Their MMDs begin with ZONE,
use 56-byte roots and select separate Normal/Ultimate preset containers. This is
the same preset architecture, with a different mission schema and progression path.

## Editable fields

Enemy preset, handicap, displayed LV, arena, time, Challenge Stamp list, conditional
rewards and directed next-stage links are real data fields. Root +34 links to root
indices in the same MMD. More than one ordinary destination offers a player choice.
Stage kinds 0–7 are ordinary; 8–15 participate in the separate secret path.

Keep valid donor Stamp criteria. The native getter can dereference null when +28
is zero; all 128 original roots have nonzero lists, with 3, 4 or 5 criteria. A fixed
five-entry assumption is also wrong. The guided creator preserves donor criteria
and rejects empty donors before mutating the document.

## Secret route action: one rule per Normal/Ultimate slot

| Stock file | Requirement |
|---|---|
| zone_green_square.mmd | No native secret trigger |
| zone_red_triangle.mmd | Win with a Super Attack |
| zone_blue_lozenge.mmd | No native secret trigger |
| zone_yellow_spiral.mmd | Win while Raging Soul is active |
| zone_violet_circle.mmd | Win with an Ultimate Attack |
| zone_aquamarine_sphere.mmd | No native secret trigger |
| zone_crimson_liner.mmd | Maximum combo hit count at least 20 |
| zone_final.mmd | No native secret trigger |
| zone_ultimate_square.mmd | Win with an Ultimate Attack |
| zone_ultimate_triangle.mmd | Maximum combo hit count at least 20 |
| zone_ultimate_lozenge.mmd | No native secret trigger |
| zone_ultimate_spiral.mmd | Win with a Super Attack |
| zone_ultimate_circle.mmd | Win with an Ultimate Attack |
| zone_ultimate_sphere.mmd | No native secret trigger |
| zone_ultimate_liner.mmd | Win while Raging Soul is active |
| zone_final_ultimate.mmd | Win with a Super Attack |

The same rule applies to secret forks in all battles of that slot. Successful
unlock can remain latched during the run; it need not be repeated at every fork.
Renaming or relocating a file does not change native slot semantics. For a custom
filename the editor reports unknown rather than assuming there is no trigger.

Native `26FA18` checks the latch, checks for a secret destination and calls the
mode/slot requirement at `26F8C8`. Its result reaches menu context +668 through
`2767B0`, and `271F50` uses the separate secret-selection path. Ordinary candidates
use another count/selection branch. A graph with only secret links can reach a
fallback at `2720C8`; do not use malformed secret-only graphs as proof that native
unlock rules are irrelevant. Keep a valid ordinary continuation.

The stored root +30 expression mirrors original requirements and is copied to a
selected-stage snapshot, but no evaluator for it was found in the traced secret
flow. That establishes neither a working override nor global deadness in all game
versions. It remains available under advanced research. Reward +2C conditions run
separately after battle; changing a reward query does not redefine a route action.

No MMD-only method to change the native secret achievement was verified. Studio's
**Route** tab shows both the Zone-wide requirement and **Where this stage can lead**;
those panels deliberately do not repeat in Conditions & rewards.

## Query names that were finally identified

Statistic argument 3 is maximum combo hits; 14 is remaining player-team health
**percentage**, not HP. Arguments 11/12/13 are Super victory, Ultimate victory and
Raging Soul victory. Merely using a move earlier in battle does not set a finishing
attack condition. Cross-checks with native Perfect Actions 87/89 and the Raging Soul
state bit resolved the earlier unknown labels. See
[outcome proof](BATTLE_ZONE_OUTCOME_FLAGS_NATIVE_EVIDENCE.json) and
[routing proof](BATTLE_ZONE_CONDITION_NATIVE_EVIDENCE.json).

## Arena and music corrections

Original arenas are not uniformly 13: Green Square was the all-13 sample that led
to that mistaken generalization. The native setup reads +1C and calls the stage
converter. Stock ordinary Zone selectors above 13 fall back to Wasteland; the
Tutorial/Practice selector 14 is not thereby a verified cross-mode stage. An
arena-only runtime attempt reached title but not combat, so no successful gameplay
verification is claimed for that attempt.

The stored +20 music word is ignored by stock Zone music setup. Native stage-type
pools and the special last-Zone cases select the song. A displayed Music 56 is not
silence. See [music analysis](../editor/docs/MUSIC_SELECTORS_EN.md) for exact pools,
selector 30/31 corrections, regional tables and the Galaxy/Tutorial distinction.

## Progress is coordinate-keyed

Stock save records are keyed by mode, Zone slot and coordinate-derived cell:

```text
cell = (int(X) + 1) + 3 * (6 - int(Y))
route = save + 0x5E20 + mode*0x1060 + zone*0x20C
cell record = route + 4 + cell*24
```

Float-to-int conversion truncates toward zero. +10 displayed LV is not a way to
choose this record. Original X includes 0, 1 and 2; the earlier editor rule demanding
−1, 0, 1 was wrong. With standard X=0..2, Y=0..6, cells 1..20 fit the original bank;
(2,0) computes 21 and is outside its 21 physical cells indexed 0..20. Cell 0 contains
reserved/noncanonical state and is not an ordinary spare slot.

The 16 stock routes contain 128 fights. Arithmetic leaves 192 unoccupied standard
save-address-safe positions, not 192 demonstrated playable additions. Native UI,
navigation, stamps, aggregation and route logic impose independent constraints.
The original visual grid is 5×13 entries, with transformed coordinates; larger save
banks do not enlarge it. See [expansion results](SAVE_RAM_AND_EXPANSION.md).
