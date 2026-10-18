# Experiment history and corrected interpretations

Read [current findings](FINDINGS.md) first. This chronology preserves failed attempts
because they explain why plausible interpretations were abandoned. Old build manifests
and snapshots retain their original values; this guide does not relabel them as new tests.

## Initial Discord/MMD investigation

The original chat exports described inconsistent tutorial enemy edits and an assumed
GSC-like offset model. File geometry instead supports byte-relative descriptor offsets.
At tutorial offset 24F, one edited byte belongs to a BE32 descriptor reference at 24C.
Changing it can select an unrelated list layout, explaining strange participant counts.
Changing a count without allocating records, or changing offsets without alignment,
is not evidence of a hidden random roster generator.

Tutorial preset 0 resolves to Yamcha/native13, preset1 to Krillin/native12, preset2
to Piccolo/native11. The apparent mismatch with the general roster was a namespace
mistake. Native getters can use a fixed row stride even when a descriptor stride is
edited, so a no-effect stride change does not prove the whole file is ignored.

G03 replaced 16A with 169 on Saibamen and was a poor transformation control: Saibamen
have no ordinary forms, and later localization corrected those item labels. G04
changed health equipment on the same known preset. The user observed much higher
Saibaman health, validating the equipment path without proving automatic form changes.

## Kid Buu flow experiments

| Stage | Observation / control | Correct interpretation |
|---|---|---|
| KB01 | Three fighters loaded; defense/CPU items applied; arena Cave; supposed Fat Buu was Super Buu | Native 63 was wrong; Fat Buu is 62. Correct arena is 8, not 9. Equipment loading alone does not validate flow items |
| KB02/KB03 controls | Goku did not transform under supplied item labels; Gohan control did | Later localization/native-slot work explains confounders; no isolated universal mission transformation-lock flag established |
| KB04 | AI-type isolation tried | A negative does not prove CPU decisions universally prevent immediate items |
| KB05 | Goku with Gohan's identical items transformed at 20,000 HP; SSJ3 did not cancel | Gohan item 155 requests the second slot at two bars; not proof that nine filled slots are required |
| KB06 | Minimal equipment lists did not produce the requested full flow; Vegeta repeatedly switched near 30,000 HP | Wrong special-item labels remained in the test; treat it as historical, not final behavior |
| KB07A/B | Corrected user record: A transformed Goku; B did not. Vegeta switched even without items | Initial claim that both worked was withdrawn. Removing items also removed No Switch-Outs; repetition alone did not prove a hidden MMD switch trigger |
| KB08/KB09 | Controlled debugger observations gathered | Not all negative snapshots captured a causally complete trigger interval; keep file identity and runtime state separate |
| KB10 | Original localization rebuilt; corrected equipment families tested | 15E/15F are switches, 15A/15B cancellation. Goku form changes loaded the destination equipment |
| G12 / KB13 | Simplified mission and heavy CPU MAX setup exercised form changes, cancellation and switches | CPU MAX and empty slots were not universal blockers. Simplifying several fields does not isolate a single original mission flag |
| KB14 | User saw cancellation animation followed by SSJ3 | Native slot0 was cancellation; preset destination alone did not determine animation |
| KB15B | Corrected Goku slot1 three-bar request (156), SSJ3 cancellation, base equipment observed | Working two-layer native-slot/preset chain; session included a disclosed resident correction and HP/aura controls |
| KB16/KB17 | User requested roster order/No Switch-Outs, then removal of Buu | Final archive readback confirmed the two-fighter setup; the final delivered revision was not fully replayed here |

The original story about objects being discovered in battle RAM was corrected by the
user: the community initially found them through save editing. Later supplied guest
dumps provided independent runtime evidence. Do not attribute the initial discovery
to a combat dump.

Original item labels used by early builders are historical and can be wrong. Use the
current English equipment catalog and native-slot catalog for new mods. Likewise,
the original mission's High Tension caption at three bars did not itself prove that
the caption forced Vegeta's teammate switch.

## Advanced missions and actions

- ADV18B/C explored new roots and allied teams, including custom local move selectors.
  Earlier map defects were fixed before ADV18E. An observed action prompt with
  objective 0 is distinct from a prompt-completion victory with objective 29.
- ADV18E naturally completed added root 498 and persisted after cold restart, with
  the original executable. It also changed original root117 for another comparison.
- Optional-action follow-up found 20 stock Galaxy missions with nonempty sequences,
  all using objectives other than 29. Those donor missions were inspected statically,
  not all replayed in the emulator.
- Battle Zone sample BZ01 confirmed its separate preset namespace in a live battle;
  that does not certify every later expanded grid fixture.

## Expansion, persistence and transfer

- GX19A's 67th icon reached menu/combat but corrupted unrelated global saved fields
  when its aggregate updated. It is a negative safety result, not a successful new Galaxy.
- GS512 demonstrated limited relocated-mission persistence, but later work found more
  old-bank readers. Its reports are historical prototypes, not the current safe patch.
- D2 Galaxy1039 and sparse Tutorial63 natural persistence/cold reload succeeded.
  Full visible Tutorial64 failed circles; the earlier 251 revision also corrupted a
  caller stack array. Final 329 revision fixed that stack path, not all graphical limits.
- D2 Zone trials failed. The later minimal float-only cell21 control failed too, even
  though an older matrix says pending. Cell53 additionally violated the visual grid.
  A planned cell-result migration was never executed and creates no new-win evidence.
- Later original-EBOOT Goku→GokuSSJ2 transfer reused an existing icon, saved a natural
  diagnostic result and cold-loaded successfully. The user's independent Kid Gohan→
  GokuSSJ3 transfer is a separate user-reported confirmation.

## Documentation corrections during editor development

| Earlier statement | Current correction |
|---|---|
| All Zone coordinates must be X −1/0/1 | Originals include X=2; validate the actual cell key and preserve imported geometry |
| All Zone arenas are 13 | Only the sampled Green Square was uniform; originals vary and native +1C is read |
| Music 30 is random, 31 unknown | Native labels are Battle of Omega Solo Guitar/Full; 56 is the mode-dependent sentinel |
| Zone route editing requires EBOOT changes | Links/destination kinds are editable; the native secret action is the separate immutable part in Studio |
| Result flags 11–13 unknown | Native cross-checks identify Super/Ultimate/Raging Soul wins |
| MAIN cleared/available flags interchangeable | Query2 returns mask8; query3 mask2; visibility separate; Zone callbacks remain unmapped |
| Battle modifiers have an unknown side | Traced and controlled path applies them to the player team, including allies |
| Tutorial selector14 is generic unknown | All nine Tutorial roots use it; descriptive Tutorial/Practice name is user-identified, not an ordinary Zone-stage guarantee |

Historical verification directories bind earlier source hashes. They do not certify
new code just because their result is PASS. Current release reports live at the top
of `editor/verification/`; older snapshots remain explicitly historical in the source
repository and are omitted from the portable release.
