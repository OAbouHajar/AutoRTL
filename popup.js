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
  const statFixed = document.getElementById("statFixed");
  const statInputs = document.getElementById("statInputs");
  const statMode = document.getElementById("statMode");
  const reloadLink = document.getElementById("reloadLink");

  const MODE_DISPLAY = { auto: "Auto", "force-rtl": "RTL", "force-ltr": "LTR" };

  let currentMode = "auto";

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
    { rtlFixerEnabled: true, rtlFixerMode: "auto" },
    (data) => {
      enableToggle.checked = data.rtlFixerEnabled;
      currentMode = data.rtlFixerMode;
      updateStatusUI(data.rtlFixerEnabled);
      updateModeUI(data.rtlFixerMode);
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
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "rtl-fixer-update", enabled: isEnabled, mode: currentMode },
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

  reloadLink.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
    });
    window.close();
  });
})();
