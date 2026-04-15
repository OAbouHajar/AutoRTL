/**
 * RTL Fixer — Popup Script
 * Manages settings UI, persists to chrome.storage.local,
 * and syncs with the active tab's content script.
 */
(() => {
  "use strict";

  // ── DOM references ──
  const enableToggle = document.getElementById("enableToggle");
  const statusDot = document.getElementById("statusDot");
  const statusLabel = document.getElementById("statusLabel");
  const modeBtns = document.querySelectorAll(".mode-btn");
  const fontSelect = document.getElementById("fontSelect");
  const fontPreview = document.getElementById("fontPreview");
  const statFixed = document.getElementById("statFixed");
  const statInputs = document.getElementById("statInputs");
  const statMode = document.getElementById("statMode");
  const reloadLink = document.getElementById("reloadLink");

  const MODE_DISPLAY = { auto: "Auto", "force-rtl": "RTL", "force-ltr": "LTR" };

  let currentMode = "auto";
  let currentFont = "";

  // ── Update status indicator ──
  function updateStatusUI(isEnabled) {
    statusDot.classList.toggle("off", !isEnabled);
    statusLabel.textContent = isEnabled ? "Active" : "Disabled";
  }

  // ── Update mode buttons ──
  function updateModeUI(mode) {
    modeBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    statMode.textContent = MODE_DISPLAY[mode] || "Auto";
  }

  // ── Load settings into UI ──
  chrome.storage.local.get(
    { rtlFixerEnabled: true, rtlFixerMode: "auto", rtlFixerFont: "" },
    (data) => {
      enableToggle.checked = data.rtlFixerEnabled;
      currentMode = data.rtlFixerMode;
      currentFont = data.rtlFixerFont || "";
      updateStatusUI(data.rtlFixerEnabled);
      updateModeUI(data.rtlFixerMode);
      fontSelect.value = currentFont;
      updateFontPreview(currentFont);
    }
  );

  // ── Request stats from content script ──
  function requestStats() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "rtl-fixer-get-state" },
        (resp) => {
          if (chrome.runtime.lastError || !resp) return;
          // Update stats from content script counts
          if (typeof resp.fixedCount === "number") {
            statFixed.textContent = resp.fixedCount;
          }
          if (typeof resp.inputCount === "number") {
            statInputs.textContent = resp.inputCount;
          }
        }
      );
    });
  }
  requestStats();

  // ── Push settings to content script ──
  function pushUpdate() {
    const isEnabled = enableToggle.checked;
    updateStatusUI(isEnabled);

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

    // Refresh stats shortly after
    setTimeout(requestStats, 300);
  }

  // ── Event listeners ──
  enableToggle.addEventListener("change", pushUpdate);

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentMode = btn.dataset.mode;
      updateModeUI(currentMode);
      pushUpdate();
    });
  });

  // ── Font selector ──
  function updateFontPreview(fontValue) {
    if (fontValue) {
      fontPreview.style.fontFamily = fontValue;
      // Load Google Font in popup for preview
      const name = fontValue.split(",")[0].replace(/'/g, "").trim();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    } else {
      fontPreview.style.removeProperty("font-family");
    }
  }

  fontSelect.addEventListener("change", () => {
    currentFont = fontSelect.value;
    updateFontPreview(currentFont);
    pushUpdate();
  });

  reloadLink.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
    });
    window.close();
  });
})();
