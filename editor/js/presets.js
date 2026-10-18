/* RB2 Galaxy Editor — standalone DAT tables and preset editing. No dependencies. */
(function (global) {
  "use strict";
  const RB2 = (global.RB2 = global.RB2 || {});
  const EMPTY = 0xffffffff;
  const GEOMETRY = Object.freeze({ appearance: 32, strength: 88, preset: 44, item: 84 });
  const PRESET_ALIASES = new Set([
    "galaxy",
    "tutorial",
    "battle_zone_nor",
    "battle_zone_ult",
    "battle_zone_spe",
    "preset_galaxy",
    "preset_tutorial",
    "preset_battle_zone_nor",
    "preset_battle_zone_ult",
    "preset_battle_zone_spe",
  ]);
  function asBytes(source) {
    if (source instanceof Uint8Array) return new Uint8Array(source);
    if (source instanceof ArrayBuffer) return new Uint8Array(source.slice(0));
    if (ArrayBuffer.isView(source))
      return new Uint8Array(
        source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength),
      );
    if (Array.isArray(source)) return Uint8Array.from(source);
    throw new TypeError("Expected binary bytes.");
  }
  function assertWord(value) {
    if (!Number.isInteger(value) || value < 0 || value > EMPTY)
      throw new RangeError("A DAT word must be an unsigned 32-bit integer.");
    return value;
  }
  class DatDocument {
    constructor(source, kind) {
      kind = PRESET_ALIASES.has(kind) ? "preset" : kind;
      if (!Object.prototype.hasOwnProperty.call(GEOMETRY, kind))
        throw new Error("Unknown DAT table kind: " + kind);
      const bytes = asBytes(source),
        stride = GEOMETRY[kind];
      const offset = kind === "item" ? 0 : 16;
      if (bytes.length < offset) throw new Error("Truncated DAT header: expected 16 bytes.");
      if (kind === "item" && (!bytes.length || bytes.length % stride))
        throw new Error(
          "Item definitions must be a nonempty multiple of 84 bytes; this table has no header.",
        );
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const count = kind === "item" ? bytes.length / stride : view.getUint32(0, false);
      if (offset + count * stride !== bytes.length)
        throw new Error(
          "DAT length does not match the big-endian record count and " + stride + "-byte row size.",
        );
      this.kind = kind;
      this.stride = stride;
      this.header = bytes.slice(0, offset);
      this.rows = [];
      for (let index = 0; index < count; index++) {
        const words = [];
        for (let word = 0; word < stride / 4; word++)
          words.push(view.getUint32(offset + index * stride + word * 4, false));
        this.rows.push(words);
      }
    }
    get count() {
      return this.rows.length;
    }
    row(index) {
      if (!Number.isInteger(index) || index < 0 || index >= this.count)
        throw new RangeError("DAT row index is outside the table.");
      return this.rows[index].slice();
    }
    checkRow(words) {
      if (!Array.isArray(words) && !ArrayBuffer.isView(words))
        throw new TypeError("Expected an array of DAT words.");
      if (words.length !== this.stride / 4)
        throw new RangeError("Expected exactly " + this.stride / 4 + " words in this row.");
      return Array.from(words, assertWord);
    }
    setRow(index, words) {
      this.row(index);
      this.rows[index] = this.checkRow(words);
    }
    appendRow(words) {
      const row = this.checkRow(words),
        index = this.count;
      if (index >= EMPTY) throw new RangeError("DAT count exceeds its 32-bit header.");
      this.rows.push(row);
      return index;
    }
    encode() {
      const offset = this.kind === "item" ? 0 : 16;
      const bytes = new Uint8Array(offset + this.count * this.stride);
      bytes.set(this.header);
      const view = new DataView(bytes.buffer);
      if (offset) view.setUint32(0, this.count, false);
      this.rows.forEach((words, index) =>
        words.forEach((value, word) =>
          view.setUint32(offset + index * this.stride + word * 4, assertWord(value), false),
        ),
      );
      return bytes;
    }
  }
  RB2.DatDocument = DatDocument;
  RB2.EMPTY_ITEM = EMPTY;

  function hex(value, width) {
    return (
      "0x" +
      Number(value)
        .toString(16)
        .toUpperCase()
        .padStart(width || 0, "0")
    );
  }
  function parseWord(input, absent) {
    let value = String(input).trim();
    if (absent && (!value || /^(?:empty|none|-1)$/i.test(value))) return EMPTY;
    value = value.split(/\s+[—·]\s+/)[0].trim();
    if (/^FFFFFFFF$/i.test(value)) return EMPTY;
    if (!/^(?:0x[0-9a-f]+|\d+)$/i.test(value))
      throw new Error("Use a decimal number or a hexadecimal number beginning with 0x.");
    return assertWord(Number(value));
  }
  RB2.parseDatWord = parseWord;
  const el = (...args) => RB2.ui.el(...args);
  function button(label, action, cls, attrs) {
    return el(
      "button",
      Object.assign({ type: "button", class: cls || "secondary", onclick: action }, attrs),
      label,
    );
  }
  function field(label, control, help) {
    return el(
      "label",
      { class: "field" },
      el("span", {}, label),
      control,
      help ? el("small", { class: "muted" }, help) : null,
    );
  }
  function data(app) {
    return app.data || RB2.DATA || {};
  }
  function characterId(row) {
    return Number(row.id ?? row.native ?? row.native_id ?? row.native_id_decimal);
  }
  function characterName(app, id) {
    const row = (data(app).characters || []).find((x) => characterId(x) === id);
    return row
      ? row.name || row.label
      : app.characterName
        ? app.characterName(id)
        : "Character " + id;
  }
  function itemId(row) {
    return Number(row.id ?? row.index ?? row.item_index_decimal);
  }
  function itemName(app, id) {
    if (id & 0x80000000) return "Empty";
    const row = (data(app).items || []).find((x) => itemId(x) === id);
    return row ? row.name || row.game_name_en : app.itemName ? app.itemName(id) : "Item " + hex(id);
  }
  function moveNative(row) {
    return Number(row.native ?? row.nativeId ?? row.native_id ?? row.native_id_decimal);
  }
  function moveId(row) {
    return Number(row.id ?? row.localId ?? row.local_id ?? row.local_move_index);
  }
  function moveName(row) {
    return row.name || row.move_name || row.name_en || "Unresolved move";
  }
  function tableTitle(file) {
    if (file.kind === "appearance") return "Appearance & moves";
    if (file.kind === "strength") return "Strength & equipment";
    if (file.kind === "item") return "Item definitions (advanced)";
    if (/tutorial/i.test(file.name)) return "Tutorial presets";
    if (/battle_zone.*(?:ult|ultimate|spe)/i.test(file.name))
      return "Battle Zone — Ultimate presets";
    if (/battle_zone/i.test(file.name)) return "Battle Zone — Normal presets";
    if (/download/i.test(file.name)) return "Download presets";
    if (/galaxy/i.test(file.name)) return "Galaxy presets";
    return "Preset links";
  }
  function findDependency(app, state, kind) {
    const key = kind + "FileId";
    return (
      app.files.find((f) => f.id === state[key] && f.kind === kind) ||
      app.files.find((f) => f.kind === kind)
    );
  }
  function safeRow(file, index) {
    return file && index < file.doc.count ? file.doc.row(index) : null;
  }
  function presetName(app, file, index, appearance) {
    if (!file || index === EMPTY) return "None";
    const p = safeRow(file, index),
      a = p && safeRow(appearance, p[0]);
    return a ? characterName(app, a[0]) + " · costume " + (a[1] + 1) : "Preset " + index;
  }
  function labelForRow(app, file, index, appearance) {
    const row = file.doc.row(index);
    if (file.kind === "appearance")
      return characterName(app, row[0]) + " · costume " + (row[1] + 1);
    if (file.kind === "strength")
      return (
        "CPU " + row[0] + " · " + row.slice(2).filter((v) => !(v & 0x80000000)).length + "/20 items"
      );
    if (file.kind === "item") return itemName(app, index);
    return presetName(app, file, index, appearance);
  }
  function portrait(app, native) {
    const row = (data(app).characters || []).find((x) => characterId(x) === native);
    const path = row && row.portrait;
    if (path)
      return el("img", {
        src: path,
        alt: characterName(app, native),
        class: "character-portrait",
        width: 64,
        height: 64,
        loading: "lazy",
      });
    return null;
  }
  function nativeSlots(app, native) {
    const all = data(app).nativeTransforms || data(app).transformations || [];
    return Array.isArray(all)
      ? all.find((x) => Number(x.native ?? x.id ?? x.native_id_decimal) === native)
      : all[native];
  }
  function slotNote(app, native, slot) {
    const info = nativeSlots(app, native);
    if (!info)
      return (
        "Native slot " +
        slot +
        ": animation and cancellation behavior are determined by this character’s native transformation data."
      );
    const target = info.slots
      ? info.slots[slot]?.target
      : info.targets
        ? info.targets[slot]
        : info["native_slot" + slot + "_target"];
    const cancel = info.slots
      ? info.slots[slot]?.cancel
      : info.cancel
        ? info.cancel[slot]
        : info.cancelBits
          ? info.cancelBits[slot]
          : info["slot" + slot + "_cancel_bit"];
    if (
      target === null ||
      (Number(target) === 100 &&
        !(app.modEnabled && app.modProfile?.characters.some((c) => c.id === 100)))
    )
      return (
        "Native slot " +
        slot +
        " is unused. Assigning a link here does not establish a supported transformation."
      );
    if (target !== undefined)
      return (
        "Native slot " +
        slot +
        ": " +
        characterName(app, Number(target)) +
        " · " +
        (Number(cancel) ? "cancellation animation" : "transformation animation") +
        ". Destination preset links must match the intended native action."
      );
    return "Keep the destination consistent with native slot " + slot + ".";
  }

  function renderDatTable(container, app, embedded) {
    app.ui = app.ui || {};
    const state =
      embedded?.state || (app.ui.presets = app.ui.presets || { index: 0, search: "", page: 0 });
    function guardDraft() {
      return app.ensureApplied
        ? app.ensureApplied() !== false
        : !app.pendingForm || app.pendingForm.apply() !== false;
    }
    const files = app.files.filter((f) => GEOMETRY[f.kind] && f.doc);
    if (!embedded) container.replaceChildren();
    if (!embedded)
      container.append(
        el(
          "div",
          { class: "panel" },
          el("h2", {}, "Presets, equipment & moves"),
          el(
            "p",
            { class: "muted" },
            "Open individual DAT files. Appearance and strength tables are shared; each Galaxy, Tutorial or Battle Zone preset file has its own preset indices.",
          ),
        ),
      );
    if (!files.length) {
      container.append(
        el(
          "div",
          { class: "panel empty-state" },
          el("h3", {}, "Open your extracted DAT tables"),
          el(
            "p",
            {},
            "For a complete preset workflow, open preset_appearance_table.dat, preset_strength_table.dat and a preset_character_*.dat file. Item definitions are optional. Use Open files above.",
          ),
        ),
      );
      return;
    }
    let file = embedded?.file || files.find((f) => f.id === state.fileId);
    const selected = files.find((f) => f.id === app.selectedFileId);
    if (!file) file = selected || files[0];
    state.fileId = file.id;
    state.index = Math.max(0, Math.min(Number(state.index) || 0, file.doc.count - 1));
    const appearance = findDependency(app, state, "appearance"),
      strength = findDependency(app, state, "strength");
    const bar = el("div", { class: "panel toolbar" });
    const fileSelect = el("select", { "aria-label": "DAT table" });
    files.forEach((f) =>
      fileSelect.append(
        el("option", { value: f.id }, tableTitle(f) + " — " + f.name + (f.dirty ? " *" : "")),
      ),
    );
    fileSelect.value = file.id;
    fileSelect.addEventListener("change", () => {
      if (!guardDraft()) {
        fileSelect.value = file.id;
        return;
      }
      state.fileId = fileSelect.value;
      state.index = 0;
      state.search = "";
      state.page = 0;
      if (app.selectFile) app.selectFile(fileSelect.value);
      app.refresh();
    });
    bar.append(field("DAT table / namespace", fileSelect));
    for (const kind of ["appearance", "strength"]) {
      const choices = files.filter((f) => f.kind === kind);
      if (file.kind !== "preset" || choices.length < 2) continue;
      const select = el("select", { "aria-label": kind + " dependency" });
      choices.forEach((f) => select.append(el("option", { value: f.id }, f.name)));
      select.value = (kind === "appearance" ? appearance : strength).id;
      select.addEventListener("change", () => {
        if (!guardDraft()) return;
        state[kind + "FileId"] = select.value;
        app.refresh();
      });
      bar.append(field("Use " + kind + " table", select));
    }
    bar.append(
      el(
        "span",
        { class: "muted" },
        file.doc.count + " records · " + file.doc.stride + " bytes each · big-endian",
      ),
    );
    if (!embedded) container.append(bar);
    if (!embedded && ["appearance", "strength"].includes(file.kind))
      container.append(
        button("Create new " + file.kind + "…", () => RB2.newDatRow(app, file), "primary"),
      );
    if (!file.doc.count) {
      container.append(
        el(
          "div",
          { class: "panel" },
          "This table is empty. Clone a record from an existing table to use a researched baseline.",
        ),
      );
      return;
    }
    const layout = el("div", { class: "split-layout" }),
      left = el("section", { class: "panel" }),
      right = el("section", { class: "panel" });
    if (embedded) container.append(right);
    else {
      layout.append(left, right);
      container.append(layout);
    }
    const search = el("input", {
      type: "search",
      value: state.search || "",
      placeholder: "Search name, index, or equipment…",
      "aria-label": "Search DAT records",
    });
    left.append(search);
    const records = el("div", { class: "record-list", role: "list", "aria-label": "DAT records" }),
      pager = el("div", { class: "toolbar" });
    left.append(records, pager);
    function paintList() {
      const query = (state.search || "").trim().toLowerCase();
      const indexes = [];
      for (let i = 0; i < file.doc.count; i++) {
        const row = file.doc.row(i);
        const extra =
          file.kind === "strength"
            ? row
                .slice(2)
                .filter((v) => !(v & 0x80000000))
                .map((v) => itemName(app, v))
                .join(" ")
            : "";
        const label = i + " " + hex(i) + " " + labelForRow(app, file, i, appearance) + " " + extra;
        if (!query || label.toLowerCase().includes(query)) indexes.push(i);
      }
      const pageSize = 80,
        pages = Math.max(1, Math.ceil(indexes.length / pageSize));
      state.page = Math.max(0, Math.min(state.page || 0, pages - 1));
      records.replaceChildren();
      indexes.slice(state.page * pageSize, (state.page + 1) * pageSize).forEach((i) => {
        const b = button(
          "#" + i + " · " + labelForRow(app, file, i, appearance),
          () => {
            if (!guardDraft()) return;
            state.index = i;
            app.refresh();
          },
          "record-button" + (state.index === i ? " selected" : ""),
          { "aria-current": state.index === i ? "true" : undefined },
        );
        if (file.kind === "preset") {
          const pr = safeRow(appearance, file.doc.row(i)[0]);
          if (pr) {
            const label = b.textContent;
            b.replaceChildren(portrait(app, pr[0]), el("span", {}, label));
            b.classList.add("preset-record-card");
          }
        }
        records.append(b);
      });
      if (!indexes.length) records.append(el("p", { class: "muted" }, "No matching records."));
      pager.replaceChildren(
        button(
          "Previous",
          () => {
            state.page--;
            paintList();
          },
          "secondary",
          { disabled: !state.page },
        ),
        el(
          "span",
          { class: "muted" },
          indexes.length + " results · " + (state.page + 1) + "/" + pages,
        ),
        button(
          "Next",
          () => {
            state.page++;
            paintList();
          },
          "secondary",
          { disabled: state.page + 1 >= pages },
        ),
      );
    }
    search.addEventListener("input", () => {
      state.search = search.value;
      state.page = 0;
      paintList();
    });
    if (!embedded) paintList();
    const index = state.index,
      original = file.doc.row(index),
      controls = [];
    const offset = (file.kind === "item" ? 0 : 16) + index * file.doc.stride;
    right.append(
      el("h3", {}, tableTitle(file) + " #" + index),
      el("p", { class: "muted" }, "File offset " + hex(offset) + " · " + file.name),
    );
    const notice = el("div", { role: "status", "aria-live": "polite" });
    right.append(notice);
    const grid = el("div", { class: "grid" });
    let listSequence = 0;
    function datalist(entries) {
      const id = "preset-options-" + file.id + "-" + index + "-" + listSequence++;
      const list = el("datalist", { id });
      entries.forEach(([value, label]) =>
        list.append(el("option", { value: String(value) }, label)),
      );
      right.append(list);
      return id;
    }
    function numeric(word, label, help, options) {
      options = options || {};
      const input = el("input", {
        type: "text",
        value: options.format ? options.format(original[word]) : String(original[word]),
        spellcheck: "false",
        "aria-label": label,
        list: options.list,
        title: help,
      });
      controls[word] = { input, absent: !!options.absent };
      const wrapper = field(
        label + " (+" + (word * 4).toString(16).toUpperCase().padStart(2, "0") + ")",
        input,
        help,
      );
      (options.parent || grid).append(wrapper);
      return input;
    }
    function go(target, record) {
      if (!target || !guardDraft()) return;
      if (embedded) {
        if (target.kind === "preset") app.openPreset(target, record);
        else {
          app.ui.presets.characterTab = target.kind;
          app.refresh();
        }
        return;
      }
      state.fileId = target.id;
      state.index = record;
      state.search = "";
      state.page = Math.floor(record / 80);
      if (app.selectFile) app.selectFile(target.id);
      app.refresh();
    }
    const users = [];
    if (file.kind === "appearance" || file.kind === "strength") {
      const at = file.kind === "appearance" ? 0 : 1;
      files
        .filter((f) => f.kind === "preset")
        .forEach((f) => {
          for (let i = 0; i < f.doc.count; i++)
            if (f.doc.row(i)[at] === index) users.push({ f, i });
        });
      if (users.length)
        right.append(
          el(
            "p",
            { class: users.length > 1 ? "warning" : "muted" },
            "Referenced by " +
              users.length +
              " preset(s) across loaded tables. Editing this shared row changes every reference. Use “Clone complete preset” on a preset to isolate its appearance and strength.",
          ),
        );
      if (users.length)
        right.append(
          el(
            "details",
            {},
            el("summary", {}, "Show presets using this row"),
            users
              .slice(0, 100)
              .map((x) => button(x.f.name + " #" + x.i, () => go(x.f, x.i), "record-button")),
            users.length > 100
              ? el("p", { class: "muted" }, "Showing the first 100 references.")
              : null,
          ),
        );
    }
    if (file.kind === "appearance") {
      const preview = el(
        "div",
        { class: "toolbar" },
        portrait(app, original[0]),
        el("strong", {}, characterName(app, original[0])),
      );
      right.append(preview);
      const characterList = datalist(
        (data(app).characters || []).map((x) => [
          characterId(x) + " — " + (x.name || x.label),
          "Native/form ID " + characterId(x),
        ]),
      );
      const nativeInput = numeric(
        0,
        "Native character / form",
        "Native IDs are shared by the game. Changing the character does not automatically change its move selectors or preset links.",
        { list: characterList, format: (n) => n + " — " + characterName(app, n) },
      );
      numeric(
        1,
        "Costume index",
        "Zero-based costume index: 0 is menu costume 1, 1 is menu costume 2. Preserve a valid costume for this character.",
      );
      numeric(
        2,
        "Costume-selection mode",
        "Value 1 enters random costume selection. Other values are preserved as raw data.",
      );
      const moveLists = [];
      ["Super — Up", "Super — Right", "Super — Down", "Super — Left", "Ultimate — Push"].forEach(
        (label, n) => {
          const listId = datalist([]),
            list =
              document.getElementById(listId) ||
              Array.from(right.querySelectorAll("datalist")).find((x) => x.id === listId);
          const input = numeric(
            n + 3,
            label,
            "Local move selector for this native form. Move data and animations are not transplanted from other characters.",
            { list: listId },
          );
          moveLists.push({ list, input });
        },
      );
      function updateMoveOptions(initial) {
        let native;
        try {
          native = parseWord(nativeInput.value);
        } catch (_) {
          return;
        }
        const moves = (data(app).moves || []).filter((x) => moveNative(x) === native);
        moveLists.forEach(({ list, input }, n) => {
          list.replaceChildren();
          moves.forEach((m) =>
            list.append(
              el(
                "option",
                { value: moveId(m) + " — " + moveName(m) },
                m.resolved === false
                  ? "Unresolved or inconsistent localization"
                  : "Local move " + moveId(m),
              ),
            ),
          );
          if (initial) {
            const match = moves.find((m) => moveId(m) === original[n + 3]);
            if (match) input.value = original[n + 3] + " — " + moveName(match);
          }
        });
      }
      nativeInput.addEventListener("input", () => updateMoveOptions(false));
      updateMoveOptions(true);
      right.append(
        button(
          "Use catalog / loaded move defaults",
          () => {
            try {
              const native = parseWord(nativeInput.value);
              const defaults = RB2.Authoring.newAppearance(app, native).slice(3);
              defaults.forEach((value, n) => {
                const move = (data(app).moves || []).find(
                  (x) => moveNative(x) === native && moveId(x) === value,
                );
                controls[n + 3].input.value = value + (move ? " — " + moveName(move) : "");
              });
              markDraft();
              notice.className = "muted";
              notice.textContent =
                "Catalog / loaded move selectors copied into this form. Costume, preset links and equipment are unchanged.";
            } catch (e) {
              notice.className = "warning";
              notice.textContent = e.message;
            }
          },
          "secondary",
        ),
      );
    } else if (file.kind === "strength") {
      numeric(
        0,
        "CPU level word",
        "Equipment can alter the effective runtime CPU level. Max Computer produced level 29 in controlled tests.",
      );
      numeric(
        1,
        "AI-type word",
        "0xFFFFFFFF retains the baseline/default route in tested presets. Arbitrary AI-type values have not been mapped.",
        { absent: true, format: (v) => (v === EMPTY ? "0xFFFFFFFF" : String(v)) },
      );
      right.append(
        el(
          "p",
          { class: "muted" },
          "Equipment uses item array indices, not name-text IDs or effect-flag IDs. All 20 slots are independent; empty slots are allowed. Labels use the active original/mod reference catalog.",
        ),
      );
      const entries = [["0xFFFFFFFF — Empty", "No equipment"]].concat(
        (data(app).items || []).map((x) => [
          hex(itemId(x)) + " — " + (x.name || x.game_name_en),
          x.description || x.game_description_en || "",
        ]),
      );
      const list = datalist(entries);
      for (let slot = 0; slot < 20; slot++)
        numeric(
          slot + 2,
          "Equipment slot " + slot,
          "Search by item name or enter its decimal/0x index. Empty = 0xFFFFFFFF.",
          { list, absent: true, format: (v) => hex(v) + " — " + itemName(app, v) },
        );
      right.append(
        button(
          "Clear all 20 equipment slots",
          () => {
            controls.slice(2).forEach((c) => {
              c.input.value = "0xFFFFFFFF — Empty";
            });
            markDraft();
            notice.className = "muted";
            notice.textContent = "Equipment cleared in the form. Apply row to save this change.";
          },
          "secondary",
        ),
      );
    } else if (file.kind === "preset") {
      const a = safeRow(appearance, original[0]),
        s = safeRow(strength, original[1]);
      right.append(
        el(
          "div",
          { class: "toolbar" },
          a ? portrait(app, a[0]) : null,
          el("strong", {}, presetName(app, file, index, appearance)),
        ),
      );
      if (!appearance || !strength)
        right.append(
          el(
            "p",
            { class: "warning" },
            "Load both shared appearance and strength DAT files to resolve names, validate those references and clone a complete preset. Raw links can still be edited.",
          ),
        );
      numeric(0, "Appearance index", "Index in the selected shared appearance table.");
      numeric(1, "Strength index", "Index in the selected shared strength/equipment table.");
      numeric(
        2,
        "Additional parameter selector",
        "Preserve a suitable baseline. The full meaning of this selector is unresolved; custom NPC probes retained 99.",
      );
      right.append(
        el(
          "div",
          { class: "toolbar" },
          button(
            "Edit appearance #" + original[0],
            () => go(appearance, original[0]),
            "secondary",
            { disabled: !a },
          ),
          button("Edit strength #" + original[1], () => go(strength, original[1]), "secondary", {
            disabled: !s,
          }),
        ),
      );
      if (a)
        right.append(
          el(
            "p",
            { class: "muted" },
            "Moves: " +
              a
                .slice(3)
                .map((v) => {
                  const m = (data(app).moves || []).find(
                    (x) => moveNative(x) === a[0] && moveId(x) === v,
                  );
                  return m ? moveName(m) : String(v);
                })
                .join(" · "),
          ),
        );
      if (s)
        right.append(
          el(
            "p",
            { class: "muted" },
            "Equipment: " +
              (s
                .slice(2)
                .filter((v) => !(v & 0x80000000))
                .map((v) => itemName(app, v))
                .join(" · ") || "none"),
          ),
        );
      right.append(
        el(
          "p",
          { class: "warning" },
          "A form link selects the destination preset and its equipment/moves. The native transformation slot still chooses the action and animation. Linking the cancellation slot to a powered-up form can produce the wrong animation. Fusion requirements are not fully decoded.",
        ),
      );
      const choices = [["0xFFFFFFFF — None", "No destination"]];
      for (let i = 0; i < file.doc.count; i++)
        choices.push([
          i + " — " + presetName(app, file, i, appearance),
          "Preset in this same file",
        ]);
      const list = datalist(choices);
      const diamonds = el("div", { class: "link-diamonds" });
      const slotButtons = [];
      const directions = ["Left", "Top", "Right", "Bottom"];
      for (let group = 0; group < 2; group++) {
        const title = group === 0 ? "Transformations" : "Fusions";
        const figure = el("section", {
          class: "link-diamond-panel",
          "aria-label": title + " diagram",
        });
        const diamond = el("div", { class: "link-diamond" });
        figure.append(
          el("h4", {}, title),
          diamond,
          el("p", { class: "muted" }, "1 Left · 2 Top · 3 Right · 4 Bottom. Click a slot to edit."),
        );
        for (let slot = 0; slot < 4; slot++) {
          const word = 3 + group * 4 + slot;
          const choice = button(
            "",
            () => {
              const input = controls[word].input;
              input.scrollIntoView({ block: "center", behavior: "smooth" });
              input.focus();
              input.select();
            },
            "link-diamond-slot slot-" + slot,
          );
          slotButtons.push({ choice, word, title, slot });
          diamond.append(choice);
        }
        diamonds.append(figure);
      }
      right.append(diamonds);
      function paintDiamonds() {
        for (const { choice, word, title, slot } of slotButtons) {
          let target,
            text,
            native = null;
          try {
            target = parseWord(controls[word].input.value, true);
            if (target === EMPTY) text = "None";
            else if (target >= file.doc.count) text = "Missing preset #" + target;
            else {
              text = "#" + target + " · " + presetName(app, file, target, appearance);
              const row = safeRow(appearance, file.doc.row(target)[0]);
              if (row) native = row[0];
            }
          } catch (_) {
            text = "Invalid destination";
          }
          const label = title + " · slot " + (slot + 1) + " (" + directions[slot] + ") · " + text;
          choice.title = label;
          choice.setAttribute("aria-label", label);
          const image = native !== null ? portrait(app, native) : null;
          choice.replaceChildren(
            image
              ? image
              : el(
                  "span",
                  { class: "link-empty", "aria-hidden": "true" },
                  target === EMPTY ? "—" : "?",
                ),
          );
        }
      }
      for (let n = 0; n < 8; n++) {
        const isForm = n < 4,
          slot = n % 4;
        const input = numeric(
          n + 3,
          (isForm ? "Form" : "Fusion") + "-link slot " + (slot + 1) + " · " + directions[slot],
          "Diagram position: " +
            directions[slot] +
            " (" +
            (slot + 1) +
            "). " +
            (isForm && a
              ? slotNote(app, a[0], slot)
              : "Destination preset in this same namespace. 0xFFFFFFFF disables this link. Fusion constraints require further research."),
          {
            list,
            absent: true,
            format: (v) =>
              v === EMPTY ? "0xFFFFFFFF — None" : v + " — " + presetName(app, file, v, appearance),
          },
        );
        input.addEventListener("input", paintDiamonds);
        input.addEventListener("change", paintDiamonds);
        const target = original[n + 3];
        if (target < file.doc.count)
          input.parentElement.append(
            button("Open linked preset #" + target, () => go(file, target), "secondary"),
          );
      }
      paintDiamonds();
    } else {
      right.append(
        el(
          "p",
          { class: "warning" },
          "Advanced item definitions are global shared data. Equipped items refer to this row index. Editing labels does not change the item’s programmed behavior. Properties with unknown semantics are exposed as raw words.",
        ),
      );
      for (let word = 0; word < 21; word++) {
        const label =
          word === 0
            ? "Name text ID"
            : word === 1
              ? "Description text ID"
              : word < 9
                ? "Unknown property word " + word
                : "Effect bitmap word " + (word - 9);
        numeric(
          word,
          label,
          word >= 9
            ? "32 effect bits. Effect flag numbers differ from equipped item indices; preserve unknown flags."
            : "Raw big-endian word.",
          { format: (v) => hex(v, 8) },
        );
      }
      const flags = [];
      for (let n = 0; n < 12; n++)
        for (let bit = 0; bit < 32; bit++)
          if (original[n + 9] & (1 << bit)) flags.push(hex(n * 32 + bit));
      right.append(
        el("p", { class: "muted" }, "Current effect flags: " + (flags.join(", ") || "none")),
      );
    }
    right.append(grid);
    function readDraft() {
      return controls.map((c, i) => {
        try {
          c.input.removeAttribute("aria-invalid");
          return parseWord(c.input.value, c.absent);
        } catch (e) {
          c.input.setAttribute("aria-invalid", "true");
          c.input.focus();
          throw new Error("Word +" + hex(i * 4) + ": " + e.message);
        }
      });
    }
    function validate(row) {
      const errors = [],
        warnings = [];
      if (file.kind === "preset") {
        if (appearance && row[0] >= appearance.doc.count)
          errors.push("Appearance index is outside the loaded appearance table.");
        if (strength && row[1] >= strength.doc.count)
          errors.push("Strength index is outside the loaded strength table.");
        for (let n = 3; n < 11; n++)
          if (row[n] !== EMPTY && row[n] >= file.doc.count)
            errors.push(
              (n < 7 ? "Form" : "Fusion") +
                " link " +
                ((n - 3) % 4) +
                " is outside this preset table.",
            );
      }
      if (file.kind === "strength") {
        const items = files.find((f) => f.kind === "item");
        row.slice(2).forEach((v, n) => {
          if (!(v & 0x80000000) && v >= 381)
            warnings.push(
              "Equipment slot " +
                n +
                ": extra item ID " +
                v +
                (v >= 384
                  ? " exceeds the original 384-bit bitmap and can overwrite RAM; an engine expansion is required."
                  : " needs an expanded native effect loop."),
            );
          if (!(v & 0x80000000) && items && v >= items.doc.count)
            errors.push("Equipment slot " + n + " is outside the loaded item definitions.");
        });
      }
      if (file.kind === "appearance") {
        if (!(data(app).characters || []).some((x) => characterId(x) === row[0]))
          warnings.push(
            "Native ID is not in the active character catalog. Add the mod’s character list in Overview → Mod support if applicable.",
          );
        const moves = (data(app).moves || []).filter((x) => moveNative(x) === row[0]);
        if (moves.length && row.slice(3).some((v) => !moves.some((m) => moveId(m) === v)))
          warnings.push(
            "One or more local move selectors are absent from the resolved catalog; compatibility is unverified.",
          );
      }
      return { errors, warnings };
    }
    const currentIssues = validate(original);
    if (currentIssues.errors.length || currentIssues.warnings.length)
      right.append(
        el(
          "p",
          { class: "warning" },
          currentIssues.errors.concat(currentIssues.warnings).join(" "),
        ),
      );
    function applyDraft() {
      const pending = app.pendingForm;
      try {
        const row = readDraft(),
          issues = validate(row);
        if (issues.errors.length) throw new Error(issues.errors.join(" "));
        if (pending && pending.fileId === file.id) app.pendingForm = null;
        if (row.some((value, word) => value !== file.doc.row(index)[word])) {
          app.transact("Edit " + file.name + " row " + index, [file], () =>
            file.doc.setRow(index, row),
          );
        }
        if (issues.warnings.length) app.notify(issues.warnings.join(" "), "warning");
        else
          app.notify("Applied row " + index + ". Export the modified DAT when ready.", "success");
        return true;
      } catch (e) {
        if (pending) app.pendingForm = pending;
        notice.className = "warning";
        notice.textContent = e.message;
        app.notify(e.message, "warning");
        return false;
      }
    }
    function markDraft() {
      const changed = controls.some((c, word) => {
        try {
          return parseWord(c.input.value, c.absent) !== original[word];
        } catch (_) {
          return true;
        }
      });
      if (changed)
        app.pendingForm = {
          fileId: file.id,
          label: file.name + " row " + index,
          apply: applyDraft,
          discard: () => {
            app.pendingForm = null;
          },
        };
      else if (app.pendingForm && app.pendingForm.fileId === file.id) app.pendingForm = null;
    }
    grid.addEventListener("input", markDraft);
    grid.addEventListener("change", markDraft);
    const actions = el("div", { class: "toolbar" });
    actions.append(button("Apply row", applyDraft, "primary"));
    actions.append(
      button(
        "Reset form",
        () => {
          if (app.pendingForm && app.pendingForm.fileId === file.id) app.pendingForm = null;
          app.refresh();
        },
        "secondary",
      ),
    );
    actions.append(
      button(
        "Clone row",
        () => {
          if (!guardDraft()) return;
          try {
            app.transact("Clone " + file.name + " row " + index, [file], () => {
              state.index = file.doc.appendRow(file.doc.row(index));
              state.search = "";
              state.page = Math.floor(state.index / 80);
            });
            app.notify(
              "Cloned the saved row. Existing references still point to the original; set new links explicitly.",
              "success",
            );
          } catch (e) {
            notice.className = "warning";
            notice.textContent = e.message;
          }
        },
        "secondary",
        {
          title:
            "Applies valid form edits, then clones the record. Preset references are preserved.",
        },
      ),
    );
    if (file.kind === "preset") {
      actions.append(
        button(
          "Clone complete preset",
          () => {
            if (!guardDraft()) return;
            try {
              const p = file.doc.row(index),
                a = appearance.doc.row(p[0]),
                s = strength.doc.row(p[1]);
              app.transact("Clone complete preset " + index, [appearance, strength, file], () => {
                p[0] = appearance.doc.appendRow(a);
                p[1] = strength.doc.appendRow(s);
                const newIndex = file.doc.count;
                for (let n = 3; n < 11; n++) if (p[n] === index) p[n] = newIndex;
                state.index = file.doc.appendRow(p);
                state.search = "";
                state.page = Math.floor(state.index / 80);
              });
              app.notify(
                "Created independent appearance, strength and preset rows. Self-links follow the new preset; links to other forms still target their existing presets.",
                "success",
              );
            } catch (e) {
              notice.className = "warning";
              notice.textContent = e.message;
            }
          },
          "secondary",
          {
            disabled: !safeRow(appearance, original[0]) || !safeRow(strength, original[1]),
            title:
              "Applies valid form edits, then clones the preset and its appearance/equipment rows. Other linked forms are not cloned.",
          },
        ),
      );
    }
    if (embedded && file.kind !== "preset")
      Array.from(actions.children)
        .filter((b) => b.textContent === "Clone row")
        .forEach((b) => b.remove());
    right.append(actions);
    right.append(
      el(
        "p",
        { class: "muted" },
        "Valid row edits are applied before navigation or export. Invalid values keep this form open for correction. Reset form discards pending edits. Export each changed DAT and repack it with your usual tools.",
      ),
    );
  }
  function renderCharacterWorkspace(container, app) {
    const state = (app.ui.presets = app.ui.presets || { index: 0, search: "", page: 0 });
    const files = app.files.filter((f) => GEOMETRY[f.kind]),
      file =
        files.find((f) => f.id === state.fileId) ||
        files.find((f) => f.id === app.selectedFileId) ||
        files.find((f) => f.kind === "preset") ||
        files[0];
    if (!file || file.kind !== "preset") {
      renderDatTable(container, app);
      return;
    }
    state.fileId = file.id;
    state.index = Math.max(0, Math.min(Number(state.index) || 0, Math.max(0, file.doc.count - 1)));
    const appearance = findDependency(app, state, "appearance"),
      strength = findDependency(app, state, "strength");
    container.append(
      el(
        "section",
        { class: "panel" },
        el("p", { class: "eyebrow" }, "CHARACTER WORKSPACE"),
        el("h2", {}, tableTitle(file)),
        el(
          "p",
          { class: "muted" },
          "Choose a character preset in a container, then edit its form links, Appearance and Strength without leaving this character.",
        ),
      ),
    );
    const bar = el("div", { class: "panel toolbar" }),
      select = el("select", { "aria-label": "DAT table" });
    for (const f of files.filter((f) => f.kind === "preset"))
      select.append(el("option", { value: f.id }, tableTitle(f) + " — " + f.name));
    select.value = file.id;
    select.addEventListener("change", () => {
      if (!app.ensureApplied()) {
        select.value = file.id;
        return;
      }
      const target = files.find((f) => f.id === select.value);
      if (target.doc.count) app.openPreset(target, 0);
      else {
        state.fileId = target.id;
        state.index = 0;
        app.selectedFileId = target.id;
        app.refresh();
      }
    });
    bar.append(
      field("Preset container / mode", select),
      button("New character preset…", () => RB2.openNewPreset(app, file), "primary"),
      el("span", { class: "tag" }, file.doc.count + " characters / presets"),
    );
    const advanced = el(
      "details",
      { class: "advanced-dat-switch" },
      el("summary", {}, "Shared tables & global item definitions"),
    );
    for (const f of files.filter((f) => f.kind !== "preset"))
      advanced.append(
        button(
          tableTitle(f) + " — " + f.name,
          () => {
            if (!app.ensureApplied()) return;
            state.fileId = f.id;
            state.index = 0;
            state.search = "";
            state.page = 0;
            app.selectFile(f.id);
          },
          "record-button",
        ),
      );
    bar.append(advanced);
    container.append(bar);
    if (!file.doc.count) {
      container.append(
        el(
          "section",
          { class: "panel empty-state" },
          el("h3", {}, "This container has no characters yet"),
          button("Create first preset…", () => RB2.openNewPreset(app, file), "primary"),
        ),
      );
      return;
    }
    const left = el("aside", { class: "panel character-browser" }),
      right = el("div", { class: "character-details" }),
      layout = el("div", { class: "split-layout character-layout" }, left, right);
    container.append(layout);
    const search = el("input", {
        type: "search",
        "aria-label": "Search DAT records",
        placeholder: "Search character name or preset…",
        value: state.search || "",
      }),
      list = el("div", { class: "record-list", "aria-label": "Character presets" }),
      pager = el("div", { class: "toolbar" });
    left.append(search, list, pager);
    function paint() {
      const query = search.value.toLowerCase(),
        ids = Array.from({ length: file.doc.count }, (_, i) => i).filter((i) =>
          (i + " " + presetName(app, file, i, appearance)).toLowerCase().includes(query),
        ),
        pages = Math.max(1, Math.ceil(ids.length / 80));
      state.page = Math.max(0, Math.min(state.page || 0, pages - 1));
      list.replaceChildren();
      for (const i of ids.slice(state.page * 80, (state.page + 1) * 80)) {
        const a = safeRow(appearance, file.doc.row(i)[0]),
          b = button(
            "",
            () => {
              if (!app.ensureApplied()) return;
              state.index = i;
              app.refresh();
            },
            "record-button preset-record-card" + (i === state.index ? " selected" : ""),
            {
              "aria-label": "Preset " + i + " " + presetName(app, file, i, appearance),
              "aria-current": i === state.index ? "true" : "false",
            },
          );
        b.append(
          a ? portrait(app, a[0]) : el("span", { class: "portrait-placeholder" }, "?"),
          el(
            "span",
            {},
            el("strong", {}, presetName(app, file, i, appearance)),
            el("small", {}, "Preset #" + i),
          ),
        );
        list.append(b);
      }
      pager.replaceChildren(
        button(
          "Previous",
          () => {
            state.page--;
            paint();
          },
          "secondary",
          { disabled: !state.page },
        ),
        el("span", { class: "muted" }, ids.length + " results · " + (state.page + 1) + "/" + pages),
        button(
          "Next",
          () => {
            state.page++;
            paint();
          },
          "secondary",
          { disabled: state.page + 1 >= pages },
        ),
      );
    }
    search.addEventListener("input", () => {
      state.search = search.value;
      state.page = 0;
      paint();
    });
    paint();
    const preset = file.doc.row(state.index),
      a = safeRow(appearance, preset[0]);
    right.append(
      el(
        "section",
        { class: "panel character-heading" },
        a ? portrait(app, a[0]) : null,
        el(
          "div",
          {},
          el("h2", {}, presetName(app, file, state.index, appearance)),
          el("p", { class: "muted" }, "Preset #" + state.index + " · " + file.name),
        ),
      ),
    );
    if (app.ui.returnMission) {
      const back = app.ui.returnMission;
      right.append(
        button(
          "← Back to mission " + back.node,
          () => {
            if (!app.ensureApplied()) return;
            app.selectFile(back.fileId);
          },
          "secondary",
        ),
      );
    }
    const tabs = el("nav", { class: "subtabs", "aria-label": "Character editor sections" });
    state.characterTab = state.characterTab || "links";
    for (const [key, label] of [
      ["links", "Preset & transformations"],
      ["appearance", "Appearance & moves"],
      ["strength", "Strength & equipment"],
    ])
      tabs.append(
        button(
          label,
          () => {
            if (!app.ensureApplied()) return;
            state.characterTab = key;
            app.refresh();
          },
          "subtab" + (state.characterTab === key ? " active" : ""),
        ),
      );
    right.append(tabs);
    const kind = state.characterTab;
    if (kind === "links") {
      renderDatTable(right, app, { file, state });
      return;
    }
    const dependency = kind === "appearance" ? appearance : strength,
      at = kind === "appearance" ? 0 : 1;
    if (!dependency) {
      const expected = "preset_" + kind + "_table.dat";
      right.append(
        el(
          "section",
          { class: "panel empty-state" },
          el("h3", {}, "Load " + expected),
          el(
            "p",
            {},
            "This preset references a shared " +
              kind +
              " table. Open that individual DAT to edit the character here.",
          ),
          button("Load " + expected + "…", () => app.loadDependency(kind), "primary"),
        ),
      );
      return;
    }
    const choices = files.filter((f) => f.kind === kind);
    if (choices.length > 1) {
      const options = el("select", { "aria-label": kind + " dependency" });
      choices.forEach((f) => options.append(el("option", { value: f.id }, f.name)));
      options.value = dependency.id;
      options.addEventListener("change", () => {
        if (!app.ensureApplied()) return;
        state[kind + "FileId"] = options.value;
        app.refresh();
      });
      right.append(field("Use shared " + kind + " table", options));
    }
    const toolbar = el("div", { class: "panel toolbar" }),
      valid = preset[at] < dependency.doc.count;
    const setLink = (id) =>
      app.transact("Assign " + kind + " record", [file], () => {
        const row = file.doc.row(state.index);
        row[at] = id;
        file.doc.setRow(state.index, row);
      });
    toolbar.append(
      button(
        "Create new " + kind + " for this character…",
        () => RB2.newDatRow(app, dependency, null, { file, index: state.index, at }),
        "primary",
      ),
    );
    if (valid)
      toolbar.append(
        button("Make this " + kind + " independent", () => {
          if (!app.ensureApplied()) return;
          app.transact("Detach shared " + kind, [file, dependency], () => {
            const row = file.doc.row(state.index);
            row[at] = dependency.doc.appendRow(dependency.doc.row(row[at]));
            file.doc.setRow(state.index, row);
          });
        }),
      );
    const link = el("input", {
      type: "number",
      min: 0,
      max: Math.max(0, dependency.doc.count - 1),
      "aria-label": "Existing " + kind + " record",
      value: valid ? preset[at] : 0,
    });
    toolbar.append(
      field("Use existing record", link),
      button("Link record", () => {
        if (!app.ensureApplied()) return;
        const id = Number(link.value);
        if (!Number.isInteger(id) || id < 0 || id >= dependency.doc.count) {
          app.notify("Choose an existing record in this shared table.", "error");
          return;
        }
        setLink(id);
      }),
    );
    right.append(toolbar);
    if (!valid) {
      right.append(
        el(
          "section",
          { class: "panel empty-state" },
          el("h3", {}, "This character has no assigned " + kind),
          el(
            "p",
            {},
            "Create a new record above, or link an existing one. An unassigned preset is a draft and must be completed before game export.",
          ),
        ),
      );
      return;
    }
    renderDatTable(right, app, {
      file: dependency,
      state: { ...state, fileId: dependency.id, index: preset[at], search: "", page: 0 },
    });
  }
  RB2.renderDatTable = renderDatTable;
  RB2.renderPresets = renderCharacterWorkspace;
})(typeof globalThis !== "undefined" ? globalThis : window);
