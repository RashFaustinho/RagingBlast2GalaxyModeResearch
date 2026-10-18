/* Stock-game selector semantics, distinct from audio-file and localized-text IDs. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {});
  function mode(ctx) {
    return ctx.mode === "zone"
      ? "zone"
      : /tutorial/i.test(ctx.file.name || "")
        ? "tutorial"
        : "galaxy";
  }
  function overridden(app, id) {
    return !!(app.modEnabled && app.modProfile?.music?.some((r) => r.id === id));
  }
  function options(ctx) {
    return (ctx.app.data.music || []).map((row) => {
      if (row.id !== 56 || overridden(ctx.app, 56)) return row;
      return {
        ...row,
        name:
          mode(ctx) === "galaxy"
            ? "Default → The Great Expectation (Galaxy)"
            : mode(ctx) === "tutorial"
              ? "Select Randomly (Tutorial)"
              : "Automatic (Battle Zone controls music)",
      };
    });
  }
  function label(ctx, id) {
    if (mode(ctx) === "zone") return "Automatic (Battle Zone)";
    return options(ctx).find((r) => r.id === id)?.name || "Music " + id;
  }
  function help(ctx, id) {
    if (mode(ctx) === "zone")
      return (
        "Stock Battle Zone chooses music from its own stage-type pools, with special last-zone tracks. The stored MMD value (" +
        id +
        ") is preserved but is not read to select the song. Changing +0x20 alone does not force a different track."
      );
    if (overridden(ctx.app, id))
      return "Mod-supplied music label. A modded executable or audio table can change the stock selector behavior.";
    if (id === 56)
      return mode(ctx) === "galaxy"
        ? "Galaxy converts 56 to selector 6, The Great Expectation. It does not request a random song here."
        : "Tutorial passes 56 to the audio resolver, which chooses among the 56 resident music entries (0–55).";
    return (
      ctx.app.data.music?.find((r) => r.id === id)?.description ||
      "Unlisted selector. Its behavior depends on the game's music tables."
    );
  }
  R.Music = { mode, options, label, help };
})(globalThis);
