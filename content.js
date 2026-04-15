/**
 * RTL Fixer — Content Script
 * Automatically detects Arabic text in input fields, textareas,
 * contenteditable elements, AND displayed text across all websites.
 * Wrapped in an IIFE to avoid global scope pollution.
 */
(() => {
  "use strict";

  // ──────────────────────────────────────────────
  //  Constants
  // ──────────────────────────────────────────────

  /** Regex matching Arabic / Persian / Urdu Unicode block characters */
  const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  /** Attribute flag to mark elements we have processed */
  const MARKER = "data-rtl-fixer";

  /** Selector for text-entry elements (inputs) */
  const INPUT_SELECTOR = [
    'input[type="text"]',
    'input[type="search"]',
    'input[type="email"]',
    'input[type="url"]',
    "input:not([type])",
    "textarea",
    '[contenteditable="true"]',
    '[contenteditable=""]',
    "[contenteditable=plaintext-only]",
  ].join(",");

  /** Selector for text-display elements (output / content) */
  const TEXT_SELECTOR = [
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "li", "td", "th", "blockquote", "figcaption",
    "dt", "dd", "label", "legend", "caption",
    "summary", "pre",
  ].join(",");

  /** Tags to skip entirely */
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "SVG", "MATH",
    "CODE", "KBD", "SAMP", "VAR",
  ]);

  // ──────────────────────────────────────────────
  //  State
  // ──────────────────────────────────────────────

  let enabled = true;

  /**
   * Direction mode:
   *   "auto"      – detect per-element (default)
   *   "force-rtl" – always RTL
   *   "force-ltr" – always LTR
   */
  let mode = "auto";

  /** Custom Arabic font (empty string = page default) */
  let customFont = "";

  /** WeakSet to avoid duplicate input listeners */
  const trackedInputs = new WeakSet();

  // ──────────────────────────────────────────────
  //  Direction detection & application
  // ──────────────────────────────────────────────

  /**
   * Check if a string contains Arabic characters.
   * @param {string} text
   * @returns {boolean}
   */
  function hasArabic(text) {
    return ARABIC_RE.test(text);
  }

  /**
   * Get best direction for a string.
   * @param {string} text
   * @returns {"rtl"|"ltr"}
   */
  function detectDirection(text) {
    return hasArabic(text) ? "rtl" : "ltr";
  }

  /**
   * Read the visible text from an element.
   * @param {HTMLElement} el
   * @returns {string}
   */
  function getText(el) {
    if (el.isContentEditable) return el.textContent || "";
    if ("value" in el) return el.value || "";
    return el.textContent || "";
  }

  /**
   * Check if an element is an editable field (input, textarea, contenteditable).
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isEditable(el) {
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  /**
   * Check if an element is inside a contenteditable ancestor.
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isInsideEditable(el) {
    let parent = el.parentElement;
    while (parent) {
      if (parent.isContentEditable) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  /**
   * Apply direction styles to an element.
   * For editable elements (input/textarea/contenteditable), only CSS is used
   * to avoid disrupting cursor position or causing re-renders.
   * For display elements, the `dir` HTML attribute is also set.
   * @param {HTMLElement} el
   * @param {"rtl"|"ltr"} dir
   */
  function setDir(el, dir) {
    // Skip if direction already matches — prevents cursor jumps
    if (el.style.direction === dir && !customFont) return;

    const editable = isEditable(el);

    // For display elements, set the dir attribute (safe, not actively edited)
    if (!editable) {
      el.setAttribute("dir", dir);
    }

    // CSS properties — safe for all elements
    el.style.direction = dir;
    el.style.textAlign = dir === "rtl" ? "right" : "left";

    // unicode-bidi: plaintext breaks cursor in <input>/<textarea>
    if (!editable) {
      el.style.unicodeBidi = "plaintext";
    }

    // Apply custom font when direction is RTL and a font is selected
    if (dir === "rtl" && customFont) {
      el.style.fontFamily = customFont;
    } else if (!customFont) {
      el.style.removeProperty("font-family");
    }
  }

  /**
   * Apply the correct direction to an input element based on mode & content.
   * @param {HTMLElement} el
   */
  function applyDirection(el) {
    if (!enabled) return;

    const text = getText(el);
    if (text.trim().length === 0) return;

    let dir;
    if (mode === "force-rtl") dir = "rtl";
    else if (mode === "force-ltr") dir = "ltr";
    else dir = detectDirection(text);

    setDir(el, dir);
  }

  /**
   * Reset inlined direction styles.
   * @param {HTMLElement} el
   */
  function resetDirection(el) {
    if (!isEditable(el)) {
      el.removeAttribute("dir");
    }
    el.style.removeProperty("direction");
    el.style.removeProperty("text-align");
    el.style.removeProperty("unicode-bidi");
    el.style.removeProperty("font-family");
  }

  // ──────────────────────────────────────────────
  //  Input elements — listener-based
  // ──────────────────────────────────────────────

  /**
   * Attach an input listener to an editable element.
   * @param {HTMLElement} el
   */
  function attachInputListener(el) {
    if (trackedInputs.has(el)) return;
    trackedInputs.add(el);
    el.setAttribute(MARKER, "input");

    el.addEventListener("input", () => applyDirection(el), { passive: true });
  }

  /**
   * Scan a root node for input elements and attach listeners.
   * @param {ParentNode} root
   */
  function scanInputs(root) {
    if (!root || !root.querySelectorAll) return;

    if (root instanceof HTMLElement && root.matches?.(INPUT_SELECTOR)) {
      attachInputListener(root);
    }
    root.querySelectorAll(INPUT_SELECTOR).forEach(attachInputListener);
  }

  // ──────────────────────────────────────────────
  //  Display / output elements — direct scan
  // ──────────────────────────────────────────────

  /**
   * Check if an element contains direct (non-nested) text.
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function hasDirectText(el) {
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Fix direction on a semantic text-display element (p, h1-h6, li, etc.).
   * @param {HTMLElement} el
   */
  function fixTextElement(el) {
    if (!enabled) return;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.id === "rtl-fixer-toggle") return;
    // Never touch elements that are inside a contenteditable — this disrupts cursor
    if (el.isContentEditable || isInsideEditable(el)) return;

    const text = el.textContent || "";
    if (text.trim().length === 0) return;

    let dir;
    if (mode === "force-rtl") dir = "rtl";
    else if (mode === "force-ltr") dir = "ltr";
    else if (hasArabic(text)) dir = "rtl";
    else return; // auto mode: don't touch pure-LTR elements

    setDir(el, dir);
    el.setAttribute(MARKER, "text");
  }

  /**
   * Fix direction on generic divs/spans that directly hold Arabic text.
   * Only targets "leaf" blocks that have their own text content.
   * @param {HTMLElement} el
   */
  function fixGenericBlock(el) {
    if (!enabled) return;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.id === "rtl-fixer-toggle") return;
    if (el.getAttribute(MARKER)) return; // already processed
    // Never touch elements that are inside a contenteditable
    if (el.isContentEditable || isInsideEditable(el)) return;
    if (!hasDirectText(el)) return;

    const text = el.textContent || "";
    if (text.trim().length === 0) return;
    if (mode === "auto" && !hasArabic(text)) return;

    let dir;
    if (mode === "force-rtl") dir = "rtl";
    else if (mode === "force-ltr") dir = "ltr";
    else dir = "rtl";

    setDir(el, dir);
    el.setAttribute(MARKER, "text");
  }

  /**
   * Scan a root node for display elements and fix their direction.
   * @param {ParentNode} root
   */
  function scanTextElements(root) {
    if (!root || !root.querySelectorAll) return;

    // Fix semantic text elements (p, h1-h6, li, etc.)
    root.querySelectorAll(TEXT_SELECTOR).forEach(fixTextElement);

    // Fix divs/spans that directly contain Arabic text
    root.querySelectorAll("div, span").forEach(fixGenericBlock);

    // The root itself
    if (root instanceof HTMLElement) {
      if (root.matches?.(TEXT_SELECTOR)) fixTextElement(root);
      else if (root.matches?.("div, span")) fixGenericBlock(root);
    }
  }

  /**
   * Full scan — inputs + display text.
   * @param {ParentNode} root
   */
  function fullScan(root) {
    scanInputs(root);
    scanTextElements(root);
  }

  // ──────────────────────────────────────────────
  //  Re-apply / reset all
  // ──────────────────────────────────────────────

  function reapplyAll() {
    // Re-fix tracked inputs
    document.querySelectorAll(`[${MARKER}="input"]`).forEach((el) => {
      enabled ? applyDirection(el) : resetDirection(el);
    });

    // Re-fix or reset text elements
    document.querySelectorAll(`[${MARKER}="text"]`).forEach((el) => {
      if (enabled) {
        fixTextElement(el);
      } else {
        resetDirection(el);
        el.removeAttribute(MARKER);
      }
    });

    // Re-scan everything when re-enabled or mode changes
    if (enabled) scanTextElements(document.body);
  }

  // ──────────────────────────────────────────────
  //  MutationObserver
  // ──────────────────────────────────────────────

  let scanTimer = null;

  /** Debounced full scan — batches rapid DOM changes. */
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      fullScan(document.body);
    }, 200);
  }

  const observer = new MutationObserver((mutations) => {
    let needsBroadScan = false;

    for (const mutation of mutations) {
      // New child nodes added
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            fullScan(node);
          }
        }
        needsBroadScan = true;
      }

      // contenteditable attribute changed
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "contenteditable"
      ) {
        const el = mutation.target;
        if (el instanceof HTMLElement) {
          const val = el.getAttribute("contenteditable");
          if (val === "true" || val === "" || val === "plaintext-only") {
            attachInputListener(el);
          }
        }
      }

      // Text content changed — only care about display text, not user typing.
      // Skip if the mutation is inside a contenteditable (user is typing).
      if (mutation.type === "characterData") {
        const target = mutation.target.parentElement;
        if (target && !target.isContentEditable && !isInsideEditable(target)) {
          needsBroadScan = true;
        }
      }
    }

    if (needsBroadScan) scheduleScan();
  });

  // ──────────────────────────────────────────────
  //  Google Fonts loader
  // ──────────────────────────────────────────────

  const loadedFonts = new Set();

  /**
   * Inject a Google Fonts stylesheet for the given font family.
   * Only loads each font once.
   * @param {string} fontValue  e.g. "'Cairo', sans-serif"
   */
  function ensureFontLoaded(fontValue) {
    if (!fontValue) return;
    // Extract the font name from the CSS value, e.g. "'Cairo', sans-serif" -> "Cairo"
    const name = fontValue.split(",")[0].replace(/'/g, "").trim();
    if (!name || loadedFonts.has(name)) return;
    loadedFonts.add(name);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }

  // ──────────────────────────────────────────────
  //  Settings persistence
  // ──────────────────────────────────────────────

  function saveSettings() {
    try {
      chrome.storage.local.set({
        rtlFixerEnabled: enabled,
        rtlFixerMode: mode,
        rtlFixerFont: customFont,
      });
    } catch { /* not available */ }
  }

  function loadSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(
          { rtlFixerEnabled: true, rtlFixerMode: "auto", rtlFixerFont: "" },
          (data) => {
            enabled = data.rtlFixerEnabled;
            mode = data.rtlFixerMode;
            customFont = data.rtlFixerFont || "";
            if (customFont) ensureFontLoaded(customFont);
            resolve();
          }
        );
      } catch { resolve(); }
    });
  }

  // ──────────────────────────────────────────────
  //  Message listener (popup ↔ content)
  // ──────────────────────────────────────────────

  try {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === "rtl-fixer-update") {
        if (typeof msg.enabled === "boolean") enabled = msg.enabled;
        if (msg.mode) mode = msg.mode;
        if (typeof msg.font === "string") {
          customFont = msg.font;
          if (customFont) ensureFontLoaded(customFont);
        }

        reapplyAll();
        sendResponse({ ok: true });
      }

      if (msg.type === "rtl-fixer-get-state") {
        // Gather live stats for the popup
        const fixedCount = document.querySelectorAll(`[${MARKER}="text"]`).length;
        const inputCount = document.querySelectorAll(`[${MARKER}="input"]`).length;
        sendResponse({ enabled, mode, fixedCount, inputCount });
      }
    });
  } catch { /* not in extension context */ }

  // ──────────────────────────────────────────────
  //  Initialisation
  // ──────────────────────────────────────────────

  async function init() {
    await loadSettings();

    // Full initial scan — inputs AND display text
    fullScan(document);

    // Observe future DOM changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["contenteditable"],
      characterData: true,
    });
  }

  init();
})();