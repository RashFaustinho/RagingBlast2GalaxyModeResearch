# Tutorial save and RAM constraints

Original BLES00978 decrypted ELF SHA256 `8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892`. Static follow-up; no additional Tutorial completion/cold-save test is claimed.

Original tutorial.mmd has9 roots. Tutorial result/progress uses a separate block at SYS-DATA+0xBFC8, not Galaxy’s+0x8148. Result writer0xFE00C..0xFE050 calculates `save+0xBFC8+mission*28` and ORs completion bit1. Action-marking writer0xFCCF0..0xFCD5C uses the same stride and sets bits `taskIndex+12`. Runtime initialization0x1CE0A8..0x1CE17C copies per-task flags through a loop of20. Bits12..31 fill the first word; more than20 tasks can spill or wrap the mask rather than creating an extended detector array. The separate native action array is also20 tasks.

Three independent scans use9 records: menu/launch availability0x1CF24C, completion/achievement0x309C8C, and full-completion helper0x319680.0x31AD70 passes save+0xBFC8 to initializer0x3190A8, which clears0x140bytes. The next separately initialized section begins+0xC108.

A0x140-byte block is not proof of11 spare mission records: nine rows occupy252bytes and the meaning of every trailing byte has not been traced. Do not advertise Tutorial roots9/10 as safe. At root11, record+12 reaches+0xC108, already the next save section. The unchecked result writer can touch that area if an additional root is selected; this address calculation is static, not a corruption experiment.

The MAIN graph parser’s count-driven allocations do not extend any of these saved arrays. The launch configuration’s512-bit mission snapshot is another limit for paths using that shared structure, but is not an established safe Tutorial capacity. The GS512 prototype relocates Galaxy only and leaves Tutorial bytes0xBFC8..0xC107 unchanged. No Tutorial patch is included.

Supported practical authoring remains edits to the original9 Tutorial missions, with at most20 action tasks per mission. Additional Tutorial roots are explicitly research-only and trigger creation/export warnings in Studio0.4. Resolving additional Tutorial capacity requires tracing its menu/progress consumers and all trailing fields, followed by isolated runtime save and cold-reload tests.
