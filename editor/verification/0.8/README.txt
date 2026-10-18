Galaxy Studio 0.8 verification

109 Node tests passed, zero failures and zero skips.
Ten current browser reports bind every shipped production source: baseline, help,
guided authoring, mod support, conditions, archives/preview, refinements, mission
management, Galaxy transfer and review regressions. Static lint and formatting pass.
Three Python release-gate tests verify failed/incomplete/stale-source rejection.
See TESTING.md and CODE_REVIEW_EN.md for coverage and limitations.

New browser checks cover shared DOM helpers, consecutive renamed DAT layout dialogs,
availability OR-query removal with byte-exact Undo, actual AFS cancellation and retry.
Existing checks exercise mission deletion/free-ID reuse/moving, preset editing,
conditional perspectives, mod profiles, live previews, downloads and workspace restore.
The archive workflow checks actual ZIP extraction and a rebuilt progress AFS with an
independent decoder. No private game data, AFS files or workspaces are bundled.

Older subdirectories retain historical evidence and are not the current release gates.
Tests use Linux Chromium. Native Windows double-click launch and a new RPCS3 gameplay
run are not claimed for this cleanup. The separately documented original-EBOOT Galaxy
transfer test validates an existing-icon replacement, not independent Galaxy expansion.
