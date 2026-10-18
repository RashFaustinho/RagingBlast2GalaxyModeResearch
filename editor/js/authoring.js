/* Guided authoring primitives. Counts are file records; save limits are mode-specific. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {}),
    F = 0xffffffff,
    view = (b) => new DataView(b.buffer, b.byteOffset, b.byteLength);
  function isGalaxy(file) {
    return file.kind === "main" && !/tutorial/i.test(file.name);
  }
  function saveRisks(file, data = R.DATA) {
    const d = file.doc,
      out = [];
    if (isGalaxy(file)) {
      if (d.rootCount > 498)
        out.push({
          severity: d.rootCount > 500 ? "danger" : "warning",
          message:
            d.rootCount > 500
              ? `This file has ${d.rootCount} missions. The original game saves only indices 0–499. Mission 500 and above overlap other saved data and can corrupt game saves.`
              : `This file exceeds the original 498 missions. Indices 498 and 499 fit the researched 500-record save table; compatibility of the new progression still needs a game test. Keep a save backup.`,
        });
      const ref = view(d.header).getUint32(24, false),
        icons = d.descriptors[ref]?.[0] || 0;
      if (icons > 66)
        out.push({
          severity: "danger",
          message:
            "More than 66 Galaxy selection icons: icon 66 overlaps global save fields. This collision was reproduced in-game.",
        });
      if (d.ownersCount > 100)
        out.push({
          severity: "danger",
          message:
            "Native Galaxy owners beyond 99 are not independently addressed by the original executable.",
        });
    }
    out.push(...menuRisks(file, data));
    if (file.kind === "main" && /tutorial/i.test(file.name) && d.rootCount > 9)
      out.push({
        severity: "danger",
        message: `Tutorial has ${d.rootCount} missions, above the original nine. Its save uses a separate fixed nine-record progression scan; following padding is not verified spare capacity. A new Tutorial root is research-only until its save/menu/RAM paths are extended.`,
      });
    if (d.magic === "ZONE") {
      const cells = new Map();
      for (let i = 0; i < d.rootCount; i++) {
        const r = view(d.readRoot(i)),
          x = r.getFloat32(0, false),
          y = r.getFloat32(4, false);
        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          Math.abs(x) > 2147483647 ||
          Math.abs(y) > 2147483647 ||
          zoneCell(Math.trunc(x), Math.trunc(y)) < 0 ||
          zoneCell(Math.trunc(x), Math.trunc(y)) > 20
        )
          out.push({
            severity: "danger",
            message: `Battle Zone mission ${i}: X=${x}, Y=${y} addresses saved cell ${zoneCell(Math.trunc(x), Math.trunc(y))}, outside 0–20. This can overlap another save field.`,
          });
        else {
          const cell = zoneCell(Math.trunc(x), Math.trunc(y));
          if (!Number.isInteger(x) || !Number.isInteger(y))
            out.push({
              severity: "warning",
              message: `Battle Zone mission ${i}: fractional X=${x}, Y=${y} truncate toward zero to saved cell ${cell}. Visually separate fights may share progress.`,
            });
          if (!validZonePoint(x, y) && Number.isInteger(x) && Number.isInteger(y))
            out.push({
              severity: "warning",
              message: `Battle Zone mission ${i}: X=${x}, Y=${y} maps within saved cell ${cell}, but lies outside the original map coordinate range X=0–2, Y=0–6. Verify menu navigation in-game.`,
            });
          if (cells.has(cell))
            out.push({
              severity: "warning",
              message: `Missions ${cells.get(cell)} and ${i} share saved grid cell ${cell}. Some original conditional alternatives deliberately share progress.`,
            });
          else cells.set(cell, i);
        }
      }
    }
    return out;
  }
  const CIRCLE_CAPACITIES = Object.freeze({
    0: 10,
    1: 3,
    2: 4,
    3: 5,
    4: 1,
    5: 3,
    6: 3,
    7: 0,
    8: 8,
  });
  function menuRisks(file, data = R.DATA) {
    const d = file.doc,
      out = [];
    if (file.kind !== "main") return out;
    for (let owner = 0; owner < d.ownersCount; owner++) {
      const members = [...new Set(d.getOwner(owner).nodes.map((n) => n.node))],
        groups = new Map();
      if (members.length > 32)
        out.push({
          severity: "warning",
          code: "map-node-capacity",
          owner,
          capacity: 32,
          nodes: members,
          message: `${/tutorial/i.test(file.name) ? "Tutorial" : data?.characters?.find((c) => c.id === owner)?.name || "Galaxy owner " + owner}: this map contains ${members.length} node candidates. The original executable has a separate 32-node map-object pool. Loading more nodes together needs an engine expansion, independently of save capacity.`,
        });
      for (const node of members) {
        if (node < 0 || node >= d.rootCount) continue;
        const kind = view(d.readRoot(node)).getUint16(10, false);
        if (!groups.has(kind)) groups.set(kind, []);
        groups.get(kind).push(node);
      }
      for (const [kind, nodes] of groups) {
        const capacity = CIRCLE_CAPACITIES[kind];
        if (capacity === undefined || nodes.length <= capacity) continue;
        const label = /tutorial/i.test(file.name)
            ? "Tutorial"
            : data?.characters?.find((c) => c.id === owner)?.name || "Galaxy owner " + owner,
          category = data?.categories?.find((c) => c.id === kind)?.name || "Category " + kind;
        const reason =
          kind === 4
            ? "only one Boss circle available per Galaxy"
            : `${capacity} circle objects for ${category} (category ${kind}) available per map`;
        out.push({
          severity: "warning",
          code: kind === 4 ? "boss-circle-capacity" : "circle-capacity",
          owner,
          category: kind,
          nodes,
          capacity,
          message: `${label}: missions ${nodes.join(", ")} use ${kind === 4 ? "Boss category 4" : category + " category " + kind}. The original menu has ${reason}. If these missions are visible together, an extra node can show effects without a selectable circle. Choose another mission category, or make their visibility mutually exclusive.`,
        });
      }
    }
    return out;
  }
  function validZonePoint(x, y) {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x <= 2 &&
      y >= 0 &&
      y <= 6 &&
      zoneCell(x, y) >= 0 &&
      zoneCell(x, y) <= 20
    );
  }
  function zoneCell(x, y) {
    return x + 1 + 3 * (6 - y);
  }
  function findBasicDonor(d) {
    const ids = Array.from({ length: d.rootCount }, (_, i) => i);
    if (d.rootCount > 238) ids.unshift(238);
    return ids.find((i) => {
      try {
        const v = view(d.readRoot(i));
        return (
          v.getUint16(16, false) === 0 &&
          !v.getUint16(18, false) &&
          !v.getUint16(20, false) &&
          ![0x24, 0x3c, 0x4c].some((o) => v.getUint32(o, false)) &&
          d.getRoster(i, "enemies")?.tag === 0 &&
          d.getRoster(i, "enemies").entries.length > 0
        );
      } catch (_) {
        return false;
      }
    });
  }
  function createMission(d, o) {
    if (!Number.isInteger(o.donor) || o.donor < 0 || o.donor >= d.rootCount)
      throw Error("A valid existing basic mission is required as a donor.");
    if (d.magic === "MAIN") {
      const owner = d.getOwner(o.owner);
      if (!owner.nodes.length && !o.allowEmpty)
        throw Error(
          "Choose an existing populated Galaxy. Creating new selectable Galaxies has separate save limitations.",
        );
      if (owner.nodes.length && !owner.nodes.some((n) => n.node === o.predecessor))
        throw Error("Choose a preceding mission from the selected Galaxy map.");
    } else {
      if (!validZonePoint(o.x, o.y)) throw Error("Choose a valid Battle Zone grid position.");
      const stampRef = view(d.readRoot(o.donor)).getUint32(0x28, false);
      if (!stampRef || !d.descriptors[stampRef]?.[0] || d.descriptors[stampRef][1] !== 4)
        throw Error(
          "Choose a Battle Zone donor with valid Challenge Stamp criteria. The native menu requires this list.",
        );
    }
    const empty = d.magic === "MAIN" && !d.getOwner(o.owner).nodes.length;
    if (empty && (o.predecessor !== undefined || o.unlock === "after"))
      throw Error(
        "The first mission in an empty Galaxy cannot have a preceding mission or clear-condition.",
      );
    const backup = d.encode();
    try {
      const id = d.duplicateMission(o.donor, {
        owner: o.owner,
        connectTo: o.predecessor,
        x: o.x,
        y: o.y,
      });

      if (d.magic === "ZONE") {
        const row = d.readRoot(id),
          v = view(row);
        // Keep the known native donor list. setList detaches it when the user edits it.
        v.setUint32(0x28, view(d.readRoot(o.donor)).getUint32(0x28, false), false);
        for (const offset of [0x2c, 0x30, 0x34]) v.setUint32(offset, 0, false);
        d.writeRoot(id, row);
      }
      if (d.magic === "MAIN") {
        const row = d.readRoot(id),
          v = view(row);
        v.setUint16(8, o.stage, false);
        v.setUint16(10, 5, false);
        v.setUint16(12, o.music, false);
        v.setUint16(14, o.difficulty, false);
        v.setUint16(16, 0, false);
        v.setUint16(18, 0, false);
        v.setUint16(20, 0, false);
        v.setUint32(28, 0, false);
        for (const offset of [
          0x24, 0x2c, 0x30, 0x34, 0x38, 0x3c, 0x40, 0x44, 0x48, 0x4c, 0x50, 0x54,
        ])
          v.setUint32(offset, 0, false);
        d.writeRoot(id, row);
        if (o.unlock === "after")
          d.setExpression(
            id,
            0x34,
            R.Mmd.encodeExpression([
              { kind: 2, operand: o.predecessor },
              { kind: 2, operand: 2 },
              { kind: 1, operand: 16 },
              { kind: 0, operand: 0 },
            ]),
          );
      }
      return id;
    } catch (e) {
      const clean = new R.MmdDocument(backup);
      Object.assign(d, clean);
      throw e;
    }
  }
  // Keep root indices stable: deletion removes map memberships, never compacts roots.
  function checkedMission(d, node) {
    if (d.magic !== "MAIN") throw Error("Mission management requires a Galaxy MAIN file.");
    if (!Number.isInteger(node) || node < 0 || node >= d.rootCount)
      throw Error("Choose an existing mission.");
  }
  function missionOwners(d, node) {
    checkedMission(d, node);
    return Array.from({ length: d.ownersCount }, (_, id) => id).filter((id) =>
      d.getOwner(id).nodes.some((n) => n.node === node),
    );
  }
  function expressionMissionTokens(bytes, node) {
    const parsed = R.Mmd.parseExpression(bytes),
      stack = [],
      hits = [];
    let dynamic = false;
    parsed.tokens.forEach((t, i) => {
      if (t.kind === 2) stack.push({ value: t.operand, index: i });
      else if (t.kind === 1) {
        const unary = t.operand === 39 || t.operand === 40,
          args = stack.splice(-(unary ? 1 : 2));
        if (t.operand === 16 && [2, 3].includes(args[1]?.value)) {
          if (args[0]?.value === node) hits.push(args[0].index);
          else if (args[0]?.value === undefined) dynamic = true;
        }
        stack.push({});
      }
    });
    return { hits, dynamic };
  }
  function missionDependencies(d, node) {
    checkedMission(d, node);
    const references = [],
      unreadable = [];
    function expression(mission, field, ref) {
      if (!ref) return;
      try {
        const result = expressionMissionTokens(d.body(ref), node);
        if (result.hits.length) references.push({ mission, field, ref, tokens: result.hits });
        if (result.dynamic)
          unreadable.push({
            mission,
            field,
            message: "Dynamic mission index needs manual review.",
          });
      } catch (e) {
        unreadable.push({ mission, field, message: e.message });
      }
    }
    for (let mission = 0; mission < d.rootCount; mission++) {
      if (mission === node) continue;
      const row = view(d.readRoot(mission));
      for (const [offset, field] of [
        [0x30, "Reveal"],
        [0x34, "Availability"],
        [0x40, "Objective parameter"],
        [0x44, "Rule parameter 1"],
        [0x48, "Rule parameter 2"],
      ])
        expression(mission, field, row.getUint32(offset, false));
      for (const side of ["allies", "enemies"])
        try {
          const roster = d.getRoster(mission, side);
          if (roster?.special)
            unreadable.push({
              mission,
              field: side,
              message: "Special participant group needs manual review.",
            });
          else
            roster?.entries.forEach((e, i) =>
              expression(mission, side + " candidate " + (i + 1), e.condition),
            );
        } catch (e) {
          unreadable.push({ mission, field: side, message: e.message });
        }
      for (const [offset, stride, at, field] of [
        [0x2c, 8, 4, "Conditional reward"],
        [0x3c, 12, 8, "Perfect Action"],
      ]) {
        const ref = row.getUint32(offset, false);
        if (ref) {
          const bytes = d.body(ref),
            v = view(bytes);
          for (let p = 0; p < bytes.length; p += stride)
            expression(mission, field + " " + (p / stride + 1), v.getUint32(p + at, false));
        }
      }
      const ref = row.getUint32(0x38, false);
      if (ref) {
        const bytes = d.body(ref),
          v = view(bytes);
        for (let p = 0; p + 4 <= bytes.length; p += 4) {
          const type = v.getUint16(p, false);
          if (!type) break;
          if ([2, 3].includes(type) && v.getUint16(p + 2, false) === node)
            references.push({ mission, field: "Unlock OR query", listOffset: p });
        }
      }
    }
    return { references, unreadable };
  }
  function redirectMissionDependencies(d, node, replacement) {
    checkedMission(d, replacement);
    if (replacement === node) throw Error("Choose a different replacement mission.");
    const info = missionDependencies(d, node),
      seen = new Set(),
      lists = new Map();
    for (const r of info.references) {
      if (r.ref) {
        if (seen.has(r.ref)) continue;
        seen.add(r.ref);
        const bytes = d.body(r.ref),
          v = view(bytes);
        r.tokens.forEach((i) => v.setInt32(i * 8 + 4, replacement, false));
        d.relocate(r.ref, bytes);
      } else {
        if (!lists.has(r.mission)) lists.set(r.mission, d.getList(r.mission, 0x38, 4));
        view(lists.get(r.mission)).setUint16(r.listOffset + 2, replacement, false);
      }
    }
    for (const [mission, bytes] of lists) d.setList(mission, 0x38, bytes, 4);
    return info;
  }
  function atomicMissionEdit(d, fn) {
    const before = d.encode(),
      warnings = d.warnings.slice();
    try {
      return fn();
    } catch (e) {
      Object.assign(d, new R.MmdDocument(before));
      d.warnings = warnings;
      throw e;
    }
  }
  function detachOwner(d, node, owner, replacement) {
    const o = d.getOwner(owner);
    if (!o.nodes.some((n) => n.node === node))
      throw Error("The mission does not belong to the source Galaxy.");
    const neighbors = d
      .getEdges()
      .filter((e) => e.a === node || e.b === node)
      .map((e) => (e.a === node ? e.b : e.a));
    o.nodes = o.nodes.filter((n) => n.node !== node);
    if (o.start === node) {
      const next =
        replacement ??
        neighbors.find((id) => o.nodes.some((n) => n.node === id)) ??
        o.nodes[0]?.node ??
        65535;
      if (o.nodes.length && !o.nodes.some((n) => n.node === next))
        throw Error("The replacement entry must remain in its source Galaxy.");
      o.start = next;
    }
    d.setOwner(owner, o);
  }
  function pruneMissionEdges(d, node) {
    const owners = Array.from(
      { length: d.ownersCount },
      (_, id) => new Set(d.getOwner(id).nodes.map((n) => n.node)),
    );
    const edges = d.getEdges(),
      kept = edges.filter(
        (e) => (e.a !== node && e.b !== node) || owners.some((set) => set.has(e.a) && set.has(e.b)),
      );
    if (kept.length !== edges.length) d.setEdges(kept);
  }
  function reconnectMissionNeighbors(d, owners, neighbors, replacement) {
    if (replacement === undefined) return;
    const edges = d.getEdges();
    let changed = false;
    for (const owner of owners) {
      const members = new Set(d.getOwner(owner).nodes.map((n) => n.node));
      if (!members.has(replacement)) continue;
      for (const n of neighbors)
        if (
          n !== replacement &&
          members.has(n) &&
          !edges.some(
            (e) => (e.a === replacement && e.b === n) || (e.b === replacement && e.a === n),
          )
        ) {
          edges.push({ a: replacement, b: n, opaqueA: 0, opaqueB: 0 });
          changed = true;
        }
    }
    if (changed) d.setEdges(edges);
  }
  function dependencyChoice(d, o) {
    const info = missionDependencies(d, o.node);
    if (o.redirectTo !== undefined) redirectMissionDependencies(d, o.node, o.redirectTo);
    else if (info.references.length && !o.keepDependencies)
      throw Error(
        "Choose a replacement mission for the dependencies, or explicitly keep them unchanged.",
      );
    return info;
  }
  function deleteMission(d, o) {
    checkedMission(d, o.node);
    const owners = missionOwners(d, o.node),
      remove = o.owner === undefined ? owners : [o.owner];
    if (d.freeMissionIds().includes(o.node)) throw Error("This mission ID is already free.");
    return atomicMissionEdit(d, () => {
      const neighbors = d
          .getEdges()
          .filter((e) => e.a === o.node || e.b === o.node)
          .map((e) => (e.a === o.node ? e.b : e.a)),
        dependencies = dependencyChoice(d, o);
      for (const owner of remove) detachOwner(d, o.node, owner, o.entryReplacements?.[owner]);
      if (o.reconnect) reconnectMissionNeighbors(d, remove, neighbors, o.redirectTo);
      pruneMissionEdges(d, o.node);
      const remainingOwners = missionOwners(d, o.node),
        freed = !remainingOwners.length;
      if (freed) {
        if (missionDependencies(d, o.node).references.length)
          throw Error("Redirect the remaining mission-state dependencies before freeing this ID.");
        const empty = new Uint8Array(d.rootStride);
        view(empty).setUint32(0x58, R.Mmd.FREE_MISSION_TAG, false);
        d.writeRoot(o.node, empty);
      }
      return { owners: remove, remainingOwners, freed, dependencies };
    });
  }
  function moveMission(d, o) {
    checkedMission(d, o.node);
    if (d.freeMissionIds().includes(o.node))
      throw Error("This mission ID is free. Create a new battle to reuse it.");
    d.getOwner(o.target);
    if (o.source === o.target) throw Error("Choose another destination Galaxy.");
    const destination = d.getOwner(o.target);
    if (
      o.predecessor !== undefined &&
      (!destination.nodes.some((n) => n.node === o.predecessor) || o.predecessor === o.node)
    )
      throw Error("Choose a preceding mission from the destination Galaxy.");
    if (!destination.nodes.length && o.predecessor !== undefined)
      throw Error("An empty Galaxy has no preceding mission.");
    return atomicMissionEdit(d, () => {
      const neighbors = d
          .getEdges()
          .filter((e) => e.a === o.node || e.b === o.node)
          .map((e) => (e.a === o.node ? e.b : e.a)),
        dependencies = dependencyChoice(d, o);
      let opaque = 0;
      if (o.source !== undefined) {
        opaque = d.getOwner(o.source).nodes.find((n) => n.node === o.node)?.opaque || 0;
        detachOwner(d, o.node, o.source, o.sourceEntry);
      } else if (missionOwners(d, o.node).length)
        throw Error("Choose the source Galaxy to move this mission from.");
      const target = d.getOwner(o.target);
      if (!target.nodes.length) target.start = o.node;
      if (!target.nodes.some((n) => n.node === o.node)) target.nodes.push({ node: o.node, opaque });
      d.setOwner(o.target, target);
      if (o.reconnect && o.source !== undefined)
        reconnectMissionNeighbors(d, [o.source], neighbors, o.redirectTo);
      pruneMissionEdges(d, o.node);
      if (o.predecessor !== undefined) {
        const edges = d.getEdges();
        if (
          !edges.some(
            (e) =>
              (e.a === o.node && e.b === o.predecessor) ||
              (e.b === o.node && e.a === o.predecessor),
          )
        ) {
          edges.push({ a: o.predecessor, b: o.node, opaqueA: 0, opaqueB: 0 });
          d.setEdges(edges);
        }
      }
      if (o.clearGates) {
        const row = d.readRoot(o.node),
          v = view(row);
        for (const at of [0x30, 0x34, 0x38]) v.setUint32(at, 0, false);
        d.writeRoot(o.node, row);
      }
      if (o.unlockAfter) {
        if (o.predecessor === undefined)
          throw Error("Choose a preceding mission for the new clear-condition.");
        d.setExpression(
          o.node,
          0x34,
          R.Mmd.encodeExpression([
            { kind: 2, operand: o.predecessor },
            { kind: 2, operand: 2 },
            { kind: 1, operand: 16 },
            { kind: 0, operand: 0 },
          ]),
        );
      }
      return { target: o.target, source: o.source, dependencies };
    });
  }
  function newAppearance(app, native) {
    const c = app.data.characters.find((c) => c.id === native);
    if (!c) throw Error("Choose a native character/form from the active catalog.");
    let moves = c.defaultMoves;
    if (!Array.isArray(moves) || moves.length !== 5) {
      for (const f of (app.files || []).filter((f) => f.kind === "appearance")) {
        for (let i = 0; i < f.doc.count; i++) {
          const a = f.doc.row(i);
          if (a[0] === native) {
            moves = a.slice(3);
            break;
          }
        }
        if (moves) break;
      }
    }
    if (!Array.isArray(moves) || moves.length !== 5)
      throw Error(
        "Move defaults for this mod character are unknown. Supply five defaultMoves in the mod profile, or load a matching Appearance table first.",
      );
    return [native, 0, 0, ...moves];
  }
  function newStrength() {
    return [20, F, ...Array(20).fill(F)];
  }
  function newPreset(appearance = F, strength = F) {
    return [appearance, strength, 99, ...Array(8).fill(F)];
  }
  R.Authoring = {
    missionOwners,
    missionDependencies,
    redirectMissionDependencies,
    freeMissionIds: (d) => d.freeMissionIds(),
    deleteMission,
    moveMission,
    isGalaxy,
    saveRisks,
    menuRisks,
    CIRCLE_CAPACITIES,
    findBasicDonor,
    createMission,
    validZonePoint,
    zoneCell,
    newAppearance,
    newStrength,
    newPreset,
  };
})(globalThis);
