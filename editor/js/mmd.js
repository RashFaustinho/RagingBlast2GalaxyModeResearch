/* RB2 Workshop — MAIN/ZONE reader and conservative editor.
 * Big-endian fields, descriptor indices (never absolute pointers), and payload
 * bytes are kept separate. No-edit encode is byte-identical. Unknown bytes and
 * old payload ranges are deliberately retained when lists grow or detach.
 */
(function (global) {
  "use strict";
  const RB2 = (global.RB2 = global.RB2 || {});
  const U16 = 0xffff,
    U32 = 0xffffffff;
  const view = (b) => new DataView(b.buffer, b.byteOffset, b.byteLength);
  const bytes = (b) => {
    if (b instanceof Uint8Array) return new Uint8Array(b);
    if (b instanceof ArrayBuffer) return new Uint8Array(b.slice(0));
    if (ArrayBuffer.isView(b))
      return new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    throw new TypeError("Expected binary bytes.");
  };
  const uint = (n, max, label) => {
    if (!Number.isInteger(n) || n < 0 || n > max)
      throw new RangeError(`${label || "Value"} must be an integer from 0 to ${max}.`);
    return n;
  };
  const int32 = (n) => {
    if (!Number.isInteger(n) || n < -2147483648 || n > 2147483647)
      throw new RangeError("Expected a signed 32-bit integer.");
    return n;
  };
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const concatenate = (a, b) => {
    const c = new Uint8Array(a.length + b.length);
    c.set(a);
    c.set(b, a.length);
    return c;
  };
  const field = (key, offset, type, name, extra) =>
    Object.assign({ key, offset, type, name }, extra || {});
  const MAIN = [
    field("x", 0, "f32", "Map X"),
    field("y", 4, "f32", "Map Y"),
    field("stage", 8, "u16", "Stage"),
    field("category", 10, "u16", "Node category"),
    field("music", 12, "u16", "Music"),
    field("difficulty", 14, "u16", "Displayed difficulty"),
    field("objective", 16, "u16", "Objective type"),
    field("rule1", 18, "u16", "Rule description 1 (one-based)"),
    field("rule2", 20, "u16", "Rule description 2 (one-based)"),
    field("opaque16", 22, "u16", "Unknown +16", { unknown: true }),
    field("opaque18", 24, "u16", "Unknown +18", { unknown: true }),
    field("opaque1a", 26, "u16", "Unknown +1A", { unknown: true }),
    field("time", 28, "u32", "Time limit (raw seconds)"),
    field("incidents", 32, "ref", "Incident edge list"),
    field("allies", 36, "ref", "Ally group"),
    field("enemies", 40, "ref", "Enemy group"),
    field("rewards", 44, "ref", "Conditional rewards"),
    field("reveal", 48, "ref", "Reveal expression"),
    field("availability", 52, "ref", "Availability expression"),
    field("queries", 56, "ref", "Unlock OR query list"),
    field("actions", 60, "ref", "Perfect Action sequence"),
    field("objectiveParameter", 64, "ref", "Objective parameter expression"),
    field("ruleParameter1", 68, "ref", "Rule description 1 parameter"),
    field("ruleParameter2", 72, "ref", "Rule description 2 parameter"),
    field("modifiers", 76, "ref", "Mission modifier item list"),
    field("uiItems1", 80, "ref", "UI item list 1 (scope unresolved)"),
    field("uiItems2", 84, "ref", "UI item list 2 (scope unresolved)"),
    field("opaque58", 88, "u32", "Unknown +58", { unknown: true }),
  ];
  const ZONE = [
    field("x", 0, "f32", "Map X"),
    field("y", 4, "f32", "Map Y"),
    field("kind", 8, "u32", "Stage kind"),
    field("enemy", 12, "u32", "Enemy preset"),
    field("progress", 16, "u32", "Displayed level (LV)"),
    field("handicap", 20, "u32", "Handicap"),
    field("time", 24, "u32", "Time limit (raw seconds)"),
    field("stage", 28, "u32", "Stage selector"),
    field("music", 32, "u32", "Stored music (unused by stock Battle Zone)"),
    field("opaque24", 36, "u32", "Unknown variant +24", { unknown: true }),
    field("criteria", 40, "ref", "Challenge Stamp criteria"),
    field("rewards", 44, "ref", "Conditional rewards"),
    field("availability", 48, "ref", "Availability expression"),
    field("next", 52, "ref", "Next nodes"),
  ];
  function readField(row, spec) {
    const d = view(row),
      o = spec.offset;
    if (spec.type === "f32") return d.getFloat32(o, false);
    if (spec.type === "u16") return d.getUint16(o, false);
    if (spec.type === "s32" || spec.type === "i32") return d.getInt32(o, false);
    return d.getUint32(o, false);
  }
  function writeField(row, spec, value) {
    const d = view(row),
      o = spec.offset;
    if (spec.type === "f32") {
      if (!Number.isFinite(value) || Math.abs(value) > 3.4028234663852886e38)
        throw new RangeError("Coordinate must be a finite 32-bit float.");
      d.setFloat32(o, value, false);
    } else if (spec.type === "u16") d.setUint16(o, uint(value, U16, spec.name), false);
    else if (spec.type === "s32" || spec.type === "i32") d.setInt32(o, int32(value), false);
    else d.setUint32(o, uint(value, U32, spec.name), false);
    return row;
  }

  const operators = {
    16: "QUERY",
    33: "+",
    34: "-",
    35: "*",
    36: "/",
    37: "OR",
    38: "AND",
    39: "NOT",
    40: "NEG",
    41: "==",
    42: "!=",
    43: "<",
    44: ">",
    45: "<=",
    46: ">=",
  };
  function formatExpression(ast) {
    if (typeof ast === "number") return String(ast);
    if (!ast || !ast.op) throw new Error("Invalid expression tree.");
    const a = ast.args.map(formatExpression);
    if (ast.op === "QUERY") return `query(type=${a[0]}, argument=${a[1]})`;
    if (a.length === 1) return `${ast.op}(${a[0]})`;
    return `(${a[0]} ${ast.op} ${a[1]})`;
  }
  function parseExpression(input) {
    const b = bytes(input),
      d = view(b),
      stack = [],
      tokens = [];
    if (!b.length || b.length % 8)
      throw new Error("Expression requires complete eight-byte tokens.");
    for (let i = 0; i < b.length; i += 8) {
      const kind = d.getUint32(i, false),
        operand = d.getInt32(i + 4, false);
      tokens.push({ kind, operand });
      if (kind === 0) {
        if (stack.length !== 1) throw new Error("Expression must leave exactly one result at END.");
        return {
          tokens,
          ast: stack[0],
          preview: formatExpression(stack[0]),
          terminationOffset: i,
          trailingBytes: b.length - i - 8,
        };
      }
      if (kind === 2) stack.push(operand);
      else if (kind === 1) {
        const op = operators[operand];
        if (!op) throw new Error(`Unsupported/reserved expression operator ${operand}.`);
        const arity = operand === 39 || operand === 40 ? 1 : 2;
        if (stack.length < arity) throw new Error("Expression stack underflow.");
        let args = stack.splice(-arity);
        if (operand === 16) {
          args.reverse(); // Native QUERY pops type first, argument second.
          if (args[0] === 0) throw new Error("Query type 0 is unsafe in the native dispatcher.");
        }
        stack.push({ op, args });
      } else throw new Error(`Unsupported token kind ${kind}.`);
      if (stack.length > 32) throw new Error("Expression exceeds the native 32-value stack.");
    }
    throw new Error("Expression is missing its END token.");
  }
  function validateExpression(input) {
    try {
      return Object.assign({ valid: true, issues: [] }, parseExpression(input));
    } catch (e) {
      return { valid: false, issues: [e.message], preview: "" };
    }
  }
  function encodeExpression(tokens) {
    if (!Array.isArray(tokens)) throw new TypeError("Expected an expression token array.");
    const b = new Uint8Array(tokens.length * 8),
      d = view(b);
    tokens.forEach((t, i) => {
      d.setUint32(i * 8, uint(Array.isArray(t) ? t[0] : t.kind, U32, "Token kind"), false);
      d.setInt32(
        i * 8 + 4,
        int32(Array.isArray(t) ? t[1] : t.operand === undefined ? t.value : t.operand),
        false,
      );
    });
    parseExpression(b);
    return b;
  }
  function evaluateExpression(ast, context) {
    context = context || {};
    if (typeof ast === "number") return ast;
    const a = ast.args.map((n) => evaluateExpression(n, context)),
      op = ast.op;
    if (op === "QUERY") {
      if (a[0] === 5 && context.selectedNative !== undefined)
        return +(a[1] === context.selectedNative);
      if (a[0] === 4) return 0;
      if (a[0] === 6) return a[1];
      if (typeof context.query === "function") return context.query(a[0], a[1]);
      throw new Error("This query needs runtime/save-state context.");
    }
    switch (op) {
      case "NOT":
        return +!a[0];
      case "NEG":
        return -a[0] | 0;
      case "+":
        return (a[0] + a[1]) | 0;
      case "-":
        return (a[0] - a[1]) | 0;
      case "*":
        return Math.imul(a[0], a[1]);
      case "/":
        if (!a[1]) throw new Error("Division by zero.");
        return Math.trunc(a[0] / a[1]) | 0;
      case "OR":
        return +(!!a[0] || !!a[1]);
      case "AND":
        return +(!!a[0] && !!a[1]);
      case "==":
        return +(a[0] === a[1]);
      case "!=":
        return +(a[0] !== a[1]);
      case "<":
        return +(a[0] < a[1]);
      case ">":
        return +(a[0] > a[1]);
      case "<=":
        return +(a[0] <= a[1]);
      case ">=":
        return +(a[0] >= a[1]);
      default:
        throw new Error("Unknown operator.");
    }
  }

  class MmdDocument {
    constructor(input) {
      const b = bytes(input);
      if (b.length < 4) throw new Error("Truncated MMD header.");
      this.magic = String.fromCharCode(...b.subarray(0, 4));
      const format =
        this.magic === "MAIN"
          ? [36, 0x60000, 92]
          : this.magic === "ZONE"
            ? [20, 0x10000, 56]
            : null;
      if (!format) throw new Error("Expected a MAIN Galaxy/tutorial or ZONE Battle Zone MMD.");
      this.headerSize = format[0];
      this.version = format[1];
      if (b.length < this.headerSize) throw new Error("Truncated MMD header.");
      const d = view(b),
        tableSize = d.getUint32(8, false),
        payloadSize = d.getUint32(12, false);
      if (d.getUint32(4, false) !== this.version) throw new Error("Unsupported MMD version.");
      if (tableSize % 8 || this.headerSize + tableSize + payloadSize !== b.length)
        throw new Error("MMD sizes do not match the file.");
      this.header = b.slice(0, this.headerSize);
      this.descriptors = [];
      for (let p = this.headerSize; p < this.headerSize + tableSize; p += 8)
        this.descriptors.push([
          d.getUint16(p, false),
          d.getUint16(p + 2, false),
          d.getUint32(p + 4, false),
        ]);
      this.payload = b.slice(this.headerSize + tableSize);
      this.warnings = [];
      this.validate();
      if (this.rootStride !== format[2])
        throw new Error(`Unsupported ${this.magic} root stride ${this.rootStride}.`);
    }
    _ref(ref) {
      uint(ref, U32, "Descriptor index");
      if (ref >= this.descriptors.length) throw new RangeError(`Descriptor ${ref} does not exist.`);
      return this.descriptors[ref];
    }
    get rootRef() {
      return view(this.header).getUint32(16, false);
    }
    get rootCount() {
      return this._ref(this.rootRef)[0];
    }
    get rootStride() {
      return this._ref(this.rootRef)[1];
    }
    get ownersRef() {
      return this.magic === "MAIN" ? view(this.header).getUint32(28, false) : 0;
    }
    get ownersCount() {
      return this.magic === "MAIN" ? this._ref(this.ownersRef)[0] : 0;
    }
    get edgesRef() {
      if (this.magic !== "MAIN") throw new Error("Only MAIN uses a global edge table.");
      return view(this.header).getUint32(20, false);
    }
    validate() {
      if (this.descriptors.length > Math.floor(U32 / 8))
        throw new Error("Descriptor table is too large.");
      if (this.payload.length > U32) throw new Error("Payload is too large.");
      for (let i = 0; i < this.descriptors.length; i++) {
        const [n, s, o] = this.descriptors[i];
        uint(n, U16, "Descriptor count");
        uint(s, U16, "Descriptor stride");
        uint(o, U32, "Descriptor offset");
        if (o + n * s > this.payload.length)
          throw new Error(`Descriptor ${i} lies outside the payload.`);
      }
      this._ref(this.rootRef);
      if (this.rootStride !== (this.magic === "MAIN" ? 92 : 56))
        throw new Error("Unsupported mission root stride.");
      if (this.magic === "MAIN") {
        this._ref(this.edgesRef);
        this._ref(this.ownersRef);
      }
      this.validateReferences();
      return true;
    }
    validateReferences() {
      // Verify the references whose meaning is known; preserve opaque words.
      const check = (ref, stride, label) => {
        if (!ref) return;
        const shape = this._ref(ref);
        if (stride !== undefined && shape[1] !== stride)
          throw new Error(`${label}: expected record stride ${stride}.`);
      };
      const rewardRefs = (ref) => {
        if (!ref) return;
        check(ref, 8, "Rewards");
        const b = this.body(ref),
          d = view(b);
        for (let p = 0; p < b.length; p += 8)
          check(d.getUint32(p + 4, false), undefined, "Reward expression");
      };
      for (let node = 0; node < this.rootCount; node++) {
        const root = this.readRoot(node),
          d = view(root);
        for (const spec of this.magic === "MAIN" ? MAIN : ZONE)
          if (spec.type === "ref") check(d.getUint32(spec.offset, false), undefined, spec.name);
        if (this.magic === "MAIN") {
          for (const off of [32, 56]) check(d.getUint32(off, false), 4, "Edge/query list");
          for (const off of [76, 80, 84]) check(d.getUint32(off, false), 2, "Item list");
          for (const off of [36, 40]) {
            const ref = d.getUint32(off, false);
            if (!ref) continue;
            const b = this.body(ref);
            if (b.length !== 8) throw new Error("Unsupported participant group size.");
            const group = view(b);
            if (group.getUint32(0, false) !== 0) continue;
            const roster = group.getUint32(4, false);
            check(roster, 8, "Roster");
            if (roster) {
              const rb = this.body(roster),
                rd = view(rb);
              for (let p = 0; p < rb.length; p += 8)
                check(rd.getUint32(p + 4, false), undefined, "Roster expression");
            }
          }
          const actions = d.getUint32(60, false);
          check(actions, 12, "Action sequence");
          if (actions) {
            const b = this.body(actions),
              ad = view(b);
            for (let p = 0; p < b.length; p += 12)
              check(ad.getUint32(p + 8, false), undefined, "Action expression");
          }
        } else {
          check(d.getUint32(40, false), 4, "Stamp criteria");
          check(d.getUint32(52, false), 4, "Next-node list");
        }
        rewardRefs(d.getUint32(44, false));
      }
      if (this.magic === "MAIN") {
        if (this._ref(this.edgesRef)[1] !== 8) throw new Error("Unsupported global edge stride.");
        if (this._ref(this.ownersRef)[1] !== 12) throw new Error("Unsupported owner table stride.");
        const b = this.body(this.ownersRef),
          d = view(b);
        for (let p = 0; p < b.length; p += 12) {
          check(d.getUint32(p, false), undefined, "Owner auxiliary reference");
          check(d.getUint32(p + 4, false), 4, "Owner mission list");
        }
      }
      return true;
    }
    body(ref) {
      const [n, s, o] = this._ref(ref);
      if (o + n * s > this.payload.length) throw new Error("Descriptor lies outside payload.");
      return this.payload.slice(o, o + n * s);
    }
    _geometry(input, count, stride) {
      const b = bytes(input);
      uint(count, U16, "Descriptor count");
      uint(stride, U16, "Descriptor stride");
      if (b.length !== count * stride)
        throw new Error("Descriptor geometry does not match the supplied body.");
      return b;
    }
    _allocation(input, count, stride) {
      const b = this._geometry(input, count, stride),
        offset = Math.ceil(this.payload.length / 4) * 4;
      if (offset + b.length > U32) throw new Error("Payload exceeds 32-bit offsets.");
      const expanded = new Uint8Array(offset + b.length);
      expanded.set(this.payload);
      expanded.set(b, offset);
      this.payload = expanded;
      return [count, stride, offset];
    }
    append(input, count, stride) {
      const ref = this.descriptors.length;
      if (ref >= Math.floor(U32 / 8)) throw new Error("Descriptor table is full.");
      this.descriptors.push(this._allocation(input, count, stride));
      return ref;
    }
    relocate(ref, input, count, stride) {
      const old = this._ref(ref);
      this.descriptors[ref] = this._allocation(
        input,
        count === undefined ? old[0] : count,
        stride === undefined ? old[1] : stride,
      );
      return ref;
    }
    _writeExisting(ref, input) {
      const [n, s, o] = this._ref(ref),
        b = this._geometry(input, n, s);
      if (same(b, this.body(ref))) return;
      const end = o + n * s;
      const alias = this.descriptors.some(
        ([an, as, ao], i) => i !== ref && an * as && ao < end && ao + an * as > o,
      );
      if (alias) this.relocate(ref, b);
      else this.payload.set(b, o);
    }
    encode() {
      this.validate();
      const header = bytes(this.header),
        h = view(header);
      h.setUint32(8, this.descriptors.length * 8, false);
      h.setUint32(12, this.payload.length, false);
      const result = new Uint8Array(
          header.length + this.descriptors.length * 8 + this.payload.length,
        ),
        d = view(result);
      result.set(header);
      this.descriptors.forEach(([n, s, o], i) => {
        const p = header.length + i * 8;
        d.setUint16(p, n, false);
        d.setUint16(p + 2, s, false);
        d.setUint32(p + 4, o, false);
      });
      result.set(this.payload, header.length + this.descriptors.length * 8);
      return result;
    }
    readRoot(index) {
      uint(index, this.rootCount - 1, "Mission index");
      const b = this.body(this.rootRef);
      return b.slice(index * this.rootStride, (index + 1) * this.rootStride);
    }
    writeRoot(index, input) {
      uint(index, this.rootCount - 1, "Mission index");
      const row = bytes(input);
      if (row.length !== this.rootStride) throw new Error("Incorrect mission row size.");
      const roots = this.body(this.rootRef);
      roots.set(row, index * this.rootStride);
      this._writeExisting(this.rootRef, roots);
      return index;
    }
    rootOffset(index) {
      uint(index, this.rootCount - 1, "Mission index");
      return (
        this.headerSize +
        this.descriptors.length * 8 +
        this._ref(this.rootRef)[2] +
        index * this.rootStride
      );
    }
    _rootRef(node, offset) {
      return view(this.readRoot(node)).getUint32(offset, false);
    }
    _setRootRef(node, offset, ref) {
      const root = this.readRoot(node);
      this._ref(ref);
      view(root).setUint32(offset, ref, false);
      this.writeRoot(node, root);
    }
    getList(node, offset, stride) {
      const ref = this._rootRef(node, offset);
      if (!ref) return new Uint8Array();
      if (stride !== undefined && this._ref(ref)[1] !== stride)
        throw new Error(`Expected stride ${stride} at +${offset.toString(16)}.`);
      return this.body(ref);
    }
    setList(node, offset, input, stride) {
      const b = bytes(input);
      uint(stride, U16, "List stride");
      if (!stride || b.length % stride) throw new Error("List must contain complete records.");
      const current = this._rootRef(node, offset);
      if (current && this._ref(current)[1] === stride && same(this.body(current), b))
        return current;
      const ref = b.length ? this.append(b, b.length / stride, stride) : 0;
      this._setRootRef(node, offset, ref);
      return ref;
    }
    getExpression(node, offset) {
      const ref = this._rootRef(node, offset);
      return ref
        ? Object.assign({ ref, bytes: this.body(ref) }, validateExpression(this.body(ref)))
        : { ref: 0, bytes: new Uint8Array(), valid: true, issues: [], preview: "[absent]" };
    }
    _newExpression(input) {
      if (input === null || input === undefined) return 0;
      const b = Array.isArray(input) ? encodeExpression(input) : bytes(input);
      parseExpression(b);
      // Original expressions are one descriptor row containing the full token program.
      return this.append(b, 1, b.length);
    }
    setExpression(node, offset, input) {
      const ref = this._newExpression(input);
      this._setRootRef(node, offset, ref);
      return ref;
    }
    getRoster(node, side) {
      if (this.magic !== "MAIN") throw new Error("Battle Zone uses one enemy preset in the root.");
      const offset = side === "allies" ? 36 : side === "enemies" ? 40 : null;
      if (offset === null) throw new Error("Side must be allies or enemies.");
      const ref = this._rootRef(node, offset);
      if (!ref) return null;
      const b = this.body(ref);
      if (b.length !== 8) throw new Error("Unsupported participant group geometry.");
      const d = view(b),
        tag = d.getUint32(0, false),
        rosterRef = d.getUint32(4, false);
      if (tag !== 0) return { ref, tag, rosterRef, entries: [], special: true, bytes: b };
      const [count, stride] = this._ref(rosterRef);
      if (stride !== 8) throw new Error("Unsupported roster stride.");
      const r = view(this.body(rosterRef)),
        entries = [];
      for (let i = 0; i < count; i++)
        entries.push({
          preset: r.getUint16(i * 8, false),
          opaque: r.getUint16(i * 8 + 2, false),
          condition: r.getUint32(i * 8 + 4, false),
        });
      return { ref, tag, rosterRef, entries, special: false };
    }
    setRoster(node, side, entries) {
      if (this.magic !== "MAIN") throw new Error("Roster groups are only supported in MAIN.");
      const offset = side === "allies" ? 36 : side === "enemies" ? 40 : null;
      if (offset === null) throw new Error("Side must be allies or enemies.");
      if (!Array.isArray(entries)) throw new TypeError("Expected roster entries.");
      const b = new Uint8Array(entries.length * 8),
        d = view(b);
      entries.forEach((e, i) => {
        d.setUint16(i * 8, uint(e.preset, U16, "Preset"), false);
        d.setUint16(i * 8 + 2, uint(e.opaque || 0, U16, "Opaque word"), false);
        const condition = e.condition || 0;
        this._ref(condition);
        d.setUint32(i * 8 + 4, condition, false);
      });
      if (!entries.length) {
        this._setRootRef(node, offset, 0);
        return 0;
      }
      const rr = this.append(b, entries.length, 8),
        group = new Uint8Array(8);
      view(group).setUint32(4, rr, false);
      const ref = this.append(group, 1, 8);
      this._setRootRef(node, offset, ref);
      return ref;
    }
    getActions(node) {
      if (this.magic !== "MAIN") throw new Error("Perfect Actions are a MAIN feature.");
      const b = this.getList(node, 60, 12),
        d = view(b),
        out = [];
      for (let p = 0; p < b.length; p += 12)
        out.push({
          action: d.getUint32(p, false),
          parameter: d.getInt32(p + 4, false),
          expression: d.getUint32(p + 8, false),
        });
      return out;
    }
    setActions(node, entries) {
      if (this.magic !== "MAIN") throw new Error("Perfect Actions are a MAIN feature.");
      if (entries.length > 20)
        throw new Error("The native Perfect Action buffer holds at most 20 steps.");
      const b = new Uint8Array(entries.length * 12),
        d = view(b);
      entries.forEach((e, i) => {
        d.setUint32(
          i * 12,
          uint(e.action === undefined ? e.id : e.action, U32, "Action ID"),
          false,
        );
        d.setInt32(i * 12 + 4, int32(e.parameter === undefined ? -1 : e.parameter), false);
        const ref = e.expression || 0;
        this._ref(ref);
        d.setUint32(i * 12 + 8, ref, false);
      });
      return this.setList(node, 60, b, 12);
    }
    getOwner(index) {
      if (this.magic !== "MAIN") throw new Error("Only MAIN has Galaxy owners.");
      uint(index, this.ownersCount - 1, "Owner");
      if (this._ref(this.ownersRef)[1] !== 12) throw new Error("Unsupported owner table stride.");
      const d = view(this.body(this.ownersRef)),
        p = index * 12,
        auxRef = d.getUint32(p, false),
        listRef = d.getUint32(p + 4, false),
        nodes = [];
      if (listRef) {
        const [n, s] = this._ref(listRef);
        if (s !== 4) throw new Error("Unsupported owner list stride.");
        const b = view(this.body(listRef));
        for (let i = 0; i < n; i++)
          nodes.push({ node: b.getUint16(i * 4, false), opaque: b.getUint16(i * 4 + 2, false) });
      }
      return {
        auxRef,
        listRef,
        start: d.getUint16(p + 8, false),
        opaque: d.getUint16(p + 10, false),
        nodes,
      };
    }
    setOwner(index, change) {
      const old = this.getOwner(index),
        obj = Object.assign({}, old, change),
        rows = this.body(this.ownersRef),
        d = view(rows),
        p = index * 12;
      this._ref(uint(obj.auxRef, U32, "Owner auxiliary reference"));
      uint(obj.start, U16, "Starting node");
      if (obj.start >= this.rootCount && !(obj.start === U16 && obj.nodes.length === 0))
        throw new Error("Starting node must exist; 65535 is only valid for an empty Galaxy owner.");
      const b = new Uint8Array(obj.nodes.length * 4),
        bd = view(b);
      obj.nodes.forEach((e, i) => {
        bd.setUint16(i * 4, uint(e.node, this.rootCount - 1, "Owner mission"), false);
        bd.setUint16(i * 4 + 2, uint(e.opaque || 0, U16, "Opaque owner word"), false);
      });
      let ref = old.listRef;
      if (!(ref && same(this.body(ref), b)) && !(ref === 0 && b.length === 0))
        ref = b.length ? this.append(b, obj.nodes.length, 4) : 0;
      d.setUint32(p, obj.auxRef, false);
      d.setUint32(p + 4, ref, false);
      d.setUint16(p + 8, uint(obj.start, U16, "Starting node"), false);
      d.setUint16(p + 10, uint(obj.opaque, U16, "Opaque owner word"), false);
      this._writeExisting(this.ownersRef, rows);
      return this.getOwner(index);
    }
    getEdges() {
      const [n, s] = this._ref(this.edgesRef);
      if (s !== 8) throw new Error("Unsupported global edge stride.");
      const d = view(this.body(this.edgesRef)),
        out = [];
      for (let i = 0; i < n; i++) {
        const edge = {
          a: d.getUint16(i * 8, false),
          opaqueA: d.getUint16(i * 8 + 2, false),
          b: d.getUint16(i * 8 + 4, false),
          opaqueB: d.getUint16(i * 8 + 6, false),
        };
        // Non-serialized provenance keeps local opaque words attached to the
        // same edge when the caller filters/reorders even duplicate pairs.
        Object.defineProperty(edge, "sourceIndex", { value: i });
        out.push(edge);
      }
      return out;
    }
    setEdges(edges) {
      if (this.magic !== "MAIN") throw new Error("Only MAIN has reciprocal global edges.");
      uint(edges.length, U16, "Edge count");
      const b = new Uint8Array(edges.length * 8),
        d = view(b),
        wanted = Array.from({ length: this.rootCount }, () => []);
      edges.forEach((e, i) => {
        const a = uint(e.a, this.rootCount - 1, "Edge endpoint"),
          z = uint(e.b, this.rootCount - 1, "Edge endpoint");
        if (a === z) throw new Error("Self-loop edges are not supported.");
        d.setUint16(i * 8, a, false);
        d.setUint16(i * 8 + 2, uint(e.opaqueA || 0, U16, "Opaque edge word"), false);
        d.setUint16(i * 8 + 4, z, false);
        d.setUint16(i * 8 + 6, uint(e.opaqueB || 0, U16, "Opaque edge word"), false);
        wanted[a].push(i);
        wanted[z].push(i);
      });
      const previous = this.getEdges(),
        remap = new Map(),
        claimed = new Set();
      const samePair = (a, z) => (a.a === z.a && a.b === z.b) || (a.a === z.b && a.b === z.a);
      edges.forEach((e, i) => {
        if (
          Number.isInteger(e.sourceIndex) &&
          previous[e.sourceIndex] &&
          samePair(e, previous[e.sourceIndex]) &&
          !remap.has(e.sourceIndex)
        ) {
          remap.set(e.sourceIndex, i);
          claimed.add(i);
        }
      });
      // Plain edge records (without provenance) match unchanged endpoint pairs.
      previous.forEach((old, i) => {
        if (remap.has(i)) return;
        const n = edges.findIndex(
          (e, j) => !claimed.has(j) && e.sourceIndex === undefined && samePair(e, old),
        );
        if (n >= 0) {
          remap.set(i, n);
          claimed.add(n);
        }
      });
      const roots = this.body(this.rootRef),
        rd = view(roots);
      for (let node = 0; node < this.rootCount; node++) {
        const p = node * this.rootStride + 32,
          ref = rd.getUint32(p, false),
          old = ref ? this.body(ref) : new Uint8Array(),
          od = view(old),
          entries = [],
          todo = new Set(wanted[node]);
        // Retain existing local order/opaque words whenever an edge still belongs.
        if (ref && this._ref(ref)[1] !== 4) throw new Error("Unsupported incident list stride.");
        for (let q = 0; q < old.length; q += 4) {
          const e = remap.get(od.getUint16(q, false));
          if (e !== undefined && todo.delete(e)) entries.push([e, od.getUint16(q + 2, false)]);
        }
        todo.forEach((e) => entries.push([e, 0]));
        const body = new Uint8Array(entries.length * 4),
          bd = view(body);
        entries.forEach(([e, o], i) => {
          bd.setUint16(i * 4, e, false);
          bd.setUint16(i * 4 + 2, o, false);
        });
        if (!same(old, body))
          rd.setUint32(p, body.length ? this.append(body, entries.length, 4) : 0, false);
      }
      if (!same(b, this.body(this.edgesRef))) this.relocate(this.edgesRef, b, edges.length, 8);
      this._writeExisting(this.rootRef, roots);
      return edges.length;
    }
    validateGraph() {
      const issues = [];
      try {
        if (this.magic === "ZONE") {
          for (let n = 0; n < this.rootCount; n++) {
            const b = this.getList(n, 52, 4),
              d = view(b);
            for (let p = 0; p < b.length; p += 4)
              if (d.getUint32(p, false) >= this.rootCount)
                issues.push(`Mission ${n}: next node ${d.getUint32(p, false)} does not exist.`);
          }
          return issues;
        }
        const edges = this.getEdges(),
          uses = new Map();
        for (let n = 0; n < this.rootCount; n++) {
          const b = this.getList(n, 32, 4),
            d = view(b);
          for (let p = 0; p < b.length; p += 4) {
            const e = d.getUint16(p, false),
              key = `${e}:${n}`;
            uses.set(key, (uses.get(key) || 0) + 1);
            if (!edges[e] || (edges[e].a !== n && edges[e].b !== n))
              issues.push(`Mission ${n}: edge ${e} is not incident to this node.`);
          }
        }
        edges.forEach((e, i) => {
          for (const n of [e.a, e.b])
            if (n >= this.rootCount || (uses.get(`${i}:${n}`) || 0) !== 1)
              issues.push(`Edge ${i}: endpoint ${n} must reference this edge exactly once.`);
        });
        for (let owner = 0; owner < this.ownersCount; owner++) {
          const record = this.getOwner(owner);
          for (const n of record.nodes)
            if (n.node >= this.rootCount)
              issues.push(`Owner ${owner}: mission ${n.node} does not exist.`);
          if (record.nodes.length && !record.nodes.some((n) => n.node === record.start))
            issues.push(
              `Owner ${owner}: starting mission ${record.start} is not in its mission list.`,
            );
          if (!record.nodes.length && record.start !== U16 && record.start >= this.rootCount)
            issues.push(`Owner ${owner}: invalid starting mission ${record.start}.`);
        }
      } catch (e) {
        issues.push(e.message);
      }
      return issues;
    }
    _cloneDescriptor(ref, kind, memo) {
      if (!ref) return 0;
      const key = `${ref}:${kind}`;
      if (memo.has(key)) return memo.get(key);
      const [n, s] = this._ref(ref),
        b = this.body(ref),
        d = view(b);
      if (kind === "group") {
        if (b.length === 8 && d.getUint32(0, false) === 0)
          d.setUint32(4, this._cloneDescriptor(d.getUint32(4, false), "roster", memo), false);
        else
          this.warnings.push(
            "A special/wave participant group was copied; its unresolved inner references remain shared.",
          );
      } else if (kind === "roster" || kind === "rewards") {
        if (s !== 8)
          throw new Error("Cannot safely clone a roster/reward list with unknown stride.");
        for (let p = 0; p < b.length; p += 8)
          d.setUint32(p + 4, this._cloneDescriptor(d.getUint32(p + 4, false), "raw", memo), false);
      } else if (kind === "actions") {
        if (s !== 12)
          throw new Error("Cannot safely clone an action sequence with unknown stride.");
        for (let p = 0; p < b.length; p += 12)
          d.setUint32(p + 8, this._cloneDescriptor(d.getUint32(p + 8, false), "raw", memo), false);
      }
      const result = this.append(b, n, s);
      memo.set(key, result);
      return result;
    }
    freeMissionIds() {
      if (this.magic !== "MAIN") return [];
      const used = new Set();
      for (let owner = 0; owner < this.ownersCount; owner++)
        this.getOwner(owner).nodes.forEach((n) => used.add(n.node));
      this.getEdges().forEach((e) => {
        used.add(e.a);
        used.add(e.b);
      });
      const roots = this.body(this.rootRef),
        free = [];
      for (let node = 0; node < this.rootCount; node++)
        if (
          !used.has(node) &&
          view(roots).getUint32(node * this.rootStride + 0x58, false) === 0x47534652 &&
          roots
            .subarray(node * this.rootStride, node * this.rootStride + 0x58)
            .every((b) => b === 0)
        )
          free.push(node);
      return free;
    }
    duplicateMission(sourceNode, options) {
      options = options || {};
      const original = this.encode(),
        oldWarnings = this.warnings.slice();
      try {
        const free = this.freeMissionIds(),
          reuse = options.reuseNode ?? free[0];
        if (free.includes(sourceNode)) throw new Error("Choose an active donor mission.");
        if (reuse !== undefined && !free.includes(reuse))
          throw new Error("Choose a free mission ID for reuse.");
        if (reuse === undefined && this.rootCount >= U16)
          throw new Error("Root count cannot exceed 65535.");
        const root = this.readRoot(sourceNode),
          d = view(root),
          newNode = reuse ?? this.rootCount,
          memo = new Map();
        if (options.x !== undefined) writeField(root, MAIN[0], options.x);
        if (options.y !== undefined) writeField(root, MAIN[1], options.y);
        if (this.magic === "MAIN") {
          if (options.owner === undefined)
            throw new Error("Choose a Galaxy owner for the new mission.");
          this.getOwner(options.owner);
          if (options.connectTo !== undefined && options.connectTo !== null)
            uint(options.connectTo, this.rootCount - 1, "Connected mission");
          for (const spec of MAIN.filter((f) => f.type === "ref")) {
            const o = spec.offset;
            if (o === 32) {
              d.setUint32(o, 0, false);
              continue;
            }
            const kind =
              o === 36 || o === 40 ? "group" : o === 44 ? "rewards" : o === 60 ? "actions" : "raw";
            d.setUint32(o, this._cloneDescriptor(d.getUint32(o, false), kind, memo), false);
          }
        } else {
          for (const o of [40, 44, 48, 52])
            d.setUint32(
              o,
              this._cloneDescriptor(d.getUint32(o, false), o === 44 ? "rewards" : "raw", memo),
              false,
            );
          this.warnings.push(
            "Duplicated Battle Zone mission retains its displayed level and route links. Saved progress uses mode, zone and integer grid cell; give independent fights distinct cells.",
          );
        }
        if (reuse === undefined)
          this.relocate(
            this.rootRef,
            concatenate(this.body(this.rootRef), root),
            newNode + 1,
            this.rootStride,
          );
        else this.writeRoot(newNode, root);
        if (this.magic === "MAIN") {
          const owner = this.getOwner(options.owner);
          if (!owner.nodes.length) {
            owner.start = newNode;
            this.warnings.push(
              "A previously empty Galaxy owner was populated. Creating a playable new Galaxy is not established by the node-addition test.",
            );
          }
          owner.nodes.push({ node: newNode, opaque: 0 });
          this.setOwner(options.owner, owner);
          if (options.connectTo !== undefined && options.connectTo !== null) {
            const edges = this.getEdges();
            edges.push({ a: options.connectTo, b: newNode, opaqueA: 0, opaqueB: 0 });
            this.setEdges(edges);
          }
          this.warnings.push(
            (reuse === undefined
              ? "New Galaxy node added."
              : "Free Galaxy mission ID " +
                newNode +
                " reused. Existing saves may retain this ID’s old progress.") +
              " Arbitrary mission counts and new-save unlock behavior need in-game verification.",
          );
        } else if (options.connectTo !== undefined && options.connectTo !== null) {
          uint(options.connectTo, newNode - 1, "Connected mission");
          const list = this.getList(options.connectTo, 52, 4),
            extra = new Uint8Array(4);
          view(extra).setUint32(0, newNode, false);
          this.setList(options.connectTo, 52, concatenate(list, extra), 4);
        }
        return newNode;
      } catch (e) {
        const clean = new MmdDocument(original);
        this.header = clean.header;
        this.descriptors = clean.descriptors;
        this.payload = clean.payload;
        this.warnings = oldWarnings;
        throw e;
      }
    }
  }
  RB2.MmdDocument = MmdDocument;
  RB2.Mmd = {
    FREE_MISSION_TAG: 0x47534652,
    schemas: { MAIN, ZONE },
    MAIN,
    ZONE,
    readField,
    writeField,
    operators,
    parseExpression,
    validateExpression,
    formatExpression,
    encodeExpression,
    evaluateExpression,
    constantExpression: (value) =>
      encodeExpression([
        { kind: 2, operand: value },
        { kind: 0, operand: 0 },
      ]),
  };
})(globalThis);
