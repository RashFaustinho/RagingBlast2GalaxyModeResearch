/* The game's loose localization members: BOM + UTF-16LE + trailing NULs. */
(function (g) {
  "use strict";
  const R = (g.RB2 = g.RB2 || {});
  const languages = {
    US: "English",
    IT: "Italian",
    FR: "French",
    DE: "German",
    SP: "Spanish",
    JP: "Japanese",
  };
  function identify(name) {
    const m = /^TUTO_(\d{3,5})_(US|IT|FR|DE|SP|JP)\.txt$/i.exec(name);
    return m ? { id: Number(m[1]), language: m[2].toUpperCase() } : null;
  }
  class LocalizedTextDocument {
    constructor(source) {
      const bytes = source instanceof Uint8Array ? source.slice() : new Uint8Array(source);
      if (
        bytes.length < 4 ||
        bytes.length > 128 * 1024 ||
        bytes.length % 2 ||
        bytes[0] !== 255 ||
        bytes[1] !== 254
      )
        throw Error("Expected a UTF-16LE text member with BOM (maximum 128 KiB).");
      let end = bytes.length;
      while (end > 2 && bytes[end - 1] === 0 && bytes[end - 2] === 0) end -= 2;
      if (end === bytes.length) throw Error("Localized game text needs a trailing NUL terminator.");
      this.trailing = bytes.length - end;
      this.text = new TextDecoder("utf-16le", { fatal: true, ignoreBOM: true }).decode(
        bytes.subarray(2, end),
      );
      this.kind = "tutorialText";
      this.count = 1;
      this.setText(this.text);
    }
    setText(text) {
      if (
        typeof text !== "string" ||
        text.includes("\0") ||
        (text.length + 1) * 2 + this.trailing > 128 * 1024
      )
        throw Error("Text must not contain NULs or exceed 128 KiB.");
      // Reject unpaired surrogates instead of writing ill-formed UTF-16.
      for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdbff) {
          const next = text.charCodeAt(++i);
          if (!(next >= 0xdc00 && next <= 0xdfff)) throw Error("Invalid Unicode surrogate.");
        } else if (c >= 0xdc00 && c <= 0xdfff) throw Error("Invalid Unicode surrogate.");
      }
      this.text = text;
    }
    encode() {
      this.setText(this.text);
      const b = new Uint8Array(2 + this.text.length * 2 + this.trailing),
        v = new DataView(b.buffer);
      b.set([255, 254]);
      for (let i = 0; i < this.text.length; i++)
        v.setUint16(2 + i * 2, this.text.charCodeAt(i), true);
      return b;
    }
  }
  R.LocalizedText = { identify, languages };
  R.LocalizedTextDocument = LocalizedTextDocument;
})(globalThis);
