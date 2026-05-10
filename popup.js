/**
 * AutoRTL — Popup Script (v3)
 * Premium UI interactions, settings sync, live stats, and site exclusion management.
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

  // Exclusion DOM
  const excludeHostname = document.getElementById("excludeHostname");
  const excludeBtn      = document.getElementById("excludeBtn");
  const excludeBtnIcon  = document.getElementById("excludeBtnIcon");
  const excludeBtnText  = document.getElementById("excludeBtnText");
  const excludedList    = document.getElementById("excludedList");
  const excludedEmpty   = document.getElementById("excludedEmpty");
  const clearAllBtn     = document.getElementById("clearAllBtn");

  const MODE_DISPLAY = { auto: "Auto", "force-rtl": "RTL", "force-ltr": "LTR" };
  const STATUS_MSG   = {
    auto:      "Auto-detecting Arabic text",
    "force-rtl": "RTL applied to all elements",
    "force-ltr": "LTR applied to all elements",
  };

  let isEnabled   = true;
  let currentMode = "auto";
  let currentFont = "";
  let currentHostname = "";
  let isCurrentSiteExcluded = false;
  let excludedSites = [];

  // ── UI updaters ──

  function updateToggleUI() {
    togglePill.classList.toggle("on", isEnabled);
    toggleLabel.textContent = isEnabled ? "Active" : "Paused";
    toggleLabel.classList.toggle("off", !isEnabled);
    statusDot.classList.toggle("off", !isEnabled);

    if (isCurrentSiteExcluded) {
      statusText.textContent = "Excluded — site skipped";
      statusDot.classList.add("off");
    } else {
      statusText.textContent = isEnabled
        ? STATUS_MSG[currentMode]
        : "Extension paused";
    }
  }

  function updateModeUI() {
    modeBtns.forEach((b) =>
      b.classList.toggle("active", b.dataset.mode === currentMode)
    );
    statMode.textContent = MODE_DISPLAY[currentMode] || "Auto";
    if (isEnabled && !isCurrentSiteExcluded) statusText.textContent = STATUS_MSG[currentMode];
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

  // ── Exclusion UI ──

  function updateExcludeUI() {
    excludeHostname.textContent = currentHostname || "—";
    isCurrentSiteExcluded = excludedSites.includes(currentHostname);

    if (isCurrentSiteExcluded) {
      excludeBtn.classList.add("restore");
      excludeBtnIcon.textContent = "✅";
      excludeBtnText.textContent = "Restore";
    } else {
      excludeBtn.classList.remove("restore");
      excludeBtnIcon.textContent = "🚫";
      excludeBtnText.textContent = "Exclude";
    }

    updateToggleUI();
    renderExcludedList();
  }

  function renderExcludedList() {
    // Remove all site items (keep the empty message)
    const items = excludedList.querySelectorAll(".excluded-item");
    items.forEach((item) => item.remove());

    if (excludedSites.length === 0) {
      excludedEmpty.classList.remove("hidden");
      clearAllBtn.classList.add("hidden");
      return;
    }

    excludedEmpty.classList.add("hidden");
    clearAllBtn.classList.remove("hidden");

    excludedSites.forEach((hostname) => {
      const item = document.createElement("div");
      item.className = "excluded-item";

      const label = document.createElement("span");
      label.className = "excluded-item-label";
      label.textContent = hostname;

      const restoreBtn = document.createElement("button");
      restoreBtn.className = "excluded-item-restore";
      restoreBtn.textContent = "✕";
      restoreBtn.title = `Restore ${hostname}`;
      restoreBtn.setAttribute("aria-label", `Restore ${hostname}`);
      restoreBtn.addEventListener("click", () => removeSiteFromExclusion(hostname));

      item.appendChild(label);
      item.appendChild(restoreBtn);
      excludedList.appendChild(item);
    });
  }

  // ── Exclusion logic ──

  function toggleCurrentSiteExclusion() {
    if (!currentHostname) return;

    if (isCurrentSiteExcluded) {
      excludedSites = excludedSites.filter((h) => h !== currentHostname);
    } else if (!excludedSites.includes(currentHostname)) {
      excludedSites.push(currentHostname);
    }

    chrome.storage.local.set({ autoRtlExcludedSites: excludedSites }, () => {
      updateExcludeUI();
      notifyContentScript();
    });
  }

  function removeSiteFromExclusion(hostname) {
    excludedSites = excludedSites.filter((h) => h !== hostname);
    chrome.storage.local.set({ autoRtlExcludedSites: excludedSites }, () => {
      updateExcludeUI();
      // Notify only if we removed the current site
      if (hostname === currentHostname) {
        notifyContentScript();
      }
    });
  }

  function clearAllExclusions() {
    excludedSites = [];
    chrome.storage.local.set({ autoRtlExcludedSites: [] }, () => {
      updateExcludeUI();
      notifyContentScript();
    });
  }

  function notifyContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "autortl-site-excluded" },
        () => void chrome.runtime.lastError
      );
    });
  }

  // ── Load saved settings ──

  function loadAll() {
    chrome.storage.local.get(
      { autoRtlEnabled: true, autoRtlMode: "auto", autoRtlFont: "", autoRtlExcludedSites: [] },
      (data) => {
        isEnabled     = data.autoRtlEnabled;
        currentMode   = data.autoRtlMode;
        currentFont   = data.autoRtlFont || "";
        excludedSites = data.autoRtlExcludedSites || [];
        updateToggleUI();
        updateModeUI();
        updateFontUI();
        loadCurrentTab();
      }
    );
  }

  function loadCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        try {
          currentHostname = new URL(tabs[0].url).hostname;
        } catch {
          currentHostname = "";
        }
      }
      updateExcludeUI();
    });
  }

  loadAll();

  // ── Stats ──

  function requestStats() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "autortl-get-state" },
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
      autoRtlEnabled: isEnabled,
      autoRtlMode: currentMode,
      autoRtlFont: currentFont,
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          type: "autortl-update",
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

  // Exclude button
  excludeBtn.addEventListener("click", toggleCurrentSiteExclusion);

  // Clear all exclusions
  clearAllBtn.addEventListener("click", clearAllExclusions);
})();
