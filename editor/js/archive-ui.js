/* Archive workflows: select local files, inspect contents, save verified new copies. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {});
  const el = (...a) => R.ui.el(...a),
    button = (text, fn, cls = "secondary") =>
      el("button", { type: "button", class: cls, onclick: fn }, text);
  const note = (t) => el("p", { class: "muted" }, t),
    A = () => R.Archives;
  const jsonBytes = (o) => new TextEncoder().encode(JSON.stringify(o, null, 2) + "\n");
  async function sha(bytes) {
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  }
  function picker(label, accept, multiple = false) {
    const input = el("input", { type: "file", accept, multiple, "aria-label": label });
    return el("label", { class: "field" }, el("span", { class: "field-label" }, label), input);
  }
  function check(label) {
    const input = el("input", { type: "checkbox" });
    return { input, element: el("label", { class: "check-field" }, input, label) };
  }
  function validate(name, bytes) {
    if (
      /\.mmd$/i.test(name) &&
      String.fromCharCode(...bytes.subarray(0, 4)) !== (/^zone_/i.test(name) ? "ZONE" : "MAIN")
    )
      throw Error(name + ": wrong MMD type for this archive filename.");
    if (bytes.length > 16 * 1024 * 1024) throw Error(name + ": exceeds the 16 MiB editing limit.");
    const kind = R.gameFileKind(name, bytes);
    if (!kind) throw Error("Unknown file layout: " + name);
    const d = R.makeGameDocument(bytes, kind);
    d.validate?.();
    return d;
  }
  function session(app, title) {
    if (!app.ensureApplied()) return null;
    const body = app.dialog(title),
      error = el("p", { class: "warning", role: "alert", hidden: true }),
      status = el("p", { class: "archive-status", role: "status" }, "Choose files to begin."),
      progress = el("progress", { max: 1, value: 0 }),
      results = el("div", { class: "archive-results" });
    let busy = false,
      stop = false;
    const cancel = button("Cancel operation", () => {
      stop = true;
      cancel.disabled = true;
    });
    cancel.hidden = true;
    const update = (p) => {
      progress.max = p.total || 1;
      progress.value = p.current;
      status.textContent = `${p.current} / ${p.total} archive entries · ${p.found ?? "rebuilding"}${p.found !== undefined ? " supported copies found" : ""}`;
    };
    async function run(fn) {
      if (busy) return;
      busy = true;
      R.sessionLog?.record("archive.operation.started", {
        workflow: title,
        files: [...body.querySelectorAll("input[type=file]")].flatMap((n) =>
          [...n.files].map((f) => ({ name: f.name, bytes: f.size })),
        ),
      });
      stop = false;
      const controls = [...body.querySelectorAll("input,select,button")]
        .filter((n) => n !== cancel)
        .map((n) => [n, n.disabled]);
      controls.forEach(([n]) => (n.disabled = true));
      error.hidden = true;
      progress.value = 0;
      cancel.hidden = false;
      cancel.disabled = false;
      body.classList.add("archive-busy");
      const blockClose = (e) => e.preventDefault();
      document.getElementById("app-dialog").addEventListener("cancel", blockClose);
      try {
        await fn({ onProgress: update, cancelled: () => stop });
        // Hashing/manifests can yield after the archive engine has returned.
        if (stop) throw new DOMException("Operation cancelled.", "AbortError");
        R.sessionLog?.record("archive.operation.completed", {
          workflow: title,
          status: status.textContent,
        });
      } catch (e) {
        R.sessionLog?.record(
          e.name === "AbortError" ? "archive.operation.cancelled" : "archive.operation.failed",
          { workflow: title, error: e },
          e.name === "AbortError" ? "info" : "error",
        );
        if (e.name === "AbortError") {
          results.replaceChildren();
          status.textContent = "Operation cancelled. Original AFS unchanged.";
        } else {
          error.textContent = e.message;
          error.hidden = false;
          status.textContent = "Operation could not finish. Original AFS unchanged.";
        }
      } finally {
        controls.forEach(([n, disabled]) => (n.disabled = disabled));
        busy = false;
        cancel.hidden = true;
        body.classList.remove("archive-busy");
        document.getElementById("app-dialog").removeEventListener("cancel", blockClose);
      }
    }
    return {
      body,
      error,
      status,
      progress,
      results,
      cancel,
      run,
      get busy() {
        return busy;
      },
    };
  }
  function warnings(box, scans) {
    const rows = scans.flatMap((s) =>
      s.warnings.map((w) => `${s.directory.file.name}, entry ${w.index}: ${w.message}`),
    );
    if (rows.length)
      box.append(
        el(
          "details",
          {},
          el(
            "summary",
            {},
            `${rows.length} unsupported archive entries skipped — review before using the output`,
          ),
          ...rows.map((t) => note(t)),
        ),
      );
  }
  R.openExtractFromGame = function (app) {
    const s = session(app, "Export from game");
    if (!s) return;
    const afs = picker("Source AFS archives", ".afs", true),
      full = check("Scan every entry (mods with relocated files; slower)"),
      scan = button(
        "Find editable files",
        () =>
          s.run(async (opts) => {
            const sources = [...afs.querySelector("input").files];
            if (!sources.length)
              throw Error("Choose the progress, boot and/or battle_others AFS archives.");
            s.results.replaceChildren();
            const scans = [];
            for (const source of sources) {
              s.status.textContent = "Scanning " + source.name;
              scans.push(await A().scan(source, { ...opts, full: full.input.checked }));
            }
            const byName = new Map();
            for (const sc of scans)
              for (const f of sc.found) {
                const key = f.name.toLowerCase();
                if (!byName.has(key)) byName.set(key, []);
                byName.get(key).push({ ...f, source: sc.directory.file.name });
              }
            if (!byName.size)
              throw Error(
                "No supported MMD/DAT/tutorial TXT files found. Try a full scan or the other AFS.",
              );
            const entries = [],
              manifest = {
                version: 1,
                tool: "Galaxy Studio " + R.VERSION,
                scanModes: scans.map((sc) => ({
                  archive: sc.directory.file.name,
                  mode: sc.scanMode,
                  skipped: sc.warnings,
                })),
                files: [],
              };
            let conflicts = 0;
            for (const copies of byName.values()) {
              const variants = [];
              for (const copy of copies) {
                let v = variants.find((v) => A().equal(v.bytes, copy.bytes));
                if (!v) {
                  v = { name: copy.name, bytes: copy.bytes, locations: [] };
                  variants.push(v);
                }
                v.locations.push({ archive: copy.source, entry: copy.index, path: copy.path });
              }
              if (variants.length > 1) conflicts++;
              for (let i = 0; i < variants.length; i++) {
                const v = variants[i],
                  path =
                    variants.length === 1
                      ? v.name
                      : `variants/${v.locations[0].entry}-${i + 1}/${v.name}`;
                validate(v.name, v.bytes);
                entries.push({ name: path, bytes: v.bytes });
                manifest.files.push({
                  file: path,
                  sha256: await sha(v.bytes),
                  locations: v.locations,
                });
              }
            }
            entries.push({ name: "extraction-manifest.json", bytes: jsonBytes(manifest) });
            s.status.textContent = `Found ${byName.size} distinct filenames in ${scans.length} AFS archive(s).`;
            s.results.append(
              el("h3", {}, "Ready to extract"),
              note(
                "Matching copies are collected once. " +
                  (conflicts
                    ? `${conflicts} filenames have different contents: each variant is kept separately and must be reviewed separately.`
                    : "All repeated copies agree."),
              ),
              el(
                "ul",
                { class: "archive-file-list" },
                ...entries
                  .filter((e) => e.name !== "extraction-manifest.json")
                  .map((e) =>
                    el(
                      "li",
                      {},
                      el("code", {}, e.name),
                      el("span", {}, (e.bytes.length / 1024).toFixed(1) + " KiB"),
                    ),
                  ),
              ),
            );
            s.results.append(
              button(
                "Download Extracted Zip",
                () =>
                  R.downloadFile(
                    "Galaxy-Studio-extracted.zip",
                    R.zip(entries.map((e) => ({ name: "extracted/" + e.name, bytes: e.bytes }))),
                  ),
                "primary",
              ),
            );
            warnings(s.results, scans);
          }),
        "primary",
      );
    for (const input of [afs.querySelector("input"), full.input])
      input.addEventListener("change", () => {
        if (!s.busy) {
          s.results.replaceChildren();
          s.error.hidden = true;
          s.status.textContent = "Selection changed. Find editable files again.";
        }
      });
    s.body.append(
      note(
        "Choose the progress AFS for missions, boot AFS for presets/items, and battle_others AFS for tutorial messages. Internal archive names are detected from content; an AFL list is not needed.",
      ),
      afs,
      full.element,
      scan,
      s.progress,
      s.status,
      s.cancel,
      s.error,
      s.results,
      note(
        "Download the ZIP, unpack its extracted folder into Galaxy Studio, then use Open MMD / DAT files to load the files you want to edit.",
      ),
    );
  };
  R.openImportToGame = function (app) {
    const s = session(app, "Import to game");
    if (!s) return;
    const afs = picker("Target AFS archive", ".afs"),
      files = picker("Saved edited MMD / DAT / TXT files", "", true),
      full = check("Scan every entry (mods with relocated files; slower)"),
      review = button(
        "Review import",
        () =>
          s.run(async (opts) => {
            s.results.replaceChildren();
            const target = afs.querySelector("input").files[0],
              sources = [...files.querySelector("input").files];
            if (!target || !sources.length)
              throw Error("Choose one AFS and at least one saved edited file.");
            const replacements = [];
            for (const f of sources) {
              if (!A().supported(f.name)) throw Error("Unsupported game filename: " + f.name);
              if (f.size > 16 * 1024 * 1024)
                throw Error(f.name + ": exceeds the 16 MiB editing limit.");
              const bytes = new Uint8Array(await f.arrayBuffer()),
                doc = validate(f.name, bytes);
              replacements.push({
                name: f.name,
                bytes,
                sha256: await sha(bytes),
                risks: R.Authoring.saveRisks(
                  {
                    name: f.name,
                    kind:
                      doc.magic === "MAIN"
                        ? "main"
                        : doc.magic === "ZONE"
                          ? "zone"
                          : R.gameFileKind(f.name, bytes),
                    doc,
                  },
                  app.data,
                ),
              });
            }
            const names = new Set();
            for (const r of replacements) {
              if (names.has(r.name.toLowerCase()))
                throw Error("Choose only one revision of " + r.name);
              names.add(r.name.toLowerCase());
            }
            const found = await A().scan(target, {
              ...opts,
              full: full.input.checked,
              collect: false,
            });
            for (const r of replacements)
              if (!found.found.some((f) => f.name.toLowerCase() === r.name.toLowerCase()))
                throw Error(r.name + " is not present in " + target.name + ". Use the other AFS.");
            s.status.textContent = "Review the files and all matching archive copies below.";
            s.results.append(
              el("h3", {}, "Import plan"),
              el(
                "ul",
                { class: "archive-file-list" },
                ...replacements.map((r) =>
                  el(
                    "li",
                    {},
                    el("code", {}, r.name),
                    el(
                      "span",
                      {},
                      found.found.filter((f) => f.name.toLowerCase() === r.name.toLowerCase())
                        .length + " matching copies",
                    ),
                  ),
                ),
              ),
              note(
                "All matching copies will be updated, including repeated Battle Zone parameter packs. Other files and unknown data are preserved. The source AFS is read only; the result is a new copy.",
              ),
            );
            warnings(s.results, [found]);
            const risks = replacements.flatMap((r) => r.risks || []);
            if (risks.length)
              s.results.append(
                el(
                  "div",
                  { class: "archive-notice" },
                  el("strong", {}, "Game save compatibility"),
                  ...risks.map((r) => note(r.message)),
                ),
              );
            s.results.append(
              button(
                "Build patched AFS",
                () =>
                  s.run(async (opts) => {
                    if (
                      risks.length &&
                      !g.confirm(
                        "Game save compatibility notice\n\n" +
                          risks.map((r) => r.message).join("\n\n") +
                          "\n\nBuild this research-only AFS copy anyway?",
                      )
                    )
                      return;
                    const result = await A().rebuild(found, replacements, opts);
                    s.results.replaceChildren(
                      el("h3", {}, "Patched copy verified"),
                      note(
                        `${result.files.length} file(s), ${result.matchedCopies} matching copies, ${result.changedEntries.length} changed AFS entries. Download the result below.`,
                      ),
                    );
                    s.status.textContent = "Ready. Original AFS unchanged.";
                    s.results.append(
                      button(
                        "Download Patched AFS",
                        () =>
                          R.downloadFile(
                            target.name.replace(/\.afs$/i, "") + ".modded.afs",
                            result.blob,
                          ),
                        "primary",
                      ),
                      note(
                        "With the game closed, keep a backup and replace the game’s AFS with this copy using the original filename. For preset edits, import every changed shared DAT into the boot AFS as well.",
                      ),
                    );
                  }),
                "primary",
              ),
            );
          }),
        "primary",
      );
    for (const input of [afs.querySelector("input"), files.querySelector("input"), full.input])
      input.addEventListener("change", () => {
        if (!s.busy) {
          s.results.replaceChildren();
          s.error.hidden = true;
          s.status.textContent = "Selection changed. Review import again.";
        }
      });
    s.body.append(
      el(
        "p",
        { class: "archive-notice" },
        "Save your changes first with Export current file or Export ALL edited files, then select the exported MMD/DAT/TXT files below. Unsaved workspace edits are not imported automatically.",
      ),
      afs,
      files,
      full.element,
      review,
      s.progress,
      s.status,
      s.cancel,
      s.error,
      s.results,
    );
  };
  R.renderArchiveBridge = function (app) {
    return el(
      "section",
      { class: "panel archive-bridge" },
      el(
        "div",
        {},
        el("h2", {}, "Extract / Import quickly from / to AFS"),
        note("Main AFS to check:"),
        el(
          "ul",
          {},
          el("li", {}, el("code", {}, "st_pack_progress_pt_ps3.afs")),
          el("li", {}, el("code", {}, "st_pack_boot_pt_ps3.afs")),
          el(
            "li",
            {},
            "OPTIONAL: ",
            el("code", {}, "st_pack_battle_others_pt_ps3.afs"),
            " (Tutorial Messages)",
          ),
        ),
      ),
      el(
        "div",
        { class: "archive-bridge-actions" },
        button("↓ Export from game", () => R.openExtractFromGame(app), "primary"),
        button("↑ Import to game", () => R.openImportToGame(app), "secondary"),
      ),
      el(
        "small",
        { class: "muted" },
        "Local processing · AFS / PAK / ZPAK handled automatically · Original AFS files preserved",
      ),
    );
  };
})(window);
