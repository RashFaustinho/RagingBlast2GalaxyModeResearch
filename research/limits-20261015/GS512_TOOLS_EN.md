> **Historical report.** Read the [audited current findings](../SAVE_RAM_AND_EXPANSION.md) first.
> Pending statuses, fixture counts and some early interpretations below were
> superseded. GS512 missed later-discovered readers; D2 Zone cell21 ultimately
> failed its minimal control. This report does not establish a safe maximum.

# GS512 research tools — European BLES00978

These tools reproduce a **research save-capacity experiment**. They do not install a finished general-purpose Galaxy expansion. Studio0.4 is distributed separately and keeps original-engine warnings. Read GS512_RUNTIME_EN.md and its JSON before using the patch.

## Inputs and compatibility

- Exact original decrypted EBOOT.elf SHA256 `8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892`. Encrypted EBOOT.BIN and executables modified by other roster mods are rejected.
- Decrypted RPCS3 SYS-DATA from this game: original55000bytes, valid internal checksum. The converter does not decrypt/sign saves.
- Python3 (stdlib only for conversion and patch application; capstone is needed only when separately running the static-disassembly CLI).
- A disposable RPCS3 profile and complete save backup. Use the experiment on copies; keep patched/unpatched save formats separated.

## Reproduce the exact delta

From the package root, Windows command prompt examples:

```console
py tools\apply_gs512_elf.py C:\Research\EBOOT.elf --output C:\Research\EBOOT-GS512.elf
py tools\galaxy_save_extension.py inspect C:\Research\SYS-DATA
py tools\galaxy_save_extension.py expand C:\Research\SYS-DATA --output C:\Research\SYS-DATA-GS512
```

The first tool validates the original hash, all97 old instruction words, and the final patched hash. It creates a new file only. The expanded save is71336bytes and has a rebuilt checksum. The tool likewise refuses an existing output filename. It does not replace the active RPCS3 save for you.

The runtime experiment booted the patched ELF directly from a copied game’s PS3_GAME/USRDIR so RPCS3 retained its title paths. Its original EBOOT.BIN was left intact. The proposed RPCS3 YAML delta is included as evidence, but **YAML deployment/enabling itself was not tested**. No BIN encryptor or automatic installer is included.

The original engine expects55000byte saves; this patched layout expects71336. Do not exchange those active formats without conversion. When returning to the original executable, downgrade the latest expanded save into another file:

```console
py tools\galaxy_save_extension.py downgrade C:\Research\SYS-DATA-GS512 --output C:\Research\SYS-DATA-original-format
```

Downgrade preserves current first500 mission rows, Galaxy aggregates/globals and other current save fields; progress for500–511 is discarded. It does not resurrect an overwritten unrelated save or repair an invalid checksum.

## Mission authoring

Existing Galaxy MMD/preset editing stays data-driven. The experiment appends new roots within an **existing** Galaxy owner. GS512 permits512 total saved roots in its relocated block; the unchanged launch bitmap is also512bits. Do not create root512 (the513th record) with this design. Original498 roots plus14 additions is the capacity ceiling of this prototype, not the ultimate limit of a redesigned game engine.

The original66 selection icons,100-owner lookup and fixed Battle Zone/Tutorial systems are unchanged. A higher native roster ID or additional ZONE file still needs its own engine support. Large mod catalogs in Studio do not apply GS512 or any native patch.

No game archives, decrypted ELF, personal save or extracted MMD/DAT fixtures are included in this tools package. No native Windows execution test is claimed. The Python functions and binary patch reproduction were tested in the cloud environment; the editor’s Windows portable launch uses a browser.
