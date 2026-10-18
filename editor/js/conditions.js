/* Readable postfix conditions; runtime values stay unknown without game state. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {});
  const isQuery = (a, t) => a && a.op === "QUERY" && a.args[0] === t && Number.isInteger(a.args[1]);
  const statistics = [
    {
      id: 3,
      name: "Maximum combo hit count",
      help: "Best combo recorded during the battle. Original secret conditions compare this with 20.",
    },
    {
      id: 11,
      name: "Win with a Super Attack",
      help: "Victory recorded with a Super Attack as the finishing attack. Using a Super earlier in the fight is not sufficient. Native result query 1 / argument 11.",
    },
    {
      id: 12,
      name: "Win with an Ultimate Attack",
      help: "Victory recorded with an Ultimate Attack as the finishing attack. Using an Ultimate earlier in the fight is not sufficient. Native result query 1 / argument 12.",
    },
    {
      id: 13,
      name: "Win while in Raging Soul",
      help: "Victory recorded while Raging Soul is active. Entering Raging Soul earlier and winning after it ends is not sufficient. Native result query 1 / argument 13.",
    },
    {
      id: 14,
      name: "Remaining health (%)",
      help: "Whole-number percentage of remaining player-team health. Original Battle Zone rewards commonly require at least 30–50%.",
    },
  ];
  function queryName(type, argument, c = {}) {
    if (type === 1)
      return (
        statistics.find((x) => x.id === argument)?.name ||
        "Battle statistic " + argument + " (unmapped)"
      );
    if (type === 2 || type === 3)
      return c.mode === "zone"
        ? "Context callback " + type + " (unmapped; argument " + argument + ")"
        : "Mission " +
            argument +
            (type === 2 ? " has been cleared (0x08)" : " is unlocked / available (0x02)");
    if (type === 4) return "Always zero";
    if (type === 5)
      return "Playing Galaxy: " + (c.characterName || ((id) => "character " + id))(argument);
    if (type === 6) return String(argument);
    return "Runtime query " + type + " (argument " + argument + "; unmapped)";
  }
  function simple(a) {
    if (a === 1 || a === 0) return { kind: a ? "always" : "never" };
    if (a?.op === "NOT" && isQuery(a.args[0], 5))
      return { kind: "except", argument: a.args[0].args[1] };
    if (a?.op === "QUERY" && Number.isInteger(a.args[1]))
      return {
        kind: "query",
        type: a.args[0],
        argument: a.args[1],
        comparison: "truthy",
        value: 0,
      };
    if (
      ["==", "!=", "<", ">", "<=", ">="].includes(a?.op) &&
      a.args[0]?.op === "QUERY" &&
      Number.isInteger(a.args[1])
    )
      return {
        kind: "query",
        type: a.args[0].args[0],
        argument: a.args[0].args[1],
        comparison: a.op,
        value: a.args[1],
      };
    const galaxies = galaxyRule(a);
    if (galaxies)
      return { kind: galaxies.mode === "except" ? "except" : "galaxy", natives: galaxies.natives };
    return { kind: "custom" };
  }
  function encodeSimple(rule) {
    if (rule.kind === "always") return null;
    if (rule.kind === "never")
      return R.Mmd.encodeExpression([
        { kind: 2, operand: 0 },
        { kind: 0, operand: 0 },
      ]);
    if (rule.kind === "except" || rule.kind === "galaxy")
      return encodeRule(
        rule.kind === "except" ? "except" : "only",
        rule.natives || [rule.argument],
      );
    if (rule.kind !== "query")
      throw Error("Choose a simple condition before replacing the custom expression.");
    const values = [
      rule.argument,
      rule.type,
      ...(rule.comparison === "truthy" ? [] : [rule.value]),
    ];
    if (
      values.some((n) => !Number.isInteger(n) || n < -0x80000000 || n > 0x7fffffff) ||
      rule.type < 1 ||
      rule.type > 6
    )
      throw Error("Invalid condition value.");
    const tokens = [
      { kind: 2, operand: rule.argument },
      { kind: 2, operand: rule.type },
      { kind: 1, operand: 16 },
    ];
    if (rule.comparison !== "truthy") {
      const operator = { "==": 41, "!=": 42, "<": 43, ">": 44, "<=": 45, ">=": 46 }[
        rule.comparison
      ];
      if (!operator) throw Error("Choose a supported comparison.");
      tokens.push({ kind: 2, operand: rule.value }, { kind: 1, operand: operator });
    }
    tokens.push({ kind: 0, operand: 0 });
    return R.Mmd.encodeExpression(tokens);
  }
  function tokenExplanation(tokens, i, c = {}) {
    const token = tokens[i];
    if (token.kind === 0)
      return "End: 0 — required final terminator. The simple editor adds it automatically.";
    if (token.kind === 1)
      return token.operand === 16
        ? "Query operator 16: consumes the argument and query type, then returns the requested runtime value."
        : "Postfix operator: consumes the preceding stack values and pushes its result.";
    for (const delta of [1, 2]) {
      const at = i + delta;
      if (
        tokens[at]?.kind === 1 &&
        tokens[at].operand === 16 &&
        tokens[at - 1]?.kind === 2 &&
        tokens[at - 2]?.kind === 2
      ) {
        const type = tokens[at - 1].operand,
          arg = tokens[at - 2].operand;
        if (delta === 1)
          return (
            "Query type " +
            type +
            ": " +
            (c.mode === "zone" && (type === 2 || type === 3)
              ? "Context-specific callback; its Battle Zone meaning is not mapped"
              : {
                  1: "Read a battle statistic",
                  2: "Has the specified mission been cleared? (MAIN clear-history bit 0x08; returns 8 or 0)",
                  3: "Is the specified mission unlocked / available? (MAIN bit 0x02; returns 2 or 0)",
                  4: "Return zero",
                  5: "Compare the selected Galaxy character",
                  6: "Return the argument unchanged",
                }[type] || "Unmapped query") +
            "."
          );
        return type === 5
          ? "Native character ID " +
              arg +
              ": " +
              (c.characterName || ((id) => "character " + id))(arg) +
              ". This identifies a Galaxy perspective, not a preset or mission ID."
          : "Query argument " + arg + ": " + queryName(type, arg, c) + ".";
      }
    }
    return "Number " + token.operand + ": pushes a literal value onto the expression stack.";
  }
  function zoneRoutes(doc, node, filename) {
    const source = new DataView(doc.readRoot(node).buffer),
      ref = source.getUint32(0x34),
      bytes = ref ? doc.body(ref) : new Uint8Array(),
      v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      routes = [];
    for (let p = 0; p < bytes.length; p += 4) {
      const id = v.getUint32(p);
      if (id >= doc.rootCount) {
        routes.push({ id, invalid: true });
        continue;
      }
      const r = new DataView(doc.readRoot(id).buffer),
        kind = r.getUint32(8),
        condition = r.getUint32(0x30);
      routes.push({
        id,
        kind,
        secret: kind >= 8 && kind <= 15,
        condition: inspect(doc, condition, { mode: "zone" }).text,
      });
    }
    return {
      routes,
      requirement: zoneSecretRequirement(filename).requirement,
      ordinaryCount: routes.filter((r) => !r.invalid && !r.secret).length,
    };
  }
  function zoneSecretRequirement(filename) {
    const nativeRequirements = {
      "zone_green_square.mmd": null,
      "zone_blue_lozenge.mmd": null,
      "zone_aquamarine_sphere.mmd": null,
      "zone_final.mmd": null,
      "zone_ultimate_lozenge.mmd": null,
      "zone_ultimate_sphere.mmd": null,
      "zone_red_triangle.mmd": queryName(1, 11),
      "zone_yellow_spiral.mmd": queryName(1, 13),
      "zone_violet_circle.mmd": queryName(1, 12),
      "zone_crimson_liner.mmd": "Maximum combo hit count is at least 20",
      "zone_ultimate_square.mmd": queryName(1, 12),
      "zone_ultimate_triangle.mmd": "Maximum combo hit count is at least 20",
      "zone_ultimate_spiral.mmd": queryName(1, 11),
      "zone_ultimate_circle.mmd": queryName(1, 12),
      "zone_ultimate_liner.mmd": queryName(1, 13),
      "zone_final_ultimate.mmd": queryName(1, 11),
    };
    const key = String(filename).toLowerCase(),
      known = Object.hasOwn(nativeRequirements, key),
      value = nativeRequirements[key];
    return {
      status: !known ? "unknown" : value === null ? "none" : "active",
      requirement: !known
        ? "Unknown — identify the original Normal/Ultimate Zone slot used by this file"
        : value === null
          ? "None — this stock Zone slot has no native secret trigger"
          : value,
    };
  }
  function galaxyRule(a) {
    if (a === 1) return { mode: "always", natives: [] };
    if (a === 0) return { mode: "only", natives: [] };
    if (a && a.op === "NOT") {
      const r = galaxyRule(a.args[0]);
      if (r?.mode === "only") return { mode: "except", natives: r.natives };
      return null;
    }
    if (isQuery(a, 5)) return { mode: "only", natives: [a.args[1]] };
    if (a && a.op === "OR") {
      const parts = a.args.map(galaxyRule);
      if (parts.every((r) => r?.mode === "only"))
        return { mode: "only", natives: [...new Set(parts.flatMap((r) => r.natives))] };
    }
    return null;
  }
  function describe(a, c = {}) {
    const name = c.characterName || ((id) => "character " + id),
      r = c.mode === "zone" ? null : galaxyRule(a);
    if (r) {
      if (r.mode === "always") return "Always";
      if (!r.natives.length) return r.mode === "except" ? "Always" : "Never";
      return (
        (r.mode === "except" ? "Every Galaxy except " : "Playing Galaxy: ") +
        r.natives.map(name).join(" or ")
      );
    }
    if (typeof a === "number") return String(a);
    if (a.op === "QUERY") {
      const [t, n] = a.args;
      if (typeof t === "number" && typeof n === "number") {
        return queryName(t, n, c);
      }
      return "Runtime query " + describe(t, c) + " (" + describe(n, c) + ")";
    }
    const b = a.args.map((n) => describe(n, c));
    if (b.length === 1) return (a.op === "NOT" ? "Not: " : "Negative: ") + b[0];
    return (
      "(" +
      b[0] +
      " " +
      ({
        AND: "and",
        OR: "or",
        "==": "equals",
        "!=": "differs from",
        "<": "is less than",
        ">": "is greater than",
        "<=": "is at most",
        ">=": "is at least",
      }[a.op] || a.op) +
      " " +
      b[1] +
      ")"
    );
  }
  // Unknown saved/runtime state stays unknown. Logical identities can still prove
  // exclusion or inclusion without guessing another query's value.
  function evaluate(a, c = {}) {
    if (typeof a === "number") return a;
    const [x, y] = a.args.map((n) => evaluate(n, c));
    if (a.op === "QUERY") {
      if (c.mode === "zone" && x !== 4 && x !== 6) return null;
      if (x === 5)
        return Number.isInteger(c.selectedNative) && y !== null ? +(y === c.selectedNative) : null;
      if (x === 4) return 0;
      if (x === 6) return y;
      return null;
    }
    if (a.op === "AND") {
      if (x === 0 || y === 0) return 0;
      if (x === null || y === null) return null;
      return +(!!x && !!y);
    }
    if (a.op === "OR") {
      if ((x !== null && x !== 0) || (y !== null && y !== 0)) return 1;
      if (x === null || y === null) return null;
      return 0;
    }
    if (x === null || (a.args.length > 1 && y === null)) return null;
    if (a.op === "/" && y === 0) return null;
    try {
      return R.Mmd.evaluateExpression({ op: a.op, args: a.args.length === 1 ? [x] : [x, y] });
    } catch (_) {
      return null;
    }
  }
  function inspect(doc, ref, c = {}) {
    if (!ref)
      return { state: "included", value: 1, text: "Always", rule: { mode: "always", natives: [] } };
    try {
      const a = R.Mmd.parseExpression(doc.body(ref)).ast,
        value = evaluate(a, c);
      return {
        state: value === null ? "unknown" : value ? "included" : "excluded",
        value,
        text: describe(a, c),
        rule: c.mode === "zone" ? null : galaxyRule(a),
      };
    } catch (e) {
      return {
        state: "unknown",
        value: null,
        text: "Unrecognized condition: " + e.message,
        rule: null,
      };
    }
  }
  function encodeRule(mode, natives = []) {
    if (!["always", "only", "except"].includes(mode))
      throw Error("Choose a supported Galaxy rule.");
    if (mode === "always") return null;
    const ids = [...new Set(natives)];
    if (ids.some((n) => !Number.isInteger(n) || n < 0 || n > 0x7fffffff))
      throw Error("Invalid Galaxy native ID.");
    const tokens = [];
    if (!ids.length) tokens.push({ kind: 2, operand: 0 });
    ids.forEach((n, i) => {
      tokens.push({ kind: 2, operand: n }, { kind: 2, operand: 5 }, { kind: 1, operand: 16 });
      if (i) tokens.push({ kind: 1, operand: 37 });
    });
    if (mode === "except") tokens.push({ kind: 1, operand: 39 });
    tokens.push({ kind: 0, operand: 0 });
    return R.Mmd.encodeExpression(tokens);
  }
  function roster(doc, node, side, c) {
    const r = doc.getRoster(node, side);
    return !r || r.tag !== 0
      ? { special: !!r, entries: [] }
      : {
          special: false,
          entries: r.entries.map((e, i) => ({
            ...e,
            index: i,
            conditionInfo: inspect(doc, e.condition, c),
          })),
        };
  }
  R.Conditions = {
    statistics,
    queryName,
    simple,
    encodeSimple,
    tokenExplanation,
    zoneRoutes,
    zoneSecretRequirement,
    galaxyRule,
    describe,
    evaluate,
    inspect,
    encodeRule,
    roster,
  };
})(globalThis);
