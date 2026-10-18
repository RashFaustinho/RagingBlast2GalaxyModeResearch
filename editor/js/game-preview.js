/* Original game textures composed with live editor data; no saved-game results assumed. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {});
  const el = (...a) => R.ui.el(...a);
  function model(ctx, overrides = {}) {
    const { app, file, node } = ctx,
      v = new DataView(file.doc.readRoot(node).buffer),
      u16 = (o) => overrides[o] ?? v.getUint16(o),
      u32 = (o) => overrides[o] ?? v.getUint32(o),
      owner = Number(ctx.state.owner),
      perspective = owner >= 0 ? owner : Number(ctx.state.previewNative),
      selected = Number.isInteger(perspective) && perspective >= 0 ? perspective : undefined;
    const c = {
        mode: ctx.mode,
        selectedNative: selected,
        characterName: (id) => app.characterName(id),
      },
      lookup = (rows, id, fallback) =>
        rows?.find((x) => Number(x.id) === id)?.name || fallback + " " + id;
    function parameter(ref) {
      if (!ref) return null;
      try {
        return R.Conditions.evaluate(R.Mmd.parseExpression(file.doc.body(ref)).ast, c);
      } catch (_) {
        return null;
      }
    }
    function text(template, ref) {
      const n = parameter(ref);
      return template.replace(/\[value\]/gi, n === null ? "[value]" : String(n));
    }
    const table = R.chooseMissionPresetTable(ctx),
      apps = app.files.filter((f) => f.kind === "appearance"),
      appearance = apps.find((f) => f.id === app.ui.presets?.appearanceFileId) || apps[0];
    function identity(preset, state = "included") {
      let native = null;
      try {
        if (table && appearance) native = appearance.doc.row(table.doc.row(preset)[0])[0];
      } catch (_) {}
      return {
        preset,
        native,
        state,
        name: native === null ? "Preset " + preset : app.characterName(native),
        portrait: native === null ? "" : app.portrait(native),
      };
    }
    let enemies = [],
      allies = [],
      special = false;
    if (ctx.mode === "main")
      for (const side of ["allies", "enemies"]) {
        try {
          const roster = R.Conditions.roster(file.doc, node, side, c);
          if (roster.special) special = true;
          const entries = roster.entries
            .filter((e) => e.conditionInfo.state !== "excluded")
            .map((e) => identity(e.preset, e.conditionInfo.state));
          if (side === "allies") allies = entries;
          else enemies = entries;
        } catch (_) {
          special = true;
        }
      }
    else enemies = [identity(u32(12))];
    return {
      node,
      owner: selected,
      ownerName:
        selected === undefined
          ? ctx.mode === "zone"
            ? "Battle Zone"
            : "Select a Galaxy"
          : app.characterName(selected),
      ownerPortrait: selected === undefined ? "" : app.portrait(selected),
      enemies,
      allies,
      special,
      difficulty:
        ctx.mode === "main"
          ? lookup(app.data.difficulties, u16(14), "Difficulty")
          : "LV " + u32(16),
      category: ctx.mode === "main" ? lookup(app.data.categories, u16(10), "Category") : "Handicap",
      objective:
        ctx.mode === "main"
          ? text(lookup(app.data.objectives, u16(16), "Objective"), u32(0x40)).replace(
              /^Mission:\s*/,
              "",
            )
          : lookup(app.data.handicaps, u32(0x14), "Handicap"),
      rules:
        ctx.mode === "main"
          ? [
              { id: u16(0x12), ref: u32(0x44) },
              { id: u16(0x14), ref: u32(0x48) },
            ]
              .filter((x) => x.id)
              .map((x) => text(lookup(app.data.rules, x.id, "Rule"), x.ref))
          : [],
      stage:
        ctx.mode !== "main" && !app.modEnabled && u32(0x1c) > 13
          ? lookup(app.data.stages, 0, "Arena") + " (fallback from selector " + u32(0x1c) + ")"
          : lookup(app.data.stages, ctx.mode === "main" ? u16(8) : u32(0x1c), "Arena"),
      music: R.Music.label(ctx, ctx.mode === "main" ? u16(12) : u32(0x20)),
      musicNote: R.Music.help(ctx, ctx.mode === "main" ? u16(12) : u32(0x20)),
      unresolved:
        enemies.some((e) => e.state === "unknown") || allies.some((e) => e.state === "unknown"),
    };
  }
  function rules(m) {
    return el(
      "div",
      { class: "game-rule-window", "data-game-rules": "" },
      el(
        "div",
        { class: "game-objective" },
        el("strong", {}, m.category + ": "),
        el("span", {}, m.objective),
      ),
      ...m.rules.map((t) => el("p", {}, t)),
    );
  }
  function card(c) {
    return el(
      "div",
      {
        class: "game-fighter" + (c.state === "unknown" ? " conditional" : ""),
        title: c.name + (c.state === "unknown" ? " · condition unresolved" : ""),
        "data-game-preset": c.preset,
      },
      c.portrait
        ? el("img", { src: c.portrait, alt: c.name, loading: "lazy" })
        : el("span", { class: "game-fighter-placeholder" }, "?"),
      el("span", { class: "game-fighter-name" }, c.name),
      c.state === "unknown"
        ? el("span", { class: "game-conditional", title: "Runtime-dependent candidate" }, "?")
        : null,
    );
  }
  function summary(m) {
    return el(
      "section",
      { class: "game-mission-panel", "aria-label": "Live mission preview" },
      el(
        "header",
        { class: "game-nameplate" },
        m.ownerPortrait ? el("img", { src: m.ownerPortrait, alt: "" }) : null,
        el("strong", {}, m.ownerName),
        el("span", {}, "MISSION " + m.node),
      ),
      el(
        "div",
        { class: "game-fighters", "data-game-team": "enemies" },
        ...(m.enemies.length
          ? m.enemies.map(card)
          : [
              el(
                "p",
                { class: "muted" },
                m.special ? "Special team format — inspect Teams." : "No opponent candidates.",
              ),
            ]),
      ),
      m.allies.length
        ? el(
            "div",
            { class: "game-allies" },
            el("span", {}, "ALLIES"),
            ...m.allies.map((c) =>
              el(
                "span",
                { class: "game-ally", title: c.name },
                c.portrait ? el("img", { src: c.portrait, alt: c.name }) : null,
                c.name,
              ),
            ),
          )
        : null,
      el(
        "dl",
        { class: "game-mission-stats" },
        el(
          "div",
          {},
          el("dt", {}, "Difficulty"),
          el("dd", { "data-game-difficulty": "", class: "game-difficulty" }, m.difficulty),
        ),
        el(
          "div",
          {},
          el("dt", {}, "Arena"),
          el("dd", { "data-game-arena": "", title: m.stage }, m.stage),
        ),
        el(
          "div",
          {},
          el("dt", {}, "Music"),
          el("dd", { "data-game-music": "", title: m.musicNote || m.music }, m.music),
        ),
      ),
      m.unresolved
        ? el(
            "p",
            { class: "game-preview-note" },
            "? Conditional candidates need a Galaxy perspective or runtime state.",
          )
        : null,
    );
  }
  function zoneUnlock(ctx) {
    const info = R.Conditions.zoneSecretRequirement(ctx.file.name),
      active = info.status === "active",
      box = el("section", {
        class: "zone-unlock-banner " + info.status,
        "aria-label": "Battle Zone secret-route requirement",
        "data-zone-secret-status": info.status,
      });
    box.append(
      el("h3", {}, "Secret routes — entire Battle Zone"),
      el(
        "strong",
        { class: "zone-unlock-requirement" },
        active
          ? info.requirement
          : info.status === "none"
            ? "No native secret-route trigger"
            : "Secret-route requirement unknown",
      ),
      el(
        "p",
        {},
        active
          ? "The same requirement applies to secret forks in ALL battles of this Zone. Once activated, the unlock may remain active for the rest of the run, so the action does not necessarily need to be repeated at each fork."
          : info.status === "none"
            ? "This stock Zone slot has no action that unlocks secret routes. Adding a secret destination does not create one. Use ordinary destinations (Stage kind 0–7) to offer accessible route choices."
            : "Identify the original Normal/Ultimate Zone slot where this file is imported before relying on a secret unlock. An unknown filename does not mean there is no trigger.",
      ),
      el(
        "p",
        { class: "muted" },
        "Ordinary forks are player choices and do not require this action. The secret-unlock action is defined by the executable and cannot be changed in Galaxy Studio.",
      ),
      el(
        "p",
        { class: "source-note" },
        "Original-game rule for this file’s usual Zone slot. Executable mods or importing into a different slot can change which rule applies.",
      ),
    );
    return box;
  }
  function render(ctx) {
    const host = el("div", { class: "live-game-preview" });
    update(host, ctx);
    return host;
  }
  function update(host, ctx, overrides = {}) {
    try {
      const m = model(ctx, overrides);
      host.classList.toggle("collapsed", !!ctx.state.previewCollapsed);
      const toggle = el(
        "button",
        {
          class: "quiet compact",
          type: "button",
          "aria-expanded": String(!ctx.state.previewCollapsed),
          onclick: () => {
            ctx.state.previewCollapsed = !ctx.state.previewCollapsed;
            update(host, ctx, overrides);
          },
        },
        ctx.state.previewCollapsed ? "Show preview" : "Hide preview",
      );
      host.replaceChildren(
        el(
          "div",
          { class: "preview-label" },
          el("span", {}, "IN-GAME PREVIEW"),
          el("span", {}, "Live · " + m.stage),
          toggle,
        ),
        summary(m),
        rules(m),
      );
    } catch (e) {
      host.replaceChildren(el("p", { class: "muted" }, "Preview unavailable: " + e.message));
    }
  }
  R.GamePreview = { model, render, update, rules, zoneUnlock };
})(globalThis);
