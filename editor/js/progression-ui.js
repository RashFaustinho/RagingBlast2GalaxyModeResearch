/* Named rewards, unlock provenance and mission-rule guidance. */
(function (g) {
  "use strict";
  const R = g.RB2,
    el = (t, a, ...c) => R.ui.el(t, a, ...c),
    button = (s, f, cls = "secondary") =>
      el("button", { type: "button", class: cls, onclick: f }, s),
    note = (s) => el("p", { class: "muted helper-text" }, s),
    view = (b) => new DataView(b.buffer, b.byteOffset, b.byteLength);
  function enhancedGroups(app) {
    return app.modEnabled && app.modProfile
      ? app.data.enhancedCharacters || []
      : R.PROGRESSION.enhancedCharacters;
  }
  function enhancedNative(app, id) {
    return enhancedGroups(app).find((x) => x.index === id)?.native;
  }
  function rewardLabel(app, kind, id, doc) {
    const name = (n) => app.characterName(n),
      native = Math.floor(id / 100),
      entry = id % 100;
    switch (kind) {
      case 0: {
        const move = app.data.moves.find((x) => x.native === native && x.id === entry);
        return name(native) + " · " + (move?.name || "Local move " + entry);
      }
      case 1:
        return app.itemName(id);
      case 2:
        return name(native) + " · costume index " + entry + " (menu costume " + (entry + 1) + ")";
      case 3:
        return app.data.music.find((x) => x.id === id)?.name || "BGM " + id;
      case 4:
      case 9:
        return name(id);
      case 5:
        return id + " Limit Point" + (id === 1 ? "" : "s");
      case 6:
        return app.data.stages.find((x) => x.id === id)?.name || "Stage " + id;
      case 7:
        return "Dragon Ball reward";
      case 8:
        return "Museum picture #" + id;
      case 10: {
        const n = enhancedNative(app, id);
        return (
          (n === undefined ? "Unmapped character-select group " + id : name(n)) +
          " · enhanced character (group " +
          id +
          ")"
        );
      }
      default:
        return "Unmapped reward " + id;
    }
  }
  function rewardOptions(app, kind, doc) {
    let ids = R.PROGRESSION.originalRewardIds[String(kind)] || [];
    if (kind === 0)
      ids = app.data.moves
        .filter((x) => x.resolved && x.id < 100 && x.native * 100 + x.id <= 65535)
        .map((x) => x.native * 100 + x.id);
    if (kind === 1) ids = app.data.items.map((x) => x.id);
    if (kind === 3) ids = app.data.music.map((x) => x.id);
    if (kind === 4) ids = app.data.characters.map((x) => x.id);
    if (kind === 5) ids = Array.from({ length: 20 }, (_, i) => i + 1);
    if (kind === 6) ids = app.data.stages.map((x) => x.id);
    if (kind === 9)
      ids =
        app.modEnabled && app.modProfile
          ? app.data.characters.map((x) => x.id)
          : R.PROGRESSION.galaxyIcons.map((x) => x.native);
    if (kind === 10) ids = enhancedGroups(app).map((x) => x.index);
    return [...new Set(ids)].map((id) => ({ id, name: rewardLabel(app, kind, id, doc) }));
  }
  R.rewardLabel = rewardLabel;
  R.rewardOptions = rewardOptions;
  R.renderModifierGuide = function (ctx) {
    const app = ctx.app,
      d = ctx.file.doc,
      root = view(d.readRoot(ctx.node)),
      ids = (o) => {
        const ref = root.getUint32(o, false);
        return ref
          ? [
              ...(function* () {
                const b = view(d.body(ref));
                for (let i = 0; i < b.byteLength; i += 2) yield b.getUint16(i, false);
              })(),
            ]
          : [];
      };
    const modifiers = ids(0x4c),
      ui = ids(0x50),
      box = el(
        "section",
        { class: "panel mmd-panel" },
        el("h3", {}, "How the rule text, effect and icons work together"),
      );
    const names = (a) => a.map((i) => app.itemName(i) + " (" + i + ")").join(", ") || "None";
    box.append(
      el(
        "div",
        { class: "relationship-grid" },
        el(
          "div",
          { class: "relationship-step" },
          el("h4", {}, "1 · Rule descriptions"),
          note(
            "The sentence shown in the mission menu. It describes a condition; changing the wording alone does not add the effect.",
          ),
        ),
        el(
          "div",
          { class: "relationship-step" },
          el("h4", {}, "2 · Battle modifier items"),
          note(
            "Items applied to the player’s team, including any allied candidates. To give an enemy CPU bonus items, edit that character preset’s Strength equipment instead.",
          ),
          note(names(modifiers)),
        ),
        el(
          "div",
          { class: "relationship-step" },
          el("h4", {}, "3 · Mission UI items"),
          note(
            "Icons shown to explain the mission’s items and countermeasures such as Seal. Adding an icon does not equip the item.",
          ),
          note("List A: " + names(ui)),
        ),
      ),
    );
    box.append(
      note(
        "Original mission 496 is a verified example: rule 10 “Player Health constantly decreases”, modifier 296 / Health Auto-Loss V, and UI list A 296. UI list B is empty. These are independent fields, so synchronization is an explicit edit.",
      ),
    );
    if (modifiers.some((i) => !ui.includes(i)))
      box.append(
        el(
          "p",
          { class: "warning" },
          "Some mission modifiers are absent from UI list A. This can be deliberate; review whether the player should see their icons.",
        ),
      );
    box.append(
      button("Match UI list A to battle modifiers", () => {
        if (!app.ensureApplied()) return;
        app.transact("Synchronize mission modifier icons", [ctx.file], () => {
          const v = view(d.readRoot(ctx.node)),
            ref = v.getUint32(0x4c, false);
          d.setList(ctx.node, 0x50, ref ? d.body(ref) : new Uint8Array(), 2);
        });
      }),
    );
    box.append(
      el(
        "details",
        {},
        el("summary", {}, "Which side receives a mission modifier?"),
        note(
          "Battle modifier items apply to the player’s team. Enemy CPU equipment belongs in each enemy preset’s Strength table. The two Mission UI item lists only control displayed icons; they do not equip items or choose a side.",
        ),
        note(
          "Original Galaxy path: the mission bitmap is merged into team 0 (the player’s roster) before actors are created. The code at 0x12C83C combines it with each player-side candidate’s item bitmap, then rebuilds its effects. It does not run the same merge over the enemy roster. Enemy effects normally come from the enemy preset’s Strength equipment. There is no per-entry target selector in this MMD list. Exact item behavior and Seal interactions still depend on the native effect code; modded executables may change this path.",
        ),
      ),
    );
    return box;
  };
  function records(doc, node) {
    const ref = view(doc.readRoot(node)).getUint32(0x2c, false);
    if (!ref) return [];
    const b = view(doc.body(ref)),
      out = [];
    for (let i = 0; i < b.byteLength; i += 8)
      out.push({
        kind: b.getUint16(i, false),
        id: b.getUint16(i + 2, false),
        condition: b.getUint32(i + 4, false),
      });
    return out;
  }
  R.renderUnlockGuide = function (ctx) {
    const app = ctx.app,
      d = ctx.file.doc,
      box = el(
        "section",
        { class: "panel mmd-panel" },
        el("h3", {}, "Mission access, Galaxy unlocks and forms"),
      );
    box.append(
      note(
        "Reveal controls whether a mission appears on the map. Availability and OR queries control whether it can be selected. Map connections and saved progress also matter. These are different from unlocking a whole character’s Galaxy.",
      ),
      note(
        "Conditional rewards are processed by the game’s result/unlock flow when their condition is met, usually after clearing a mission. An absent condition does not mean “grant immediately on opening this file”. Some rewards also check existing save state and game-wide limits.",
      ),
    );
    const owner = Number(ctx.state.owner);
    if (owner >= 0) {
      const forms = app.data.characters
          .filter((x) => x.name.split(" / ")[0] === app.characterName(owner).split(" / ")[0])
          .map((x) => x.id),
        sources = [];
      for (let i = 0; i < d.rootCount; i++)
        for (const reward of records(d, i))
          if (
            (reward.kind === 9 && reward.id === owner) ||
            (reward.kind === 4 && forms.includes(reward.id))
          )
            sources.push({ node: i, ...reward });
      box.append(el("h4", {}, "Unlock sources for " + app.characterName(owner)));
      if (!sources.length)
        box.append(
          note(
            "No matching unlock reward was found in this MMD. Initial availability can be set by new-save initialization or other game systems.",
          ),
        );
      for (const s of sources)
        box.append(
          el(
            "div",
            { class: "unlock-source" },
            app.portrait(s.id)
              ? el("img", { src: app.portrait(s.id), alt: "" })
              : el("span", { class: "portrait-placeholder" }, "?"),
            el(
              "span",
              {},
              (s.kind === 9 ? "Galaxy unlock: " : "Galaxy form: ") +
                rewardLabel(app, s.kind, s.id, d),
            ),
            button("Open mission " + s.node, () => {
              if (!app.ensureApplied()) return;
              const owning = Array.from({ length: d.ownersCount }, (_, id) => id).find((id) =>
                d.getOwner(id).nodes.some((n) => n.node === s.node),
              );
              ctx.state.owner = String(owning ?? -1);
              ctx.state.node = s.node;
              app.refresh();
            }),
          ),
        );
    }
    box.append(
      el(
        "details",
        {},
        el("summary", {}, "Can I make an entire Galaxy start locked?"),
        note(
          "Galaxy/character unlock rewards are kind 9 and use a native base-character ID. Galaxy-form rewards are kind 4 and use the target native form. The original new-save initializer uses hardcoded native availability lists:60 native IDs receive the character-availability flag, and66 receive the separate Galaxy-form flag. These lists are outside the MMD. There is no single “start locked” MMD toggle.",
        ),
        note(
          "Editing an unlock reward changes future rewards; it does not erase an unlock already stored in an existing save. Mission availability expressions do not relock an entire Galaxy. A custom starting save can change native availability, which also affects character access outside Galaxy and requires a corrected internal checksum. This editor does not edit savedata.",
        ),
      ),
    );
    const choices = el("select", { "aria-label": "Availability prerequisite mission" }),
      ownerNodes =
        owner >= 0
          ? d.getOwner(owner).nodes.map((n) => n.node)
          : Array.from({ length: d.rootCount }, (_, i) => i);
    for (const id of ownerNodes.filter((id) => id !== ctx.node))
      choices.append(el("option", { value: id }, "Mission " + id));
    const applyGate = (after) => {
      if (!app.ensureApplied()) return;
      app.transact("Set guided mission availability", [ctx.file], () => {
        const bytes = after
          ? R.Mmd.encodeExpression([
              [2, Number(choices.value)],
              [2, 2],
              [1, 16],
              [0, 0],
            ])
          : null;
        d.setExpression(ctx.node, 0x34, bytes);
        d.setList(ctx.node, 0x38, new Uint8Array(), 4);
      });
    };
    box.append(
      el("h4", {}, "Set a simple mission prerequisite"),
      el(
        "div",
        { class: "toolbar" },
        choices,
        button("Unlock after this mission", () => {
          if (choices.options.length) applyGate(true);
        }),
        button("Clear additional availability gate", () => applyGate(false)),
      ),
      note(
        "This changes the availability expression and clears the OR-query list. Reveal expressions and graph connections remain separate. Use the map above to identify the prerequisite.",
      ),
    );
    return box;
  };
})(globalThis);
