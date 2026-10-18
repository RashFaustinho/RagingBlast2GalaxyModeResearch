/* Local AFS + STPK/STPZ bridge. File slices keep multi-GB AFS inputs off the JS heap. */
(function (root) {
  "use strict";
  const R = (root.RB2 = root.RB2 || {}),
    LIMIT = 128 * 1024 * 1024,
    enc = new TextEncoder(),
    dec = new TextDecoder("utf-8", { fatal: true });
  const view = (b) => new DataView(b.buffer, b.byteOffset, b.byteLength),
    magic = (b) => String.fromCharCode(...b.subarray(0, 4));
  const equal = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const align = (n, k) => Math.ceil(n / k) * k;
  function safeName(s) {
    if (
      !s ||
      s === "." ||
      s === ".." ||
      /[\\/:<>"|?*\x00-\x1f]/.test(s) ||
      /[. ]$/.test(s) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s)
    )
      throw Error("Unsafe archive member name.");
    return s;
  }
  function supported(n) {
    return (
      /^(?:galaxy|tutorial|zone_[a-z0-9_]+)\.mmd$/i.test(n) ||
      /^preset_(?:appearance_table|strength_table|character_(?:galaxy|tutorial|download))\.dat$/i.test(
        n,
      ) ||
      /^preset_character_battle_zone_(?:nor|spe)(?:\.dat)?$/i.test(n) ||
      /^item_parameter\.dat$/i.test(n) ||
      /^tutorial_message_table_0[1-9]\.dat$/i.test(n) ||
      /^TUTO_\d{3,5}_(?:US|IT|FR|DE|SP|JP)\.txt$/i.test(n)
    );
  }
  // Destination folders use the original European archive layout, even for loose inputs.
  function targetAfs(name) {
    if (/^(?:galaxy|tutorial|zone_[a-z0-9_]+)\.mmd$/i.test(name))
      return "st_pack_progress_pt_ps3.afs";
    if (
      /^preset_(?:appearance_table|strength_table|character_(?:galaxy|tutorial|download))\.dat$/i.test(
        name,
      ) ||
      /^preset_character_battle_zone_(?:nor|spe)(?:\.dat)?$/i.test(name) ||
      /^item_parameter\.dat$/i.test(name)
    )
      return "st_pack_boot_pt_ps3.afs";
    if (
      /^tutorial_message_table_0[1-9]\.dat$/i.test(name) ||
      /^TUTO_\d{3,5}_(?:US|IT|FR|DE|SP|JP)\.txt$/i.test(name)
    )
      return "st_pack_battle_others_pt_ps3.afs";
    return null;
  }
  function exportPath(name) {
    return (targetAfs(name) || "Unassigned") + "/" + safeName(name);
  }
  function decodeTokens(b, expected) {
    if (expected > LIMIT) throw Error("Compression chunk exceeds the 128 MiB limit.");
    const out = new Uint8Array(expected);
    let p = 0,
      q = 0;
    while (p < b.length) {
      const t = b[p++],
        n = t >>> 1;
      if (!n || q + n > expected) throw Error("Invalid compression token.");
      if (t & 1) {
        const d = b[p++];
        if (!d || d > q) throw Error("Invalid back-reference.");
        for (let j = 0; j < n; j++) {
          out[q] = out[q - d];
          q++;
        }
      } else {
        if (p + n > b.length) throw Error("Truncated compression literal.");
        out.set(b.subarray(p, p + n), q);
        p += n;
        q += n;
      }
    }
    if (q !== expected) throw Error("Decompressed size mismatch.");
    return out;
  }
  function encodeTokens(b) {
    const out = new Uint8Array(b.length + Math.ceil(b.length / 127) + 2),
      buckets = new Map();
    let p = 0,
      q = 0,
      lit = -1,
      count = 0;
    const key = (i) => (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
    function history(i) {
      if (i >= 255 && i - 255 + 2 < b.length) {
        const k = key(i - 255),
          a = buckets.get(k);
        if (a) {
          a.shift();
          if (!a.length) buckets.delete(k);
        }
      }
      if (i + 2 < b.length) {
        const k = key(i),
          a = buckets.get(k) || [];
        a.push(i);
        buckets.set(k, a);
      }
    }
    while (p < b.length) {
      let length = 0,
        distance = 0;
      const candidates = p + 2 < b.length ? buckets.get(key(p)) : null;
      if (candidates)
        for (let i = candidates.length - 1; i >= 0; i--) {
          const d = p - candidates[i];
          if (d > 255) break;
          let n = 3;
          while (n < 127 && p + n < b.length && b[p + n] === b[p + n - d]) n++;
          if (n > length) {
            length = n;
            distance = d;
          }
          if (n === 127) break;
        }
      if (length >= 3) {
        if (count) {
          out[lit] = count << 1;
          count = 0;
        }
        out[q++] = (length << 1) | 1;
        out[q++] = distance;
        for (let i = 0; i < length; i++) history(p + i);
        p += length;
      } else {
        if (!count) lit = q++;
        out[q++] = b[p];
        history(p++);
        if (++count === 127) {
          out[lit] = count << 1;
          count = 0;
        }
      }
    }
    if (count) out[lit] = count << 1;
    return out.slice(0, q);
  }
  function unpack(b) {
    if (magic(b) === "STPK") return { pak: b, layout: null };
    if (b.length < 32 || magic(b) !== "STPZ" || magic(b.subarray(16)) !== "0DCS")
      throw Error("Unsupported STPZ compression variant.");
    const v = view(b),
      expected = v.getUint32(20, true);
    if (expected > LIMIT || v.getUint32(24, true) + 16 !== b.length)
      throw Error("Invalid STPZ size.");
    const out = new Uint8Array(expected),
      chunks = [];
    let p = 32,
      q = 0;
    while (p < b.length) {
      if (p + 16 > b.length || magic(b.subarray(p)) !== "0LCS")
        throw Error("Unknown compression block.");
      const n = v.getUint32(p + 4, true),
        size = v.getUint32(p + 8, true),
        reserved = v.getUint32(p + 12, true);
      if (size < 16 || p + size > b.length || q + n > expected)
        throw Error("Compression block outside archive.");
      out.set(decodeTokens(b.subarray(p + 16, p + size), n), q);
      chunks.push({ size: n, reserved });
      q += n;
      p += size;
    }
    if (q !== expected) throw Error("Incomplete STPZ.");
    return { pak: out, layout: { header: b.slice(0, 16), limit: v.getUint32(28, true), chunks } };
  }
  function compress(pak, layout) {
    if (!layout) return pak;
    if (pak.length > LIMIT || !layout.limit || layout.limit > 128 * 1024)
      throw Error("Unsupported compression geometry.");
    const same = layout.chunks.reduce((n, c) => n + c.size, 0) === pak.length,
      chunks = same
        ? layout.chunks
        : Array.from({ length: Math.ceil(pak.length / layout.limit) }, (_, i) => ({
            size: Math.min(layout.limit, pak.length - i * layout.limit),
            reserved: layout.chunks.at(-1)?.reserved || 0,
          }));
    let p = 0;
    const blocks = [];
    for (const c of chunks) {
      const data = encodeTokens(pak.subarray(p, p + c.size)),
        b = new Uint8Array(data.length + 16),
        v = view(b);
      b.set(enc.encode("0LCS"));
      v.setUint32(4, c.size, true);
      v.setUint32(8, b.length, true);
      v.setUint32(12, c.reserved, true);
      b.set(data, 16);
      blocks.push(b);
      p += c.size;
    }
    const out = new Uint8Array(32 + blocks.reduce((n, b) => n + b.length, 0)),
      v = view(out);
    out.set(layout.header);
    out.set(enc.encode("0DCS"), 16);
    v.setUint32(20, pak.length, true);
    v.setUint32(24, out.length - 16, true);
    v.setUint32(28, layout.limit, true);
    p = 32;
    for (const b of blocks) {
      out.set(b, p);
      p += b.length;
    }
    if (!equal(unpack(out).pak, pak)) throw Error("Compression verification failed.");
    return out;
  }
  function members(b) {
    if (b.length < 16 || magic(b) !== "STPK") throw Error("Expected STPK archive.");
    const v = view(b),
      n = v.getUint32(8),
      end = 16 + n * 48;
    if (n > 20000 || end > b.length) throw Error("Invalid STPK directory.");
    const names = new Set(),
      rows = [];
    for (let i = 0; i < n; i++) {
      const o = 16 + i * 48,
        offset = v.getUint32(o),
        size = v.getUint32(o + 4),
        raw = b.subarray(o + 16, o + 48),
        zero = raw.indexOf(0),
        name = dec.decode(zero < 0 ? raw : raw.subarray(0, zero));
      if (!name || name === "." || name === ".." || /[\\/:\x00-\x1f]/.test(name))
        throw Error("Invalid internal archive name.");
      if (names.has(name.toLowerCase()) || offset < end || offset + size > b.length)
        throw Error("Invalid or duplicate STPK member.");
      names.add(name.toLowerCase());
      rows.push({ index: i, name, offset, size });
    }
    const sorted = rows.slice().sort((a, b) => a.offset - b.offset);
    for (let i = 1; i < sorted.length; i++)
      if (sorted[i - 1].offset + sorted[i - 1].size > sorted[i].offset)
        throw Error("Overlapping STPK members.");
    return rows;
  }
  function replaceMember(pak, name, replacement) {
    const rows = members(pak),
      target = rows.find((r) => r.name === name);
    if (!target) throw Error("Archive path disappeared.");
    if (replacement.length > LIMIT) throw Error("Replacement exceeds 128 MiB.");
    const end = Math.min(
        ...rows.filter((r) => r.offset > target.offset).map((r) => r.offset),
        pak.length,
      ),
      span = end - target.offset;
    // Nonzero gap bytes may be opaque data or the tail of an earlier, larger member.
    // Keep the whole gap and insert aligned space before it instead of consuming it.
    const preserveGap =
      replacement.length > target.size &&
      pak
        .subarray(target.offset + target.size, Math.min(target.offset + replacement.length, end))
        .some((x) => x);
    const delta = preserveGap
        ? align(replacement.length - target.size, 16)
        : align(Math.max(0, replacement.length - span), 16),
      out = new Uint8Array(pak.length + delta);
    if (out.length > LIMIT) throw Error("Repacked container exceeds 128 MiB.");
    if (preserveGap) {
      out.set(pak.subarray(0, target.offset));
      out.set(pak.subarray(target.offset + target.size, end), target.offset + target.size + delta);
    } else out.set(pak.subarray(0, end));
    out.set(pak.subarray(end), end + delta);
    out.set(replacement, target.offset);
    const v = view(out);
    v.setUint32(16 + target.index * 48 + 4, replacement.length);
    for (const r of rows) if (r.offset >= end) v.setUint32(16 + r.index * 48, r.offset + delta);
    const after = members(out);
    for (const r of rows) {
      const a = after[r.index];
      if (
        !equal(
          out.subarray(a.offset, a.offset + a.size),
          r === target ? replacement : pak.subarray(r.offset, r.offset + r.size),
        )
      )
        throw Error("Unexpected archive member change.");
    }
    return out;
  }
  async function read(blob, start, size) {
    if (start < 0 || size < 0 || start + size > blob.size) throw Error("Read outside input.");
    return new Uint8Array(await blob.slice(start, start + size).arrayBuffer());
  }
  async function afsDirectory(file) {
    const h = await read(file, 0, 8),
      v = view(h);
    if (magic(h) !== "AFS\0") throw Error("Choose a PS3 AFS archive.");
    const n = v.getUint32(4, true);
    if (!n || n > 20000 || 16 + n * 8 > file.size) throw Error("Invalid AFS directory.");
    const header = await read(file, 0, 16 + n * 8),
      d = view(header),
      nameOffset = d.getUint32(8 + n * 8, true),
      nameSize = d.getUint32(12 + n * 8, true),
      rows = [];
    if (
      (nameOffset || nameSize) &&
      (nameSize < n * 48 || nameOffset + nameSize > file.size || nameOffset < header.length)
    )
      throw Error("Invalid AFS filename table.");
    for (let i = 0; i < n; i++) {
      const offset = d.getUint32(8 + i * 8, true),
        size = d.getUint32(12 + i * 8, true);
      if (offset < header.length || offset + size > file.size)
        throw Error("AFS member outside file.");
      rows.push({ index: i, offset, size });
    }
    const sorted = rows.slice().sort((a, b) => a.offset - b.offset),
      ranges = [...sorted, ...(nameSize ? [{ offset: nameOffset, size: nameSize }] : [])].sort(
        (a, b) => a.offset - b.offset,
      );
    for (let i = 1; i < ranges.length; i++)
      if (ranges[i - 1].offset + ranges[i - 1].size > ranges[i].offset)
        throw Error("Overlapping AFS data.");
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      r.capacity =
        Math.min(
          sorted[i + 1]?.offset || file.size,
          nameSize && nameOffset > r.offset ? nameOffset : file.size,
        ) - r.offset;
    }
    return { file, header, rows, nameOffset, nameSize };
  }
  const yieldUI = () => new Promise((r) => setTimeout(r, 0));
  function checkCancelled(cancelled) {
    if (cancelled()) {
      const error = new Error("Operation cancelled.");
      error.name = "AbortError";
      throw error;
    }
  }
  async function scan(
    file,
    {
      full = false,
      onProgress = () => {},
      cancelled = () => false,
      collect = true,
      match = supported,
      locations: selectLocations = null,
    } = {},
  ) {
    checkCancelled(cancelled);
    const directory = await afsDirectory(file);
    checkCancelled(cancelled);
    const hints =
      /st_pack_progress/i.test(file.name) && directory.rows.length === 2177
        ? [872, 8, 22, 36, 50, 64, 78, 92, 106, 120, 134, 148, 162, 176, 190, 204, 218, 232, 234]
        : null;
    const locations =
      selectLocations?.(directory) ||
      hints ||
      (/st_pack_battle_others/i.test(file.name) && directory.rows.length === 136
        ? [53, 96, 98, 100, 102, 104, 106]
        : null);
    if (locations?.some((i) => !Number.isInteger(i) || i < 0 || i >= directory.rows.length))
      throw Error("Invalid archive scan location.");
    const rows = locations && !full ? locations.map((i) => directory.rows[i]) : directory.rows,
      found = [],
      warnings = [];
    let decompressed = 0;
    function walk(body, index, path, depth) {
      if (depth > 6) throw Error("Nested archive depth exceeds six.");
      const { pak } = unpack(body);
      decompressed += pak.length;
      if (decompressed > 1024 * 1024 * 1024)
        throw Error("Scan exceeds 1 GiB of decompressed container data.");
      for (const r of members(pak)) {
        const data = pak.subarray(r.offset, r.offset + r.size),
          chain = [...path, r.name];
        if (match(r.name))
          found.push({
            name: r.name,
            index,
            path: chain,
            bytes: collect ? data.slice() : undefined,
            size: r.size,
          });
        else if (["STPK", "STPZ"].includes(magic(data))) walk(data, index, chain, depth + 1);
      }
    }
    for (let i = 0; i < rows.length; i++) {
      checkCancelled(cancelled);
      const row = rows[i];
      onProgress({ current: i, total: rows.length, found: found.length, index: row.index });
      const prefix = await read(file, row.offset, Math.min(32, row.size));
      if (["STPK", "STPZ"].includes(magic(prefix))) {
        try {
          if (row.size > LIMIT) throw Error("Container exceeds 128 MiB.");
          walk(await read(file, row.offset, row.size), row.index, [], 0);
        } catch (e) {
          warnings.push({ index: row.index, message: e.message });
        }
      }
      await yieldUI();
    }
    checkCancelled(cancelled);
    onProgress({ current: rows.length, total: rows.length, found: found.length });
    checkCancelled(cancelled);
    return {
      directory,
      found,
      warnings,
      scanMode: locations && !full ? "BLES00978 known locations" : "All entries",
    };
  }
  function patchTree(body, changes, path = []) {
    const { pak: original, layout } = unpack(body);
    let pak = original;
    const groups = new Map();
    for (const c of changes) {
      const name = c.path[path.length];
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(c);
    }
    for (const [name, list] of groups) {
      const r = members(pak).find((r) => r.name === name);
      if (!r) throw Error("Missing import path.");
      const old = pak.subarray(r.offset, r.offset + r.size),
        direct = list.filter((c) => c.path.length === path.length + 1);
      if (direct.length > 1) throw Error("Duplicate replacement path.");
      const replacement = direct.length ? direct[0].bytes : patchTree(old, list, [...path, name]);
      if (!equal(old, replacement)) pak = replaceMember(pak, name, replacement);
    }
    return pak === original ? body : compress(pak, layout);
  }
  async function rebuild(
    scanResult,
    replacements,
    { onProgress = () => {}, cancelled = () => false } = {},
  ) {
    checkCancelled(cancelled);
    const { directory, found } = scanResult,
      { file, rows, header, nameOffset, nameSize } = directory,
      byName = new Map();
    for (const r of replacements) {
      safeName(r.name);
      const key = r.name.toLowerCase();
      if (!supported(r.name)) throw Error("Unsupported replacement: " + r.name);
      if (byName.has(key)) throw Error("Duplicate replacement filename: " + r.name);
      byName.set(key, r);
    }
    for (const key of byName.keys())
      if (!found.some((r) => r.name.toLowerCase() === key))
        throw Error("File not found in this AFS: " + byName.get(key).name);
    const groups = new Map();
    for (const location of found) {
      const r = byName.get(location.name.toLowerCase());
      if (r) {
        if (!groups.has(location.index)) groups.set(location.index, []);
        groups.get(location.index).push({ ...location, bytes: r.bytes });
      }
    }
    const patches = [];
    let current = 0;
    for (const [index, list] of groups) {
      checkCancelled(cancelled);
      onProgress({ current: current++, total: groups.size, index });
      await yieldUI();
      checkCancelled(cancelled);
      const r = rows[index],
        old = await read(file, r.offset, r.size),
        body = patchTree(old, list);
      if (!equal(old, body)) {
        const consumed = Math.min(body.length, r.capacity) - r.size,
          preserveGap =
            consumed > 0 && (await read(file, r.offset + r.size, consumed)).some((x) => x);
        patches.push({
          row: r,
          body,
          preserveGap,
          delta: preserveGap
            ? align(body.length - r.size, 2048)
            : align(Math.max(0, body.length - r.capacity), 2048),
        });
      }
    }
    checkCancelled(cancelled);
    patches.sort((a, b) => a.row.offset - b.row.offset);
    const offsetAfter = (o) =>
        o +
        patches.filter((p) => p.row.offset + p.row.capacity <= o).reduce((n, p) => n + p.delta, 0),
      newHeader = header.slice(),
      v = view(newHeader);
    for (const r of rows) {
      v.setUint32(8 + r.index * 8, offsetAfter(r.offset), true);
      const p = patches.find((p) => p.row.index === r.index);
      if (p) v.setUint32(12 + r.index * 8, p.body.length, true);
    }
    const newNameOffset = nameSize ? offsetAfter(nameOffset) : nameOffset;
    if (
      newNameOffset > 0xffffffff ||
      file.size + patches.reduce((n, p) => n + p.delta, 0) > 0xffffffff
    )
      throw Error("AFS exceeds 32-bit offsets.");
    v.setUint32(8 + rows.length * 8, newNameOffset, true);
    const ops = [{ start: 0, end: header.length, parts: [newHeader] }];
    for (const p of patches) {
      const r = p.row,
        end = r.offset + r.capacity;
      ops.push({
        start: r.offset,
        end,
        parts: p.preserveGap
          ? [
              p.body,
              new Uint8Array(r.size + p.delta - p.body.length),
              file.slice(r.offset + r.size, end),
            ]
          : [
              p.body,
              ...(p.body.length < r.capacity ? [file.slice(r.offset + p.body.length, end)] : []),
              ...(r.capacity + p.delta > Math.max(r.capacity, p.body.length)
                ? [new Uint8Array(r.capacity + p.delta - p.body.length)]
                : []),
            ],
      });
    }
    if (nameSize) {
      const names = await read(file, nameOffset, nameSize),
        nv = view(names);
      for (const p of patches) {
        const field = p.row.index * 48 + 44;
        if (nv.getUint32(field, true) === p.row.size) nv.setUint32(field, p.body.length, true);
      }
      ops.push({ start: nameOffset, end: nameOffset + nameSize, parts: [names] });
    }
    ops.sort((a, b) => a.start - b.start);
    let at = 0;
    const parts = [];
    for (const o of ops) {
      if (o.start < at) throw Error("Overlapping output operations.");
      parts.push(file.slice(at, o.start), ...o.parts);
      at = o.end;
    }
    parts.push(file.slice(at));
    const blob = new Blob(parts, { type: "application/octet-stream" });
    const check = await afsDirectory(blob);
    for (const r of rows) {
      const p = patches.find((p) => p.row.index === r.index),
        after = check.rows[r.index];
      if (after.offset !== offsetAfter(r.offset) || after.size !== (p ? p.body.length : r.size))
        throw Error("Output AFS directory verification failed.");
      if (p && !equal(await read(blob, after.offset, after.size), p.body))
        throw Error("Output AFS body verification failed.");
    }
    checkCancelled(cancelled);
    return {
      blob,
      changedEntries: patches.map((p) => ({
        index: p.row.index,
        before: p.row.size,
        after: p.body.length,
        inserted: p.delta,
        preservedPaddingBytes: p.preserveGap ? p.row.capacity - p.row.size : 0,
      })),
      matchedCopies: found.filter((r) => byName.has(r.name.toLowerCase())).length,
      files: [...byName.values()].map((r) => r.name),
      verification:
        "Nested archives decoded and compared; untouched AFS ranges and opaque gaps retained as original File slices.",
    };
  }
  R.Archives = {
    targetAfs,
    exportPath,
    supported,
    safeName,
    unpack,
    compress,
    members,
    replaceMember,
    decodeTokens,
    encodeTokens,
    afsDirectory,
    scan,
    rebuild,
    equal,
  };
  if (typeof module !== "undefined") module.exports = R.Archives;
})(typeof window !== "undefined" ? window : globalThis);
