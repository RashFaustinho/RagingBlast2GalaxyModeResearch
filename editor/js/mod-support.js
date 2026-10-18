/* Offline, explicit catalog overlays. Profiles never patch the game's executable. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {});
  const number = (v, max = 65535) => {
    if (typeof v === "string" && /^(?:0x[\da-f]+|\d+)$/i.test(v.trim())) v = Number(v);
    if (!Number.isInteger(v) || v < 0 || v > max)
      throw Error("Expected an integer ID between 0 and " + max + ".");
    return v;
  };
  const label = (v) => {
    if (typeof v !== "string" || !v.trim() || v.length > 200)
      throw Error("Names must contain 1–200 characters.");
    return v.trim();
  };
  function rows(a, kind, fn) {
    if (a === undefined) return [];
    if (!Array.isArray(a) || a.length > 12000) throw Error("Invalid " + kind + " catalog.");
    const seen = new Set();
    return a.map((x) => {
      if (!x || typeof x !== "object" || Array.isArray(x))
        throw Error("Invalid " + kind + " record.");
      const y = fn(x),
        key = kind === "moves" ? y.native + ":" + y.id : y.id;
      if (seen.has(key)) throw Error("Duplicate " + kind + " ID " + key + ".");
      seen.add(key);
      return y;
    });
  }
  function validate(raw) {
    if (!raw || raw.format !== "RB2-Galaxy-Studio-Mod" || raw.version !== 1)
      throw Error("Expected an RB2-Galaxy-Studio-Mod version 1 profile.");
    const p = { format: raw.format, version: 1, name: label(raw.name) };
    p.characters = rows(raw.characters, "characters", (x) => {
      const y = { id: number(x.id), name: label(x.name) };
      if (x.defaultMoves !== undefined) {
        if (!Array.isArray(x.defaultMoves) || x.defaultMoves.length !== 5)
          throw Error("defaultMoves needs exactly five local selectors.");
        y.defaultMoves = x.defaultMoves.map((v) => number(v, 0x7fffffff));
      }
      if (x.keepOriginalMoves === true) y.keepOriginalMoves = true;
      if (x.useOriginalPortrait === true) y.useOriginalPortrait = true;
      if (x.group !== undefined) y.group = number(x.group);
      if (x.portrait !== undefined) {
        if (
          typeof x.portrait !== "string" ||
          x.portrait.length > 350000 ||
          !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(x.portrait)
        )
          throw Error("Custom portraits must be embedded PNG data URLs (maximum 350 KB encoded).");
        const b = atob(x.portrait.split(",")[1]);
        if (!b.startsWith("\x89PNG\r\n\x1a\n")) throw Error("Invalid PNG signature.");
        y.portrait = x.portrait;
      }
      return y;
    });
    if (!p.characters.length) throw Error("Supply the mod’s native character/form ID list first.");
    p.moves = rows(raw.moves, "moves", (x) => ({
      native: number(x.native),
      id: number(x.id, 0x7fffffff),
      name: label(x.name),
      resolved: true,
    }));
    for (const kind of ["stages", "music", "items"])
      p[kind] = rows(raw[kind], kind, (x) => ({ id: number(x.id), name: label(x.name) }));
    p.transformations = rows(raw.transformations, "transformations", (x) => {
      if (!Array.isArray(x.slots) || x.slots.length > 4)
        throw Error("A native form has at most four researched slots.");
      const seen = new Set();
      return {
        id: number(x.id),
        slots: x.slots.map((s) => {
          const slot = number(s.slot, 3);
          if (seen.has(slot)) throw Error("Duplicate native form slot.");
          seen.add(slot);
          if (typeof s.cancel !== "boolean")
            throw Error("Each native slot needs an explicit cancel boolean.");
          return { slot, target: s.target === null ? null : number(s.target), cancel: s.cancel };
        }),
      };
    });
    p.enhancedCharacters = rows(raw.enhancedCharacters, "enhanced groups", (x) => ({
      id: number(x.id ?? x.index),
      native: number(x.native),
    }));
    return p;
  }
  function overlay(base, profile) {
    const p = validate(profile),
      d = { ...base };
    const merge = (original, extra, key = (x) => x.id) => {
      const map = new Map(original.map((x) => [key(x), { ...x }]));
      for (const x of extra) map.set(key(x), { ...x });
      return [...map.values()].sort((a, b) => (a.native ?? 0) - (b.native ?? 0) || a.id - b.id);
    };
    const changed = new Set(p.characters.filter((x) => !x.keepOriginalMoves).map((x) => x.id));
    d.characters = merge(
      base.characters,
      p.characters.map((x) => ({
        ...x,
        portrait:
          x.portrait ||
          (x.useOriginalPortrait ? base.characters.find((y) => y.id === x.id)?.portrait : "") ||
          "",
        defaultMoves:
          x.defaultMoves ||
          (x.keepOriginalMoves ? base.characters.find((y) => y.id === x.id)?.defaultMoves : null),
      })),
    );
    d.moves = merge(
      base.moves.filter((x) => !changed.has(x.native)),
      p.moves,
      (x) => x.native + ":" + x.id,
    );
    for (const k of ["stages", "music", "items"]) d[k] = merge(base[k] || [], p[k]);
    d.nativeTransforms = merge(
      (base.nativeTransforms || []).filter((x) => !changed.has(x.id)),
      p.transformations,
    );
    d.enhancedCharacters = p.enhancedCharacters.length
      ? p.enhancedCharacters.map((x) => ({ index: x.id, native: x.native }))
      : [];
    return d;
  }
  function csv(text) {
    if (typeof text !== "string" || text.length > 4 * 1024 * 1024)
      throw Error("CSV exceeds the 4 MiB limit.");
    text = text.replace(/^\ufeff/, "");
    const out = [],
      row = [];
    let cell = "",
      quoted = false,
      closed = false;
    for (let i = 0; i <= text.length; i++) {
      const c = i === text.length ? "\n" : text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            quoted = false;
            closed = true;
          }
        } else if (i === text.length) throw Error("Unclosed CSV quote.");
        else cell += c;
        continue;
      }
      if (c === '"') {
        if (cell || closed) throw Error("Invalid CSV quote.");
        quoted = true;
        continue;
      }
      if (c === "," || c === "\n") {
        row.push(cell.trim());
        cell = "";
        closed = false;
        if (c === "\n") {
          if (row.some((x) => x)) out.push(row.slice());
          row.length = 0;
        }
        continue;
      }
      if (c === "\r" && text[i + 1] === "\n") continue;
      if (closed && !/\s/.test(c)) throw Error("Unexpected text after a quoted CSV cell.");
      cell += c;
    }
    if (!out.length) throw Error("CSV is empty.");
    const head = out.shift().map((x) => x.toLowerCase());
    if (new Set(head).size !== head.length) throw Error("Duplicate CSV column.");
    return out.map((r) => {
      if (r.length !== head.length) throw Error("CSV rows must match the header.");
      return Object.fromEntries(head.map((h, i) => [h, r[i]]));
    });
  }
  function characterCSV(text, name = "Imported mod") {
    const characters = csv(text).map((x) => {
      const y = { id: number(x.id ?? x.native), name: label(x.name) };
      const cols = ["super_up", "super_right", "super_down", "super_left", "ultimate"];
      if (cols.some((k) => x[k])) {
        if (!cols.every((k) => x[k] !== undefined && x[k] !== ""))
          throw Error("Provide all five move selectors, or leave all five empty.");
        y.defaultMoves = cols.map((k) => number(x[k], 0x7fffffff));
      }
      if (x.keep_original_moves === "true") y.keepOriginalMoves = true;
      if (x.use_original_portrait === "true") y.useOriginalPortrait = true;
      return y;
    });
    return validate({ format: "RB2-Galaxy-Studio-Mod", version: 1, name, characters });
  }
  function moveCSV(text) {
    return rows(csv(text), "moves", (x) => ({
      native: number(x.native),
      id: number(x.id),
      name: label(x.name),
      resolved: true,
    }));
  }
  function characterGroups(bytes) {
    if (
      !(bytes instanceof Uint8Array) ||
      !bytes.length ||
      bytes.length % 36 ||
      bytes.length > 4096 * 36
    )
      throw Error(
        "Expected raw cs_form.dat rows of 36 bytes, with no DAT header. Other mod layouts are not inferred.",
      );
    const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      out = [];
    for (let i = 0; i < bytes.length / 36; i++) {
      const o = i * 36,
        id = d.getUint32(o),
        native = d.getUint32(o + 4),
        count = d.getUint32(o + 8);
      if (id !== i || native > 65535 || count < 1 || count > 5)
        throw Error("Unsupported cs_form.dat geometry or group numbering.");
      const forms = [];
      for (let j = 0; j < count; j++) {
        const n = d.getUint32(o + 16 + j * 4);
        if (n > 65535) throw Error("Invalid native form in cs_form.dat.");
        forms.push(n);
      }
      out.push({ id, native, forms });
    }
    return out;
  }
  const template = {
    format: "RB2-Galaxy-Studio-Mod",
    version: 1,
    name: "My mod — replace this example",
    characters: [{ id: 100, name: "Extra fighter", defaultMoves: [0, 1, 2, 3, 4], group: 66 }],
    moves: [{ native: 100, id: 0, name: "Extra Super — replace with the real local move" }],
    transformations: [],
    enhancedCharacters: [],
  };
  R.ModSupport = { validate, overlay, characterCSV, moveCSV, characterGroups, template, number };
})(globalThis);
