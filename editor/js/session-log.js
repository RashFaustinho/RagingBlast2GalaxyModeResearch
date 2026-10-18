/* Bounded, local diagnostics. No game bytes, text contents or network uploads. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {});
  function safe(value, seen = new Set(), depth = 0) {
    if (value instanceof Error)
      return { name: value.name, message: safe(value.message), stack: safe(value.stack || "") };
    if (typeof value === "string")
      return value
        .replace(/(?:file:\/\/\/|https?:\/\/)[^\s)]+/g, (s) => s.split(/[\\/]/).pop())
        .slice(0, 2000);
    if (value == null || typeof value === "boolean" || typeof value === "number") return value;
    if (typeof value !== "object") return String(value).slice(0, 200);
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer)
      return { omittedBinaryBytes: value.byteLength };
    if (depth >= 4 || seen.has(value)) return "[omitted]";
    seen.add(value);
    const result = Array.isArray(value)
      ? value.slice(0, 50).map((v) => safe(v, seen, depth + 1))
      : Object.fromEntries(
          Object.entries(value)
            .slice(0, 30)
            .map(([k, v]) => [k, safe(v, seen, depth + 1)]),
        );
    seen.delete(value);
    return result;
  }
  class SessionLog {
    constructor(limit = 2000) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw Error("Invalid log limit.");
      this.limit = limit;
      this.startedUTC = new Date().toISOString();
      this.events = [];
      this.dropped = 0;
      this.sequence = 0;
    }
    record(event, details = {}, level = "info") {
      // Diagnostics must never interrupt an edit, even with unusual error metadata.
      try {
        this.events.push({
          sequence: ++this.sequence,
          utc: new Date().toISOString(),
          level: ["info", "warning", "error"].includes(level) ? level : "info",
          event: safe(String(event)),
          details: safe(details),
        });
        if (this.events.length > this.limit) {
          this.events.shift();
          this.dropped++;
        }
      } catch (_) {}
    }
    report(context = {}) {
      return JSON.parse(
        JSON.stringify({
          format: "RB2-Galaxy-Studio-Session-Log",
          version: 1,
          editorVersion: R.VERSION || "development",
          editorBuild: R.BUILD || "development",
          startedUTC: this.startedUTC,
          exportedUTC: new Date().toISOString(),
          droppedEvents: this.dropped,
          context: safe(context),
          events: this.events,
        }),
      );
    }
  }
  R.SessionLog = SessionLog;
  R.sessionLog = new SessionLog();
  R.sessionLog.record("session.started");
  if (g.addEventListener) {
    g.addEventListener(
      "error",
      (e) => {
        R.sessionLog.record(
          "runtime.error",
          {
            error: e.error || e.message || "Resource could not load",
            source: (e.filename || e.target?.src || e.target?.href || "").split(/[\\/]/).pop(),
            line: e.lineno,
            column: e.colno,
          },
          "error",
        );
      },
      true,
    );
    g.addEventListener("unhandledrejection", (e) =>
      R.sessionLog.record("runtime.unhandledrejection", { error: e.reason }, "error"),
    );
  }
})(globalThis);
