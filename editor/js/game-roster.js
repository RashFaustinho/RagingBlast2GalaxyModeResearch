/* Read-only native roster import. IDs/names come from the mod, never inferred. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {});
  const isNameText = (name, language = "(?:US|IT|FR|DE|SP|JP)") =>
    new RegExp("^CharacterName_\\d{3,5}_" + language + "\\.txt$", "i").test(name);
  const isRosterFile = (name, language) =>
    /^(?:cs_main|cs_form|preset_appearance_table)\.dat$/i.test(name) || isNameText(name, language);
  function nativeNames(source) {
    if (
      !(source instanceof Uint8Array) ||
      !source.length ||
      source.length % 80 ||
      source.length / 80 > 4096
    )
      throw Error("Unsupported cs_main.dat layout: expected raw 80-byte rows (no header).");
    const v = new DataView(source.buffer, source.byteOffset, source.byteLength),
      rows = [];
    for (let id = 0; id < source.length / 80; id++) {
      const offset = id * 80;
      if (v.getUint32(offset) !== id) throw Error("Unsupported native numbering in cs_main.dat.");
      rows.push({ id, nameText: v.getUint32(offset + 4), formText: v.getUint32(offset + 8) });
    }
    return rows;
  }
  function profile({ main, texts, groups, appearance, name = "Roster from game files" }) {
    const rows = nativeNames(main),
      labels = new Map(),
      languages = new Set();
    for (const file of texts) {
      const match = /^CharacterName_(\d{3,5})_(US|IT|FR|DE|SP|JP)\.txt$/i.exec(file.name);
      if (!match)
        throw Error("Expected CharacterName_###_XX.txt members from K_CharacterName_XX.pak.");
      const id = Number(match[1]);
      if (labels.has(id))
        throw Error("Duplicate character-name text ID " + id + ". Choose one language only.");
      languages.add(match[2].toUpperCase());
      labels.set(id, new R.LocalizedTextDocument(file.bytes).text.replace(/\r?\n/g, " ").trim());
    }
    if (!labels.size || languages.size !== 1)
      throw Error("Supply character-name texts in exactly one language.");
    const groupRows = groups ? R.ModSupport.characterGroups(groups) : [];
    const defaults = new Map();
    if (appearance) {
      const table = new R.DatDocument(appearance, "appearance");
      for (let n = 0; n < table.count; n++) {
        const row = table.row(n);
        if (!defaults.has(row[0])) defaults.set(row[0], row.slice(3));
      }
    }
    const missing = [];
    const characters = rows.map((r) => {
      const base = labels.get(r.nameText),
        form = r.formText === 0xffffffff ? "" : labels.get(r.formText);
      if (!base || form === undefined) missing.push(r.id);
      const character = {
        id: r.id,
        name:
          (base || "Native #" + r.id + " [missing name #" + r.nameText + "]") +
          (r.formText !== 0xffffffff ? " / " + (form || "[missing form #" + r.formText + "]") : ""),
      };
      const group = groupRows.find((x) => x.forms.includes(r.id));
      if (group) character.group = group.id;
      if (defaults.has(r.id)) character.defaultMoves = defaults.get(r.id);
      return character;
    });
    return {
      profile: R.ModSupport.validate({
        format: "RB2-Galaxy-Studio-Mod",
        version: 1,
        name,
        characters,
        enhancedCharacters: groupRows.map((r) => ({ id: r.id, native: r.native })),
      }),
      language: [...languages][0],
      missingNames: missing,
      namedTexts: labels.size,
      moveDefaults: characters.filter((r) => r.defaultMoves).length,
    };
  }
  // One input-selection contract for loose files and members read from AFS.
  function fromFiles(files, name = "Roster from game files") {
    const byName = new Map();
    for (const file of files) {
      if (!isRosterFile(file.name)) throw Error("Unrecognized roster input: " + file.name);
      const key = file.name.toLowerCase();
      if (byName.has(key)) throw Error("Choose only one copy of " + file.name + ".");
      byName.set(key, file.bytes);
    }
    if (!byName.has("cs_main.dat")) throw Error("Choose exactly one cs_main.dat.");
    return profile({
      main: byName.get("cs_main.dat"),
      groups: byName.get("cs_form.dat"),
      appearance: byName.get("preset_appearance_table.dat"),
      texts: files.filter((f) => isNameText(f.name)),
      name,
    });
  }
  async function fromArchives(
    sources,
    { language = "US", full = false, onProgress = () => {}, cancelled = () => false } = {},
  ) {
    if (!["US", "IT", "FR", "DE", "SP", "JP"].includes(language))
      throw Error("Choose a supported roster language.");
    if (sources.length > 16) throw Error("Choose at most 16 AFS archives per roster import.");
    if (!sources.length) throw Error("Choose the mod’s progress and boot AFS archives.");
    const files = new Map(),
      warnings = [];
    const match = (name) => isRosterFile(name, language);
    for (const source of sources) {
      const scan = await R.Archives.scan(source, {
        full,
        match,
        locations: (d) =>
          /st_pack_progress/i.test(source.name) && d.rows.length === 2177 ? [1891] : null,
        cancelled,
        onProgress: (progress) => onProgress({ ...progress, archive: source.name }),
      });
      warnings.push(...scan.warnings.map((w) => ({ archive: source.name, ...w })));
      for (const file of scan.found) {
        const key = file.name.toLowerCase(),
          previous = files.get(key);
        if (previous && !R.Archives.equal(previous.bytes, file.bytes))
          throw Error(
            "Conflicting copies of " +
              file.name +
              ". Choose archives from the same game installation.",
          );
        files.set(key, file);
      }
    }
    if (!files.has("cs_main.dat"))
      throw Error(
        "cs_main.dat was not found. Include the mod’s st_pack_progress_pt_ps3.afs. If its data was relocated, enable Scan every entry.",
      );
    if (![...files.values()].some((f) => isNameText(f.name)))
      throw Error(
        "No character names found for " +
          language +
          ". Include st_pack_boot_pt_ps3.afs or choose another language.",
      );
    const result = fromFiles([...files.values()], "Roster extracted from game AFS");
    return { ...result, warnings, extractedFiles: files.size };
  }
  R.GameRoster = { nativeNames, profile, fromFiles, fromArchives };
})(globalThis);
