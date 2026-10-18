/* Character-led workflows and visual mission creation. UI only, offline. */
(function (g) {
  "use strict";
  const R = g.RB2,
    el = (t, a, ...c) => R.ui.el(t, a, ...c),
    button = (s, f, cls = "secondary") =>
      el("button", { type: "button", class: cls, onclick: f }, s),
    note = (s) => el("p", { class: "muted helper-text" }, s);
  const field = (s, n, help) =>
    el(
      "label",
      { class: "field" },
      el("span", { class: "field-label" }, s),
      n,
      help ? el("small", { class: "muted" }, help) : null,
    );
  function choose(value, rows, label) {
    const s = el("select", { "aria-label": label });
    for (const r of rows) s.append(el("option", { value: r.id }, r.name));
    s.value = String(value);
    return s;
  }
  function galaxyCards(app, doc, selected, pick, all = true, showEmpty = false) {
    const root = el("div", { class: "galaxy-picker" }),
      search = el("input", {
        type: "search",
        placeholder: "Find a Galaxy by character name…",
        "aria-label": "Find Galaxy",
      }),
      grid = el("div", { class: "galaxy-card-grid" });
    const entries = Array.from({ length: doc.ownersCount }, (_, id) => ({
      id,
      name: app.characterName(id),
      count: doc.getOwner(id).nodes.length,
    })).filter((x) => showEmpty || x.count);
    if (all)
      entries.push({
        id: -1,
        name: "All Missions",
        count: doc.rootCount - doc.freeMissionIds().length,
      });
    function paint() {
      grid.replaceChildren();
      for (const row of entries.filter((x) =>
        x.name.toLowerCase().includes(search.value.toLowerCase()),
      )) {
        const b = button(
          "",
          () => pick(row.id),
          "galaxy-card" + (row.id === Number(selected) ? " selected" : ""),
        );
        b.setAttribute("aria-label", row.id < 0 ? "All Missions" : row.name + " Galaxy");
        b.setAttribute("aria-pressed", String(row.id === Number(selected)));
        b.append(
          row.id < 0
            ? el("span", { class: "galaxy-all-icon" }, "✦")
            : app.portrait(row.id)
              ? el("img", { src: app.portrait(row.id), alt: "", loading: "lazy" })
              : el("span", { class: "portrait-placeholder" }, "?"),
          el("span", {}, el("strong", {}, row.name), el("small", {}, row.count + " missions")),
        );
        grid.append(b);
      }
      if (!grid.children.length) grid.append(note("No matching Galaxies."));
    }
    search.addEventListener("input", paint);
    root.append(search, grid);
    paint();
    return root;
  }
  R.galaxyChooser = function (ctx, owner, onPick) {
    const box = el("div", { class: "galaxy-choice" }),
      current = owner >= 0 ? ctx.app.characterName(owner) : "All Missions";
    const b = button(
      "",
      () => {
        if (!ctx.app.ensureApplied()) return;
        const body = ctx.app.dialog("Choose a Galaxy");
        body.append(
          note(
            "Original portraits from the game. Enable Show Empty Galaxies to include native forms with no missions.",
          ),
          galaxyCards(
            ctx.app,
            ctx.file.doc,
            owner,
            (id) => {
              ctx.app.closeDialog();
              onPick(id);
            },
            true,
            ctx.state.showEmptyGalaxies,
          ),
        );
      },
      "galaxy-current",
    );
    b.setAttribute("aria-label", "Choose Galaxy / selected character");
    b.append(
      owner >= 0
        ? ctx.app.portrait(owner)
          ? el("img", { src: ctx.app.portrait(owner), alt: "" })
          : el("span", { class: "portrait-placeholder" }, "?")
        : el("span", { class: "galaxy-all-icon" }, "✦"),
      el("span", {}, el("small", {}, "GALAXY"), el("strong", {}, current)),
      el("span", {}, "▾"),
    );
    box.append(b);
    return box;
  };
  R.galaxyRail = function (ctx, owner, onPick) {
    const rail = el("aside", { class: "galaxy-rail", "aria-label": "Galaxy character list" });
    rail.append(
      el(
        "div",
        { class: "galaxy-rail-heading" },
        el("p", { class: "eyebrow" }, "YOUR GALAXIES"),
        R.galaxyChooser(ctx, owner, onPick),
      ),
    );
    const list = el("div", { class: "galaxy-rail-list" });
    const entries = Array.from({ length: ctx.file.doc.ownersCount }, (_, id) => ({
      id,
      name: ctx.app.characterName(id),
      count: ctx.file.doc.getOwner(id).nodes.length,
    })).filter((x) => ctx.state.showEmptyGalaxies || x.count);
    entries.push({
      id: -1,
      name: "All Missions",
      count: ctx.file.doc.rootCount - ctx.file.doc.freeMissionIds().length,
    });
    for (const row of entries) {
      const b = button(
        "",
        () => {
          if (ctx.app.ensureApplied()) onPick(row.id);
        },
        "galaxy-rail-card" + (row.id === owner ? " selected" : ""),
      );
      b.setAttribute("aria-label", row.id < 0 ? "All Missions" : row.name + " Galaxy");
      b.setAttribute("aria-pressed", String(row.id === owner));
      b.title = row.name + " · " + row.count + " missions";
      b.dataset.galaxy = row.id;
      b.append(
        el(
          "span",
          { class: "galaxy-rail-art" },
          row.id >= 0 && ctx.app.portrait(row.id)
            ? el("img", { src: ctx.app.portrait(row.id), alt: "", loading: "lazy" })
            : el("span", { class: "galaxy-all-icon" }, "✦"),
        ),
        el("span", { class: "galaxy-rail-name" }, row.name),
        el("span", { class: "galaxy-rail-count" }, row.count + " missions"),
      );
      list.append(b);
    }
    rail.append(list);
    requestAnimationFrame(() => {
      const active = list.querySelector(".selected");
      if (active)
        list.scrollTop = Math.max(
          0,
          active.offsetTop - list.offsetTop - list.clientHeight / 2 + active.clientHeight / 2,
        );
    });
    return rail;
  };
  function missionDependencyControls(ctx, body) {
    const freeIds = new Set(ctx.file.doc.freeMissionIds()),
      info = R.Authoring.missionDependencies(ctx.file.doc, ctx.node),
      box = el("section", { class: "mission-dependency-review" }),
      rows = info.references;
    const replacement = choose(
      -1,
      [
        { id: -1, name: "Keep existing mission-state queries" },
        ...Array.from({ length: ctx.file.doc.rootCount }, (_, id) => ({
          id,
          name: "Mission " + id,
        })).filter((r) => r.id !== ctx.node && !freeIds.has(r.id)),
      ],
      "Replacement mission for dependencies",
    );
    const keep = el("input", { type: "checkbox", "aria-label": "Keep dependencies unchanged" }),
      reconnect = el("input", {
        type: "checkbox",
        checked: true,
        disabled: true,
        "aria-label": "Reconnect remaining neighbors",
      });
    if (rows.length) {
      box.append(
        el("h3", {}, "Progression dependencies"),
        note(
          "Other missions query this mission’s progress. Redirect those queries to a surviving mission, or explicitly keep them unchanged. Unchanged requirements may block access after deletion or moving.",
        ),
        el(
          "ul",
          {},
          ...[...new Set(rows.map((r) => "Mission " + r.mission + " · " + r.field))].map((s) =>
            el("li", {}, s),
          ),
        ),
        field("Replace mission-state dependencies with", replacement),
        el(
          "label",
          { class: "checkbox-label" },
          keep,
          " I will keep and review the existing dependencies.",
        ),
        el(
          "label",
          { class: "checkbox-label" },
          reconnect,
          " Connect remaining neighbors through the replacement mission, where they share the source Galaxy.",
        ),
      );
      replacement.addEventListener("change", () => {
        keep.closest("label").hidden = replacement.value !== "-1";
        reconnect.disabled = replacement.value === "-1";
      });
    }
    if (info.unreadable.length)
      box.append(
        el(
          "details",
          {},
          el(
            "summary",
            {},
            "Additional manual review · " +
              info.unreadable.length +
              " dynamic or unsupported conditions",
          ),
          note(
            "Only known mission-state queries (types 2 and 3 with literal mission IDs) can be redirected. Other scripts and opaque groups are preserved.",
          ),
          el(
            "ul",
            {},
            ...info.unreadable.map((r) =>
              el("li", {}, "Mission " + r.mission + " · " + r.field + ": " + r.message),
            ),
          ),
        ),
      );
    if (rows.length || info.unreadable.length) body.append(box);
    return () => ({
      redirectTo: rows.length && replacement.value !== "-1" ? Number(replacement.value) : undefined,
      keepDependencies: !rows.length || keep.checked,
      reconnect: rows.length && replacement.value !== "-1" && reconnect.checked,
    });
  }
  function entryReplacement(app, doc, node, owner) {
    const o = doc.getOwner(owner),
      remaining = o.nodes.filter((n) => n.node !== node);
    if (o.start !== node || !remaining.length) return null;
    const neighbors = doc
        .getEdges()
        .filter((e) => e.a === node || e.b === node)
        .map((e) => (e.a === node ? e.b : e.a)),
      first = remaining.find((n) => neighbors.includes(n.node))?.node ?? remaining[0].node;
    const input = choose(
      first,
      remaining.map((n) => ({ id: n.node, name: "Mission " + n.node })),
      "Replacement entry for " + app.characterName(owner),
    );
    return { input, element: field(app.characterName(owner) + " · new entry mission", input) };
  }
  R.openTransferGalaxy = function (ctx) {
    const app = ctx.app;
    if (!app.ensureApplied()) return;
    const target = Number(ctx.state.owner),
      doc = ctx.file.doc,
      body = app.dialog("Transfer Galaxy from another Character"),
      summary = el("section"),
      issue = el("p", { class: "warning", role: "alert", hidden: true });
    let source = null;
    body.append(
      note(
        "Replace an existing character’s Galaxy with " +
          app.characterName(target) +
          "’s Galaxy. This moves the whole map and reuses its existing menu icon; it does not add an extra icon or expand save storage.",
      ),
      el(
        "p",
        { class: "warning" },
        "The source character loses its Galaxy, but remains playable. Existing mission records and Galaxy scores are inherited. The destination character must already be unlocked in your game save. Character-unlock and transformation rewards keep their original targets.",
      ),
      el("h3", {}, "Choose the Galaxy to transfer"),
    );
    const picker = galaxyCards(
        app,
        doc,
        -1,
        (id) => {
          source = id;
          paint();
        },
        false,
      ),
      commit = button(
        "Transfer Galaxy",
        () => {
          try {
            if (source === null) throw Error("Choose a source Galaxy.");
            const report = app.transact("Transfer Galaxy", [ctx.file], () =>
              R.GalaxyTransfer.transfer(ctx.file.doc, source, target),
            );
            app.closeDialog();
            ctx.state.owner = String(target);
            ctx.state.node = report.entry;
            ctx.state.search = "";
            delete ctx.state.emptyOwner;
            app.refresh();
            app.notify("Galaxy transferred. Export galaxy.mmd and import it into the game.");
          } catch (e) {
            issue.textContent = e.message;
            issue.hidden = false;
          }
        },
        "primary",
      );
    commit.disabled = true;
    function paint() {
      issue.hidden = true;
      summary.replaceChildren();
      commit.disabled = true;
      for (const b of picker.querySelectorAll(".galaxy-card")) {
        const active = b.getAttribute("aria-label") === app.characterName(source) + " Galaxy";
        b.classList.toggle("selected", active);
        b.setAttribute("aria-pressed", String(active));
      }
      try {
        const report = R.GalaxyTransfer.preview(doc, source, target);
        summary.append(
          el("h3", {}, app.characterName(source) + " → " + app.characterName(target)),
          note(
            report.missions.length +
              " missions · entry mission " +
              report.entry +
              " · existing world icon " +
              report.iconIndex +
              " of " +
              report.iconCount +
              ". Mission IDs, map links, positions and opponent presets are kept. Selected-Galaxy conditions are adjusted for the new owner, including shared teams.",
          ),
          note(
            "No executable patch is required for this replacement within native character IDs 0–99. You can undo the transfer.",
          ),
        );
        commit.disabled = false;
      } catch (e) {
        issue.textContent = e.message;
        issue.hidden = false;
      }
    }
    body.append(
      picker,
      summary,
      issue,
      el(
        "div",
        { class: "toolbar" },
        commit,
        button("Cancel", () => app.closeDialog()),
      ),
    );
  };
  R.openDeleteMission = function (ctx) {
    const app = ctx.app;
    if (!app.ensureApplied()) return;
    const doc = ctx.file.doc,
      owners = R.Authoring.missionOwners(doc, ctx.node),
      body = app.dialog("Delete mission " + ctx.node),
      issue = el("p", { class: "warning", role: "alert", hidden: true });
    if (!owners.length)
      body.append(
        note("This battle is already unassigned. Deleting it will free its ID for reuse."),
      );
    body.append(
      note(
        "Delete this battle and free its mission ID when it is removed from every Galaxy. New battles reuse freed IDs before adding another record, without renumbering the others. Choosing a single shared membership keeps the ID in use elsewhere. Existing game saves can retain old progress for a reused ID. Undo restores the change. Review remaining paths in Map & owners; neighbors are only reconnected when you choose a replacement below.",
      ),
    );
    const options = [
        { id: "all", name: "All Galaxies containing this mission" },
        ...owners.map((id) => ({ id: String(id), name: "Only " + app.characterName(id) })),
      ],
      scope = choose("all", options, "Delete mission scope"),
      entries = el("div");
    body.append(field("Remove from", scope), entries);
    let entryInputs = {};
    function paint() {
      entries.replaceChildren();
      entryInputs = {};
      for (const owner of scope.value === "all" ? owners : [Number(scope.value)]) {
        const e = entryReplacement(app, doc, ctx.node, owner);
        if (e) {
          entries.append(e.element);
          entryInputs[owner] = e.input;
        }
      }
    }
    scope.addEventListener("change", paint);
    paint();
    const dependencies = missionDependencyControls(ctx, body);
    body.append(
      issue,
      el(
        "div",
        { class: "toolbar" },
        button(
          "Delete mission / free ID",
          () => {
            try {
              const owner = scope.value === "all" ? undefined : Number(scope.value),
                o = {
                  node: ctx.node,
                  owner,
                  entryReplacements: Object.fromEntries(
                    Object.entries(entryInputs).map(([id, input]) => [id, Number(input.value)]),
                  ),
                  ...dependencies(),
                };
              const result = app.transact("Delete mission and free ID", [ctx.file], () =>
                R.Authoring.deleteMission(ctx.file.doc, o),
              );
              app.closeDialog();
              const current = Number(ctx.state.owner);
              if (current >= 0) {
                const list = ctx.file.doc.getOwner(current);
                ctx.state.node = list.nodes.some((n) => n.node === list.start)
                  ? list.start
                  : (list.nodes[0]?.node ?? 0);
              }
              ctx.state.search = "";
              app.refresh();
              app.notify(
                result.freed
                  ? "Mission " + ctx.node + " deleted. Its ID is free for a new battle."
                  : "Removed from this Galaxy; the shared mission ID remains in use.",
              );
            } catch (e) {
              issue.textContent = e.message;
              issue.hidden = false;
            }
          },
          "danger",
        ),
        button("Cancel", () => app.closeDialog()),
      ),
    );
  };
  R.openMoveMission = function (ctx) {
    const app = ctx.app;
    if (!app.ensureApplied()) return;
    const doc = ctx.file.doc,
      owners = R.Authoring.missionOwners(doc, ctx.node),
      selected = Number(ctx.state.owner),
      body = app.dialog("Move mission " + ctx.node + " to another Galaxy"),
      issue = el("p", { class: "warning", role: "alert", hidden: true });
    const source = choose(
      owners.includes(selected) ? selected : (owners[0] ?? -1),
      owners.length
        ? owners.map((id) => ({ id, name: app.characterName(id) }))
        : [{ id: -1, name: "Unassigned mission" }],
      "Source Galaxy",
    );
    const destination = choose(
      Array.from({ length: doc.ownersCount }, (_, id) => id).find(
        (id) => id !== Number(source.value),
      ),
      Array.from({ length: doc.ownersCount }, (_, id) => ({
        id,
        name: app.characterName(id) + " · " + doc.getOwner(id).nodes.length + " missions",
      })),
      "Destination Galaxy",
    );
    body.append(
      note(
        "Keep this mission’s ID, fighters and battle setup, remove its source membership and add it to the destination. Links still used by another Galaxy are preserved; obsolete source links are removed. Coordinates are kept and can be adjusted in Battle.",
      ),
      field("From Galaxy", source),
      field("To Galaxy", destination),
    );
    if (owners.length > 1)
      body.append(
        el(
          "p",
          { class: "warning" },
          "This mission is shared. Its other Galaxy memberships stay in place. Changes to this battle or its own gates also affect those remaining perspectives; review conditional teams in the destination.",
        ),
      );
    const location = el("div"),
      clear = el("input", {
        type: "checkbox",
        checked: true,
        "aria-label": "Reset moved mission gates",
      });
    body.append(
      location,
      el(
        "label",
        { class: "checkbox-label" },
        clear,
        " Reset this mission’s reveal, availability and unlock OR queries for the destination.",
      ),
      note(
        "Team and reward conditions are preserved. Queries that compare the selected Galaxy may need changes in Teams or Progression.",
      ),
    );
    let predecessor, unlock, sourceEntry;
    function paint() {
      location.replaceChildren();
      const target = Number(destination.value),
        o = doc.getOwner(target),
        ids = o.nodes.map((n) => n.node).filter((n) => n !== ctx.node),
        picture = app.portrait(target);
      location.append(
        el(
          "div",
          { class: "mission-destination-heading" },
          picture ? el("img", { src: picture, alt: "" }) : null,
          el("strong", {}, app.characterName(target)),
        ),
      );
      sourceEntry =
        Number(source.value) >= 0
          ? entryReplacement(app, doc, ctx.node, Number(source.value))
          : null;
      if (sourceEntry) location.append(sourceEntry.element);
      predecessor = choose(
        ids.includes(o.start) ? o.start : (ids[0] ?? -1),
        [
          { id: -1, name: "No new map connection" },
          ...ids.map((id) => ({ id, name: "Mission " + id })),
        ],
        "Destination preceding mission",
      );
      unlock = el("input", {
        type: "checkbox",
        checked: !!ids.length,
        "aria-label": "Unlock moved mission after predecessor",
      });
      const update = () => {
        unlock.disabled = predecessor.value === "-1";
        if (unlock.disabled) unlock.checked = false;
      };
      predecessor.addEventListener("change", update);
      update();
      if (!o.nodes.length)
        location.append(
          el(
            "p",
            { class: "warning" },
            "This is an empty native Galaxy slot. The moved battle becomes its entry mission. This does not add a selectable Galaxy icon or extend the original menu/save limits.",
          ),
        );
      else
        location.append(
          field("Connect to destination mission", predecessor),
          el("label", { class: "checkbox-label" }, unlock, " Unlock after clearing that mission."),
          R.renderMissionMap(
            {
              ...ctx,
              node: Number(predecessor.value),
              onPick: (id) => {
                predecessor.value = String(id);
                update();
              },
            },
            ids,
          ),
        );
    }
    source.addEventListener("change", () => {
      if (destination.value === source.value)
        destination.value = String(
          Array.from({ length: doc.ownersCount }, (_, id) => id).find(
            (id) => id !== Number(source.value),
          ),
        );
      paint();
    });
    destination.addEventListener("change", paint);
    paint();
    const dependencies = missionDependencyControls(ctx, body);
    body.append(
      issue,
      el(
        "div",
        { class: "toolbar" },
        button(
          "Move mission",
          () => {
            try {
              const o = {
                node: ctx.node,
                source: Number(source.value) >= 0 ? Number(source.value) : undefined,
                target: Number(destination.value),
                sourceEntry: sourceEntry ? Number(sourceEntry.input.value) : undefined,
                predecessor: predecessor.value === "-1" ? undefined : Number(predecessor.value),
                unlockAfter: unlock.checked,
                clearGates: clear.checked,
                ...dependencies(),
              };
              app.transact("Move mission to another Galaxy", [ctx.file], () =>
                R.Authoring.moveMission(ctx.file.doc, o),
              );
              app.closeDialog();
              ctx.state.owner = String(o.target);
              ctx.state.node = ctx.node;
              ctx.state.search = "";
              ctx.state.showEmptyGalaxies = true;
              delete ctx.state.emptyOwner;
              app.refresh();
              app.notify(
                "Mission moved. Review its position, conditional teams and progression in the destination.",
              );
            } catch (e) {
              issue.textContent = e.message;
              issue.hidden = false;
            }
          },
          "primary",
        ),
        button("Cancel", () => app.closeDialog()),
      ),
    );
  };
  R.openMissionWizard = function (ctx) {
    const app = ctx.app;
    if (!app.ensureApplied()) return;
    const doc = ctx.file.doc,
      main = ctx.mode === "main",
      isGalaxy = R.Authoring.isGalaxy(ctx.file);
    const ownerList = Array.from({ length: doc.ownersCount }, (_, id) => id).filter(
      (id) => ctx.state.showEmptyGalaxies || doc.getOwner(id).nodes.length,
    );
    const selected = Number(ctx.state.owner),
      w = {
        owner: ownerList.includes(selected) ? selected : ownerList[0],
        predecessor: ctx.node,
        unlock: "after",
        stage: 8,
        music: 0,
        difficulty: 2,
      };
    const donor = main ? R.Authoring.findBasicDonor(doc) : ctx.node;
    if (main && donor === undefined) {
      app.notify(
        "No ordinary basic donor was found. Open an original Galaxy MMD with a working basic battle.",
        "error",
      );
      return;
    }
    if (main && w.owner === undefined) {
      app.notify("This document has no populated Galaxy owner.", "error");
      return;
    }
    const body = app.dialog(main ? "Create a Galaxy mission" : "Create a Battle Zone fight");
    body.classList.add("wizard-body");
    const form = el("div"),
      issue = el("p", { class: "warning", role: "alert", hidden: true });
    body.append(
      note(
        main
          ? "Start with a working basic battle, choose its Galaxy and click the preceding mission. The new record and map connection are created together."
          : "Add a fight to an unused saved grid cell of this existing route. A new file does not create a ninth selectable Battle Zone.",
      ),
      form,
      issue,
    );
    if (main && doc.freeMissionIds().length)
      body.append(
        note(
          "The next battle will reuse free Mission ID " +
            doc.freeMissionIds()[0] +
            ". Existing game saves may retain that ID’s previous progress.",
        ),
      );
    function mapStep() {
      form.replaceChildren();
      const ids = main
        ? doc.getOwner(w.owner).nodes.map((n) => n.node)
        : Array.from({ length: doc.rootCount }, (_, i) => i);
      if (!ids.includes(w.predecessor)) w.predecessor = ids[0];
      if (main) {
        form.append(
          el("h3", {}, "1 · Choose the Galaxy"),
          galaxyCards(
            app,
            doc,
            w.owner,
            (id) => {
              w.owner = id;
              mapStep();
            },
            false,
            ctx.state.showEmptyGalaxies,
          ),
        );
      }
      const empty = main && !ids.length;
      if (empty)
        form.append(
          el("h3", {}, "2 · First mission"),
          note(
            "This Galaxy has no missions. The new battle becomes its entry mission, with no predecessor or clear-condition.",
          ),
          el(
            "p",
            { class: "warning" },
            "An empty native owner is editable, but adding a mission does not create a new selectable Galaxy icon. The original game has separate Galaxy menu and save limits; transformed-form Galaxies need an in-game compatibility check.",
          ),
        );
      else
        form.append(
          el("h3", {}, (main ? "2" : "1") + " · Select the preceding mission"),
          note(
            "Click a circle below. This mission will connect to the new battle. Leave a clear controller direction at the preceding node; nearby branches can compete for selection.",
          ),
          R.renderMissionMap(
            {
              ...ctx,
              node: w.predecessor,
              onPick: (id) => {
                w.predecessor = id;
                mapStep();
              },
            },
            ids,
          ),
          note("Selected: mission " + w.predecessor),
        );
      let point;
      if (!main) {
        const taken = new Set(
          ids.map((i) => {
            const v = new DataView(doc.readRoot(i).buffer);
            return R.Authoring.zoneCell(
              Math.trunc(v.getFloat32(0, false)),
              Math.trunc(v.getFloat32(4, false)),
            );
          }),
        );
        for (let y = 6; y >= 0 && !point; y--)
          for (let x = 0; x <= 2; x++)
            if (R.Authoring.validZonePoint(x, y) && !taken.has(R.Authoring.zoneCell(x, y))) {
              point = { x, y };
              break;
            }
        if (!point) {
          issue.hidden = false;
          issue.textContent =
            "All 20 cells addressable by standard map coordinates are occupied. Edit an existing fight or free a cell first.";
          return;
        }
      }
      const source = new DataView(doc.readRoot(empty ? donor : w.predecessor).buffer);
      w.x = main ? source.getFloat32(0, false) + 18 : point.x;
      w.y = main ? source.getFloat32(4, false) : point.y;
      const position = el("div", { class: "wizard-position" });
      const px = el("input", {
          type: "number",
          value: w.x,
          step: main ? "any" : 1,
          "aria-label": "New mission X",
        }),
        py = el("input", {
          type: "number",
          value: w.y,
          step: main ? "any" : 1,
          "aria-label": "New mission Y",
        });
      position.append(field("Map X", px), field("Map Y", py));
      form.append(el("h3", {}, "Battle setup"), position);
      let unlock, stage, music, difficulty;
      if (main) {
        if (empty) w.unlock = "open";
        unlock = choose(
          w.unlock,
          [
            { id: "after", name: "Unlock after clearing the selected mission" },
            {
              id: "open",
              name: "No additional clear-condition (map and Galaxy access still apply)",
            },
          ],
          "New mission availability",
        );
        unlock.disabled = empty;
        unlock.addEventListener("change", () => (w.unlock = unlock.value));
        stage = choose(w.stage, app.data.stages, "New mission stage");
        music = choose(w.music, app.data.music, "New mission music");
        difficulty = choose(w.difficulty, app.data.difficulties, "New mission difficulty");
        form.append(
          field("Availability", unlock),
          el(
            "div",
            { class: "grid field-grid" },
            field("Arena", stage),
            field("Music", music),
            field("Displayed difficulty", difficulty),
          ),
          note(
            "A basic defeat-enemy objective is used. Copied rewards, allies, prompts, modifier items and extra rule captions are cleared. You can add them after creation. The donor’s opponent preset remains a valid starting opponent.",
          ),
        );
      }
      const create = button(
        main ? "Create mission" : "Create fight",
        () => {
          try {
            w.x = Number(px.value);
            w.y = Number(py.value);
            if (
              !Number.isFinite(w.x) ||
              !Number.isFinite(w.y) ||
              Math.abs(w.x) > 3.402823466e38 ||
              Math.abs(w.y) > 3.402823466e38
            )
              throw Error("Enter finite map coordinates.");
            if (
              empty &&
              !g.confirm(
                "This creates the first mission for an empty native Galaxy owner. It does not add a selectable Galaxy icon or extend the original save/menu limits. Continue with this experimental Galaxy?",
              )
            )
              return;
            if (
              main &&
              !isGalaxy &&
              /tutorial/i.test(ctx.file.name) &&
              doc.rootCount >= 9 &&
              !g.confirm(
                "Tutorial uses a separate fixed nine-record progression scan. Additional Tutorial missions are research-only and may corrupt saves or other RAM fields. Create this experimental record anyway?",
              )
            )
              return;
            if (
              isGalaxy &&
              !doc.freeMissionIds().length &&
              doc.rootCount >= 498 &&
              !g.confirm(
                doc.rootCount >= 500
                  ? "SAVE CORRUPTION RISK: the original game stores only missions 0–499. This new mission will overlap other saved data. Create a research-only record anyway?"
                  : "This adds a battle beyond the original 498 missions. The original save has space for indices 498 and 499 only. Keep a backup; new progression needs a game test. Continue?",
              )
            )
              return;
            if (main) {
              w.stage = Number(stage.value);
              w.music = Number(music.value);
              w.difficulty = Number(difficulty.value);
              w.unlock = unlock.value;
            }
            app.closeDialog();
            const id = app.transact("Create guided mission", [ctx.file], () =>
              R.Authoring.createMission(doc, { ...w, donor, allowEmpty: empty }),
            );
            ctx.state.owner = String(w.owner ?? -1);
            ctx.state.node = id;
            ctx.state.tab = "teams";
            app.refresh();
            app.notify(
              "Mission " +
                id +
                " created. Choose its opponents in Teams, then edit the battle settings.",
            );
          } catch (e) {
            issue.hidden = false;
            issue.textContent = e.message;
          }
        },
        "primary",
      );
      form.append(
        el(
          "div",
          { class: "toolbar" },
          create,
          button("Cancel", () => app.closeDialog()),
        ),
      );
      if (isGalaxy && !doc.freeMissionIds().length && doc.rootCount >= 498)
        form.append(
          el(
            "p",
            { class: doc.rootCount >= 500 ? "error-box" : "warning" },
            doc.rootCount >= 500
              ? "This mission exceeds the verified 500-record save capacity. Creating/exporting it requires an explicit research-risk confirmation."
              : "This is an additional mission beyond the original count. The researched save capacity is 500 total mission records.",
          ),
        );
    }
    mapStep();
  };
  R.exactMissionPresetTable = function (ctx) {
    const pattern =
      ctx.mode === "zone"
        ? /ultimate|_spe/i.test(ctx.file.name)
          ? /preset_character_battle_zone_(?:spe|ult)/i
          : /preset_character_battle_zone_nor/i
        : /tutorial/i.test(ctx.file.name)
          ? /preset_character_tutorial/i
          : /preset_character_galaxy/i;
    return ctx.app.files.find((f) => f.kind === "preset" && pattern.test(f.name)) || null;
  };
  R.openTeamPreset = function (ctx, index) {
    const table = R.exactMissionPresetTable(ctx);
    if (!table) {
      ctx.app.notify(
        "Load the " +
          (/tutorial/i.test(ctx.file.name)
            ? "Tutorial"
            : ctx.mode === "zone"
              ? "matching Battle Zone"
              : "Galaxy") +
          " preset container first.",
        "warning",
      );
      document.getElementById("file-input").click();
      return;
    }
    ctx.app.openPreset(table, index);
  };
  R.openNewPreset = function (app, table, onCreated) {
    if (!app.ensureApplied()) return;
    const state = app.ui.presets || (app.ui.presets = {}),
      appearance =
        app.files.find((f) => f.id === state.appearanceFileId && f.kind === "appearance") ||
        app.files.find((f) => f.kind === "appearance"),
      strength =
        app.files.find((f) => f.id === state.strengthFileId && f.kind === "strength") ||
        app.files.find((f) => f.kind === "strength");
    const body = app.dialog("Create a character preset"),
      native = choose(0, app.data.characters, "New preset character"),
      preview = el("img", { class: "character-portrait", src: app.portrait(0), alt: "" });
    preview.hidden = !app.portrait(0);
    native.addEventListener("change", () => {
      preview.src = app.portrait(Number(native.value));
      preview.hidden = !app.portrait(Number(native.value));
    });
    const message = el("p", { class: "warning", role: "alert" });
    body.append(
      note(
        "A preset belongs to " + table.name + ". Each form needs its own preset and form links.",
      ),
      preview,
      field("Character / form", native),
      note(
        appearance && strength
          ? "New independent Appearance and Strength records will be created and linked. Equipment starts empty; no form/fusion links are assumed."
          : "The shared Appearance and/or Strength file is missing. Load it first, or create an unassigned preset and finish those links in its character tabs.",
      ),
      message,
      el(
        "div",
        { class: "toolbar" },
        button(
          "Create preset",
          () => {
            try {
              const appearanceRow = appearance
                ? R.Authoring.newAppearance(app, Number(native.value))
                : null;
              app.closeDialog();
              const files = [
                table,
                ...(appearance ? [appearance] : []),
                ...(strength ? [strength] : []),
              ];
              const id = app.transact("Create character preset", files, () => {
                const a = appearance ? appearance.doc.appendRow(appearanceRow) : 0xffffffff,
                  s = strength ? strength.doc.appendRow(R.Authoring.newStrength()) : 0xffffffff;
                return table.doc.appendRow(R.Authoring.newPreset(a, s));
              });
              state.newPresetNatives = state.newPresetNatives || {};
              state.newPresetNatives[table.id + ":" + id] = Number(native.value);
              app.openPreset(table, id);
              if (onCreated) onCreated(id, table);
              app.notify(
                "Preset " +
                  id +
                  " created. Review Appearance, Strength and form links before export.",
              );
            } catch (e) {
              message.textContent = e.message;
            }
          },
          "primary",
        ),
        button("Cancel", () => app.closeDialog()),
      ),
    );
  };
  R.newDatRow = function (app, file, onCreated, linkedPreset) {
    if (!app.ensureApplied()) return;
    const body = app.dialog(
      "Create " + (file.kind === "appearance" ? "Appearance" : "Strength") + " record",
    );
    const native = choose(
      (() => {
        try {
          const root = app.files.find(
              (f) => f.id === app.ui.presets?.fileId && f.kind === "preset",
            ),
            p = root?.doc.row(app.ui.presets.index),
            a =
              app.files.find(
                (f) => f.id === app.ui.presets.appearanceFileId && f.kind === "appearance",
              ) || app.files.find((f) => f.kind === "appearance");
          return p && a && p[0] < a.doc.count
            ? a.doc.row(p[0])[0]
            : (app.ui.presets?.newPresetNatives?.[root?.id + ":" + app.ui.presets?.index] ?? 0);
        } catch (_) {
          return 0;
        }
      })(),
      app.data.characters,
      "New appearance character",
    );
    if (file.kind === "appearance") body.append(field("Character / form", native));
    const issue = el("p", { class: "warning", role: "alert" });
    body.append(
      note(
        file.kind === "appearance"
          ? "Uses the active catalog or a loaded matching Appearance for move defaults, with costume 0. Assign this row to a preset when ready."
          : "Starts with empty equipment, CPU level 20 and default AI type. Assign this row to a preset when ready.",
      ),
      issue,
      button(
        "Create record",
        () => {
          try {
            const row =
              file.kind === "appearance"
                ? R.Authoring.newAppearance(app, Number(native.value))
                : R.Authoring.newStrength();
            app.closeDialog();
            const id = app.transact(
              "Create " + file.kind,
              linkedPreset ? [file, linkedPreset.file] : [file],
              () => {
                const id = file.doc.appendRow(row);
                if (linkedPreset) {
                  const p = linkedPreset.file.doc.row(linkedPreset.index);
                  p[linkedPreset.at] = id;
                  linkedPreset.file.doc.setRow(linkedPreset.index, p);
                }
                return id;
              },
            );
            if (onCreated) onCreated(id);
            else if (!linkedPreset) {
              app.ui.presets.fileId = file.id;
              app.ui.presets.index = id;
              app.ui.presets.page = Math.floor(id / 80);
              app.selectFile(file.id);
            }
            app.refresh();
          } catch (e) {
            issue.textContent = e.message;
            app.notify(e.message, "warning");
          }
        },
        "primary",
      ),
    );
  };
})(globalThis);
