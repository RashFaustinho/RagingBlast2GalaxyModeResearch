/* Galaxy Studio: offline shell. Local file processing; no network calls. */
(function () {
  "use strict";
  const RB2 = (window.RB2 = window.RB2 || {});
  const $ = (id) => document.getElementById(id);
  const el = RB2.ui.el;
  const button = (text, fn, cls = "secondary") =>
    el("button", { class: cls, type: "button", onclick: fn }, text);
  const equal = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const dv = (b) => new DataView(b.buffer, b.byteOffset, b.byteLength);
  const hex = (n) => "0x" + n.toString(16).toUpperCase();
  const fileBytes = (f) => f.doc.encode();
  function cleanName(name) {
    return (
      String(name)
        .split(/[\\/]/)
        .pop()
        .replace(/[<>:"|?*\x00-\x1F]/g, "_") || "data.dat"
    );
  }
  function base64(b) {
    let s = "";
    for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode(...b.subarray(i, i + 32768));
    return btoa(s);
  }
  function unbase64(s) {
    if (typeof s !== "string" || s.length > 24000000) throw Error("Invalid workspace data.");
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  }
  function makeDoc(bytes, kind) {
    if (kind === "tutorialText") return new RB2.LocalizedTextDocument(bytes);
    if (kind === "help") return new RB2.HelpDocument(bytes);
    if (kind === "main" || kind === "zone") {
      const doc = new RB2.MmdDocument(bytes);
      if (doc.magic !== (kind === "main" ? "MAIN" : "ZONE"))
        throw Error("MMD type does not match its magic.");
      return doc;
    }
    return new RB2.DatDocument(bytes, kind);
  }
  function inferKind(name, b) {
    const magic = String.fromCharCode(...b.subarray(0, 4));
    if (magic === "MAIN") return "main";
    if (magic === "ZONE") return "zone";
    const n = name.toLowerCase();
    if (RB2.LocalizedText.identify(name)) return "tutorialText";
    if (/^tutorial_message_table_\d+(?:\.dat)?$/.test(n)) return "help";
    if (n.includes("preset_appearance")) return "appearance";
    if (n.includes("preset_strength")) return "strength";
    if (n.includes("preset_character")) return "preset";
    if (/^item_parameter(?:\.|$)/.test(n)) return "item";
    if (/\.(?:afs|pak|zpak|zip|exe|elf|bin)$/i.test(name))
      throw Error(
        "Open individual MMD/DAT files here. For AFS archives use Overview → Export from game.",
      );
    return null;
  }
  const TYPE_NAMES = {
    main: "Galaxy / Tutorial MMD",
    zone: "Battle Zone MMD",
    appearance: "Appearance DAT",
    strength: "Strength DAT",
    preset: "Character preset DAT",
    item: "Item parameter DAT",
    help: "Tutorial message order DAT",
    tutorialText: "Localized tutorial TXT",
  };
  const tabForKind = (kind) =>
    ({ main: "galaxy", zone: "zone", help: "help", tutorialText: "help" })[kind] || "presets";
  function download(name, bytes, type = "application/octet-stream") {
    const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type }),
      url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: cleanName(name) });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function crc32(b) {
    let c = 0xffffffff;
    for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zip(entries) {
    const enc = new TextEncoder(),
      chunks = [],
      central = [];
    let offset = 0,
      centralSize = 0;
    for (const e of entries) {
      const name = enc.encode(e.name),
        b = e.bytes,
        crc = crc32(b),
        local = new Uint8Array(30 + name.length),
        l = dv(local);
      l.setUint32(0, 0x04034b50, true);
      l.setUint16(4, 20, true);
      l.setUint16(6, 0x800, true);
      l.setUint16(12, 33, true);
      l.setUint32(14, crc, true);
      l.setUint32(18, b.length, true);
      l.setUint32(22, b.length, true);
      l.setUint16(26, name.length, true);
      local.set(name, 30);
      chunks.push(local, b);
      const c = new Uint8Array(46 + name.length),
        v = dv(c);
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 20, true);
      v.setUint16(8, 0x800, true);
      v.setUint16(14, 33, true);
      v.setUint32(16, crc, true);
      v.setUint32(20, b.length, true);
      v.setUint32(24, b.length, true);
      v.setUint16(28, name.length, true);
      v.setUint32(42, offset, true);
      c.set(name, 46);
      central.push(c);
      centralSize += c.length;
      offset += local.length + b.length;
    }
    const end = new Uint8Array(22),
      v = dv(end);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, entries.length, true);
    v.setUint16(10, entries.length, true);
    v.setUint32(12, centralSize, true);
    v.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, end], { type: "application/zip" });
  }
  RB2.zip = zip;
  RB2.downloadFile = download;
  RB2.gameFileKind = inferKind;
  RB2.makeGameDocument = makeDoc;
  class App {
    constructor() {
      this.files = [];
      this.data = RB2.DATA || {};
      this.modProfile = null;
      this.modEnabled = false;
      this.modSavedState = JSON.stringify([false, null]);
      this.ui = {};
      this.tab = "home";
      this.selectedFileId = null;
      this.history = [];
      this.future = [];
      this.nextId = 1;
      this.pendingForm = null;
    }
    setModProfile(profile, enabled) {
      const checked = profile == null ? null : RB2.ModSupport.validate(profile);
      const effective = enabled && checked ? RB2.ModSupport.overlay(RB2.DATA, checked) : RB2.DATA;
      this.modProfile = checked;
      this.modEnabled = !!enabled;
      this.data = effective;
      if (this.ui.reference) this.ui.reference.page = 0;
      RB2.sessionLog.record("catalog.changed", {
        enabled: this.modEnabled,
        name: checked?.name,
        characters: checked?.characters.length,
      });
      this.refresh();
    }
    modState() {
      return JSON.stringify([this.modEnabled, this.modProfile]);
    }
    notify(message, type = "success") {
      RB2.sessionLog.record(
        "notification",
        { message, context: this.logContext() },
        type === "error" ? "error" : type === "warning" ? "warning" : "info",
      );
      const t = el(
        "div",
        { class: "toast " + type, role: type === "error" ? "alert" : "status" },
        message,
      );
      $("toast-region").append(t);
      while ($("toast-region").children.length > 3) $("toast-region").firstElementChild.remove();
      t.title = "Click to dismiss";
      t.addEventListener("click", () => t.remove());
      $("status-text").textContent = message;
      setTimeout(() => t.remove(), type === "error" ? 8000 : 4500);
    }
    ensureApplied() {
      if (this._applying) return true;
      this._applying = true;
      try {
        if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))
          document.activeElement.blur();
        if (!this.pendingForm) return true;
        return this.pendingForm.apply() !== false;
      } catch (e) {
        this.notify(e.message, "error");
        return false;
      } finally {
        this._applying = false;
      }
    }
    selectFile(id) {
      if (!this.ensureApplied()) return false;
      const f = this.files.find((x) => x.id === id);
      if (!f) return false;
      this.selectedFileId = id;
      if (!["main", "zone", "help", "tutorialText"].includes(f.kind)) {
        this.ui.presets = this.ui.presets || {};
        if (this.ui.presets.fileId !== id) {
          this.ui.presets.fileId = id;
          this.ui.presets.index = 0;
          this.ui.presets.search = "";
          this.ui.presets.page = 0;
        }
      }
      this.tab = tabForKind(f.kind);
      this.refresh();
      window.scrollTo(0, 0);
      return true;
    }
    setTab(tab) {
      if (!this.ensureApplied()) return;
      this.tab = tab;
      RB2.sessionLog.record("navigation", { tab });
      this.refresh();
      window.scrollTo(0, 0);
    }
    characterName(id) {
      return this.data.characters?.find((x) => x.id === id)?.name || "Character " + id;
    }
    itemName(id) {
      return (id >>> 0) & 0x80000000
        ? "Empty"
        : this.data.items?.find((x) => x.id === id)?.name || "Item " + hex(id);
    }
    portrait(id) {
      return this.data.characters?.find((x) => x.id === id)?.portrait || "";
    }
    presetLabel(index, table) {
      table =
        table ||
        this.files.find((x) => x.kind === "preset" && /galaxy/i.test(x.name)) ||
        this.files.find((x) => x.kind === "preset");
      const appearance =
        this.files.find(
          (x) => x.kind === "appearance" && x.id === this.ui.presets?.appearanceFileId,
        ) || this.files.find((x) => x.kind === "appearance");
      if (!table || index >= table.doc.count) return "#" + index + " · preset";
      const p = table.doc.row(index);
      if (!appearance || p[0] >= appearance.doc.count) return "#" + index + " · appearance " + p[0];
      return "#" + index + " · " + this.characterName(appearance.doc.row(p[0])[0]);
    }
    transact(label, files, fn) {
      files = [...new Set(files)];
      const before = files.map((f) => ({ file: f, bytes: fileBytes(f) }));
      let value;
      try {
        value = fn();
        files.forEach((f) => makeDoc(fileBytes(f), f.kind));
      } catch (e) {
        RB2.sessionLog.record("edit.rolledBack", { label, error: e }, "error");
        before.forEach((s) => {
          s.file.doc = makeDoc(s.bytes, s.file.kind);
        });
        throw e;
      }
      const after = files.map((f) => ({ file: f, bytes: fileBytes(f) }));
      if (before.some((s, i) => !equal(s.bytes, after[i].bytes))) {
        this.history.push({ label, before, after });
        if (this.history.length > 40) this.history.shift();
        this.future = [];
        RB2.sessionLog.record("edit.applied", {
          label,
          context: this.logContext(),
          files: before.map((s, i) => ({
            name: s.file.name,
            kind: s.file.kind,
            beforeBytes: s.bytes.length,
            afterBytes: after[i].bytes.length,
            firstChangedOffset: s.bytes.findIndex((v, n) => v !== after[i].bytes[n]),
          })),
        });
      }
      this.pendingForm = null;
      this.refresh();
      $("status-text").textContent = label;
      return value;
    }
    undo() {
      if (!this.ensureApplied()) return;
      const h = this.history.pop();
      if (!h) return;
      h.before.forEach((s) => (s.file.doc = makeDoc(s.bytes, s.file.kind)));
      this.future.push(h);
      RB2.sessionLog.record("edit.undone", { label: h.label });
      this.refresh();
      this.notify("Undid: " + h.label);
    }
    redo() {
      if (!this.ensureApplied()) return;
      const h = this.future.pop();
      if (!h) return;
      h.after.forEach((s) => (s.file.doc = makeDoc(s.bytes, s.file.kind)));
      this.history.push(h);
      RB2.sessionLog.record("edit.redone", { label: h.label });
      this.refresh();
      this.notify("Redid: " + h.label);
    }
    refresh() {
      if (
        this.tab === "help" &&
        !this.files.some(
          (f) => f.id === this.selectedFileId && ["help", "tutorialText"].includes(f.kind),
        )
      )
        this.selectedFileId =
          (
            this.files.find(
              (f) =>
                f.id === this.ui.helpTables?.fileId && ["help", "tutorialText"].includes(f.kind),
            ) || this.files.find((f) => ["help", "tutorialText"].includes(f.kind))
          )?.id || this.selectedFileId;
      const mode = this.tab === "galaxy" ? "main" : this.tab === "zone" ? "zone" : null;
      if (mode && !this.files.some((f) => f.id === this.selectedFileId && f.kind === mode)) {
        const section = this.ui.mmd?.[this.tab];
        this.selectedFileId =
          (
            this.files.find((f) => f.id === section?.file && f.kind === mode) ||
            this.files.find((f) => f.kind === mode)
          )?.id || this.selectedFileId;
      }
      if (
        this.tab === "presets" &&
        !this.files.some(
          (f) =>
            f.id === this.selectedFileId &&
            !["main", "zone", "help", "tutorialText"].includes(f.kind),
        )
      ) {
        this.selectedFileId =
          (
            this.files.find((f) => f.id === this.ui.presets?.fileId) ||
            this.files.find((f) => !["main", "zone", "help", "tutorialText"].includes(f.kind))
          )?.id || this.selectedFileId;
      }
      for (const f of this.files) f.dirty = !equal(f.original, fileBytes(f));
      $("file-count").textContent = this.files.length;
      const dirty = this.files.filter((f) => f.dirty);
      $("change-count").textContent = this.files.length
        ? dirty.length + " modified · " + this.files.length + " files"
        : "No files loaded";
      $("undo").disabled = !this.history.length;
      $("redo").disabled = !this.future.length;
      $("export-all").disabled = !dirty.length;
      $("export-current").disabled = !this.files.some((f) => f.id === this.selectedFileId);
      document.querySelectorAll(".nav-tab").forEach((b) => {
        b.classList.toggle("active", b.dataset.tab === this.tab);
        b.setAttribute("aria-current", b.dataset.tab === this.tab ? "page" : "false");
      });
      const activeExport = this.currentExportFile();
      $("export-current").textContent =
        this.tab === "presets" && ["appearance", "strength"].includes(activeExport?.kind)
          ? "Export " + TYPE_NAMES[activeExport.kind]
          : "Export current file";
      $("export-current").title = activeExport?.name || "Export selected file";
      this.renderFiles();
      const c = $("content");
      c.replaceChildren();
      try {
        if (this.tab === "galaxy") RB2.renderMmd(c, this, "main");
        else if (this.tab === "zone") RB2.renderMmd(c, this, "zone");
        else if (this.tab === "presets") RB2.renderPresets(c, this);
        else if (this.tab === "help") RB2.renderHelpTables(c, this);
        else if (this.tab === "reference") this.renderReference(c);
        else this.renderHome(c);
      } catch (e) {
        c.append(
          el(
            "div",
            { class: "error-box" },
            el("h2", {}, "This panel could not read the selected data"),
            el("p", {}, e.message),
            el(
              "p",
              {},
              "Your file bytes are still in the workspace. Check the file type and its references.",
            ),
          ),
        );
        RB2.sessionLog.record("panel.error", { tab: this.tab, error: e }, "error");
        console.error(e);
      }
      document.title = (dirty.length ? "● " : "") + "RB2 Galaxy Studio";
    }
    renderFiles() {
      const list = $("file-list");
      list.replaceChildren();
      if (!this.files.length) {
        list.append(
          el(
            "p",
            { class: "empty-sidebar" },
            "Drop extracted MMD and DAT files anywhere to begin.",
          ),
        );
        return;
      }
      for (const f of this.files) {
        const b = button(
          "",
          () => this.selectFile(f.id),
          "file-button" + (f.id === this.selectedFileId ? " active" : ""),
        );
        b.title = f.name;
        b.append(
          el(
            "span",
            {
              class: "file-type" + (["main", "zone"].includes(f.kind) ? "" : " dat"),
            },
            ["main", "zone"].includes(f.kind) ? "MMD" : f.kind === "tutorialText" ? "TXT" : "DAT",
          ),
          el(
            "span",
            {},
            el("span", { class: "file-label" }, f.name),
            el(
              "span",
              { class: "file-detail" },
              (f.doc.rootCount ?? f.doc.count) +
                " records · " +
                (f.original.length / 1024).toFixed(1) +
                " KB",
            ),
          ),
          f.dirty ? el("span", { class: "dirty-dot", title: "Modified" }, "●") : "",
        );
        list.append(b);
      }
    }
    async openFiles(fileList) {
      if (!this.ensureApplied()) return;
      let opened = 0;
      for (const source of fileList) {
        try {
          if (source.size > 16 * 1024 * 1024)
            throw Error(
              "This file is too large for the researched MMD/DAT formats (16 MiB limit).",
            );
          const b = new Uint8Array(await source.arrayBuffer());
          let kind = inferKind(source.name, b);
          if (!kind) {
            kind = await this.chooseKind(source.name);
            if (!kind) continue;
          }
          const doc = makeDoc(b, kind);
          const name = cleanName(source.name);
          if (this.files.some((f) => f.name.toLowerCase() === name.toLowerCase()))
            throw Error(
              "A file with this name is already open. Close the workspace or rename the other revision before importing it.",
            );
          const f = {
            id: "file-" + this.nextId++,
            name,
            kind,
            doc,
            original: b.slice(),
            exported: b.slice(),
            dirty: false,
          };
          this.files.push(f);
          RB2.sessionLog.record("file.opened", {
            name: f.name,
            kind,
            bytes: b.length,
            records: doc.rootCount ?? doc.count,
          });
          this.selectedFileId = f.id;
          opened++;
        } catch (e) {
          RB2.sessionLog.record(
            "file.openFailed",
            { name: cleanName(source.name), error: e },
            "error",
          );
          this.notify(source.name + ": " + e.message, "error");
        }
      }
      // Importing another dependency does not invalidate earlier edit snapshots.
      if (opened) {
        const last = this.files.find((f) => f.id === this.selectedFileId);
        this.tab = tabForKind(last.kind);
        this.notify(
          "Opened " +
            opened +
            " file" +
            (opened === 1 ? "" : "s") +
            ". Original files remain untouched.",
        );
      }
      this.refresh();
    }
    openPreset(table, index) {
      if (!this.ensureApplied()) return;
      if (!table || !Number.isInteger(index) || index < 0 || index >= table.doc.count) {
        this.notify("That preset is not present in the loaded container.", "error");
        return;
      }
      const state = (this.ui.presets = this.ui.presets || {});
      Object.assign(state, {
        fileId: table.id,
        index,
        search: "",
        page: Math.floor(index / 80),
        characterTab: "links",
      });
      this.selectedFileId = table.id;
      this.tab = "presets";
      this.refresh();
      window.scrollTo(0, 0);
    }
    loadDependency(kind, after) {
      const input = el("input", { type: "file", accept: ".dat,.tab" });
      input.addEventListener(
        "change",
        async () => {
          const source = input.files[0];
          if (!source) return;
          try {
            const bytes = new Uint8Array(await source.arrayBuffer());
            new RB2.DatDocument(bytes, kind);
            const previous = this.selectedFileId,
              tab = this.tab;
            await this.openFiles([source]);
            const loaded = this.files.find(
              (f) => f.name === cleanName(source.name) && f.kind === kind,
            );
            if (!loaded) throw Error("Choose the matching preset_" + kind + "_table.dat file.");
            this.ui.presets = this.ui.presets || {};
            this.ui.presets[kind + "FileId"] = loaded.id;
            this.selectedFileId = previous;
            this.tab = tab;
            if (after) after(loaded);
            this.refresh();
          } catch (e) {
            this.notify(e.message, "error");
          }
        },
        { once: true },
      );
      input.click();
    }
    chooseKind(name) {
      return new Promise((resolve) => {
        const body = this.dialog("Choose the DAT layout");
        body.append(
          el(
            "p",
            {},
            "The name and size do not identify this file unambiguously: ",
            el("strong", {}, name),
          ),
        );
        const s = el("select", { "aria-label": "DAT layout" });
        for (const k of ["appearance", "strength", "preset", "item", "help"])
          s.append(el("option", { value: k }, TYPE_NAMES[k]));
        body.append(
          s,
          el(
            "p",
            { class: "muted" },
            "Only the researched layouts are supported. An incompatible size will be rejected.",
          ),
        );
        const finish = (v) => {
          resolve(v);
          this.closeDialog();
        };
        body.append(
          el(
            "div",
            { class: "actions" },
            button("Open with this layout", () => finish(s.value), "primary"),
            button("Cancel", () => finish(null)),
          ),
        );
        $("app-dialog").addEventListener("close", () => resolve(null), {
          once: true,
        });
      });
    }
    dialog(title) {
      const d = $("app-dialog");
      if (d.open) d.close();
      const body = $("dialog-body");
      body.replaceChildren(
        el(
          "div",
          { class: "dialog-title" },
          el("h2", {}, title),
          button("✕", () => this.closeDialog(), "quiet"),
        ),
      );
      d.showModal();
      return body;
    }
    closeDialog() {
      $("app-dialog").close();
    }
    validateFiles(files = this.files) {
      const issues = [];
      const add = (file, type, message) => issues.push({ file: file.name, type, message });
      const appearance =
          this.files.find(
            (f) => f.kind === "appearance" && f.id === this.ui.presets?.appearanceFileId,
          ) || this.files.find((f) => f.kind === "appearance"),
        strength =
          this.files.find(
            (f) => f.kind === "strength" && f.id === this.ui.presets?.strengthFileId,
          ) || this.files.find((f) => f.kind === "strength"),
        items = this.files.find((f) => f.kind === "item");
      for (const f of files) {
        try {
          makeDoc(fileBytes(f), f.kind);
        } catch (e) {
          add(f, "error", e.message);
          continue;
        }
        if (f.kind === "main" || f.kind === "zone") {
          const d = f.doc;
          for (const risk of RB2.Authoring.saveRisks(f, this.data)) add(f, "warning", risk.message);
          const selectedPresetId =
            this.ui.mmd?.[f.kind === "main" ? "galaxy" : "zone"]?.files?.[f.id]?.presetFile;
          const pattern =
            f.kind === "zone"
              ? /ultimate|_spe/i.test(f.name)
                ? /battle_zone_(?:spe|ult)/i
                : /battle_zone_nor/i
              : /tutorial/i.test(f.name)
                ? /preset_character_tutorial/i
                : /preset_character_galaxy/i;
          const presetTable =
            this.files.find((x) => x.kind === "preset" && x.id === selectedPresetId) ||
            this.files.find((x) => x.kind === "preset" && pattern.test(x.name));
          if (f.kind === "main") {
            try {
              for (const issue of d.validateGraph())
                add(f, "error", typeof issue === "string" ? issue : JSON.stringify(issue));
            } catch (e) {
              add(f, "error", e.message);
            }
          }
          const schema = RB2.Mmd.schemas[d.magic];
          for (let i = 0; i < d.rootCount; i++) {
            const r = d.readRoot(i);
            for (const s of schema.filter((s) => s.type === "ref")) {
              const ref = RB2.Mmd.readField(r, s);
              if (ref >= d.descriptors.length)
                add(
                  f,
                  "error",
                  "Mission " + i + ": " + s.name + " points outside the descriptor table.",
                );
            }
            if (f.kind === "main") {
              try {
                const actions = d.getActions(i);
                if (actions.length > 20)
                  add(f, "error", "Mission " + i + ": more than 20 actions.");
                for (const side of ["allies", "enemies"]) {
                  const roster = d.getRoster(i, side);
                  if (!roster || roster.special || roster.tag !== 0) continue;
                  const candidates = roster.candidates || roster.entries || [];
                  for (const candidate of candidates) {
                    if (presetTable && candidate.preset >= presetTable.doc.count)
                      add(
                        f,
                        "error",
                        "Mission " +
                          i +
                          ": " +
                          side +
                          " preset " +
                          candidate.preset +
                          " does not exist in " +
                          presetTable.name +
                          ".",
                      );
                  }
                  const cap = side === "allies" ? 4 : 5;
                  const always = candidates.filter(
                    (x) => !(x.condition ?? x.conditionRef ?? 0),
                  ).length;
                  if (always > cap)
                    add(
                      f,
                      "error",
                      "Mission " +
                        i +
                        ": " +
                        always +
                        " unconditional " +
                        side +
                        " exceed the active team capacity of " +
                        cap +
                        ".",
                    );
                }
              } catch (e) {
                add(f, "error", "Mission " + i + ": " + e.message);
              }
            } else {
              const enemy = dv(r).getUint32(0x0c, false);
              if (presetTable && enemy >= presetTable.doc.count)
                add(
                  f,
                  "error",
                  "Zone node " +
                    i +
                    ": enemy preset " +
                    enemy +
                    " does not exist in " +
                    presetTable.name +
                    ".",
                );
              try {
                const next = d.getList(i, 0x34, 4),
                  v = dv(next);
                for (let p = 0; p < next.length; p += 4) {
                  const n = v.getUint32(p, false);
                  if (n >= d.rootCount)
                    add(
                      f,
                      "error",
                      "Zone node " + i + ": next-node index " + n + " is out of bounds.",
                    );
                }
              } catch (e) {
                add(f, "error", "Zone node " + i + ": " + e.message);
              }
            }
          }
          if (!presetTable)
            add(
              f,
              "warning",
              "The matching preset DAT is not loaded: participant references cannot be checked. Load or select its preset table.",
            );
          if (f.kind === "zone")
            add(
              f,
              "info",
              "Battle Zone progress uses mode, zone slot and coordinates. +0x10 is displayed LV. This is format information, not a file error.",
            );
        } else if (f.kind === "preset") {
          if (!appearance || !strength)
            add(f, "warning", "Load appearance and strength tables to validate shared references.");
          for (let i = 0; i < f.doc.count; i++) {
            const r = f.doc.row(i);
            if (appearance && r[0] >= appearance.doc.count)
              add(f, "error", "Preset " + i + ": appearance " + r[0] + " does not exist.");
            if (strength && r[1] >= strength.doc.count)
              add(f, "error", "Preset " + i + ": strength " + r[1] + " does not exist.");
            for (let w = 3; w < 11; w++)
              if (!(r[w] & 0x80000000) && r[w] >= f.doc.count)
                add(
                  f,
                  "error",
                  "Preset " +
                    i +
                    ": form/fusion link " +
                    r[w] +
                    " does not exist in this namespace.",
                );
          }
        } else if (f.kind === "strength") {
          for (let i = 0; i < f.doc.count; i++) {
            const r = f.doc.row(i);
            for (let w = 2; w < 22; w++) {
              const v = r[w];
              if (!(v & 0x80000000) && v >= 381)
                add(
                  f,
                  "warning",
                  "Strength " +
                    i +
                    ", slot " +
                    (w - 2) +
                    ": item " +
                    v +
                    (v >= 384
                      ? " exceeds the original 384-bit equipment bitmap and can overwrite adjacent RAM. Extra DAT rows alone do not fix this."
                      : " is outside the original fixed 381-item effect loop. A compatible engine mod is required."),
                );
              if (!(v & 0x80000000) && v >= (items?.doc.count ?? this.data.items?.length ?? 381))
                add(
                  f,
                  "warning",
                  "Strength " +
                    i +
                    ", slot " +
                    (w - 2) +
                    ": item " +
                    v +
                    " is outside the loaded/reference catalog.",
                );
            }
          }
        }
        if (f.kind === "help") {
          for (let i = 0; i < f.doc.count; i++)
            if (!RB2.HELP_TEXTS.some((t) => t.id === f.doc.row(i)))
              add(
                f,
                "warning",
                "Help entry " + i + " uses an ID outside the original English text catalog.",
              );
        }
        if (!issues.some((x) => x.file === f.name))
          add(f, "success", "Structure and available references passed.");
      }
      return issues;
    }
    showValidation() {
      if (!this.ensureApplied()) return;
      const body = this.dialog("File checks");
      if (!this.files.length) {
        body.append(el("p", {}, "Open MMD or DAT files first."));
        return;
      }
      const issues = this.validateFiles();
      const errors = issues.filter((x) => x.type === "error").length;
      RB2.sessionLog.record("validation", { errors, issues });
      body.append(
        el(
          "p",
          { class: errors ? "warning" : "success" },
          errors ? errors + " structural error(s) found." : "No structural errors found.",
        ),
        el(
          "p",
          { class: "muted" },
          "These checks verify file structures and loaded references. They do not simulate the game or prove that a new rule combination will work.",
        ),
      );
      const warnings = issues.filter((x) => x.type === "warning").length;
      body.append(
        el(
          "p",
          { class: "muted" },
          `${warnings} warning(s); informational notes do not indicate invalid files.`,
        ),
      );
      for (const x of issues.slice(0, 250))
        body.append(
          el(
            "div",
            { class: "validation-item " + x.type },
            el(
              "strong",
              {},
              (x.type === "info"
                ? "Information · "
                : x.type === "warning"
                  ? "Warning · "
                  : "Error · ") +
                x.file +
                ": ",
            ),
            x.message,
          ),
        );
      if (issues.length > 250)
        body.append(el("p", { class: "muted" }, "Showing the first 250 findings."));
    }
    currentExportFile() {
      const selected = this.files.find((f) => f.id === this.selectedFileId),
        state = this.ui.presets || {};
      if (
        this.tab === "presets" &&
        selected?.kind === "preset" &&
        ["appearance", "strength"].includes(state.characterTab)
      ) {
        const kind = state.characterTab;
        return (
          this.files.find((f) => f.kind === kind && f.id === state[kind + "FileId"]) ||
          this.files.find((f) => f.kind === kind) ||
          selected
        );
      }
      return selected;
    }
    async exportFiles(all) {
      if (!this.ensureApplied()) return;
      const files = all
        ? this.files.filter((f) => f.dirty)
        : [this.currentExportFile()].filter(Boolean);
      if (!files.length) {
        this.notify("There are no files to export.", "warning");
        return;
      }
      const issues = this.validateFiles(files),
        errors = issues.filter((x) => x.type === "error");
      if (errors.length) {
        this.showValidation();
        this.notify("Resolve structural errors before exporting.", "error");
        return;
      }
      const risks = files.flatMap((f) =>
        ["main", "zone"].includes(f.kind)
          ? RB2.Authoring.saveRisks(f, this.data).map((r) => f.name + ": " + r.message)
          : [],
      );
      if (
        risks.length &&
        !window.confirm(
          "Game save compatibility notice\n\n" +
            risks.join("\n\n") +
            "\n\nExport these research files anyway? Keep a backup before using them in the game.",
        )
      )
        return;
      const snapshots = files.map((f) => ({ file: f, bytes: fileBytes(f) }));
      RB2.sessionLog.record("files.exported", {
        all,
        files: snapshots.map((s) => ({ name: s.file.name, bytes: s.bytes.length })),
      });
      if (!all) {
        download(files[0].name, snapshots[0].bytes);
      } else {
        const report = {
          editor: "RB2 Galaxy Studio",
          version: RB2.VERSION + ".0",
          createdUTC: new Date().toISOString(),
          baseline: "BLES00978 PS3 research",
          files: snapshots.map((s) => ({
            name: s.file.name,
            path: RB2.Archives.exportPath(s.file.name),
            targetAFS: RB2.Archives.targetAfs(s.file.name),
            kind: s.file.kind,
            bytes: s.bytes.length,
            originalBytes: s.file.original.length,
            originalCRC32: hex(crc32(s.file.original)),
            crc32: hex(crc32(s.bytes)),
          })),
          checks: issues,
          notes: [
            "Editable files are grouped by their original AFS archive. These folders are not rebuilt AFS files.",
            "For mods with relocated files, verify the target archive with Overview → Import to game.",
            "Original source files were not overwritten.",
            "Runtime behavior of arbitrary edits is not certified.",
          ],
        };
        const entries = snapshots.map((s) => ({
          name: RB2.Archives.exportPath(s.file.name),
          bytes: s.bytes,
        }));
        entries.push({
          name: "Galaxy-Studio-session-log.json",
          bytes: new TextEncoder().encode(JSON.stringify(this.logReport(), null, 2)),
        });
        entries.push({
          name: "Galaxy-Studio-export.json",
          bytes: new TextEncoder().encode(JSON.stringify(report, null, 2)),
        });
        download(
          "Galaxy-Studio-edits-" + new Date().toISOString().replace(/[:.]/g, "-") + ".zip",
          zip(entries),
        );
      }
      snapshots.forEach((s) => (s.file.exported = s.bytes.slice()));
      this.notify(
        "Exported " +
          files.length +
          " file" +
          (files.length === 1 ? "" : "s") +
          ". Repack these individual files with your usual tools.",
      );
    }
    saveProject() {
      if (!this.ensureApplied()) return;
      const project = {
        format: "RB2-Galaxy-Studio",
        version: 1,
        modSupport: { enabled: this.modEnabled, profile: this.modProfile },
        createdUTC: new Date().toISOString(),
        files: this.files.map((f) => ({
          name: f.name,
          kind: f.kind,
          original: base64(f.original),
          current: base64(fileBytes(f)),
        })),
      };
      RB2.sessionLog.record("workspace.saved", {
        files: this.files.length,
        modEnabled: this.modEnabled,
      });
      download("Galaxy-Studio-workspace.rb2project", JSON.stringify(project), "application/json");
      for (const f of this.files) f.exported = fileBytes(f);
      this.modSavedState = this.modState();
      this.notify(
        "Workspace downloaded. It includes original and edited copies of your loaded files.",
      );
    }
    async loadProject(file) {
      try {
        if (!file) return;
        if (file.size > 64 * 1024 * 1024) throw Error("Workspace exceeds the 64 MiB limit.");
        const p = JSON.parse(await file.text());
        if (
          p.format !== "RB2-Galaxy-Studio" ||
          p.version !== 1 ||
          !Array.isArray(p.files) ||
          p.files.length > 1000
        )
          throw Error("Unsupported workspace format.");
        if (
          p.modSupport &&
          (typeof p.modSupport.enabled !== "boolean" ||
            (p.modSupport.profile != null && typeof p.modSupport.profile !== "object"))
        )
          throw Error("Invalid workspace mod-support settings.");
        const modProfile =
          p.modSupport?.profile == null ? null : RB2.ModSupport.validate(p.modSupport.profile);
        const modEnabled = p.modSupport?.enabled || false;
        const effectiveData =
          modEnabled && modProfile ? RB2.ModSupport.overlay(RB2.DATA, modProfile) : RB2.DATA;
        const used = new Set(),
          loaded = [];
        let total = 0;
        for (const f of p.files) {
          const name = cleanName(f.name),
            key = name.toLowerCase();
          if (used.has(key)) throw Error("Duplicate file name in workspace.");
          used.add(key);
          const original = unbase64(f.original),
            current = unbase64(f.current);
          total += original.length + current.length;
          if (total > 48 * 1024 * 1024) throw Error("Workspace data exceeds the size limit.");
          if (f.kind === "tutorialText" && !RB2.LocalizedText.identify(name))
            throw Error("Invalid localized tutorial filename.");
          makeDoc(original, f.kind);
          const doc = makeDoc(current, f.kind);
          loaded.push({
            id: "file-" + this.nextId++,
            name,
            kind: f.kind,
            original,
            doc,
            exported: current.slice(),
            dirty: !equal(original, current),
          });
        }
        if (
          this.unsaved() &&
          !window.confirm(
            "Replace this workspace? Export or save your current edits first if you want to keep them.",
          )
        )
          return;
        this.files = loaded;
        this.modProfile = modProfile;
        this.modEnabled = modEnabled;
        this.data = effectiveData;
        this.modSavedState = this.modState();
        this.pendingForm = null;
        this.history = [];
        this.future = [];
        this.selectedFileId = this.files[0]?.id || null;
        this.tab = "home";
        this.refresh();
        RB2.sessionLog.record("workspace.restored", {
          files: this.files.length,
          modEnabled: this.modEnabled,
        });
        this.notify("Workspace restored.");
      } catch (e) {
        this.notify("Could not open workspace: " + e.message, "error");
      }
    }
    unsaved() {
      return (
        this.modState() !== this.modSavedState ||
        !!this.pendingForm ||
        this.files.some((f) => !equal(fileBytes(f), f.exported || f.original))
      );
    }
    closeAll() {
      if (
        this.unsaved() &&
        !window.confirm(
          "Close this workspace and discard changes that have not been exported or saved?",
        )
      )
        return;
      RB2.sessionLog.record("workspace.closed", { files: this.files.length });
      this.files = [];
      this.modProfile = null;
      this.modEnabled = false;
      this.data = RB2.DATA;
      this.modSavedState = this.modState();
      this.pendingForm = null;
      this.history = [];
      this.future = [];
      this.ui = {};
      this.selectedFileId = null;
      this.tab = "home";
      this.refresh();
    }
    logContext() {
      const mode = this.tab === "galaxy" ? "galaxy" : this.tab === "zone" ? "zone" : null;
      const selection = mode ? this.ui.mmd?.[mode]?.files?.[this.selectedFileId] : null;
      return {
        tab: this.tab,
        selectedFile: this.files.find((f) => f.id === this.selectedFileId)?.name,
        mission: selection?.node,
        owner: selection?.owner,
        preset: this.tab === "presets" ? this.ui.presets?.index : undefined,
      };
    }
    logReport() {
      return RB2.sessionLog.report({
        ...this.logContext(),
        modEnabled: this.modEnabled,
        modName: this.modProfile?.name,
        fileCount: this.files.length,
        files: this.files.map((f) => ({
          name: f.name,
          kind: f.kind,
          modified: f.dirty,
          records: f.doc.rootCount ?? f.doc.count,
          originalBytes: f.original.length,
        })),
      });
    }
    showSessionLog() {
      const body = this.dialog("Session log");
      const report = this.logReport();
      const filter = el(
        "select",
        { "aria-label": "Log level" },
        ...["All events", "Warnings and errors", "Errors only"].map((n, i) =>
          el("option", { value: i }, n),
        ),
      );
      const list = el("pre", { class: "session-log-list", tabindex: "0" });
      const paint = () => {
        list.textContent =
          report.events
            .filter(
              (e) =>
                filter.value === "0" ||
                (filter.value === "1" ? e.level !== "info" : e.level === "error"),
            )
            .map(
              (e) =>
                e.utc +
                " · " +
                e.level.toUpperCase() +
                " · " +
                e.event +
                "\n" +
                JSON.stringify(e.details),
            )
            .join("\n\n") || "No matching events.";
      };
      filter.onchange = paint;
      body.append(
        el(
          "p",
          { class: "muted" },
          "Local diagnostics for this browser session. Nothing is uploaded. Logs include filenames, actions, sizes and errors; no game file contents. Download before closing this page. Export ALL edited files also includes a log copy.",
        ),
        el(
          "p",
          {},
          report.events.length +
            " events retained · " +
            report.droppedEvents +
            " older events omitted",
        ),
        filter,
        button(
          "Download session log",
          () =>
            download(
              "Galaxy-Studio-session-log.json",
              JSON.stringify(this.logReport(), null, 2),
              "application/json",
            ),
          "primary",
        ),
        list,
      );
      paint();
    }
    renderHome(c) {
      const copy = el(
        "div",
        { class: "hero-copy" },
        el("h1", {}, "Raging Blast 2", el("br"), "Galaxy Studio"),
        el(
          "p",
          {},
          "You can open MULTIPLE .MMD/.DAT files together (and it's even suggested to do so).",
        ),
        el(
          "p",
          {},
          "Please keep in mind there are some limits in place: Only 66 Galaxies can exist, and only up to 500 Missions.",
        ),
        button(
          this.files.length ? "Open more game files" : "Open your MMD & DAT files",
          () => $("file-input").click(),
          "primary",
        ),
      );
      const logo = el("img", {
        class: "hero-game-logo",
        src: "assets/game-ui/title-logo.png",
        alt: "Dragon Ball Raging Blast 2",
      });
      c.append(el("section", { class: "hero" }, copy, logo));
      c.append(RB2.renderArchiveBridge(this));
      c.append(RB2.renderModSupport(this));
      const files = el(
        "section",
        { class: "panel" },
        el("h2", {}, "Bring the individual files"),
        el(
          "table",
          { class: "file-requirements" },
          el(
            "tbody",
            {},
            [
              ["galaxy.mmd / tutorial.mmd", "Missions & maps"],
              ["zone_*.mmd", "Battle Zone routes"],
              [
                "preset_character_galaxy.dat / preset_character_tutorial.dat / preset_character_download.dat",
                "Character preset containers & form links",
              ],
              [
                "preset_character_battle_zone_nor / _spe",
                "Normal / Ultimate preset containers (no extension)",
              ],
              ["preset_appearance_table.dat", "Characters & moves"],
              ["preset_strength_table.dat", "CPU & equipment"],
              ["item_parameter.dat", "Global item definitions (optional, advanced)"],
              ["tutorial_message_table_01.dat … _09.dat", "Tutorial message order (all languages)"],
              ["TUTO_###_US / IT / FR / DE / SP / JP.txt", "Localized tutorial wording (optional)"],
            ].map(([a, b]) => el("tr", {}, el("td", {}, a), el("td", {}, b))),
          ),
        ),
        el(
          "p",
          { class: "source-note" },
          "The normal and Ultimate Battle Zone preset tables can have no extension. Those files are supported too.",
        ),
      );
      c.append(files);
    }
    renderReference(c) {
      const state = (this.ui.reference = this.ui.reference || {
        kind: "characters",
        search: "",
        page: 0,
      });
      const types = [
        ["characters", "Characters & forms"],
        ["items", "Equipment items"],
        ["moves", "Local move selectors"],
        ["stages", "Stages"],
        ["music", "Music"],
        ["objectives", "Galaxy objectives"],
        ["rules", "Galaxy rule descriptions"],
        ["actions", "Native action detectors"],
        ["handicaps", "Battle Zone handicaps"],
        ["stamps", "Challenge Stamp criteria"],
      ];
      const select = el(
        "select",
        { class: "reference-select", "aria-label": "Reference category" },
        types.map(([id, n]) => el("option", { value: id, selected: id === state.kind }, n)),
      );
      const search = el("input", {
        type: "search",
        placeholder: "Search names or IDs…",
        value: state.search,
        "aria-label": "Search reference",
        class: "reference-search",
      });
      const result = el("div");
      select.onchange = () => {
        state.kind = select.value;
        state.search = "";
        state.page = 0;
        this.refresh();
      };
      search.oninput = () => {
        state.search = search.value;
        state.page = 0;
        paint();
      };
      c.append(
        el("h1", {}, "Reference library"),
        el(
          "p",
          { class: "muted" },
          "Names extracted from the original English game data. Item array indices, native action IDs and local move selectors have different namespaces.",
        ),
        el("div", { class: "toolbar" }, select, search),
        result,
      );
      const paint = () => {
        result.replaceChildren();
        const q = state.search.toLowerCase().trim();
        const all = this.data[state.kind] || [];
        const rows = all.filter(
          (r) =>
            !q ||
            [
              r.id,
              hex(r.id ?? 0),
              r.name,
              r.native != null ? this.characterName(r.native) : "",
              r.description || "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(q),
        );
        const pages = Math.max(1, Math.ceil(rows.length / 150));
        state.page = Math.max(0, Math.min(state.page || 0, pages - 1));
        const start = state.page * 150;
        const previous = button("Previous page", () => {
          state.page--;
          paint();
        });
        const next = button("Next page", () => {
          state.page++;
          paint();
        });
        previous.disabled = state.page === 0;
        next.disabled = state.page + 1 >= pages;
        result.append(
          el(
            "div",
            { class: "toolbar reference-pages", "aria-label": "Reference pages" },
            previous,
            el(
              "span",
              { role: "status", "aria-live": "polite" },
              rows.length +
                " entries · Page " +
                (state.page + 1) +
                " of " +
                pages +
                " · " +
                (rows.length ? start + 1 : 0) +
                "–" +
                Math.min(start + 150, rows.length),
            ),
            next,
          ),
        );
        const header =
          state.kind === "moves"
            ? ["Native character", "Local ID", "Move", "Binding"]
            : ["ID", "Name", "Details"];
        const table = el(
          "table",
          { class: "reference-table" },
          el(
            "thead",
            {},
            el(
              "tr",
              {},
              header.map((h) => el("th", {}, h)),
            ),
          ),
        );
        const tbody = el("tbody");
        for (const r of rows.slice(start, start + 150)) {
          if (state.kind === "moves")
            tbody.append(
              el(
                "tr",
                {},
                el("td", {}, r.native + " · " + this.characterName(r.native)),
                el("td", {}, r.id),
                el("td", {}, r.name),
                el(
                  "td",
                  { class: "muted" },
                  r.resolved ? "Matched HUD + pause table" : "Unresolved / partial binding",
                ),
              ),
            );
          else
            tbody.append(
              el(
                "tr",
                {},
                el("td", {}, r.id + " / " + hex(r.id ?? 0)),
                el(
                  "td",
                  {},
                  state.kind === "characters" && r.portrait
                    ? el("img", { src: r.portrait, alt: "", loading: "lazy" })
                    : null,
                  el("span", {}, r.name),
                ),
                el("td", { class: "muted" }, r.description || r.note || r.parameterMode || ""),
              ),
            );
        }
        table.append(tbody);
        result.append(el("div", { class: "table-wrap" }, table));
        if (state.kind === "actions")
          result.append(
            el(
              "p",
              { class: "warning" },
              "These are native action detector IDs. Tutorial message text and button-glyph text numbers are separate identifiers. Some upper action IDs are only partially understood.",
            ),
          );
      };
      paint();
    }
    showHelp() {
      const body = this.dialog("Your first edited battle");
      const steps = [
        [
          "Extract, then open",
          "Use your existing tools to extract galaxy.mmd (or tutorial.mmd / a zone MMD). Open the MMD here. For character edits, also open the shared appearance and strength DATs and the preset table for that mode.",
        ],
        [
          "Select a mission or preset",
          "Choose Galaxy & Tutorial, Character presets, Battle Zone or Tutorial messages. MAIN files contain mission nodes and owner lists; the preset IDs refer to the preset table of that specific mode.",
        ],
        [
          "Make your changes",
          "Choose stages and music by name, edit team candidates, move mission nodes and edit actions independently of the victory objective. Apply changes in each panel. Unknown values are marked as such.",
        ],
        [
          "Create isolated characters",
          "Use “Clone complete preset” to copy its appearance and strength too. Each form is a separate preset. Set the native form slots correctly: destination links do not change the underlying transformation animation.",
        ],
        [
          "Check and export",
          "Check files, then export the current file or a ZIP of all modified files. The ZIP groups individual MMD/DAT files into folders named after their original AFS, plus an edit manifest. It does not contain rebuilt AFS archives. Use Overview → Import to game to rebuild the matching AFS archives.",
        ],
        [
          "Keep your workspace",
          "Save workspace preserves original and edited bytes for every loaded file. Reopen it later to continue. No data is uploaded, and your source files are never overwritten.",
        ],
      ];
      for (let i = 0; i < steps.length; i++)
        body.append(
          el(
            "section",
            { class: "quick-step" },
            el("h3", {}, el("span", { class: "step-number" }, i + 1), steps[i][0]),
            el("p", {}, steps[i][1]),
          ),
        );
      body.append(
        el(
          "div",
          { class: "warning" },
          "Galaxy has 500 saved mission records (0–499), with two spare records in the original 498-mission file. Extra Galaxy icons and standalone Battle Zones have separate save/menu limits. Battle Zone +0x10 is displayed LV; grid position selects progress. Tutorial AI scripts and complex wave groups remain partially decoded.",
        ),
        el(
          "p",
          { class: "muted" },
          "Keyboard shortcuts: Ctrl+O open files · Ctrl+S export selected file · Ctrl+Z undo · Ctrl+Shift+Z redo. All game IDs are numeric; 0x prefixes mean hexadecimal.",
        ),
        el(
          "p",
          { class: "source-note" },
          "Built from the BLES00978 research. Portraits and reference names come from the supplied game. See README_EN.md and assets/ASSET_SOURCES.md for details.",
        ),
      );
    }
  }
  RB2.App = App;
  const app = (RB2.app = window.app = new App());
  $("open-files").onclick = () => $("file-input").click();
  $("file-input").onchange = (e) => {
    app.openFiles(Array.from(e.target.files));
    e.target.value = "";
  };
  $("save-project").onclick = () => app.saveProject();
  $("load-project").onclick = () => $("project-input").click();
  $("project-input").onchange = (e) => {
    app.loadProject(e.target.files[0]);
    e.target.value = "";
  };
  $("clear-workspace").onclick = () => app.closeAll();
  $("undo").onclick = () => app.undo();
  $("redo").onclick = () => app.redo();
  $("export-current").onclick = () => app.exportFiles(false);
  $("export-all").onclick = () => app.exportFiles(true);
  $("validate").onclick = () => app.showValidation();
  $("session-log").onclick = () => app.showSessionLog();
  $("help-button").onclick = () => app.showHelp();
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => (b.onclick = () => app.setTab(b.dataset.tab)));
  let dragDepth = 0;
  document.addEventListener("dragenter", (e) => {
    if (e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
      dragDepth++;
      $("drop-overlay").hidden = false;
    }
  });
  document.addEventListener("dragleave", () => {
    if (--dragDepth <= 0) {
      dragDepth = 0;
      $("drop-overlay").hidden = true;
    }
  });
  document.addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
  });
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    $("drop-overlay").hidden = true;
    app.openFiles(Array.from(e.dataTransfer?.files || []));
  });
  window.addEventListener("beforeunload", (e) => {
    if (app.unsaved()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
      e.preventDefault();
      $("file-input").click();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      app.exportFiles(false);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) {
      e.preventDefault();
      if (e.shiftKey) app.redo();
      else app.undo();
    } else if (e.key === "?" && !typing) app.showHelp();
  });
  app.refresh();
})();
