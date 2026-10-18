/* Home-page setup for mod-specific names and local move catalogs. */
(function (g) {
  "use strict";
  const R = g.RB2,
    el = (t, a, ...c) => R.ui.el(t, a, ...c),
    button = (s, f, cls = "secondary") =>
      el("button", { type: "button", class: cls, onclick: f }, s),
    note = (s) => el("p", { class: "muted" }, s);
  function pick(app, accept, fn) {
    const input = el("input", { type: "file", accept, "aria-label": "Mod support file" });
    input.addEventListener(
      "change",
      async () => {
        try {
          const f = input.files[0];
          if (!f) return;
          if (f.size > 8 * 1024 * 1024) throw Error("Mod catalog file exceeds 8 MiB.");
          if (!app.ensureApplied()) return;
          await fn(f);
        } catch (e) {
          app.notify(e.message, "error");
        }
      },
      { once: true },
    );
    input.click();
  }
  function download(name, value) {
    R.downloadFile(name, JSON.stringify(value, null, 2), "application/json");
  }
  function readGameRoster(app, fromArchives = false) {
    if (!app.ensureApplied()) return;
    const body = app.dialog(
      fromArchives ? "Read mod roster from AFS" : "Read roster from game files",
    );
    const input = el("input", {
      type: "file",
      multiple: true,
      accept: fromArchives ? ".afs" : ".dat,.txt",
      "aria-label": fromArchives ? "Roster AFS archives" : "Roster game files",
    });
    const language = el(
      "select",
      { "aria-label": "Roster language" },
      ...["US", "IT", "FR", "DE", "SP", "JP"].map((value) => el("option", { value }, value)),
    );
    const status = el("p", { role: "status", "aria-live": "polite", class: "muted" });
    const preview = el("div");
    const fullScan = el("input", {
      type: "checkbox",
      "aria-label": "Scan every roster archive entry",
    });
    const read = button(
      fromArchives ? "Extract and read roster" : "Read selected files",
      async () => {
        read.disabled = input.disabled = language.disabled = fullScan.disabled = true;
        preview.replaceChildren();
        try {
          const sources = [...input.files];
          R.sessionLog?.record("roster.read.started", {
            source: fromArchives ? "AFS" : "Loose files",
            files: sources.map((f) => ({ name: f.name, bytes: f.size })),
            language: fromArchives ? language.value : undefined,
          });
          const result = fromArchives
            ? await R.GameRoster.fromArchives(sources, {
                language: language.value,
                full: fullScan.checked,
                cancelled: () => !input.isConnected || !document.getElementById("app-dialog").open,
                onProgress: (p) => {
                  status.textContent =
                    p.archive +
                    " · " +
                    p.current +
                    " / " +
                    p.total +
                    " entries · " +
                    p.found +
                    " roster files";
                },
              })
            : await (async () => {
                if (
                  !sources.length ||
                  sources.length > 1000 ||
                  sources.reduce((n, f) => n + f.size, 0) > 16 * 1024 * 1024
                )
                  throw Error(
                    "Choose the extracted roster files (maximum 1000 files / 16 MiB total).",
                  );
                const files = [];
                for (const f of sources)
                  files.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
                return R.GameRoster.fromFiles(files);
              })();
          if (!input.isConnected || !document.getElementById("app-dialog").open) return;
          status.textContent =
            result.profile.characters.length +
            " native forms · " +
            result.namedTexts +
            " name texts (" +
            result.language +
            ") · " +
            result.moveDefaults +
            " forms with move defaults · " +
            result.missingNames.length +
            " forms with incomplete names";
          R.sessionLog?.record("roster.read", {
            characters: result.profile.characters.length,
            language: result.language,
            missingNames: result.missingNames,
            archiveWarnings: result.warnings,
            source: fromArchives ? "AFS" : "Loose files",
          });
          if (result.warnings?.length)
            preview.append(
              note(
                result.warnings.length +
                  " archive entries could not be read. Review the session log; this roster may be incomplete.",
              ),
            );
          preview.append(
            note("Preview — no workspace or game files have changed."),
            el(
              "div",
              { class: "session-log-list" },
              ...result.profile.characters.map((c) => el("div", {}, c.id + " · " + c.name)),
            ),
            note(
              "Applying replaces the current mod profile. Portraits, move names and native transformation behavior are not assumed from the original roster; you can add them to the exported profile.",
            ),
            button(
              "Use this roster",
              () => {
                if (
                  app.modProfile &&
                  !window.confirm(
                    "Replace the current mod profile with this game-file roster? Export the existing profile first to keep custom names, portraits and move catalogs.",
                  )
                )
                  return;
                if (!app.ensureApplied()) return;
                app.setModProfile(result.profile, true);
                document.getElementById("app-dialog").close();
                app.notify(
                  "Roster imported from game files. " +
                    result.missingNames.length +
                    " forms have incomplete names.",
                  result.missingNames.length ? "warning" : "success",
                );
              },
              "primary",
            ),
          );
        } catch (e) {
          status.textContent = e.message;
          R.sessionLog?.record(
            "roster.read.failed",
            { error: e, source: fromArchives ? "AFS" : "Loose files" },
            e.name === "AbortError" ? "info" : "error",
          );
          if (e.name !== "AbortError" && input.isConnected) app.notify(e.message, "error");
        } finally {
          read.disabled = input.disabled = language.disabled = fullScan.disabled = false;
        }
      },
      "primary",
    );
    input.onchange =
      language.onchange =
      fullScan.onchange =
        () => {
          preview.replaceChildren();
          status.textContent = "Selection changed. Read the files again.";
        };
    body.append(
      note(
        fromArchives
          ? "Select the mod’s st_pack_progress_pt_ps3.afs and st_pack_boot_pt_ps3.afs together. Galaxy Studio scans nested packs for cs_main.dat, optional cs_form.dat / Appearance rows and character-name texts in the language below. Original archives are read only; preview the extracted roster before applying it."
          : "Extract the mod’s cs_main.dat and CharacterName_###_XX.txt members from K_CharacterName_XX.pak using your archive tool (choose ONE language). Optional: cs_form.dat for groups and preset_appearance_table.dat for existing local move selectors. Select all these loose DAT/TXT files together below.",
      ),
      note(
        "cs_main.dat supplies native IDs and text bindings; localized name files supply the actual mod names. Missing translations are shown explicitly. This reader supports the researched raw 80-byte cs_main layout; a mod using a different layout needs a matching parser.",
      ),
      input,
      ...(fromArchives
        ? [
            el("label", { class: "field" }, "Name language", language),
            el(
              "label",
              { class: "checkbox-label" },
              fullScan,
              " Scan every entry (mods with relocated files; slower)",
            ),
          ]
        : []),
      read,
      status,
      preview,
    );
  }
  R.renderModSupport = function (app) {
    const p = app.modProfile,
      box = el("section", { class: "panel mod-support-panel", "aria-label": "Mod support" }),
      check = el("input", {
        type: "checkbox",
        checked: app.modEnabled,
        "aria-label": "Enable mod support",
      });
    check.addEventListener("change", () => {
      if (!app.ensureApplied()) {
        check.checked = app.modEnabled;
        return;
      }
      app.setModProfile(p, check.checked);
    });
    box.append(
      el(
        "div",
        { class: "toolbar" },
        el("h2", {}, "Mod support"),
        el("label", { class: "mod-switch" }, check, " Use mod-specific catalogs"),
      ),
      note(
        "Load the native character/form IDs used by your mod. Names, move selectors and native transformation slots can differ from the original game. These catalogs guide editing; the mod itself must already support the extra assets and IDs.",
      ),
    );
    if (!app.modEnabled) {
      box.append(
        note(
          "Original game catalogs are active. Enabling this mode does not modify any loaded game file.",
        ),
      );
      return box;
    }
    box.append(
      el(
        "ol",
        { class: "mod-steps" },
        el(
          "li",
          {},
          "Extract the roster directly from the mod’s AFS archives, read loose game files, or load the mod author’s character list (CSV) / a Galaxy Studio mod profile (JSON). Use native IDs, not character-select group or preset IDs.",
        ),
        el(
          "li",
          {},
          "Recommended: open the mod’s Appearance, Strength and preset DATs using Open files. Existing Appearance rows provide valid starting move selectors.",
        ),
        el(
          "li",
          {},
          "Optional: add a local move CSV, cs_form.dat for character-select groups, or named stages/music/items and native slot definitions in the JSON profile.",
        ),
      ),
    );
    const actions = el("div", { class: "toolbar" });
    actions.append(
      button("Read mod roster from AFS…", () => readGameRoster(app, true), "primary"),
      button("Read roster from game files…", () => readGameRoster(app), "primary"),
      button(
        "Load character list / mod profile…",
        () =>
          pick(app, ".json,.csv", async (f) => {
            const text = await f.text(),
              profile = /\.csv$/i.test(f.name)
                ? R.ModSupport.characterCSV(text, f.name.replace(/\.csv$/i, ""))
                : R.ModSupport.validate(JSON.parse(text));
            app.setModProfile(profile, true);
            app.notify("Mod catalog loaded: " + profile.name + ". Game-file bytes are unchanged.");
          }),
        "primary",
      ),
      button("Download profile template", () =>
        download("Galaxy-Studio-Mod-Template.json", R.ModSupport.template),
      ),
    );
    if (p)
      actions.append(
        button("Add local move CSV…", () =>
          pick(app, ".csv", async (f) => {
            const incoming = R.ModSupport.moveCSV(await f.text()),
              map = new Map(p.moves.map((x) => [x.native + ":" + x.id, x]));
            for (const x of incoming) map.set(x.native + ":" + x.id, x);
            app.setModProfile({ ...p, moves: [...map.values()] }, true);
            app.notify("Local move catalog updated.");
          }),
        ),
        button("Load cs_form.dat…", () =>
          pick(app, ".dat", async (f) => {
            const groups = R.ModSupport.characterGroups(new Uint8Array(await f.arrayBuffer())),
              characters = p.characters.map((c) => {
                const group = groups.find((x) => x.forms.includes(c.id));
                return group ? { ...c, group: group.id } : c;
              });
            app.setModProfile(
              {
                ...p,
                characters,
                enhancedCharacters: groups.map((x) => ({ id: x.id, native: x.native })),
              },
              true,
            );
            app.notify("Character-select groups loaded; game data was not edited.");
          }),
        ),
        button("Export mod profile", () => download("Galaxy-Studio-Mod-Profile.json", p)),
      );
    box.append(actions);
    if (!p)
      box.append(
        el(
          "p",
          { class: "warning" },
          "Character list required. Read it from game files or load CSV/JSON. Until then, names still come from the original game. Do not assume that they describe a modified ID.",
        ),
      );
    else {
      box.append(
        el("h3", {}, p.name),
        note(
          p.characters.length +
            " supplied character/form names · " +
            p.moves.length +
            " named local moves · " +
            p.transformations.length +
            " native slot definitions · " +
            p.enhancedCharacters.length +
            " character-select groups. Unlisted IDs retain the original reference catalog.",
        ),
      );
      const unresolved = new Set();
      for (const f of app.files.filter((f) => f.kind === "appearance"))
        for (let i = 0; i < f.doc.count; i++) {
          const id = f.doc.row(i)[0];
          if (!app.data.characters.some((c) => c.id === id)) unresolved.add(id);
        }
      if (unresolved.size)
        box.append(
          el(
            "p",
            { class: "warning" },
            "Loaded Appearance tables contain unnamed native IDs: " +
              [...unresolved]
                .sort((a, b) => a - b)
                .slice(0, 40)
                .join(", ") +
              ". Add these to the mod profile.",
          ),
        );
      const list = el("div", { class: "mod-roster-preview" });
      for (const c of p.characters.slice(0, 20)) {
        const src = app.portrait(c.id);
        list.append(
          el(
            "div",
            { class: "mod-roster-entry" },
            src
              ? el("img", { src, alt: "", width: 40, height: 40 })
              : el("span", { class: "portrait-placeholder" }, "?"),
            el("span", {}, el("strong", {}, c.name), el("small", {}, "Native " + c.id)),
          ),
        );
      }
      box.append(list);
    }
    box.append(
      el(
        "details",
        {},
        el("summary", {}, "CSV formats, defaults and limits"),
        el(
          "p",
          {},
          "Character CSV header: id,name,super_up,super_right,super_down,super_left,ultimate. The five move columns are optional as a complete set. Example IDs in the template must be replaced with the real mod IDs.",
        ),
        el(
          "p",
          {},
          "Move CSV header: native,id,name. The move ID is local to that native form. Quoted names containing commas are supported.",
        ),
        el(
          "p",
          {},
          "A character entry replaces its original move names, slot hints and portrait unless the profile explicitly keeps them. Unknown defaults are taken from a loaded matching Appearance row when creating a preset; otherwise creation asks you to provide them.",
        ),
        el(
          "p",
          { class: "warning" },
          "Mod support does not enlarge save tables, the native owner lookup, item bitmaps or other executable arrays. Mission, Galaxy and Battle Zone save warnings remain active. The original item-effect loop covers IDs0–380, with a384-bit bitmap: ID384+ can overwrite adjacent RAM unless the engine is patched. The original 100-native roster includes a sentinel ID100 in some engine tables; a mod must patch its own engine limits.",
        ),
        el(
          "p",
          {},
          "Profiles are included in saved workspaces and can be exported separately. No account, network access or AFS/PAK input is required. See docs/MOD_SUPPORT_EN.md.",
        ),
      ),
    );
    return box;
  };
})(globalThis);
