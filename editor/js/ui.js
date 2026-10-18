/* Shared browser element factory. Binary document modules do not depend on the DOM. */
(function (global) {
  "use strict";
  const R = (global.RB2 = global.RB2 || {});
  R.VERSION = document.querySelector('meta[name="application-version"]').content;
  R.BUILD = document.querySelector('meta[name="application-build"]')?.content || "release";
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function")
        node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key in node && key !== "list") node[key] = value;
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child != null && child !== false)
        node.append(child instanceof Node ? child : String(child));
    }
    return node;
  }
  R.ui = { el };
})(globalThis);
