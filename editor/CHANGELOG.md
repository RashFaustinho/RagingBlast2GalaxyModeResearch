# Galaxy Studio 1.0 — 18 October 2026

First GitHub release. The repository now includes the English research handbook,
evidence index, reproduction tools and a prominent disclosure of predominant AI
involvement. Earlier local preview ZIPs are retained outside the published source tree.

- Show **Secret routes — entire Battle Zone** only on the **Route** tab.
- Keep **Where this stage can lead** only in Route, removing the duplicate from Conditions & rewards.
- Include all features and fixes from the 0.10 preview; the native game limits are unchanged.

# Galaxy Studio 0.10 — 18 October 2026

- Added a prominent secret-route requirement on every Battle Zone tab, even when the preview is hidden. It explains the shared Normal/Ultimate Zone slot rule, persistent unlock behavior, ordinary route choices, no-trigger slots and unknown filenames.
- Named result queries 11–13 using native evidence: win with a Super, win with an Ultimate, or win while in Raging Soul. Route destinations remain editable; the native secret-unlock action cannot be changed in Studio. Stored +30 metadata is preserved with its research limits stated.
- Added direct read-only Mod support roster extraction from AFS, with language selection, conflict checks and explicit preview/apply.
- Readable advanced conditions now support multiple Galaxy characters, preserving custom expressions and automatically adding End: 0 on Apply.
- Clarified player-team Battle Modifier Items, MAIN cleared/available flags and the Tutorial/Practice arena selector 14. Enemy bonuses belong in preset Strength.
- Cleaned Overview, removed redundant cards and removed numbers from the form/fusion diagrams.
- Reviewed the editor: centralized loose/AFS roster selection, reused file downloads and file-to-tab navigation, removed an unreachable roster guard and strengthened lint checks. Fixed Battle Zone token help incorrectly using MAIN progression meanings.
- Updated the packaging gate for this release and its new browser suites. Previous release ZIPs remain unchanged. No game executable or savedata patch is included.

# Galaxy Studio 0.9 — 18 October 2026

- Added readable condition builders and per-token explanations, including native-character IDs, Query16 and automatic End0. Individual tokens remain in an advanced submenu.
- Battle Zone preview shows Handicap; reward conditions explain health percentages. Route cards distinguish ordinary and secret destinations, native per-zone checks and stored condition metadata.
- Corrected the erroneous all-arena13 Battle Zone note; original arenas vary and are read separately from automatic music. Unverified result-flag gameplay names are explicitly marked.

- Corrected music30/31 to Battle of Omega (Solo Guitar)/(Full), added sentinel56, distinguished Galaxy fallback from Tutorial random behavior, and explained stock Battle Zone automatic music with accurate live previews.
- Removed the region-specific sidebar label and documented user-confirmed NTSC-U/NTSC-J import/export compatibility, including v2.00.
- Renamed Tutorial help to **Tutorial messages**. Added six language previews and lossless editing of loose UTF-16LE tutorial TXT members, with undo/redo, workspace restore and AFS extraction/import.
- Added a bounded local **Session log**, JSON download, warning/error filters and a log copy in edited-file ZIP exports.
- Added separate live transformation/fusion portrait diamonds with left/top/right/bottom slot mapping and focus shortcuts.
- Added read-only roster/profile import from cs_main.dat and localized character-name files, with optional cs_form and Appearance inputs; missing names and unsupported layouts are explicit.
- Added 150-entry pagination to Reference Library and replaced the requested Overview wording and AFS list.
- Previous release ZIPs are unchanged. See docs/RELEASE_PREPARATION_EN.md and docs/MUSIC_SELECTORS_EN.md for usage and verification scope.

# Galaxy Studio 0.8

- Empty Galaxies now offer **Transfer Galaxy from another Character** and **Create New Galaxy**.
- Transfer reassigns one existing world-menu icon and the complete owner map, preserving mission/save indices. Literal selected-Galaxy conditions are adjusted with copy-on-write handling, including ordinary shared rosters. Opponent presets and character/form reward targets remain intact.
- Added portrait donor selection, nonmutating preview, undo/redo and explicit unsupported-case rejection. The first-mission workflow explains that it does not create an independent world icon.
- Reviewed the complete editor and consolidated four DOM element factories into `js/ui.js`; binary document classes remain usable without a browser.
- Removed unused helpers/state, ineffective file-kind inference and CSS for the retired header/hero cards. Formatted handwritten JS/CSS for maintenance; generated catalogs and extracted assets are unchanged.
- Fixed removal of availability OR-query rows (an undefined helper prevented removal); added exact-byte Undo regression coverage.
- Fixed AFS cancellation signaling and late cancellation checks. Cancel restores controls, produces no output and permits retry.
- Use the HTML version metadata for exported manifests; reduced repeated free-slot scans during mission rendering.
- Added repeatable ESLint/Prettier checks and stronger release verification: successful completion and complete current-source coverage are required. Older release ZIPs remain unchanged.

# Galaxy Studio 0.7

- Removed the full top header to give every editor more screen space. Quick guide remains in the sidebar. Overview now displays the original western title-screen logo, extracted from the game's texture data with transparency retained.
- The in-game preview scrolls normally at all desktop widths.
- Added red **Delete mission…** and **Move to another Galaxy…** controls in Galaxy → Battle, with shared-mission scope, source entry replacements, destination map/predecessor selection and undo/redo.
- Deleting from every Galaxy now frees the Mission ID. Guided creation and duplication reuse explicitly freed IDs before appending records, including at the stock 500-record boundary. Free IDs survive MMD export/reopen; other mission IDs never shift. Original zero/unassigned records are not implicitly reclaimed.
- Known incoming mission-state queries must be redirected before their ID can be freed. Source neighbors can optionally reconnect through the replacement. Removing only one shared membership keeps the mission ID active elsewhere.
- Moved missions keep fighters, equipment, coordinates and other shared memberships. Their destination gates can be reset and a predecessor clear-condition created. Native/form queries and conditional team perspectives are not silently rewritten.
- Added an English guide distinguishing empty owner editing, reusing an existing Galaxy icon and genuine additional Galaxies. Existing game saves may retain previous progress when an ID is reused.

# Galaxy Studio 0.6

- Fixed growing preset imports into AFS/STPK files with nonzero inter-member bytes: insert aligned space and preserve the entire original gap, including stale tails from earlier smaller imports.

- Removed the decorative stars from the Galaxy character rail; centered portraits horizontally and raised the crop to align eyes closer to the bar center.
- Replaced Record/Rank with live Arena/Music values in the mission nameplate, including numeric fallbacks for unknown IDs.
- Corrected the shared Battle Zone preview to read Arena at +0x1C and Music at +0x20.
- Overview extraction now offers only **Download Extracted Zip**; completed imports offer only **Download Patched AFS**.
- Added **Show Empty Galaxies**, off by default, with portraits for all native forms. The guided wizard can create an empty owner's first entry mission without a predecessor; separate native Galaxy selection limits remain explicit.
- Renamed the ZIP button **Export ALL edited files** and grouped its MMD/DAT contents into folders named after the original target AFS. The export manifest records each path and target archive.
- Added warnings for the original per-category circle pools, including the single Boss circle, plus a capacity table in Battle setup. Controller navigation guidance explains why branches should leave a clear direction.
- Fixed selection after undo/redo of an empty Galaxy's first mission. Previous release ZIPs remain unchanged.

# Galaxy Studio 0.5

- Added Overview **Export from game**: detect nested MMD/DAT files from local AFS archives, merge identical copies, preserve conflicting variants, export to an extracted folder or ZIP, and open the extracted files in Studio.
- Added **Import to game**: choose saved edits, review all matching copies, validate files and save compatibility, then rebuild a verified new AFS copy. Supports resized nested STPK/STPZ members, sector growth and repeated Battle Zone packs.
- Added the original-texture Galaxy character rail; moved mission search/jump into the workspace. All Missions stays last.
- Added live mission and rule-caption previews with original game textures, conditional-team resolution, difficulty and numeric captions. No fictional saved-game records.
- Preserved valid donor Challenge Stamp criteria when creating a Battle Zone fight; reject empty donors before mutating the document.
- Original executable/save-capacity warnings remain active. No game executable or savedata is changed by these workflows.

#0.4

- Resolve conditional mission rosters from the selected Galaxy;491 supports all six hero/Hatchiyack perspectives without changing data.
- Readable query summaries, explicit unresolved states, and a name-based Galaxy inclusion/exclusion editor; advanced expressions remain available.
- Battle Zone preset navigation and creation use the matching Normal/Ultimate container.
- Correct original ZONE X=2 validation; check the actual saved-cell calculation, retain imported fractional/nonstandard positions with accurate warnings, and fix wizard/drag bounds. General format notes are Information.
- Separate Tutorial expansion warnings from Galaxy and Battle Zone storage. Add the user’s independent character/Galaxy-unlock verification.

# Galaxy Studio0.3

- Added Overview → Mod support with native character/form CSV and validated JSON profiles, local move CSV imports, raw cs_form.dat group lookup and embedded PNG portraits.
- Added profile export and workspace persistence; old workspaces remain supported. Catalog overlays do not edit loaded MMD/DAT bytes.
- Removed stale vanilla move/portrait/native-slot assumptions for declared replacement characters. New Appearance rows use explicit or loaded matching defaults and report missing defaults without partial edits.
- Added warnings for the original381-item effect loop and384-bit equipment bitmap, including larger modded item tables.
- Traced the original Galaxy mission modifier bitmap through the player-team merge at0x12C83C; documented the absence of an MMD per-item enemy target.
- Continued separate save/RAM expansion research. The editor still uses original executable limits for warnings; mod profiles cannot silently disable them.

# Galaxy Studio 0.2

- Added the complete supported-file list to Overview, including global item definitions, all Tutorial help tables and extensionless Battle Zone preset containers.
- Added a visual mission wizard using a basic working donor, named Galaxy portraits, clickable preceding missions, stage/music/difficulty choices and an explicit unlock gate.
- Added save-compatibility confirmations beyond the original mission count, stronger warnings beyond the verified 500-record Galaxy save capacity, and export checks for imported/raw risk states.
- Replaced the main Galaxy dropdown with original-game portraits and names; All Missions comes last.
- Added Teams shortcuts for editing or creating the candidate's preset and returning to the mission.
- Reorganized preset containers into character cards with Preset & transformations, Appearance & moves, and Strength & equipment tabs. Missing dependencies can be loaded directly from their tab.
- Added new preset/Appearance/Strength creation, independent shared-row copies, draft presets with missing links, and atomic creation/linking for a new shared row.
- Added named reward types/targets, live unlock-source lookup, explanations of mission gates versus saved Galaxy/form availability, and documented native limitations.
- Explained rule descriptions, actual mission modifiers and UI item icons, including a verified original mission496 example and an explicit icon synchronization action.
- Corrected Battle Zone +0x10 to displayed LV and guided new/dragged coordinates to its saved 3×7 grid.

The released 0.1 ZIP is preserved unchanged. New research explains limitations in its older labels and unrestricted authoring controls. No executable patch is included or required by the editor.
