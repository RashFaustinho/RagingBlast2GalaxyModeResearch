/* Whole-Galaxy reassignment: reuse one world icon and retain mission/save indices. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {}),
    view = (b) => new DataView(b.buffer, b.byteOffset, b.byteLength);
  function icons(d) {
    if (d.magic !== "MAIN") throw Error("Choose a Galaxy MAIN document.");
    const ref = view(d.header).getUint32(0x18, false),
      meta = d.descriptors[ref];
    if (!meta || meta[1] !== 28) throw Error("Unsupported Galaxy world-icon table.");
    const bytes = d.body(ref),
      v = view(bytes),
      rows = [];
    for (let i = 0; i < meta[0]; i++)
      rows.push({ index: i, native: v.getUint16(i * 28 + 12, false) });
    return { ref, bytes, rows };
  }
  function ownerChoice(d, source, target) {
    if (!Number.isInteger(source) || !Number.isInteger(target) || source === target)
      throw Error("Choose different source and destination characters.");
    if (
      source < 0 ||
      target < 0 ||
      source >= Math.min(d.ownersCount, 100) ||
      target >= Math.min(d.ownersCount, 100)
    )
      throw Error("The original owner lookup supports native IDs 0–99.");
    const a = d.getOwner(source),
      b = d.getOwner(target),
      world = icons(d),
      matches = world.rows.filter((i) => i.native === source);
    if (!a.nodes.length) throw Error("The source Galaxy has no missions.");
    if (b.nodes.length) throw Error("Choose an empty destination Galaxy.");
    if (matches.length !== 1)
      throw Error("The source must have exactly one existing world-map icon.");
    if (world.rows.some((i) => i.native === target))
      throw Error("The destination already has a world-map icon.");
    return { a, b, world, icon: matches[0].index };
  }
  function transfer(d, source, target) {
    const setup = ownerChoice(d, source, target),
      before = d.encode(),
      oldWarnings = d.warnings.slice(),
      changes = [],
      memo = new Map();
    try {
      function expression(ref, node, field) {
        if (!ref) return ref;
        if (memo.has(ref)) return memo.get(ref);
        const bytes = d.body(ref),
          parsed = R.Mmd.parseExpression(bytes),
          stack = [],
          hits = [];
        parsed.tokens.forEach((t, index) => {
          if (t.kind === 2) stack.push({ value: t.operand, index });
          else if (t.kind === 1) {
            const args = stack.splice(-(t.operand === 39 || t.operand === 40 ? 1 : 2));
            if (t.operand === 16) {
              if (args[1]?.value === 5) {
                if (args[0]?.value === undefined)
                  throw Error(
                    "Mission " +
                      node +
                      " has a dynamic selected-Galaxy query in " +
                      field +
                      ". Review it manually before transfer.",
                  );
                if (args[0].value === source) hits.push(args[0].index);
              } else if (args[1]?.value === undefined)
                throw Error("Mission " + node + " has a dynamic query type in " + field + ".");
            }
            stack.push({});
          }
        });
        let result = ref;
        if (hits.length) {
          const v = view(bytes);
          for (const at of hits) v.setInt32(at * 8 + 4, target, false);
          const meta = d.descriptors[ref];
          result = d.append(bytes, meta[0], meta[1]);
          changes.push({ node, field, oldRef: ref, newRef: result, queries: hits.length });
        }
        memo.set(ref, result);
        return result;
      }
      function expressionList(ref, node, field, stride, at) {
        if (!ref) return ref;
        const bytes = d.body(ref);
        if (bytes.length % stride) throw Error("Unsupported " + field + " list in mission " + node);
        const v = view(bytes);
        let changed = false;
        for (let p = 0; p < bytes.length; p += stride) {
          const old = v.getUint32(p + at, false),
            next = expression(old, node, field + " " + (p / stride + 1));
          if (next !== old) {
            v.setUint32(p + at, next, false);
            changed = true;
          }
        }
        return changed ? d.append(bytes, bytes.length / stride, stride) : ref;
      }
      for (const member of setup.a.nodes) {
        const node = member.node,
          row = d.readRoot(node),
          v = view(row);
        for (const [at, name] of [
          [0x30, "Reveal"],
          [0x34, "Availability"],
          [0x40, "Objective parameter"],
          [0x44, "Rule parameter 1"],
          [0x48, "Rule parameter 2"],
        ])
          v.setUint32(at, expression(v.getUint32(at, false), node, name), false);
        for (const [at, side] of [
          [0x24, "Allies"],
          [0x28, "Enemies"],
        ]) {
          const ref = v.getUint32(at, false);
          if (!ref) continue;
          const outer = d.body(ref);
          if (outer.length !== 8 || view(outer).getUint32(0, false) !== 0)
            throw Error(
              "Mission " +
                node +
                " has a special " +
                side.toLowerCase() +
                " group that cannot yet be safely transferred.",
            );
          const inner = view(outer).getUint32(4, false),
            next = expressionList(inner, node, side, 8, 4);
          if (next !== inner) {
            view(outer).setUint32(4, next, false);
            v.setUint32(at, d.append(outer, 1, 8), false);
          }
        }
        v.setUint32(
          0x2c,
          expressionList(v.getUint32(0x2c, false), node, "Reward condition", 8, 4),
          false,
        );
        v.setUint32(
          0x3c,
          expressionList(v.getUint32(0x3c, false), node, "Action condition", 12, 8),
          false,
        );
        const ref = v.getUint32(0x38, false);
        if (ref) {
          const bytes = d.body(ref),
            q = view(bytes);
          let changed = false;
          for (let p = 0; p + 4 <= bytes.length; p += 4) {
            const type = q.getUint16(p, false);
            if (!type) break;
            if (type === 5 && q.getUint16(p + 2, false) === source) {
              q.setUint16(p + 2, target, false);
              changed = true;
              changes.push({ node, field: "Unlock OR query", queries: 1 });
            }
          }
          if (changed) v.setUint32(0x38, d.append(bytes, bytes.length / 4, 4), false);
        }
        d.writeRoot(node, row);
      }
      const world = setup.world,
        bytes = world.bytes;
      view(bytes).setUint16(setup.icon * 28 + 12, target, false);
      d.relocate(world.ref, bytes);
      d.setOwner(target, {
        auxRef: setup.a.auxRef,
        start: setup.a.start,
        opaque: setup.a.opaque,
        nodes: setup.a.nodes.map((n) => ({ ...n })),
      });
      d.setOwner(source, { auxRef: 0, start: 65535, nodes: [] });
      const graph = d.validateGraph();
      if (graph.length) throw Error(graph.join("\n"));
      new R.MmdDocument(d.encode());
      return {
        source,
        target,
        iconIndex: setup.icon,
        iconCount: world.rows.length,
        missions: setup.a.nodes.map((n) => n.node),
        entry: setup.a.start,
        changes,
        updatedQueryPrograms: changes.length,
        missionCount: d.rootCount,
        originalMissionCount: new R.MmdDocument(before).rootCount,
      };
    } catch (e) {
      Object.assign(d, new R.MmdDocument(before));
      d.warnings = oldWarnings;
      throw e;
    }
  }
  function preview(d, source, target) {
    const clone = new R.MmdDocument(d.encode());
    return transfer(clone, source, target);
  }
  R.GalaxyTransfer = { icons, preview, transfer };
})(globalThis);
