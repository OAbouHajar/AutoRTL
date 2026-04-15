/**
 * RTL Fixer — Popup Script (v2)
 * Premium UI interactions, settings sync, and live stats.
 */
(() => {
  "use strict";

  // ── DOM ──
  const togglePill   = document.getElementById("togglePill");
  const toggleLabel  = document.getElementById("toggleLabel");
  const statusDot    = document.getElementById("statusDot");
  const statusText   = document.getElementById("statusText");
  const modeBtns     = document.querySelectorAll(".mode-btn");
  const fontChips    = document.querySelectorAll(".font-chip");
  const fontPreview  = document.getElementById("fontPreview");
  const statFixed    = document.getElementById("statFixed");
  const statInputs   = document.getElementById("statInputs");
  const statMode     = document.getElementById("statMode");

  const MODE_DISPLAY = { auto: "Auto", "force-rtl": "RTL", "force-ltr": "LTR" };
  const STATUS_MSG   = {
    auto:      "Auto-detecting Arabic text",
    "force-rtl": "RTL applied to all elements",
    "force-ltr": "LTR applied to all elements",
  };

  let isEnabled   = true;
  let currentMode = "auto";
  let currentFont = "";

  // ── UI updaters ──

  function updateToggleUI() {
    togglePill.classList.toggle("on", isEnabled);
    toggleLabel.textContent = isEnabled ? "Active" : "Paused";
    toggleLabel.classList.toggle("off", !isEnabled);
    statusDot.classList.toggle("off", !isEnabled);
    statusText.textContent = isEnabled
      ? STATUS_MSG[currentMode]
      : "Extension paused";
  }

  function updateModeUI() {
    modeBtns.forEach((b) =>
      b.classList.toggle("active", b.dataset.mode === currentMode)
    );
    statMode.textContent = MODE_DISPLAY[currentMode] || "Auto";
    if (isEnabled) statusText.textContent = STATUS_MSG[currentMode];
  }

  function updateFontUI() {
    fontChips.forEach((c) =>
      c.classList.toggle("active", c.dataset.font === currentFont)
    );
    applyPreviewFont();
  }

  function applyPreviewFont() {
    if (currentFont) {
      fontPreview.style.fontFamily = currentFont;
      loadGoogleFont(currentFont);
    } else {
      fontPreview.style.removeProperty("font-family");
    }
  }

  function loadGoogleFont(fontValue) {
    const name = fontValue.split(",")[0].replace(/'/g, "").trim();
    if (!name) return;
    // Avoid duplicates
    if (document.querySelector(`link[href*="${encodeURIComponent(name)}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }

  // ── Load saved settings ──

  chrome.storage.local.get(
    { rtlFixerEnabled: true, rtlFixerMode: "auto", rtlFixerFont: "" },
    (data) => {
      isEnabled   = data.rtlFixerEnabled;
      currentMode = data.rtlFixerMode;
      currentFont = data.rtlFixerFont || "";
      updateToggleUI();
      updateModeUI();
      updateFontUI();
    }
  );

  // ── Stats ──

  function requestStats() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "rtl-fixer-get-state" },
        (resp) => {
          if (chrome.runtime.lastError || !resp) return;
          if (typeof resp.fixedCount === "number") statFixed.textContent = resp.fixedCount;
          if (typeof resp.inputCount === "number") statInputs.textContent = resp.inputCount;
        }
      );
    });
  }
  requestStats();

  // ── Push to content script ──

  function pushUpdate() {
    chrome.storage.local.set({
      rtlFixerEnabled: isEnabled,
      rtlFixerMode: currentMode,
      rtlFixerFont: currentFont,
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          type: "rtl-fixer-update",
          enabled: isEnabled,
          mode: currentMode,
          font: currentFont,
        },
        () => void chrome.runtime.lastError
      );
    });

    setTimeout(requestStats, 350);
  }

  // ── Events ──

  // Toggle
  togglePill.addEventListener("click", () => {
    isEnabled = !isEnabled;
    updateToggleUI();
    pushUpdate();
  });

  // Mode buttons
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentMode = btn.dataset.mode;
      updateModeUI();
      pushUpdate();
    });
  });

  // Font chips
  fontChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      currentFont = chip.dataset.font;
      updateFontUI();
      pushUpdate();
    });
  });
})();
