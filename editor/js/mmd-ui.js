(function () {
  "use strict";
  const R = (window.RB2 = window.RB2 || {});
  const NS = "http://www.w3.org/2000/svg";
  const CATEGORIES = [
    "Ordinary A",
    "Ordinary B",
    "Perfect Action",
    "Bonus",
    "Boss",
    "Common A",
    "Common B",
    "Unknown 7",
    "Tutorial",
  ].map((name, id) => ({ id, name }));
  const DIFFICULTIES = [
    "Tutorial",
    "Very Easy",
    "Easy",
    "Normal",
    "Hard",
    "Very Hard",
    "Ultimate",
  ].map((name, id) => ({ id, name }));
  const OPS = [
    { id: 16, name: "Query" },
    { id: 33, name: "Add" },
    { id: 34, name: "Subtract" },
    { id: 35, name: "Multiply" },
    { id: 36, name: "Signed divide" },
    { id: 37, name: "OR" },
    { id: 38, name: "AND" },
    { id: 39, name: "NOT" },
    { id: 40, name: "Negate" },
    { id: 41, name: "Equals" },
    { id: 42, name: "Not equal" },
    { id: 43, name: "Less than" },
    { id: 44, name: "Greater than" },
    { id: 45, name: "Less or equal" },
    { id: 46, name: "Greater or equal" },
  ];
  const QUERY = [
    { id: 1, name: "Runtime statistic (context dependent)" },
    { id: 2, name: "MAIN mission flag 0x08" },
    { id: 3, name: "MAIN mission flag 0x02" },
    { id: 4, name: "Always zero" },
    { id: 5, name: "Selected Galaxy character equals argument" },
    { id: 6, name: "Identity / argument value" },
  ];
  const h = R.ui.el;
  const btn = (label, fn, cls = "secondary") =>
    h("button", { type: "button", class: cls, onClick: fn }, label);
  const note = (text) => h("p", { class: "muted helper-text" }, text);
  const warning = (text) => h("p", { class: "warning" }, text);
  const panel = (title, ...nodes) =>
    h("section", { class: "panel mmd-panel" }, h("h3", {}, title), ...nodes);
  const details = (title, ...nodes) =>
    h("details", { class: "mmd-details" }, h("summary", {}, title), ...nodes);
  const hex = (n) => "0x" + Number(n).toString(16).toUpperCase();
  const dv = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = (bytes, offset) => dv(bytes).getUint32(offset, false);
  const put32 = (bytes, offset, value) => dv(bytes).setUint32(offset, value, false);
  const bytesHex = (bytes) =>
    Array.from(bytes, (x) => x.toString(16).padStart(2, "0").toUpperCase()).join(" ");
  function parseInteger(value, max = 0xffffffff, signed = false) {
    const s = String(value).trim();
    if (!/^(?:0x[0-9a-f]+|-?\d+)$/i.test(s))
      throw Error("Enter a decimal integer or a hexadecimal value beginning with 0x.");
    const n = Number(s);
    if (!Number.isSafeInteger(n) || n < (signed ? -0x80000000 : 0) || n > max)
      throw Error("Value is outside the allowed range.");
    return n;
  }
  function parseHex(text) {
    const s = String(text).replace(/\s+/g, "");
    if (!/^(?:[0-9a-f]{2})*$/i.test(s))
      throw Error("Hex data must contain complete byte pairs, separated by spaces if desired.");
    return Uint8Array.from(s.match(/../g) || [], (b) => parseInt(b, 16));
  }
  function intInput(value, onChange, opts = {}) {
    const n = h("input", {
      type: "text",
      class: "numeric-input",
      value: String(value),
      inputMode: "numeric",
      ...opts,
    });
    if (onChange) n.addEventListener("change", () => onChange(n.value));
    return n;
  }
  function field(label, control, help) {
    return h(
      "label",
      { class: "field" },
      h("span", { class: "field-label" }, label),
      control,
      help ? h("small", { class: "muted" }, help) : null,
    );
  }
  function namedSelect(value, values, onChange, emptyLabel) {
    const select = h("select", { "aria-label": emptyLabel || "Choose value" });
    const rows = (values || []).map((v) => ({
      id: Number(v.id),
      name: v.name ?? v.text ?? String(v.id),
    }));
    if (!rows.some((r) => r.id === Number(value)))
      select.append(
        h("option", { value: String(value) }, `${value} · ${emptyLabel || "Unlisted / raw value"}`),
      );
    rows.forEach((v) => select.append(h("option", { value: String(v.id) }, `${v.id} · ${v.name}`)));
    select.value = String(value);
    select.addEventListener("change", () => onChange(Number(select.value)));
    return select;
  }
  function numericNamed(value, values, change, opts = {}) {
    return h(
      "div",
      { class: "named-number" },
      intInput(value, change, opts),
      values?.length ? namedSelect(value, values, change) : null,
    );
  }
  function assertRef(doc, ref) {
    if (ref !== 0 && (!Number.isInteger(ref) || ref < 0 || ref >= doc.descriptors.length))
      throw Error(`Descriptor ${ref} does not exist.`);
  }
  function readList(doc, ref, width) {
    if (!ref) return [];
    const d = doc.descriptors[ref];
    if (!d || d[1] !== width)
      throw Error(
        `Expected ${width}-byte records at descriptor ${ref}; preserve this data in Advanced.`,
      );
    const data = doc.body(ref),
      v = dv(data),
      out = [];
    for (let p = 0; p < data.length; p += width)
      out.push(width === 2 ? v.getUint16(p, false) : v.getUint32(p, false));
    return out;
  }
  function writeList(doc, node, offset, values, width) {
    const data = new Uint8Array(values.length * width),
      v = dv(data);
    values.forEach((n, i) =>
      width === 2 ? v.setUint16(i * width, n, false) : v.setUint32(i * width, n, false),
    );
    doc.setList(node, offset, data, width);
  }
  function appendExpr(doc, bytes) {
    return bytes && bytes.length ? doc.append(bytes, 1, bytes.length) : 0;
  }
  function expressionBytes(tokens) {
    const b = new Uint8Array(tokens.length * 8),
      v = dv(b);
    tokens.forEach((t, i) => {
      v.setUint32(i * 8, t.kind, false);
      v.setInt32(i * 8 + 4, t.operand, false);
    });
    return b;
  }
  function tokensFromBytes(bytes) {
    if (bytes.length % 8) throw Error("Expression records must be eight bytes each.");
    const out = [],
      v = dv(bytes);
    for (let p = 0; p < bytes.length; p += 8)
      out.push({ kind: v.getUint32(p, false), operand: v.getInt32(p + 4, false) });
    return out;
  }
  function conditionContext(ctx) {
    const owner = Number(ctx.state.owner),
      selected = Number(ctx.state.previewNative);
    return {
      mode: ctx.mode,
      selectedNative:
        Number.isInteger(owner) && owner >= 0
          ? owner
          : Number.isInteger(selected) && selected >= 0
            ? selected
            : undefined,
      characterName: (id) => ctx.app.characterName(id),
    };
  }
  function conditionSummary(ctx, ref) {
    return R.Conditions.inspect(ctx.file.doc, ref, conditionContext(ctx));
  }
  function safe(ctx, fn) {
    try {
      return fn();
    } catch (e) {
      ctx.app.notify(e.message, "error");
      return undefined;
    }
  }
  function change(ctx, label, fn) {
    if (ctx._applyingDraft) {
      fn(ctx.file.doc);
      return true;
    }
    try {
      if (!ctx._applyingDraft && ctx.app.pendingForm && !ctx.app.ensureApplied()) return false;
      ctx.app.transact(label, [ctx.file], () => fn(ctx.file.doc));
      return true;
    } catch (e) {
      ctx.app.notify(e.message, "error");
      return false;
    }
  }
  function refresh(ctx) {
    if (!ctx.app.ensureApplied || ctx.app.ensureApplied()) ctx.app.refresh();
  }
  function draftTracker(ctx, label, apply) {
    if (!ctx.drafts) ctx.drafts = new Map();
    const key = {};
    const pending = {
      fileId: ctx.file.id,
      label: "MMD form changes",
      discard: () => {
        ctx.drafts.clear();
        ctx.app.pendingForm = null;
      },
      apply: () => {
        ctx._applyingDraft = true;
        try {
          ctx.app.transact("Apply mission form changes", [ctx.file], () => {
            for (const task of ctx.drafts.values())
              if (task() === false)
                throw Error(
                  "A mission form could not be applied. Fix the highlighted values or discard its draft.",
                );
          });
          ctx.drafts.clear();
          ctx.app.pendingForm = null;
          return true;
        } catch (e) {
          ctx.app.pendingForm = pending;
          ctx.app.notify(e.message, "error");
          return false;
        } finally {
          ctx._applyingDraft = false;
        }
      },
    };
    return {
      mark: () => {
        ctx.drafts.set(key, apply);
        ctx.app.pendingForm = pending;
      },
      clear: () => {
        ctx.drafts.delete(key);
        if (!ctx.drafts.size && ctx.app.pendingForm?.fileId === ctx.file.id)
          ctx.app.pendingForm = null;
      },
      apply: () => {
        ctx.drafts.set(key, apply);
        ctx.app.pendingForm = pending;
        return pending.apply();
      },
    };
  }
  function rootRef(ctx, offset) {
    return u32(ctx.file.doc.readRoot(ctx.node), offset);
  }
  function setRootRef(doc, node, offset, ref) {
    assertRef(doc, ref);
    const row = doc.readRoot(node);
    put32(row, offset, ref);
    doc.writeRoot(node, row);
  }
  function rootValue(ctx, offset, type = "u32") {
    const b = ctx.file.doc.readRoot(ctx.node),
      v = dv(b);
    return type === "f32"
      ? v.getFloat32(offset, false)
      : type === "u16"
        ? v.getUint16(offset, false)
        : v.getUint32(offset, false);
  }
  const zoneCell = R.Authoring.zoneCell;
  function validZonePoint(x, y) {
    return R.Authoring.validZonePoint(x, y);
  }
  function occupiedZoneCells(doc) {
    const cells = new Set();
    for (let i = 0; i < doc.rootCount; i++) {
      const row = dv(doc.readRoot(i)),
        x = row.getFloat32(0, false),
        y = row.getFloat32(4, false);
      if (Number.isFinite(x) && Number.isFinite(y))
        cells.add(zoneCell(Math.trunc(x), Math.trunc(y)));
    }
    return cells;
  }
  function freeZonePoint(doc) {
    const occupied = occupiedZoneCells(doc);
    for (let y = 6; y >= 0; y--)
      for (let x = 0; x <= 2; x++)
        if (validZonePoint(x, y) && !occupied.has(zoneCell(x, y))) return { x, y };
    return null;
  }
  function setValue(ctx, offset, type, label, value) {
    change(ctx, `Change ${label}`, (doc) => {
      let n =
        type === "f32" ? Number(value) : parseInteger(value, type === "u16" ? 65535 : 0xffffffff);
      if (!Number.isFinite(n) || Math.abs(n) > 3.4028234663852886e38)
        throw Error("Coordinate must be a finite 32-bit float.");
      if (
        ctx.mode === "zone" &&
        type === "f32" &&
        (offset === 0 || offset === 4) &&
        !validZonePoint(
          offset === 0 ? n : rootValue(ctx, 0, "f32"),
          offset === 4 ? n : rootValue(ctx, 4, "f32"),
        )
      )
        throw Error(
          "Battle Zone positions must use integer grid coordinates: X = 0, 1 or 2; Y = 0–6, with saved cell 0–20. X=2, Y=0 exceeds the saved range.",
        );
      const row = doc.readRoot(ctx.node),
        v = dv(row);
      if (type === "f32") v.setFloat32(offset, n, false);
      else if (type === "u16") v.setUint16(offset, n, false);
      else v.setUint32(offset, n, false);
      doc.writeRoot(ctx.node, row);
    });
  }
  function valueField(ctx, label, offset, type = "u32", names, help) {
    const value = rootValue(ctx, offset, type),
      changeValue = (v) => setValue(ctx, offset, type, label, v);
    const control = names?.length
      ? numericNamed(value, names, changeValue)
      : intInput(value, changeValue, { inputMode: type === "f32" ? "decimal" : "numeric" });
    control.addEventListener("input", (e) => {
      const n = Number(e.target.value);
      if (e.target.value.trim() && Number.isFinite(n)) {
        ctx.previewValues = ctx.previewValues || {};
        ctx.previewValues[offset] = n;
        ctx.previewHosts?.forEach((host) => R.GamePreview.update(host, ctx, ctx.previewValues));
      }
    });
    return field(
      `${label} · +${offset.toString(16).toUpperCase().padStart(2, "0")}`,
      control,
      help,
    );
  }
  function choosePresetTable(ctx) {
    const tables = ctx.app.files.filter((f) => f.kind === "preset");
    if (ctx.state.presetFile && tables.some((f) => f.id === ctx.state.presetFile))
      return tables.find((f) => f.id === ctx.state.presetFile);
    let match;
    if (ctx.mode === "zone")
      match = tables.find(
        (f) =>
          /battle_zone/.test(f.name) &&
          (/ultimate|_spe/.test(ctx.file.name) ? /spe|ultimate/.test(f.name) : /nor/.test(f.name)),
      );
    else
      match = tables.find((f) =>
        new RegExp(/tutorial/i.test(ctx.file.name) ? "tutorial" : "galaxy", "i").test(f.name),
      );
    return match || null;
  }
  function presetIdentity(ctx, index) {
    const table = choosePresetTable(ctx),
      apps = ctx.app.files.filter((f) => f.kind === "appearance");
    const appearance = apps.find((f) => f.id === ctx.app.ui?.presets?.appearanceFileId) || apps[0];
    let native = null;
    try {
      if (table && appearance) native = appearance.doc.row(table.doc.row(index)[0])[0];
    } catch (_) {}
    return {
      native,
      label: ctx.app.presetLabel ? ctx.app.presetLabel(index, table) : `Preset ${index}`,
    };
  }
  function presetCard(ctx, index) {
    const info = presetIdentity(ctx, index),
      image = info.native === null ? null : ctx.app.portrait?.(info.native);
    return h(
      "div",
      { class: "preset-chip" },
      image
        ? h("img", {
            class: "character-portrait",
            src: image,
            alt: ctx.app.characterName?.(info.native) || "Character",
            loading: "lazy",
          })
        : h("span", { class: "portrait-placeholder" }, "?"),
      h("span", {}, info.label),
    );
  }
  function presetSelector(ctx, index, onChange) {
    const table = choosePresetTable(ctx);
    const values = table
      ? Array.from({ length: table.doc.count }, (_, id) => ({
          id,
          name: (ctx.app.presetLabel?.(id, table) || `Preset ${id}`).replace(/^#?\d+\s*·\s*/, ""),
        }))
      : [];
    return numericNamed(index, values, onChange);
  }
  function presetTableSelector(ctx) {
    const tables = ctx.app.files.filter((f) => f.kind === "preset"),
      chosen = choosePresetTable(ctx);
    if (!tables.length)
      return note(
        "Open the matching preset DAT and appearance DAT to show character names and portraits. Numeric preset references remain editable.",
      );
    const s = h("select", { "aria-label": "Preset table used for labels" });
    tables.forEach((f) => s.append(h("option", { value: f.id }, f.name)));
    s.value = chosen?.id || "";
    s.addEventListener("change", () => {
      ctx.state.presetFile = s.value;
      refresh(ctx);
    });
    return field(
      "Preset table for character labels",
      s,
      "Choose Galaxy, Tutorial, normal Battle Zone or Ultimate Zone to match this MMD. This does not change the game’s preset namespace.",
    );
  }

  function guidedExpression(ctx, ast, onUse) {
    const rule = R.Conditions.simple(ast),
      box = h("div", { class: "guided-expression" }),
      mode = h("select", { "aria-label": "Simple condition type" }),
      controls = h("div", { class: "grid field-grid" });
    const choices = [
      ["custom", "Custom expression — preserve existing tokens"],
      ["always", "Always / no extra condition"],
      ["never", "Never"],
      ...(ctx.mode === "main"
        ? [
            ["galaxy", "Playing any of the selected Galaxies"],
            ["except", "Playing any Galaxy except…"],
            ["flag2", "Another mission has been cleared"],
            ["flag3", "Another mission is unlocked / available"],
          ]
        : []),
      ["stat", "Battle statistic / result condition"],
    ];
    choices.forEach(([value, label]) => mode.append(h("option", { value }, label)));
    mode.value =
      rule.kind === "query"
        ? { 1: "stat", 2: "flag2", 3: "flag3", 5: "galaxy" }[rule.type] || "custom"
        : rule.kind;
    if (
      !choices.some(([id]) => id === mode.value) ||
      (rule.kind === "query" && rule.type !== 1 && rule.comparison !== "truthy")
    )
      mode.value = "custom";
    let argument = rule.argument ?? 14,
      comparison = rule.comparison || ">=",
      target = rule.value ?? 30;
    const galaxyIds = new Set(
      rule.natives ||
        (rule.argument !== undefined &&
        (rule.kind === "except" || (rule.kind === "query" && rule.type === 5))
          ? [rule.argument]
          : []),
    );
    const comparisonOptions = [
      ["truthy", "Is true / nonzero"],
      [">=", "Is at least"],
      ["<=", "Is at most"],
      ["==", "Equals"],
      ["!=", "Does not equal"],
      [">", "Is greater than"],
      ["<", "Is less than"],
    ];
    const render = () => {
      controls.replaceChildren();
      const m = mode.value;
      if (m === "galaxy" || m === "except") {
        const search = h("input", {
            type: "search",
            placeholder: "Find a Galaxy…",
            "aria-label": "Find condition Galaxy",
          }),
          list = h("div", { class: "condition-galaxies", "aria-label": "Condition Galaxies" }),
          ids = new Set([
            ...galaxyIds,
            ...Array.from({ length: ctx.file.doc.ownersCount }, (_, id) => id),
          ]),
          rows = [...ids].map((id) => {
            const check = h("input", { type: "checkbox", checked: galaxyIds.has(id) });
            check.onchange = () => (check.checked ? galaxyIds.add(id) : galaxyIds.delete(id));
            return {
              name: ctx.app.characterName(id),
              element: h("label", { class: "checkbox-label" }, check, ctx.app.characterName(id)),
            };
          });
        rows.forEach((row) => list.append(row.element));
        search.oninput = () =>
          rows.forEach(
            (row) =>
              (row.element.hidden = !row.name.toLowerCase().includes(search.value.toLowerCase())),
          );
        controls.append(
          note(
            "Select every Galaxy that matches. Selected characters are joined with OR; Except excludes the whole selection. These are native character IDs, not preset IDs.",
          ),
          search,
          list,
        );
      } else if (m === "flag2" || m === "flag3")
        controls.append(
          field(
            "Mission ID",
            intInput(argument, (v) => {
              argument = parseInteger(v, 0x7fffffff);
            }),
            m === "flag2"
              ? "True when this mission has already been cleared. Use this for an Unlock after mission prerequisite. Query type 2 reads the clear-history bit 0x08 (returns 8 or 0), not the currently highlighted mission."
              : "True when this mission is unlocked / available, even before its first victory. This is separate from merely being visible on the map. Query type 3 reads bit 0x02 (returns 2 or 0). Availability is derived from the MMD gates and saved progression.",
          ),
        );
      else if (m === "stat") {
        const hint = note(
          R.Conditions.statistics.find((x) => x.id === argument)?.help ||
            "Unmapped statistic. Keep the existing argument unless its meaning has been verified.",
        );
        controls.append(
          field(
            "Battle statistic",
            numericNamed(argument, R.Conditions.statistics, (v) => {
              argument = parseInteger(v, 16);
              hint.textContent =
                R.Conditions.statistics.find((x) => x.id === argument)?.help ||
                "Unmapped statistic.";
            }),
          ),
          hint,
        );
        const select = h("select", { "aria-label": "Statistic comparison" });
        comparisonOptions.forEach(([value, label]) => select.append(h("option", { value }, label)));
        select.value = comparison;
        select.onchange = () => {
          comparison = select.value;
        };
        controls.append(
          field("Comparison", select),
          field(
            "Threshold",
            intInput(target, (v) => {
              target = parseInteger(v, 0x7fffffff, true);
            }),
            "For remaining health, 30 means 30%, not 30,000 HP. Ignored for Is true / nonzero.",
          ),
        );
      } else
        controls.append(
          note(
            m === "custom"
              ? "This expression is preserved. Choose a simple condition to replace it, or open the individual tokens below."
              : m === "always"
                ? "No additional gate. The surrounding battle/reward flow still applies."
                : "Always false at this condition.",
          ),
        );
    };
    mode.onchange = render;
    box.append(
      field("Build a readable condition", mode),
      controls,
      note(
        "Use simple condition prepares a draft. Apply expression saves it. End: 0 is added automatically.",
      ),
      btn("Use simple condition", () =>
        safe(ctx, () => {
          const m = mode.value;
          onUse(
            R.Conditions.encodeSimple(
              m === "galaxy" || m === "except"
                ? { kind: m, natives: [...galaxyIds] }
                : m === "stat"
                  ? { kind: "query", type: 1, argument, comparison, value: target }
                  : m === "flag2" || m === "flag3"
                    ? { kind: "query", type: m === "flag2" ? 2 : 3, argument, comparison: "truthy" }
                    : { kind: m, argument },
            ),
          );
        }),
      ),
    );
    render();
    return box;
  }

  function zoneRoutePanel(ctx) {
    const info = R.Conditions.zoneRoutes(ctx.file.doc, ctx.node, ctx.file.name),
      box = panel(
        "Where this stage can lead",
        note(
          "Routes are editable in this MMD. Add, remove or redirect Next stage nodes on the Route tab. More than one ordinary destination lets the player choose.",
        ),
        btn("Edit next-stage links", () => {
          ctx.state.tab = "map";
          refresh(ctx);
        }),
        note("Secret unlock requirement: " + info.requirement + "."),
        h("h4", {}, "Secret-route action cannot be edited in Galaxy Studio"),
        note(
          "The action that unlocks a secret route is defined by the executable for the current Normal/Ultimate Zone slot. Galaxy Studio cannot change that action. Editing the stored +30 expression or adding a route link does not create or override a native unlock requirement.",
        ),
        note(
          "For a freely selectable fork, make both destinations ordinary (Stage kind 0–7). A secret destination (8–15) uses the Zone’s native unlock instead of an ordinary player choice. With an ordinary and a secret destination, the ordinary route is used while the secret unlock is inactive. If the Zone slot has no native secret trigger, adding a secret link does not unlock that route.",
        ),
        details(
          "What can I change without editing the executable?",
          note(
            "Edit next-stage links to choose destinations. On the Battle tab, edit a destination’s Stage kind: 0–7 is ordinary, 8–15 is secret. Enemy presets, arenas, handicaps and rewards are also editable.",
          ),
          note(
            "The native unlock requirement belongs to the whole Zone slot, not to a particular source battle. Adding a fork to another battle uses that same requirement. A successful unlock may stay active during the run; renaming the file does not move its native slot rule.",
          ),
        ),
      );
    for (const route of info.routes)
      box.append(
        h(
          "div",
          { class: "route-explanation" },
          h(
            "strong",
            {},
            "Mission " +
              route.id +
              (route.invalid
                ? " · invalid link"
                : route.secret
                  ? " · Secret route"
                  : " · Ordinary route"),
          ),
          route.invalid
            ? null
            : details(
                "Stored destination expression (research)",
                note(
                  route.condition +
                    ". Preserved for file fidelity; not a verified unlock override.",
                ),
              ),
          route.invalid
            ? null
            : btn("Open destination " + route.id, () => {
                ctx.state.node = route.id;
                refresh(ctx);
              }),
        ),
      );
    if (!info.routes.length) box.append(note("No next-stage links: this route ends here."));
    box.append(
      note(
        "Reward conditions (+2C) are evaluated in the post-battle reward flow. They do not choose a route. The stock native secret check does not evaluate the condition stored at +30; editing it alone is not a verified way to change secret requirements.",
      ),
    );
    return box;
  }

  function expressionEditor(
    ctx,
    ref,
    onApply,
    title = "Condition expression",
    help = "Absent means no condition. Existing references are preserved until you apply a change.",
  ) {
    const d = ctx.file.doc,
      wrap = details(`${title} · ${conditionSummary(ctx, ref).text}`);
    wrap.append(note(help));
    let tokens = [];
    try {
      if (ref) tokens = tokensFromBytes(d.body(ref));
    } catch (e) {
      wrap.append(warning(e.message));
    }
    const rows = h("div", { class: "expression-tokens" }),
      preview = h("output", { class: "expression-preview" });
    const constant = intInput(1, null),
      argument = intInput(
        ctx.mode === "main" ? Math.max(0, Number(ctx.state.owner || 0)) : 0,
        null,
      );
    const query = namedSelect(ctx.mode === "main" ? 5 : 6, QUERY, () => {});
    let ready = false;
    const draft = draftTracker(ctx, title, () => {
      if (tokens.length && !tokens.some((t) => t.kind === 0)) tokens.push({ kind: 0, operand: 0 });
      const bytes = tokens.length ? expressionBytes(tokens) : null;
      if (bytes) {
        const result = R.Mmd.validateExpression(bytes);
        if (!result.valid) throw Error((result.issues || ["Invalid expression"]).join("; "));
      }
      return onApply(bytes);
    });
    const refreshPreview = () => {
      if (ready) draft.mark();
      try {
        if (!tokens.length) {
          preview.textContent = "No expression / reference 0";
          preview.className = "expression-preview";
          return;
        }
        const check = R.Mmd.validateExpression(expressionBytes(tokens));
        preview.textContent = check.valid
          ? R.Conditions.describe(check.ast, conditionContext(ctx))
          : Array.from(check.issues || ["Invalid expression"]).join("; ");
        preview.className = "expression-preview " + (check.valid ? "valid" : "warning");
      } catch (e) {
        preview.textContent = e.message;
        preview.className = "expression-preview warning";
      }
    };
    const renderRows = () => {
      rows.replaceChildren();
      tokens.forEach((token, i) => {
        const kind = namedSelect(
          token.kind,
          [
            { id: 0, name: "End" },
            { id: 1, name: "Operator" },
            { id: 2, name: "Number" },
          ],
          (value) => {
            token.kind = value;
            renderRows();
          },
        );
        const operand = intInput(token.operand, (value) =>
          safe(ctx, () => {
            token.operand = parseInteger(value, 0x7fffffff, true);
            refreshPreview();
          }),
        );
        const op =
          token.kind === 1
            ? namedSelect(token.operand, OPS, (value) => {
                token.operand = value;
                operand.value = String(value);
                refreshPreview();
              })
            : null;
        rows.append(
          h(
            "div",
            { class: "token-row" },
            h("span", { class: "row-index" }, String(i)),
            kind,
            operand,
            op,
            h(
              "small",
              { class: "token-explanation" },
              R.Conditions.tokenExplanation(tokens, i, conditionContext(ctx)),
            ),
            btn(
              "Remove",
              () => {
                tokens.splice(i, 1);
                renderRows();
              },
              "danger small",
            ),
          ),
        );
      });
      refreshPreview();
    };
    let ast = 1;
    try {
      if (tokens.length) ast = R.Mmd.parseExpression(expressionBytes(tokens)).ast;
    } catch (_) {
      ast = { op: "CUSTOM", args: [] };
    }
    wrap.append(
      guidedExpression(ctx, ast, (bytes) => {
        tokens = bytes ? tokensFromBytes(bytes) : [];
        renderRows();
      }),
    );
    const raw = details(
      "Individual tokens (advanced)",
      note(
        "The program uses postfix order: argument, query type, Operator 16. Number 38 + Number 5 + Operator 16 asks whether the selected Galaxy is native character 38 (Raditz). End: 0 MUST finish a stored program; it is inserted on Apply if missing. Token kind 2 means Number; kind 1 means Operator; kind 0 means End.",
      ),
    );
    raw.append(
      h(
        "div",
        { class: "toolbar" },
        constant,
        btn("Use constant", () =>
          safe(ctx, () => {
            tokens = [
              { kind: 2, operand: parseInteger(constant.value, 0x7fffffff, true) },
              { kind: 0, operand: 0 },
            ];
            renderRows();
          }),
        ),
        query,
        argument,
        btn("Use query", () =>
          safe(ctx, () => {
            tokens = [
              { kind: 2, operand: parseInteger(argument.value, 0x7fffffff, true) },
              { kind: 2, operand: Number(query.value) },
              { kind: 1, operand: 16 },
              { kind: 0, operand: 0 },
            ];
            renderRows();
          }),
        ),
      ),
    );
    raw.append(
      note(
        "Queries push the argument, then the query type. Mission-state queries use mission IDs; selected-Galaxy queries use native character IDs. Battle Zone callback meanings may differ.",
      ),
    );
    raw.append(
      rows,
      h(
        "div",
        { class: "toolbar" },
        btn("Add number", () => {
          const i = tokens.findIndex((t) => t.kind === 0);
          tokens.splice(i < 0 ? tokens.length : i, 0, { kind: 2, operand: 1 });
          renderRows();
        }),
        btn("Add operator", () => {
          const i = tokens.findIndex((t) => t.kind === 0);
          tokens.splice(i < 0 ? tokens.length : i, 0, { kind: 1, operand: 41 });
          renderRows();
        }),
        btn("Add end", () => {
          tokens.push({ kind: 0, operand: 0 });
          renderRows();
        }),
      ),
    );
    wrap.append(raw, preview);
    wrap.append(
      h(
        "div",
        { class: "toolbar" },
        btn("Apply expression", () => draft.apply(), "primary"),
        btn(
          "Clear expression",
          () => {
            tokens = [];
            draft.apply();
          },
          "danger",
        ),
        btn("Discard expression draft", () => {
          draft.clear();
          refresh(ctx);
        }),
      ),
    );
    renderRows();
    ready = true;
    return wrap;
  }
  function rootExpression(ctx, offset, title, help) {
    return expressionEditor(
      ctx,
      rootRef(ctx, offset),
      (bytes) => change(ctx, `Edit ${title}`, (doc) => doc.setExpression(ctx.node, offset, bytes)),
      `${title} · +${offset.toString(16).toUpperCase()}`,
      help,
    );
  }

  function missionPanel(ctx) {
    const data = ctx.app.data || {},
      main = ctx.mode === "main";
    const box = panel(
      main ? "Battle setup" : "Battle Zone stage",
      note(
        main
          ? "The mission record chooses the arena, music, objective and map category. Fighters and equipment are linked separately."
          : "Each row is a playable fight, including stage kind 0. Saved progress uses normal/Ultimate mode, zone slot and grid position.",
      ),
    );
    const fields = h(
      "div",
      { class: "grid field-grid" },
      valueField(ctx, "Map X", 0, "f32"),
      valueField(ctx, "Map Y", 4, "f32"),
    );
    if (main) {
      if (R.Authoring.isGalaxy(ctx.file))
        box.append(
          h(
            "div",
            { class: "toolbar mission-management" },
            btn("Move to another Galaxy…", () => R.openMoveMission(ctx)),
            btn("Delete mission…", () => R.openDeleteMission(ctx), "danger"),
          ),
        );
      fields.append(
        valueField(
          ctx,
          "Arena",
          8,
          "u16",
          data.stages,
          "Selector 14 is used by all original Tutorial missions (Tutorial / Practice). Its use as an ordinary Galaxy arena has not been verified.",
        ),
        valueField(
          ctx,
          "Music",
          12,
          "u16",
          R.Music.options(ctx),
          R.Music.help(ctx, rootValue(ctx, 12, "u16")),
        ),
        valueField(ctx, "Mission category", 10, "u16", CATEGORIES),
        valueField(ctx, "Displayed difficulty", 14, "u16", DIFFICULTIES),
        valueField(ctx, "Objective type", 16, "u16", data.objectives),
        valueField(
          ctx,
          "Time limit (seconds)",
          28,
          "u32",
          null,
          "Supported timed settings: 30, 60, 90, 120, 180, 240, 300, 600 and 900. Other values use the default setting.",
        ),
      );
      box.append(
        fields,
        note(
          "The Boss category uses the large boss circle. The original menu has one Boss circle per Galaxy; two visible Boss missions can leave the extra node unselectable. Category and displayed difficulty are independent. No independent circle-radius field has been verified.",
        ),
      );
      for (const risk of R.Authoring.saveRisks(ctx.file, ctx.app.data).filter(
        (r) =>
          ["boss-circle-capacity", "circle-capacity", "map-node-capacity"].includes(r.code) &&
          (Number(ctx.state.owner) < 0 || r.owner === Number(ctx.state.owner)),
      ))
        box.append(warning(risk.message));
      const owner = Number(ctx.state.owner),
        counts = {};
      if (owner >= 0 && owner < ctx.file.doc.ownersCount)
        for (const n of ctx.file.doc.getOwner(owner).nodes) {
          const kind = dv(ctx.file.doc.readRoot(n.node)).getUint16(10, false);
          counts[kind] = (counts[kind] || 0) + 1;
        }
      box.append(
        details(
          "Native mission-circle limits",
          note(
            "The original executable preallocates a separate set of circles for each category. These are menu resources, separate from victory objectives and saved-result slots. Candidate counts include gated missions; mutually exclusive visibility can reduce simultaneous use.",
          ),
          h(
            "table",
            { class: "circle-capacity-table" },
            h(
              "thead",
              {},
              h(
                "tr",
                {},
                h("th", {}, "Mission category"),
                h("th", {}, "Candidates in selected Galaxy"),
                h("th", {}, "Native circle capacity"),
              ),
            ),
            h(
              "tbody",
              {},
              CATEGORIES.map((c) =>
                h(
                  "tr",
                  {},
                  h("td", {}, c.id + " · " + c.name),
                  h("td", {}, owner >= 0 ? counts[c.id] || 0 : "—"),
                  h("td", {}, R.Authoring.CIRCLE_CAPACITIES[c.id] ?? "Unknown"),
                ),
              ),
            ),
          ),
          note(
            "There is also a separate original 32-node map-object pool. Increasing save capacity does not enlarge these menu pools.",
          ),
        ),
      );
      box.append(
        rootExpression(
          ctx,
          0x40,
          "Objective parameter",
          "A numeric expression passed to the selected objective. Its meaning depends on the objective type.",
        ),
      );
      const keepPrompts = h("input", { type: "checkbox", checked: true });
      box.append(
        h("label", { class: "checkbox-label" }, keepPrompts, " Keep existing action prompts"),
      );
      box.append(
        h(
          "div",
          { class: "toolbar" },
          btn(
            "Use basic defeat-enemies setup",
            () =>
              change(ctx, "Use basic battle objective", (doc) => {
                const row = doc.readRoot(ctx.node),
                  v = dv(row);
                v.setUint16(0x10, 0, false);
                v.setUint16(0x12, 0, false);
                v.setUint16(0x14, 0, false);
                [0x40, 0x44, 0x48, 0x4c, 0x50, 0x54].forEach((o) => v.setUint32(o, 0, false));
                if (!keepPrompts.checked) v.setUint32(0x3c, 0, false);
                v.setUint32(0x1c, 0, false);
                doc.writeRoot(ctx.node, row);
              }),
            "primary",
          ),
        ),
      );
      box.append(
        note(
          "Basic setup selects objective 0 and clears rule descriptions, numeric objective/rule parameters, mission item lists and the time limit. Action prompts are retained when checked; completing them does not replace the defeat-enemies victory condition. Preset equipment, opaque fields, map category, graph, rewards and unlock gates are kept.",
        ),
      );
    } else {
      const kinds = Array.from({ length: 16 }, (_, id) => ({
        id,
        name: `${id >= 8 ? "Secret " : ""}${id % 8 < 6 ? "Stage " + ((id % 8) + 1) : id % 8 === 6 ? "Climax" : "Last"}`,
      }));
      fields.append(
        valueField(ctx, "Stage kind", 8, "u32", kinds),
        field(
          "Enemy preset · +0C",
          presetSelector(ctx, rootValue(ctx, 12), (v) =>
            setValue(ctx, 12, "u32", "enemy preset", v),
          ),
        ),
        valueField(
          ctx,
          "Displayed level (LV)",
          16,
          "u32",
          null,
          "Shown as LV in the Battle Zone menu. Enemy strength comes from the selected preset. Saved progress uses mode, zone and grid position.",
        ),
        valueField(ctx, "Handicap", 20, "u32", data.handicaps),
        valueField(
          ctx,
          "Time limit (seconds)",
          24,
          "u32",
          null,
          "Original values are 180 or 0xFFFFFFFF.",
        ),
        valueField(
          ctx,
          "Arena selector",
          28,
          "u32",
          data.stages,
          "Ordinary Battle Zone arenas use 0–13. Selector 14 belongs to Tutorial / Practice; the stock Battle Zone converter falls back to Wasteland for values above 13.",
        ),
        valueField(
          ctx,
          "Stored music word (unused by stock Battle Zone)",
          32,
          "u32",
          R.Music.options(ctx),
          R.Music.help(ctx, rootValue(ctx, 32)),
        ),
      );
      const x = rootValue(ctx, 0, "f32"),
        y = rootValue(ctx, 4, "f32");
      box.append(
        validZonePoint(x, y)
          ? note(
              `Saved grid cell ${zoneCell(x, y)} of 0–20. Original map coordinates use X=0, 1 or 2 and integer Y=0–6; X=2, Y=0 is outside saved storage.`,
            )
          : warning(
              `Nonstandard Battle Zone position X=${x}, Y=${y}; computed saved cell ${zoneCell(Math.trunc(x), Math.trunc(y))}. Check file reports whether it is outside storage or shares another fight’s progress.`,
            ),
      );
      box.append(
        fields,
        presetCard(ctx, rootValue(ctx, 12)),
        h(
          "div",
          { class: "toolbar" },
          btn("Edit character preset", () => {
            ctx.app.ui.returnMission = {
              fileId: ctx.file.id,
              node: ctx.node,
              owner: ctx.state.owner,
            };
            R.openTeamPreset(ctx, rootValue(ctx, 12));
          }),
          btn("Create a new preset…", () => {
            const table = R.exactMissionPresetTable(ctx);
            if (!table) {
              ctx.app.notify("Load the matching Battle Zone preset container first.", "warning");
              return;
            }
            R.openNewPreset(ctx.app, table, (id) => setValue(ctx, 12, "u32", "enemy preset", id));
          }),
        ),
        details(
          "Arena and music limitations",
          note(
            "Original Battle Zone missions use different arenas (for example Green Square: 13, Red Triangle: 11/4/3). Arena +1C is read when setting up the fight. Music is selected separately by the Battle Zone routine from stage-type pools and special last-zone cases; it does not use the MMD music word.",
          ),
        ),
      );
      box.append(presetTableSelector(ctx));
    }
    return box;
  }

  function perspectivePanel(ctx) {
    const box = panel(
      "Battle from this Galaxy",
      note(
        "Each row below is a candidate. The game evaluates its condition before filling a team. Choosing a preview does not change the MMD or its conditions.",
      ),
    );
    const owners = Array.from({ length: ctx.file.doc.ownersCount }, (_, id) => ({
      id,
      name: ctx.app.characterName(id),
    })).filter((x) => ctx.file.doc.getOwner(x.id).nodes.some((n) => n.node === ctx.node));
    const c = conditionContext(ctx);
    if (Number(ctx.state.owner) < 0) {
      const select = namedSelect(
        c.selectedNative ?? -1,
        [{ id: -1, name: "Choose a Galaxy perspective" }, ...owners],
        (n) => {
          ctx.state.previewNative = n;
          refresh(ctx);
        },
        "Preview Galaxy",
      );
      select.setAttribute("aria-label", "Preview Galaxy");
      box.append(field("Galaxy perspective", select));
    } else box.append(h("p", {}, "Perspective: " + ctx.app.characterName(c.selectedNative)));
    const teams = h("div", { class: "grid field-grid" });
    for (const side of ["allies", "enemies"]) {
      const r = R.Conditions.roster(ctx.file.doc, ctx.node, side, c),
        team = panel(side === "allies" ? "Player team" : "Opponent team"),
        included = r.entries.filter((e) => e.conditionInfo.state === "included"),
        unknown = r.entries.filter((e) => e.conditionInfo.state === "unknown");
      team.setAttribute("data-preview-team", side);
      if (side === "allies")
        team.append(
          note(
            c.selectedNative === undefined
              ? "Selected player (choose a Galaxy above)"
              : ctx.app.characterName(c.selectedNative) +
                  " · selected player; equipment comes from the player’s setup",
          ),
        );
      if (r.special)
        team.append(
          warning("Special group: this preview cannot resolve its spawned participants."),
        );
      included.forEach((e) => team.append(presetCard(ctx, e.preset)));
      unknown.forEach((e) =>
        team.append(
          h(
            "div",
            { class: "conditional-preview" },
            presetCard(ctx, e.preset),
            note("Conditional · " + e.conditionInfo.text),
          ),
        ),
      );
      const max = side === "allies" ? 4 : 5;
      team.append(
        note(
          `${included.length} included candidate(s) · ${r.entries.length - included.length - unknown.length} excluded · ${unknown.length} unresolved`,
        ),
      );
      if (included.length > max)
        team.append(warning("This perspective exceeds the " + max + "-candidate active capacity."));
      else if (included.length + unknown.length > max)
        team.append(
          note("The unresolved conditions decide whether the active capacity is respected."),
        );
      if (!included.length && !unknown.length && side === "enemies" && !r.special)
        team.append(warning("No opponent is included for this perspective."));
      teams.append(team);
    }
    box.append(
      teams,
      note(
        "Save-dependent queries remain unresolved because no save is loaded. The player can use a different unlocked form; the selected Galaxy native ID is what query type 5 compares.",
      ),
    );
    return box;
  }
  function simpleCandidateCondition(ctx, entry, apply) {
    const info = conditionSummary(ctx, entry.condition),
      simple = info.rule,
      box = details(
        "Choose Galaxies for this candidate",
        note(
          "Include this candidate everywhere, only in chosen Galaxies, or everywhere except chosen Galaxies. Apply replaces this candidate’s condition only; it does not change the mission’s owner list.",
        ),
      );
    if (!simple)
      box.append(
        warning(
          "The current condition also depends on other logic. Use Advanced condition to preserve it, or deliberately replace it below.",
        ),
      );
    const mode = h("select", {});
    mode.replaceChildren(
      ...[
        ["custom", "Keep current custom condition"],
        ["always", "Always include"],
        ["only", "Only in selected Galaxies"],
        ["except", "Except selected Galaxies"],
      ].map(([id, name]) => h("option", { value: id }, name)),
    );
    mode.value = simple?.mode || "custom";
    mode.setAttribute("aria-label", "Candidate Galaxy rule");
    const ids = new Set(simple?.natives || []),
      search = h("input", {
        type: "search",
        placeholder: "Find a Galaxy…",
        "aria-label": "Find candidate Galaxy",
      }),
      list = h("div", { class: "condition-galaxies" });
    const all = new Set([
      ...ids,
      ...Array.from({ length: ctx.file.doc.ownersCount }, (_, id) => id).filter(
        (id) => ctx.file.doc.getOwner(id).nodes.length,
      ),
    ]);
    const rows = [...all].map((id) => {
      const cb = h("input", {
        type: "checkbox",
        checked: ids.has(id),
        onChange: () => (cb.checked ? ids.add(id) : ids.delete(id)),
      });
      return {
        label: ctx.app.characterName(id),
        element: h("label", { class: "checkbox-label" }, cb, ctx.app.characterName(id)),
      };
    });
    rows.forEach((r) => list.append(r.element));
    search.addEventListener("input", () =>
      rows.forEach(
        (r) => (r.element.hidden = !r.label.toLowerCase().includes(search.value.toLowerCase())),
      ),
    );
    const toggle = () => {
      search.hidden = list.hidden = !["only", "except"].includes(mode.value);
    };
    mode.addEventListener("change", toggle);
    toggle();
    box.append(
      field("Inclusion rule", mode),
      search,
      list,
      btn(
        "Apply Galaxy rule",
        () =>
          safe(ctx, () => {
            if (mode.value === "custom") return;
            apply(R.Conditions.encodeRule(mode.value, [...ids]));
          }),
        "primary",
      ),
    );
    return box;
  }
  function rosterPanel(ctx, side) {
    let roster;
    try {
      roster = ctx.file.doc.getRoster(ctx.node, side);
    } catch (e) {
      return panel(side === "allies" ? "Allies" : "Enemies", warning(e.message));
    }
    const entries = roster?.entries || [],
      title = side === "allies" ? "Allied candidates" : "Enemy candidates";
    const box = panel(
      title,
      note(
        side === "allies"
          ? "The selected player occupies slot 0. Up to four additional candidates may be active at once."
          : "Up to five enemy candidates may be active at once. Conditions can select a smaller active team from a longer candidate list.",
      ),
    );
    if (roster && roster.tag !== 0) {
      box.append(
        warning(
          `Special group tag ${hex(roster.tag)}. Wave/spawned-opponent structures are not fully decoded. Preserve this group or deliberately replace it with an ordinary roster.`,
        ),
      );
      box.append(
        btn(
          "Replace with empty ordinary roster",
          () => change(ctx, "Replace special roster", (doc) => doc.setRoster(ctx.node, side, [])),
          "danger",
        ),
      );
      return box;
    }
    box.append(
      h(
        "div",
        { class: "section-meta" },
        `${entries.length} candidate${entries.length === 1 ? "" : "s"} · ${roster ? `group #${roster.ref} / roster #${roster.rosterRef}` : "no group"}`,
      ),
    );
    const update = (i, key, value) =>
      change(ctx, `Edit ${side} candidate`, (doc) => {
        const all = (doc.getRoster(ctx.node, side)?.entries || []).map((x) => ({ ...x }));
        all[i][key] = value;
        doc.setRoster(ctx.node, side, all);
      });
    entries.forEach((entry, i) => {
      const row = panel(
        `Candidate ${i + 1}`,
        presetCard(ctx, entry.preset),
        h(
          "div",
          { class: "toolbar" },
          btn(
            "Edit character preset",
            () => (
              (ctx.app.ui.returnMission = {
                fileId: ctx.file.id,
                node: ctx.node,
                owner: ctx.state.owner,
              }),
              R.openTeamPreset(ctx, entry.preset)
            ),
          ),
          btn("Create a new preset…", () => {
            const table = R.exactMissionPresetTable(ctx);
            if (!table) {
              ctx.app.notify("Load the matching preset container first.", "warning");
              return;
            }
            R.openNewPreset(ctx.app, table, (id) =>
              change(ctx, "Assign new team preset", (d) => {
                const a = d.getRoster(ctx.node, side).entries.map((x) => ({ ...x }));
                a[i].preset = id;
                d.setRoster(ctx.node, side, a);
              }),
            );
          }),
        ),
        h(
          "div",
          { class: "grid field-grid" },
          field(
            "Preset",
            presetSelector(ctx, entry.preset, (v) =>
              safe(ctx, () => update(i, "preset", parseInteger(v, 65535))),
            ),
          ),
          field(
            "Opaque u16",
            intInput(entry.opaque, (v) =>
              safe(ctx, () => update(i, "opaque", parseInteger(v, 65535))),
            ),
          ),
        ),
      );
      const info = conditionSummary(ctx, entry.condition),
        applyCondition = (bytes) =>
          change(ctx, "Edit candidate condition", (doc) => {
            const all = doc.getRoster(ctx.node, side).entries.map((x) => ({ ...x }));
            all[i].condition = appendExpr(doc, bytes);
            doc.setRoster(ctx.node, side, all);
          });
      row.append(
        h(
          "p",
          { class: "condition-status " + info.state },
          `${info.state === "unknown" ? "Unresolved" : info.state === "included" ? "Included" : "Excluded"} in preview · ${info.text}`,
        ),
        simpleCandidateCondition(ctx, entry, applyCondition),
        expressionEditor(
          ctx,
          entry.condition,
          applyCondition,
          `Advanced condition · candidate ${i + 1}`,
          "No expression means always include this candidate. QUERY 5 compares the selected Galaxy’s native ID. The simplified selector replaces only this candidate’s expression.",
        ),
      );
      const reorder = (delta) =>
        change(ctx, "Reorder roster", (doc) => {
          const a = doc.getRoster(ctx.node, side).entries.map((x) => ({ ...x }));
          [a[i], a[i + delta]] = [a[i + delta], a[i]];
          doc.setRoster(ctx.node, side, a);
        });
      row.append(
        h(
          "div",
          { class: "toolbar" },
          i > 0 ? btn("Move up", () => reorder(-1)) : null,
          i < entries.length - 1 ? btn("Move down", () => reorder(1)) : null,
          btn(
            "Remove candidate",
            () =>
              change(ctx, "Remove roster candidate", (doc) => {
                const a = doc.getRoster(ctx.node, side).entries.filter((_, n) => n !== i);
                doc.setRoster(ctx.node, side, a);
              }),
            "danger",
          ),
        ),
      );
      box.append(row);
    });
    box.append(
      btn(
        "Add candidate",
        () =>
          change(ctx, "Add roster candidate", (doc) => {
            const a = (doc.getRoster(ctx.node, side)?.entries || []).map((x) => ({ ...x }));
            a.push({ preset: 0, opaque: 0, condition: 0 });
            doc.setRoster(ctx.node, side, a);
          }),
        "primary",
      ),
    );
    const active = entries.filter((x) => !x.condition).length,
      max = side === "allies" ? 4 : 5;
    if (active > max)
      box.append(
        warning(
          `${active} unconditional candidates exceed the ${max}-character limit for this side.`,
        ),
      );
    return box;
  }

  function actionsPanel(ctx) {
    let actions;
    try {
      actions = ctx.file.doc.getActions(ctx.node);
    } catch (e) {
      return panel("Perfect Actions", warning(e.message));
    }
    const box = panel(
      "Perfect Actions / tutorial sequence",
      note(
        "These are native action detector IDs, not tutorial message or controller-glyph IDs. Objectives 0 and 1 keep the defeat-enemies goal while showing action prompts. Objective 29 makes the action sequence the victory requirement. Up to 20 tasks are supported.",
      ),
    );
    const mutate = (label, fn) =>
      change(ctx, label, (doc) => {
        const a = doc.getActions(ctx.node).map((x) => ({ ...x }));
        fn(a);
        if (a.length > 20) throw Error("The known game task array supports at most 20 steps.");
        doc.setActions(ctx.node, a);
      });
    actions.forEach((entry, i) => {
      const r = panel(
        `Step ${i + 1}`,
        h(
          "div",
          { class: "grid field-grid" },
          field(
            "Action detector",
            numericNamed(entry.action, ctx.app.data?.actions, (v) =>
              safe(ctx, () =>
                mutate("Change action", (a) => {
                  a[i].action = parseInteger(v);
                }),
              ),
            ),
          ),
          field(
            "Direct parameter",
            intInput(entry.parameter, (v) =>
              safe(ctx, () =>
                mutate("Change action parameter", (a) => {
                  a[i].parameter = parseInteger(v, 0x7fffffff, true);
                }),
              ),
            ),
          ),
        ),
      );
      r.append(
        expressionEditor(
          ctx,
          entry.expression,
          (bytes) =>
            change(ctx, "Change action parameter expression", (doc) => {
              const a = doc.getActions(ctx.node).map((x) => ({ ...x }));
              a[i].expression = appendExpr(doc, bytes);
              doc.setActions(ctx.node, a);
            }),
          `Step ${i + 1} numeric expression`,
          "Actions 94–97 and 106 use a numeric expression. Actions 81, 82, 88, 100, 102, 108–110 use the direct parameter. Many other actions ignore the direct word.",
        ),
      );
      r.append(
        h(
          "div",
          { class: "toolbar" },
          i > 0
            ? btn("Move up", () =>
                mutate("Reorder actions", (a) => {
                  [a[i], a[i - 1]] = [a[i - 1], a[i]];
                }),
              )
            : null,
          i < actions.length - 1
            ? btn("Move down", () =>
                mutate("Reorder actions", (a) => {
                  [a[i], a[i + 1]] = [a[i + 1], a[i]];
                }),
              )
            : null,
          btn("Remove step", () => mutate("Remove action", (a) => a.splice(i, 1)), "danger"),
        ),
      );
      box.append(r);
    });
    const enableActions = (objective) =>
      change(
        ctx,
        objective === 29 ? "Enable required Perfect Actions" : "Enable optional Perfect Actions",
        (doc) => {
          const row = doc.readRoot(ctx.node),
            v = dv(row);
          v.setUint16(0x0a, 2, false);
          v.setUint16(0x10, objective, false);
          doc.writeRoot(ctx.node, row);
        },
      );
    box.append(
      h(
        "div",
        { class: "toolbar" },
        btn(
          "Add action",
          () => mutate("Add action", (a) => a.push({ action: 1, parameter: 0, expression: 0 })),
          "primary",
        ),
        btn("Enable optional Perfect Actions", () => enableActions(0)),
        btn("Require Perfect Actions to win", () => enableActions(29)),
        btn(
          "Clear all actions",
          () => change(ctx, "Clear action list", (doc) => doc.setActions(ctx.node, [])),
          "danger",
        ),
      ),
      note(
        "Enable optional Perfect Actions sets category 2 and objective 0: defeat the enemies to win. Require Perfect Actions sets category 2 and objective 29: complete the sequence to win. The action list itself is kept.",
      ),
    );
    const sourceFiles = ctx.app.files.filter((f) => f.kind === "main"),
      sourceSelect = h("select", { "aria-label": "Action donor MMD" }),
      sourceNode = intInput(ctx.node, null),
      donorActions = h("select", { "aria-label": "Mission with action prompts" });
    sourceFiles.forEach((f) => sourceSelect.append(h("option", { value: f.id }, f.name)));
    sourceSelect.value = ctx.file.id;
    const refreshDonors = () => {
      const source = sourceFiles.find((f) => f.id === sourceSelect.value);
      donorActions.replaceChildren(
        h("option", { value: "" }, "Choose a mission with action prompts…"),
      );
      for (let i = 0; i < source.doc.rootCount; i++) {
        try {
          const count = source.doc.getActions(i).length;
          if (count)
            donorActions.append(
              h(
                "option",
                { value: String(i) },
                `Mission ${i} · ${count} actions · ${missionSummary(source.doc, i, "main", ctx.app.data)}`,
              ),
            );
        } catch (_) {}
      }
      sourceNode.value = "0";
    };
    sourceSelect.addEventListener("change", refreshDonors);
    donorActions.addEventListener("change", () => {
      if (donorActions.value) sourceNode.value = donorActions.value;
    });
    refreshDonors();
    box.append(
      details(
        "Copy prompts from another mission",
        note(
          "Choose any loaded Galaxy or Tutorial MMD. Original Galaxy mission 239 (Goku) demonstrates optional commands; mission 174 (Frieza, first form) combines eight tasks with objective 1. The copied list receives its own numeric expressions. The current objective, graph and enemy roster are kept.",
        ),
        field("Source MMD", sourceSelect),
        field("Known action-list donors", donorActions),
        field("Source mission ID", sourceNode),
        btn(
          "Copy action list",
          () =>
            safe(ctx, () => {
              const source = sourceFiles.find((f) => f.id === sourceSelect.value),
                n = parseInteger(sourceNode.value, source.doc.rootCount - 1),
                copied = source.doc.getActions(n).map((e) => ({
                  ...e,
                  expressionBytes: e.expression ? source.doc.body(e.expression) : null,
                }));
              if (copied.length > 20) throw Error("The donor exceeds the known 20-task limit.");
              change(ctx, "Copy action prompts from donor", (doc) =>
                doc.setActions(
                  ctx.node,
                  copied.map((e) => ({
                    action: e.action,
                    parameter: e.parameter,
                    expression: appendExpr(doc, e.expressionBytes),
                  })),
                ),
              );
            }),
          "primary",
        ),
      ),
    );
    return box;
  }
  function idListPanel(ctx, offset, title, width, names, help, maxValue) {
    const box = panel(title, help ? note(help) : null);
    let values;
    try {
      values = readList(ctx.file.doc, rootRef(ctx, offset), width);
    } catch (e) {
      box.append(warning(e.message));
      return box;
    }
    const area = h("textarea", {
      class: "id-list-input",
      rows: Math.max(3, Math.min(8, values.length)),
      value: values.join("\n"),
      "aria-label": title + " IDs",
      spellcheck: false,
    });
    const draft = draftTracker(ctx, title, () => {
      const list = area.value.trim()
        ? area.value
            .trim()
            .split(/[\s,;]+/)
            .map((x) => parseInteger(x, width === 2 ? 65535 : 0xffffffff))
        : [];
      if (maxValue !== undefined && list.some((x) => x > maxValue))
        throw Error(`IDs must refer to existing nodes (0–${maxValue}).`);
      return change(ctx, `Edit ${title}`, (doc) => writeList(doc, ctx.node, offset, list, width));
    });
    area.addEventListener("input", draft.mark);
    const labels = h(
      "div",
      { class: "id-label-preview" },
      values.map((id) =>
        h(
          "span",
          { class: "tag" },
          `${id} · ${(names || []).find((x) => Number(x.id) === id)?.name || "Unlisted"}`,
        ),
      ),
    );
    box.append(
      area,
      labels,
      note(
        "Enter decimal IDs or 0x-prefixed hexadecimal IDs, separated by spaces, commas or newlines. Order is preserved.",
      ),
    );
    if (names?.length) {
      const add = namedSelect(names[0].id, names, () => {});
      box.append(
        h(
          "div",
          { class: "toolbar" },
          add,
          btn("Add to list", () => {
            area.value += (area.value.trim() ? "\n" : "") + add.value;
            draft.mark();
          }),
        ),
      );
    }
    box.append(
      h(
        "div",
        { class: "toolbar" },
        btn("Apply list", draft.apply, "primary"),
        btn("Discard list draft", () => {
          draft.clear();
          refresh(ctx);
        }),
      ),
    );
    return box;
  }
  function rulesPanel(ctx) {
    const rules = (ctx.app.data?.rules || []).map((x) => ({ id: Number(x.id), name: x.name }));
    if (!rules.some((x) => x.id === 0)) rules.unshift({ id: 0, name: "No rule description" });
    return panel(
      "Rule descriptions",
      h(
        "div",
        { class: "grid field-grid" },
        valueField(ctx, "Rule description 1", 0x12, "u16", rules),
        valueField(ctx, "Rule description 2", 0x14, "u16", rules),
      ),
      note(
        "Selectors are one-based: 0 means absent. Descriptions supply wording; the actual effect may come from a mission modifier or preset equipment.",
      ),
      rootExpression(ctx, 0x44, "Rule 1 numeric parameter"),
      rootExpression(ctx, 0x48, "Rule 2 numeric parameter"),
    );
  }
  function rewardsPanel(ctx) {
    const ref = rootRef(ctx, 0x2c),
      doc = ctx.file.doc,
      box = panel(
        "Conditional rewards",
        note(
          ctx.mode === "zone"
            ? "A result-screen bonus, separate from selecting a route. Query type 1, argument 14 reads remaining health as a percentage: >= 30 means finish with at least 30% health. No condition means no extra requirement in the reward flow. Native result flags used in other expressions remain marked when their gameplay meaning is unverified."
            : "Choose a reward type and its named target. Each type has its own ID encoding. The condition controls eligibility in the result flow; an empty condition is unconditional at that stage.",
        ),
      );
    if (ref && doc.descriptors[ref]?.[1] !== 8) {
      box.append(
        warning(
          "This reward descriptor does not use eight-byte records. Edit raw bytes in Advanced if its format is known.",
        ),
      );
      return box;
    }
    const read = () => {
      const current = rootRef(ctx, 0x2c),
        b = current ? ctx.file.doc.body(current) : new Uint8Array(),
        v = dv(b),
        a = [];
      for (let p = 0; p < b.length; p += 8)
        a.push({
          kind: v.getUint16(p, false),
          id: v.getUint16(p + 2, false),
          condition: v.getUint32(p + 4, false),
        });
      return a;
    };
    const entries = read();
    const save = (d, a) => {
      const b = new Uint8Array(a.length * 8),
        v = dv(b);
      a.forEach((x, i) => {
        v.setUint16(i * 8, x.kind, false);
        v.setUint16(i * 8 + 2, x.id, false);
        v.setUint32(i * 8 + 4, x.condition, false);
      });
      d.setList(ctx.node, 0x2c, b, 8);
    };
    entries.forEach((e, i) => {
      const set = (key, value) =>
        safe(ctx, () =>
          change(ctx, "Change reward", (d) => {
            const a = read();
            a[i][key] = parseInteger(value, 65535);
            if (key === "kind") {
              const choices = R.rewardOptions(ctx.app, a[i].kind, d);
              if (choices.length && !choices.some((x) => x.id === a[i].id)) a[i].id = choices[0].id;
            }
            save(d, a);
          }),
        );
      const kindInfo = R.PROGRESSION.kinds.find((x) => x.id === e.kind),
        r = h(
          "div",
          { class: "reward-row" },
          h(
            "div",
            { class: "reward-heading" },
            h("h4", {}, R.rewardLabel(ctx.app, e.kind, e.id, doc)),
            h("span", { class: "research-tag" }, kindInfo?.name || "Unmapped type"),
          ),
          h(
            "div",
            { class: "grid field-grid" },
            field(
              "Reward type",
              namedSelect(e.kind, R.PROGRESSION.kinds, (v) => set("kind", v)),
            ),
            field(
              e.kind === 5 ? "Limit Points amount" : "Reward target",
              numericNamed(e.id, R.rewardOptions(ctx.app, e.kind, doc), (v) => set("id", v)),
            ),
          ),
          note(kindInfo?.help || "This reward type is not mapped. Preserve unknown values."),
          details(
            "Raw encoding",
            note(
              "Type " +
                e.kind +
                " · target " +
                e.id +
                " · " +
                (kindInfo?.encoding || "unknown encoding"),
            ),
          ),
        );
      r.append(
        expressionEditor(
          ctx,
          e.condition,
          (bytes) =>
            change(ctx, "Change reward condition", (d) => {
              const a = read();
              a[i].condition = appendExpr(d, bytes);
              save(d, a);
            }),
          `Reward ${i + 1} condition`,
        ),
        btn(
          "Remove reward",
          () =>
            change(ctx, "Remove reward", (d) =>
              save(
                d,
                read().filter((_, j) => i !== j),
              ),
            ),
          "danger",
        ),
      );
      box.append(r);
    });
    box.append(
      btn(
        "Add reward record",
        () =>
          change(ctx, "Add reward", (d) => save(d, [...read(), { kind: 8, id: 0, condition: 0 }])),
        "secondary",
      ),
    );
    return box;
  }
  function orQueriesPanel(ctx) {
    const doc = ctx.file.doc,
      ref = rootRef(ctx, 0x38),
      box = panel(
        "Availability OR queries · +38",
        note(
          "This list is separate from postfix expressions and graph links. It succeeds if any query succeeds. The terminating entry has type 0; an empty terminated list succeeds. MAIN types 2 and 3 query mission-state flags.",
        ),
      );
    if (ref && doc.descriptors[ref]?.[1] !== 4) {
      box.append(
        warning("Expected four-byte query records. Preserve this descriptor in Advanced."),
      );
      return box;
    }
    const data = ref ? doc.body(ref) : new Uint8Array(),
      v = dv(data),
      entries = [];
    for (let p = 0; p < data.length; p += 4) {
      const type = v.getUint16(p, false);
      if (!type) break;
      entries.push({ type, argument: v.getUint16(p + 2, false) });
    }
    const save = (d, a) => {
      const b = new Uint8Array((a.length + 1) * 4),
        w = dv(b);
      a.forEach((x, i) => {
        w.setUint16(i * 4, x.type, false);
        w.setUint16(i * 4 + 2, x.argument, false);
      });
      d.setList(ctx.node, 0x38, b, 4);
    };
    entries.forEach((e, i) => {
      const set = (key, value) =>
        safe(ctx, () =>
          change(ctx, "Change availability query", (d) => {
            const a = entries.map((x) => ({ ...x }));
            a[i][key] = parseInteger(value, 65535);
            if (a[i].type === 0) throw Error("Type 0 terminates the list. Remove the row instead.");
            save(d, a);
          }),
        );
      box.append(
        h(
          "div",
          { class: "grid query-row" },
          field(
            "Query type",
            numericNamed(e.type, QUERY, (v) => set("type", v)),
          ),
          field(
            "Argument",
            intInput(e.argument, (v) => set("argument", v)),
          ),
          btn(
            "Remove",
            () =>
              change(ctx, "Remove availability query", (d) =>
                save(
                  d,
                  entries.filter((_, j) => j !== i),
                ),
              ),
            "danger",
          ),
        ),
      );
    });
    box.append(
      h(
        "div",
        { class: "toolbar" },
        btn("Add query", () =>
          change(ctx, "Add availability query", (d) =>
            save(d, [...entries, { type: 2, argument: ctx.node }]),
          ),
        ),
        btn(
          "Use empty query list",
          () => change(ctx, "Clear availability queries", (d) => save(d, [])),
          "secondary",
        ),
      ),
    );
    return box;
  }

  function graphPanel(ctx) {
    const doc = ctx.file.doc,
      edges = doc.getEdges(),
      box = panel(
        "Mission links",
        note(
          "These are undirected map edges, not prerequisite mission IDs. Adding or removing a link updates the global edge array and the incident-edge lists at both ends. Unlock expressions are edited separately.",
        ),
      );
    edges.forEach((e, index) => {
      if (e.a !== ctx.node && e.b !== ctx.node) return;
      const other = e.a === ctx.node ? e.b : e.a;
      box.append(
        h(
          "div",
          { class: "edge-row" },
          h("span", {}, `Edge ${index}: mission ${e.a} ↔ ${e.b}`),
          btn(`Open mission ${other}`, () => {
            ctx.state.node = other;
            refresh(ctx);
          }),
          details(
            "Opaque edge words",
            field(
              "Endpoint A u16",
              intInput(e.opaqueA, (v) =>
                safe(ctx, () =>
                  change(ctx, "Edit edge metadata", (d) => {
                    const a = d.getEdges();
                    a[index].opaqueA = parseInteger(v, 65535);
                    d.setEdges(a);
                  }),
                ),
              ),
            ),
            field(
              "Endpoint B u16",
              intInput(e.opaqueB, (v) =>
                safe(ctx, () =>
                  change(ctx, "Edit edge metadata", (d) => {
                    const a = d.getEdges();
                    a[index].opaqueB = parseInteger(v, 65535);
                    d.setEdges(a);
                  }),
                ),
              ),
            ),
          ),
          btn(
            "Remove link",
            () =>
              change(ctx, "Remove map edge", (d) =>
                d.setEdges(d.getEdges().filter((_, i) => i !== index)),
              ),
            "danger",
          ),
        ),
      );
    });
    const target = intInput(Math.min(ctx.node + 1, doc.rootCount - 1), null);
    box.append(
      h(
        "div",
        { class: "toolbar" },
        field("Connect to mission ID", target),
        btn(
          "Add link",
          () =>
            safe(ctx, () => {
              const to = parseInteger(target.value, doc.rootCount - 1);
              if (to === ctx.node) throw Error("Choose a different mission.");
              if (doc.freeMissionIds().includes(to))
                throw Error("Create a battle in this free mission ID before linking it.");
              change(ctx, "Add map edge", (d) => {
                const a = d.getEdges();
                if (
                  a.some(
                    (e) => (e.a === ctx.node && e.b === to) || (e.b === ctx.node && e.a === to),
                  )
                )
                  throw Error("These missions are already linked.");
                a.push({ a: ctx.node, b: to, opaqueA: 0, opaqueB: 0 });
                d.setEdges(a);
              });
            }),
          "primary",
        ),
      ),
    );
    const issues = doc.validateGraph();
    box.append(
      issues.length
        ? warning(issues.join("\n"))
        : h("p", { class: "valid" }, "Graph links and reciprocal incident lists are consistent."),
    );
    return box;
  }
  function ownersPanel(ctx) {
    const doc = ctx.file.doc,
      box = panel(
        "Galaxy membership and entry mission",
        note(
          "A mission can belong to more than one Galaxy. Native character / owner IDs are 0–99. These differ from mission root indices and Galaxy selection icon indices. The owner’s auxiliary reference and opaque words are preserved.",
        ),
      );
    box.append(
      note(
        "Galaxy has 66 independently saved selection icons, indices 0–65. Adding icon 66 overlaps global saved fields; filling an empty owner does not create a supported new Galaxy. Native owner 99 already has original content.",
      ),
    );
    if (!doc.ownersCount) {
      box.append(note("No owner records are present."));
      return box;
    }
    let ownerIndex = Number(ctx.state.owner);
    if (!Number.isInteger(ownerIndex) || ownerIndex < 0 || ownerIndex >= doc.ownersCount)
      ownerIndex = 0;
    const owner = doc.getOwner(ownerIndex),
      names = Array.from({ length: doc.ownersCount }, (_, id) => ({
        id,
        name: ctx.app.characterName?.(id) || `Owner ${id}`,
      }));
    box.append(
      field(
        "Native character / owner ID",
        namedSelect(ownerIndex, names, (id) => {
          ctx.state.owner = String(id);
          refresh(ctx);
        }),
      ),
      field(
        "Entry mission",
        numericNamed(
          owner.start,
          owner.nodes.map((x) => ({ id: x.node, name: `Mission ${x.node}` })),
          (value) =>
            safe(ctx, () =>
              change(ctx, "Change Galaxy entry mission", (d) => {
                const o = d.getOwner(ownerIndex),
                  n = parseInteger(value, d.rootCount - 1);
                if (!o.nodes.some((x) => x.node === n))
                  throw Error("The entry mission must belong to this Galaxy.");
                o.start = n;
                d.setOwner(ownerIndex, o);
              }),
            ),
        ),
      ),
    );
    box.append(
      h(
        "div",
        { class: "owner-members" },
        owner.nodes.map((n, i) =>
          h(
            "div",
            { class: "owner-member" },
            btn(
              `Mission ${n.node}`,
              () => {
                ctx.state.node = n.node;
                refresh(ctx);
              },
              n.node === ctx.node ? "primary" : "secondary",
            ),
            field(
              "Opaque u16",
              intInput(n.opaque, (v) =>
                safe(ctx, () =>
                  change(ctx, "Change membership metadata", (d) => {
                    const o = d.getOwner(ownerIndex);
                    o.nodes[i].opaque = parseInteger(v, 65535);
                    d.setOwner(ownerIndex, o);
                  }),
                ),
              ),
            ),
            btn(
              "Remove",
              () =>
                change(ctx, "Remove Galaxy membership", (d) => {
                  const o = d.getOwner(ownerIndex);
                  if (n.node === o.start && o.nodes.length > 1)
                    throw Error("Choose another entry mission before removing this one.");
                  o.nodes.splice(i, 1);
                  if (!o.nodes.length) o.start = 65535;
                  d.setOwner(ownerIndex, o);
                }),
              "danger",
            ),
          ),
        ),
      ),
    );
    const member = intInput(ctx.node, null);
    box.append(
      h(
        "div",
        { class: "toolbar" },
        field("Add existing mission ID", member),
        btn(
          "Add to Galaxy",
          () =>
            safe(ctx, () =>
              change(ctx, "Add Galaxy membership", (d) => {
                const n = parseInteger(member.value, d.rootCount - 1),
                  o = d.getOwner(ownerIndex);
                if (d.freeMissionIds().includes(n))
                  throw Error("This mission ID is free. Create a new battle first.");
                if (o.nodes.some((x) => x.node === n))
                  throw Error("Mission already belongs to this Galaxy.");
                if (!o.nodes.length) o.start = n;
                o.nodes.push({ node: n, opaque: 0 });
                d.setOwner(ownerIndex, o);
              }),
            ),
          "primary",
        ),
      ),
    );
    box.append(
      details(
        "Owner metadata",
        field(
          "Auxiliary descriptor",
          intInput(owner.auxRef, (v) =>
            safe(ctx, () =>
              change(ctx, "Edit owner auxiliary reference", (d) => {
                const o = d.getOwner(ownerIndex),
                  n = parseInteger(v);
                assertRef(d, n);
                o.auxRef = n;
                d.setOwner(ownerIndex, o);
              }),
            ),
          ),
        ),
        field(
          "Opaque owner u16",
          intInput(owner.opaque, (v) =>
            safe(ctx, () =>
              change(ctx, "Edit owner metadata", (d) => {
                const o = d.getOwner(ownerIndex);
                o.opaque = parseInteger(v, 65535);
                d.setOwner(ownerIndex, o);
              }),
            ),
          ),
        ),
      ),
    );
    return box;
  }
  function newMissionPanel(ctx) {
    const doc = ctx.file.doc,
      main = ctx.mode === "main",
      free = main ? null : freeZonePoint(doc),
      box = panel(
        "Create a mission from a donor",
        note(
          main
            ? "Start from a working donor, then edit the new record. Existing mission IDs stay stable. Galaxy stores 500 mission records, indices 0–499; the original file leaves indices 498 and 499 free. This is a Galaxy save limit, not a verified Tutorial limit."
            : "Add a fight to an unused grid position in this existing route. There are 21 independently saved cells per zone. The original menu has eight normal and eight Ultimate slots; an extra MMD does not create a ninth selectable zone.",
        ),
      );
    const x = intInput(main ? rootValue(ctx, 0, "f32") + 15 : (free?.x ?? 0), null),
      y = intInput(main ? rootValue(ctx, 4, "f32") : (free?.y ?? 0), null);
    const clean = h("input", { type: "checkbox", checked: true });
    box.append(
      h("div", { class: "grid field-grid" }, field("New X", x), field("New Y", y)),
      h("label", { class: "checkbox-label" }, clean, " Clear copied rewards and progression gates"),
    );
    let connect, ownerSelect;
    if (main) {
      connect = h("input", { type: "checkbox", checked: true });
      const owners = Array.from({ length: doc.ownersCount }, (_, id) => ({
        id,
        name: ctx.app.characterName?.(id) || `Owner ${id}`,
      }));
      ownerSelect = namedSelect(
        Number(ctx.state.owner) >= 0 ? Number(ctx.state.owner) : 0,
        owners,
        () => {},
      );
      box.append(
        field("Destination Galaxy", ownerSelect),
        h("label", { class: "checkbox-label" }, connect, ` Link new mission to donor ${ctx.node}`),
      );
    } else {
      const preview = h("output", {
        class: "expression-preview",
        "aria-label": "New Battle Zone saved grid cell",
      });
      const update = () => {
        const nx = Number(x.value),
          ny = Number(y.value),
          valid = validZonePoint(nx, ny),
          cell = zoneCell(nx, ny),
          occupied = valid && occupiedZoneCells(doc).has(cell);
        preview.textContent = valid
          ? `Saved grid cell ${cell} of 0–20${occupied ? " is already occupied. Choose an unused cell." : " is available."}`
          : "Use integer X = 0, 1 or 2 and Y = 0–6, excluding X=2, Y=0.";
        preview.className = "expression-preview " + (valid && !occupied ? "valid" : "warning");
      };
      x.addEventListener("input", update);
      y.addEventListener("input", update);
      update();
      box.append(preview);
      box.append(
        note(
          "The new fight keeps the donor’s displayed LV and copied outgoing route links. Update the route to make it reachable. Distinct grid cells keep progress separate; changing LV does not.",
        ),
      );
      if (!free) {
        x.disabled = true;
        y.disabled = true;
        box.append(
          warning(
            "No unused Battle Zone saved grid cell remains in this route. All 21 cells are occupied. Creation is disabled; edit an existing fight or free a grid position first.",
          ),
        );
      }
    }
    const duplicate = btn(
      `Duplicate mission ${ctx.node}`,
      () => {
        if (
          R.Authoring.isGalaxy(ctx.file) &&
          !doc.freeMissionIds().length &&
          doc.rootCount >= 498 &&
          !window.confirm(
            doc.rootCount >= 500
              ? "SAVE CORRUPTION RISK: mission indices 500+ overlap other saved data. Create a research-only record anyway?"
              : "This exceeds the original 498 missions. The researched save capacity is 500. Keep a backup. Continue?",
          )
        )
          return;
        return safe(ctx, () =>
          change(ctx, "Create mission from donor", (d) => {
            const nx = Number(x.value),
              ny = Number(y.value);
            if (
              !Number.isFinite(nx) ||
              !Number.isFinite(ny) ||
              Math.abs(nx) > 3.4028234663852886e38 ||
              Math.abs(ny) > 3.4028234663852886e38
            )
              throw Error("Coordinates must be finite 32-bit floats.");
            if (!main) {
              if (!validZonePoint(nx, ny))
                throw Error(
                  "Battle Zone positions must use integer X = 0, 1 or 2 and Y = 0–6, excluding X=2, Y=0.",
                );
              if (occupiedZoneCells(d).has(zoneCell(nx, ny)))
                throw Error(
                  "This Battle Zone saved grid cell is already occupied. Choose an unused cell for an independent fight.",
                );
            }
            const n = d.duplicateMission(ctx.node, {
              owner: main ? Number(ownerSelect.value) : undefined,
              connectTo: main && connect.checked ? ctx.node : undefined,
              x: nx,
              y: ny,
            });
            if (clean.checked) {
              const row = d.readRoot(n);
              (main ? [0x2c, 0x30, 0x34, 0x38] : [0x2c, 0x30]).forEach((o) => put32(row, o, 0));
              d.writeRoot(n, row);
            }
            ctx.state.node = n;
            if (main) ctx.state.owner = ownerSelect.value;
          }),
        );
      },
      "primary",
    );
    duplicate.disabled = !main && !free;
    box.append(duplicate);
    return box;
  }

  function advancedPanel(ctx) {
    const doc = ctx.file.doc,
      row = doc.readRoot(ctx.node),
      box = panel(
        "Advanced: raw fields and descriptors",
        warning(
          "Opaque fields have no verified gameplay meaning. Root hex editing can replace references and break the graph. Structured editors create separate list data when needed; direct descriptor editing changes every reference to that descriptor.",
        ),
      );
    const fields = h("div", { class: "grid field-grid" });
    if (ctx.mode === "main") {
      fields.append(
        valueField(ctx, "Unknown word", 0x16, "u16"),
        valueField(ctx, "Unknown word", 0x18, "u16"),
        valueField(ctx, "Unknown word", 0x1a, "u16"),
        valueField(ctx, "Opaque configuration", 0x58, "u32"),
      );
    } else fields.append(valueField(ctx, "Opaque variant", 0x24, "u32"));
    box.append(fields);
    const rootHex = h("textarea", {
      class: "hex-editor",
      rows: 6,
      value: bytesHex(row),
      spellcheck: false,
      "aria-label": "Root record hexadecimal bytes",
    });
    const rootDraft = draftTracker(ctx, "Root hexadecimal bytes", () => {
      const bytes = parseHex(rootHex.value);
      if (bytes.length !== doc.rootStride)
        throw Error(`Root must contain exactly ${doc.rootStride} bytes.`);
      return change(ctx, "Edit raw root record", (d) => d.writeRoot(ctx.node, bytes));
    });
    rootHex.addEventListener("input", rootDraft.mark);
    box.append(
      details(
        `Root ${ctx.node} · ${row.length} bytes`,
        rootHex,
        btn("Apply root bytes", rootDraft.apply, "danger"),
        btn("Discard root draft", () => {
          rootDraft.clear();
          refresh(ctx);
        }),
      ),
    );
    const rootRefs =
      ctx.mode === "main"
        ? [
            [0x20, "Incident edge list"],
            [0x24, "Ally group"],
            [0x28, "Enemy group"],
            [0x2c, "Rewards"],
            [0x30, "Reveal expression"],
            [0x34, "Availability expression"],
            [0x38, "OR query list"],
            [0x3c, "Actions"],
            [0x40, "Objective parameter"],
            [0x44, "Rule 1 parameter"],
            [0x48, "Rule 2 parameter"],
            [0x4c, "Battle modifiers"],
            [0x50, "UI item list A"],
            [0x54, "UI item list B"],
          ]
        : [
            [0x28, "Stamp criteria"],
            [0x2c, "Rewards"],
            [0x30, "Condition"],
            [0x34, "Next nodes"],
          ];
    const refs = h("div", { class: "grid field-grid" });
    rootRefs.forEach(([o, label]) =>
      refs.append(
        field(
          `${label} · +${o.toString(16).toUpperCase()}`,
          intInput(rootRef(ctx, o), (v) =>
            safe(ctx, () =>
              change(ctx, "Change root descriptor reference", (d) =>
                setRootRef(d, ctx.node, o, parseInteger(v)),
              ),
            ),
          ),
        ),
      ),
    );
    box.append(
      details(
        "Root descriptor references",
        note("0 is an absent reference. Nonzero numbers are descriptor indices, not byte offsets."),
        refs,
      ),
    );
    let selected = parseInteger(ctx.state.descriptor || 0, doc.descriptors.length - 1);
    const selector = intInput(selected, (value) =>
      safe(ctx, () => {
        ctx.state.descriptor = parseInteger(value, doc.descriptors.length - 1);
        refresh(ctx);
      }),
    );
    const desc = doc.descriptors[selected],
      data = doc.body(selected),
      area = h("textarea", {
        class: "hex-editor",
        rows: 8,
        value: bytesHex(data),
        spellcheck: false,
        "aria-label": "Descriptor body hexadecimal bytes",
      }),
      count = intInput(desc[0], null),
      stride = intInput(desc[1], null);
    const descDraft = draftTracker(ctx, "Descriptor hexadecimal bytes", () => {
      const bytes = parseHex(area.value),
        n = parseInteger(count.value, 65535),
        size = parseInteger(stride.value, 65535);
      if (n * size !== bytes.length) throw Error("Count × stride must equal the byte length.");
      return change(ctx, "Edit shared descriptor bytes", (d) =>
        d.relocate(selected, bytes, n, size),
      );
    });
    [area, count, stride].forEach((n) => n.addEventListener("input", descDraft.mark));
    box.append(
      details(
        "Descriptor inspector / raw editor",
        field(`Descriptor index (0–${doc.descriptors.length - 1})`, selector),
        note(
          `Payload-relative offset ${hex(desc[2])}; ${data.length} bytes. Descriptor 0 can contain structural data; a zero root reference still means absent.`,
        ),
        h(
          "div",
          { class: "grid field-grid" },
          field("Record count", count),
          field("Stride in bytes", stride),
        ),
        area,
        btn("Replace this shared descriptor", descDraft.apply, "danger"),
        btn("Discard descriptor draft", () => {
          descDraft.clear();
          refresh(ctx);
        }),
      ),
    );
    const headerArea = h("textarea", {
      class: "hex-editor",
      rows: 3,
      value: bytesHex(doc.header),
      spellcheck: false,
      "aria-label": "MMD header hexadecimal bytes",
    });
    box.append(
      details(
        "Header (read only)",
        headerArea,
        note(
          "Sizes are regenerated on export. Use structured mission, graph and owner tools to change their associated descriptors.",
        ),
      ),
    );
    headerArea.readOnly = true;
    return box;
  }

  function missionSummary(doc, index, mode, data) {
    const row = doc.readRoot(index),
      v = dv(row);
    if (mode === "main") {
      const category = v.getUint16(10, false),
        objective = v.getUint16(16, false);
      return `${CATEGORIES.find((x) => x.id === category)?.name || "Category " + category} · ${data?.objectives?.find((x) => Number(x.id) === objective)?.name || "Objective " + objective}`;
    }
    const kind = v.getUint32(8, false);
    return `${kind >= 8 ? "Secret " : ""}${kind % 8 < 6 ? "Stage " + ((kind % 8) + 1) : kind % 8 === 6 ? "Climax" : "Last"} · Enemy preset ${v.getUint32(12, false)}`;
  }
  function mapView(ctx, ids) {
    const doc = ctx.file.doc,
      svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 900 360");
    svg.setAttribute("class", "galaxy-map");
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      ctx.mode === "main" ? "Galaxy mission map" : "Battle Zone route map",
    );
    const create = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
      return n;
    };
    const points = ids
      .map((id) => ({
        id,
        x: rootValue({ ...ctx, node: id }, 0, "f32"),
        y: rootValue({ ...ctx, node: id }, 4, "f32"),
      }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!points.length) return note("No missions belong to this selection.");
    const minX = Math.min(...points.map((p) => p.x)),
      maxX = Math.max(...points.map((p) => p.x)),
      minY = Math.min(...points.map((p) => p.y)),
      maxY = Math.max(...points.map((p) => p.y));
    const scale = Math.min(790 / Math.max(maxX - minX, 1), 250 / Math.max(maxY - minY, 1)),
      offX = 450 - ((maxX + minX) * scale) / 2,
      offY = 180 - ((maxY + minY) * scale) / 2;
    const pos = new Map(
      points.map((p) => [p.id, { ...p, sx: offX + p.x * scale, sy: offY + p.y * scale }]),
    );
    const line = (a, b) => {
      const pa = pos.get(a),
        pb = pos.get(b);
      if (!pa || !pb) return;
      svg.append(create("line", { x1: pa.sx, y1: pa.sy, x2: pb.sx, y2: pb.sy, class: "map-edge" }));
    };
    if (ctx.mode === "main") doc.getEdges().forEach((e) => line(e.a, e.b));
    else
      ids.forEach((id) => {
        try {
          readList(doc, u32(doc.readRoot(id), 0x34), 4).forEach((to) => line(id, to));
        } catch (_) {}
      });
    for (const p of pos.values()) {
      const selected = p.id === ctx.node,
        cat = ctx.mode === "main" ? dv(doc.readRoot(p.id)).getUint16(10, false) : 0,
        r = cat === 4 ? 23 : cat === 2 ? 16 : 12;
      const group = create("g", {
        class: `map-node${selected ? " selected" : ""}`,
        "data-node": p.id,
        tabindex: 0,
        role: "button",
        "aria-label": `Mission ${p.id}`,
        transform: `translate(${p.sx},${p.sy})`,
      });
      group.append(
        create("circle", { r: r + 6, class: "node-glow" }),
        create("circle", { r, class: "node-circle" }),
      );
      const text = create("text", { y: r + 20, "text-anchor": "middle", class: "node-label" });
      text.textContent = String(p.id);
      group.append(text);
      const title = create("title", {});
      title.textContent = `Mission ${p.id}: ${missionSummary(doc, p.id, ctx.mode, ctx.app.data)}. Drag to reposition.`;
      group.append(title);
      group.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (ctx.onPick) {
            ctx.onPick(p.id);
            return;
          }
          ctx.state.node = p.id;
          refresh(ctx);
        }
      });
      let drag = null;
      group.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        drag = { px: e.clientX, py: e.clientY, dx: 0, dy: 0, rect };
        group.setPointerCapture?.(e.pointerId);
      });
      group.addEventListener("pointermove", (e) => {
        if (!drag || ctx.onPick) return;
        drag.dx = ((e.clientX - drag.px) * 900) / drag.rect.width;
        drag.dy = ((e.clientY - drag.py) * 360) / drag.rect.height;
        group.setAttribute("transform", `translate(${p.sx + drag.dx},${p.sy + drag.dy})`);
      });
      group.addEventListener("pointerup", (e) => {
        if (!drag) return;
        const d = drag;
        drag = null;
        if (ctx.onPick) {
          ctx.onPick(p.id);
          return;
        }
        ctx.state.node = p.id;
        try {
          group.releasePointerCapture?.(e.pointerId);
        } catch (_) {}
        if (Math.abs(d.dx) + Math.abs(d.dy) < 4) {
          refresh(ctx);
          return;
        }
        change(ctx, "Move mission on map", (document) => {
          const row = document.readRoot(p.id),
            v = dv(row);
          let x = p.x + d.dx / scale,
            y = p.y + d.dy / scale;
          if (ctx.mode === "zone") {
            x = Math.max(0, Math.min(2, Math.round(x)));
            y = Math.max(0, Math.min(6, Math.round(y)));
            if (!validZonePoint(x, y))
              throw Error(
                "This position addresses saved cell 21 outside the route. Choose another grid position.",
              );
          }
          v.setFloat32(0, x, false);
          v.setFloat32(4, y, false);
          document.writeRoot(p.id, row);
        });
      });
      group.addEventListener("pointercancel", () => {
        drag = null;
        group.setAttribute("transform", `translate(${p.sx},${p.sy})`);
      });
      svg.append(group);
    }
    return h(
      "div",
      { class: "map-container" },
      svg,
      note(
        ctx.onPick
          ? "Select the preceding mission by clicking a circle."
          : "Select a circle to edit its mission. Drag a circle to change its menu coordinates. Circle sizes here illustrate the mission category.",
      ),
    );
  }
  function selectionPanel(ctx) {
    const doc = ctx.file.doc,
      panelNode = h("aside", { class: "panel mmd-sidebar" }),
      main = ctx.mode === "main",
      freeIds = new Set(doc.freeMissionIds());
    let ids = Array.from({ length: doc.rootCount }, (_, i) => i).filter((i) => !freeIds.has(i));
    if (main && doc.ownersCount) {
      const selectedOwner = Number(ctx.state.owner ?? -1);
      panelNode.append(
        R.galaxyChooser(ctx, selectedOwner, (id) => {
          ctx.state.owner = String(id);
          if (id >= 0) {
            const nodes = doc.getOwner(id).nodes;
            if (nodes.length && !nodes.some((n) => n.node === ctx.state.node))
              ctx.state.node = nodes[0].node;
          }
          refresh(ctx);
        }),
      );
      if (selectedOwner >= 0 && selectedOwner < doc.ownersCount)
        ids = doc
          .getOwner(selectedOwner)
          .nodes.map((x) => x.node)
          .filter((n) => n >= 0 && n < doc.rootCount);
    }
    const search = h("input", {
        type: "search",
        placeholder: "Find mission ID or objective…",
        value: ctx.state.search || "",
        "aria-label": "Find mission",
      }),
      list = h("div", { class: "record-list mmd-mission-list" });
    const renderList = () => {
      const needle = search.value.trim().toLowerCase();
      list.replaceChildren();
      const shown = ids.filter((id) =>
        `${id} ${missionSummary(doc, id, ctx.mode, ctx.app.data)}`.toLowerCase().includes(needle),
      );
      shown.forEach((id) => {
        const b = btn(
          "",
          () => {
            ctx.state.node = id;
            refresh(ctx);
          },
          `record-button${id === ctx.node ? " selected" : ""}`,
        );
        b.append(
          h("strong", {}, `Mission ${id}`),
          h("small", {}, missionSummary(doc, id, ctx.mode, ctx.app.data)),
        );
        list.append(b);
      });
      if (!shown.length) list.append(note("No matching missions."));
    };
    search.addEventListener("input", () => {
      ctx.state.search = search.value;
      renderList();
    });
    const jump = intInput(ctx.node, null);
    panelNode.append(
      h(
        "div",
        { class: "toolbar" },
        field("Jump to mission ID", jump),
        btn("Go", () =>
          safe(ctx, () => {
            ctx.state.node = parseInteger(jump.value, doc.rootCount - 1);
            refresh(ctx);
          }),
        ),
      ),
    );
    panelNode.append(
      search,
      note(`${ids.length} missions in this selection · ${doc.rootCount} total`),
      list,
    );
    renderList();
    if (main && R.Authoring.isGalaxy(ctx.file)) {
      const browser = h("details", { class: "mission-browser" });
      browser.open = Number(ctx.state.owner) < 0;
      browser.append(
        h("summary", {}, "Find a mission · " + ids.length + " in this Galaxy"),
        ...Array.from(panelNode.children).slice(1),
      );
      return {
        element: R.galaxyRail(ctx, Number(ctx.state.owner ?? -1), (id) => {
          ctx.state.owner = String(id);
          ctx.state.search = "";
          if (id >= 0) {
            const o = doc.getOwner(id);
            if (!o.nodes.some((n) => n.node === ctx.state.node))
              ctx.state.node = o.nodes.some((n) => n.node === o.start)
                ? o.start
                : o.nodes[0]?.node || 0;
          }
          refresh(ctx);
        }),
        ids,
        browser,
      };
    }
    return { element: panelNode, ids };
  }

  R.renderMissionMap = mapView;
  R.chooseMissionPresetTable = choosePresetTable;
  R.renderMmd = function (container, app, mode) {
    const files = app.files.filter((f) => f.kind === mode),
      key = mode === "main" ? "galaxy" : "zone";
    if (!app.ui) app.ui = {};
    if (!app.ui.mmd) app.ui.mmd = {};
    const section = app.ui.mmd[key] || (app.ui.mmd[key] = {});
    let file =
      files.find((f) => f.id === app.selectedFileId) ||
      files.find((f) => f.id === section.file) ||
      files[0];
    container.replaceChildren();
    if (!file) {
      container.append(
        h(
          "div",
          { class: "empty-state" },
          h("div", { class: "empty-icon" }, mode === "main" ? "✦" : "◈"),
          h("h2", {}, mode === "main" ? "Open a Galaxy or Tutorial MMD" : "Open a Battle Zone MMD"),
          note(
            mode === "main"
              ? "Load galaxy.mmd or tutorial.mmd to edit missions, teams, objectives and the Galaxy map."
              : "Load an individual zone_*.mmd to edit opponents, routes, handicaps and rewards.",
          ),
          note("Use Open files above. This editor works with extracted MMD and DAT files."),
        ),
      );
      return;
    }
    section.file = file.id;
    if (!section.files) section.files = {};
    const state =
      section.files[file.id] || (section.files[file.id] = { node: 0, owner: -1, tab: "mission" });
    if (!Number.isInteger(state.node) || state.node < 0 || state.node >= file.doc.rootCount)
      state.node = 0;
    if (mode === "main" && state.emptyOwner === Number(state.owner)) {
      const owner = file.doc.getOwner(Number(state.owner));
      if (owner.nodes.length) {
        state.node = owner.nodes.some((n) => n.node === owner.start)
          ? owner.start
          : owner.nodes[0].node;
        delete state.emptyOwner;
      }
    }
    const freeIds = new Set(file.doc.freeMissionIds());
    if (mode === "main" && freeIds.has(state.node))
      state.node =
        Array.from({ length: file.doc.rootCount }, (_, i) => i).find((i) => !freeIds.has(i)) ?? 0;
    const ctx = { app, file, state, mode, node: state.node };
    const fileSelect = h("select", { "aria-label": "Active MMD file" });
    files.forEach((f) =>
      fileSelect.append(h("option", { value: f.id }, `${f.name}${f.dirty ? " • modified" : ""}`)),
    );
    fileSelect.value = file.id;
    fileSelect.addEventListener("change", () => {
      section.file = fileSelect.value;
      app.selectFile(fileSelect.value);
    });
    container.append(
      h(
        "div",
        { class: "toolbar mmd-topbar" },
        field("MMD document", fileSelect),
        h(
          "span",
          { class: "tag" },
          `${file.doc.magic} · ${file.doc.rootCount - freeIds.size} missions · ${freeIds.size} free IDs · ${file.doc.descriptors.length} descriptors`,
        ),
        btn("Create mission…", () => R.openMissionWizard(ctx), "primary"),
      ),
    );
    if (mode === "main" && R.Authoring.isGalaxy(file)) {
      const showEmpty = h("input", {
        type: "checkbox",
        checked: !!state.showEmptyGalaxies,
        "aria-label": "Show Empty Galaxies",
      });
      showEmpty.addEventListener("change", () => {
        if (!app.ensureApplied()) {
          showEmpty.checked = !!state.showEmptyGalaxies;
          return;
        }
        state.showEmptyGalaxies = showEmpty.checked;
        if (
          !showEmpty.checked &&
          Number(state.owner) >= 0 &&
          !file.doc.getOwner(Number(state.owner)).nodes.length
        )
          state.owner = "-1";
        app.refresh();
      });
      container
        .querySelector(".mmd-topbar")
        .append(h("label", { class: "checkbox-label" }, showEmpty, " Show Empty Galaxies"));
    }
    if (mode === "main" && file.doc.rootCount && freeIds.size === file.doc.rootCount) {
      container.append(
        panel(
          "All mission IDs are free",
          note(
            "No active donor remains in this file. Undo a deletion or reopen a working MMD to create battles from a valid donor.",
          ),
        ),
      );
      return;
    }
    if (!file.doc.rootCount) {
      container.append(
        warning(
          "This MMD has no root records. A donor mission is required to create the first battle.",
        ),
      );
      return;
    }
    let selection;
    try {
      selection = selectionPanel(ctx);
    } catch (e) {
      container.append(warning(e.message));
      return;
    }
    const content = h("div", { class: "mmd-workspace" }),
      layout = h("div", { class: "split-layout mmd-layout" }, selection.element, content);
    container.append(layout);
    if (mode === "main" && Number(state.owner) >= 0 && !selection.ids.length) {
      state.emptyOwner = Number(state.owner);
      content.append(
        panel(
          "Empty Galaxy · " + app.characterName(Number(state.owner)),
          note("Choose how to fill this empty character/form slot."),
          R.Authoring.isGalaxy(file)
            ? btn(
                "Transfer Galaxy from another Character",
                () => R.openTransferGalaxy(ctx),
                "primary",
              )
            : null,
          note(
            "Transfer moves an existing Galaxy, including its world-menu icon. The original character loses that Galaxy; mission IDs and saved progress are retained.",
          ),
          btn("Create New Galaxy", () => R.openMissionWizard(ctx), "secondary"),
          warning(
            "Create New Galaxy starts with a first mission from a working donor. It does not add a selectable world-menu icon; use Transfer to replace an existing Galaxy. Original game menu and save limits still apply.",
          ),
        ),
      );
      return;
    }
    if (selection.browser) content.append(selection.browser);
    content.append(
      h(
        "div",
        { class: "mission-title" },
        h(
          "div",
          {},
          h("p", { class: "eyebrow" }, mode === "main" ? "GALAXY / TUTORIAL" : "BATTLE ZONE"),
          h("h2", {}, `Mission ${ctx.node}`),
          note(missionSummary(file.doc, ctx.node, mode, app.data)),
        ),
      ),
    );
    if (selection.ids.length <= 150)
      try {
        content.append(mapView(ctx, selection.ids));
      } catch (e) {
        content.append(warning("Map preview: " + e.message));
      }
    else
      content.append(
        note(
          "Select a Galaxy to display its map. All-missions view keeps the complete searchable list.",
        ),
      );
    const tabs =
      mode === "main"
        ? [
            ["mission", "Battle"],
            ["teams", "Teams"],
            ["actions", "Actions & rules"],
            ["progression", "Progression"],
            ["map", "Map & owners"],
            ["advanced", "Advanced"],
          ]
        : [
            ["mission", "Battle"],
            ["conditions", "Conditions & rewards"],
            ["map", "Route"],
            ["advanced", "Advanced"],
          ];
    if (!tabs.some((t) => t[0] === state.tab)) state.tab = "mission";
    const nav = h("nav", { class: "subtabs", "aria-label": "Mission editor sections" });
    tabs.forEach(([id, label]) =>
      nav.append(
        btn(
          label,
          () => {
            if (!app.ensureApplied()) return;
            state.tab = id;
            app.refresh();
          },
          `subtab${id === state.tab ? " active" : ""}`,
        ),
      ),
    );
    content.append(nav);
    const add = (fn) => {
      try {
        content.append(fn());
      } catch (e) {
        content.append(
          panel(
            "This section could not be decoded",
            warning(e.message),
            note("Existing bytes are preserved. Advanced exposes the raw record and descriptors."),
          ),
        );
      }
    };
    if (mode === "zone" && state.tab === "map") content.append(R.GamePreview.zoneUnlock(ctx));
    const preview = R.GamePreview.render(ctx);
    ctx.previewHosts = [preview];
    preview.dataset.view = state.tab;
    content.append(preview);
    if (state.tab === "mission") add(() => missionPanel(ctx));
    if (state.tab === "teams") {
      content.append(presetTableSelector(ctx));
      add(() => perspectivePanel(ctx));
      add(() => rosterPanel(ctx, "allies"));
      add(() => rosterPanel(ctx, "enemies"));
    }
    if (state.tab === "actions") {
      add(() => R.renderModifierGuide(ctx));
      add(() => actionsPanel(ctx));
      add(() => rulesPanel(ctx));
      add(() =>
        idListPanel(
          ctx,
          0x4c,
          "Battle modifier items · +4C",
          2,
          app.data?.items,
          "These items apply to the player’s team, including allied candidates. Give enemy CPU bonus items through Teams → Edit character preset → Strength & equipment. Mission UI item lists only display icons.",
        ),
      );
      add(() =>
        idListPanel(
          ctx,
          0x50,
          "Mission UI item list A · +50",
          2,
          app.data?.items,
          "Mission-menu item icons, separate from equipping the modifiers. A UI entry alone does not apply an effect.",
        ),
      );
      add(() =>
        idListPanel(
          ctx,
          0x54,
          "Mission UI item list B · +54",
          2,
          app.data?.items,
          "Mission-menu item icons, separate from equipping the modifiers. A UI entry alone does not apply an effect.",
        ),
      );
    }
    if (state.tab === "progression") {
      add(() => R.renderUnlockGuide(ctx));
      add(() =>
        panel(
          "Reveal and availability",
          note(
            "Map links, progression expressions and the OR query list are separate. Query meaning depends on the game context.",
          ),
          rootExpression(ctx, 0x30, "Reveal-related gate"),
          rootExpression(ctx, 0x34, "Availability gate"),
        ),
      );
      add(() => orQueriesPanel(ctx));
      add(() => rewardsPanel(ctx));
    }
    if (state.tab === "conditions") {
      add(() =>
        idListPanel(
          ctx,
          0x28,
          "Challenge Stamp criteria",
          4,
          app.data?.stamps,
          "Stamp criterion IDs and handicap IDs use different enums.",
        ),
      );
      add(() => rewardsPanel(ctx));
      add(() =>
        details(
          "Stored +30 expression (advanced research)",
          note(
            "This expression exists in the original files, so it is preserved and can be inspected. It mirrors the native secret requirement in stock secret stages. No active expression evaluator has been identified for this field in the traced stock routing path; do not use it as an unlock switch. Edit actual routes in Route → Next stage nodes instead.",
          ),
          rootExpression(
            ctx,
            0x30,
            "Zone condition",
            "Research field: copied with the selected stage, but not evaluated by the traced secret-route check. Its intended design role is unproven. Keep original values unless deliberately experimenting; Conditional Rewards expressions are evaluated separately and remain editable.",
          ),
        ),
      );
    }
    if (state.tab === "map") {
      content.append(
        panel(
          "Create a guided mission",
          note(
            "Choose a basic donor, a destination Galaxy and a predecessor visually. New missions trigger a save-compatibility notice.",
          ),
          btn("Create mission…", () => R.openMissionWizard(ctx), "primary"),
        ),
      );
      if (mode === "main") {
        add(() => graphPanel(ctx));
        add(() => ownersPanel(ctx));
      } else {
        add(() => zoneRoutePanel(ctx));
        add(() =>
          idListPanel(
            ctx,
            0x34,
            "Next stage nodes",
            4,
            null,
            "Directed links to mission indices in this MMD. Two ordinary destinations offer a player choice. Secret destinations require the Zone’s native unlock; this list cannot change its action.",
            file.doc.rootCount - 1,
          ),
        );
      }
      add(() => newMissionPanel(ctx));
    }
    if (state.tab === "advanced") add(() => advancedPanel(ctx));
  };
})();
