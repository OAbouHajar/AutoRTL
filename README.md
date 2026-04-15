<p align="center">
  <img src="icons/icon128.png" width="80" alt="AutoRTL icon" />
</p>

<h1 align="center">AutoRTL</h1>

<p align="center">
  <strong>Automatically fix Arabic &amp; RTL text direction across all websites.</strong><br />
  A Chrome Extension (Manifest V3) that detects Arabic text and switches inputs, textareas, contenteditable elements, and displayed content to RTL — instantly.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/manifest-v3-blue.svg" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/chrome-extension-yellow.svg" alt="Chrome Extension" />
</p>

---

## Features

- **Auto-detect Arabic** — regex-based detection for Arabic, Persian, and Urdu scripts
- **Fix inputs & outputs** — works on `<input>`, `<textarea>`, `[contenteditable]`, paragraphs, headings, lists, and more
- **MutationObserver** — handles dynamically loaded content (React, chat apps, SPAs)
- **Smart behavior** — only changes direction after typing; never touches empty fields
- **Mixed text support** — `unicode-bidi: plaintext` ensures Arabic + English renders correctly
- **Custom Arabic fonts** — choose from 10 popular Google Arabic fonts (Cairo, Amiri, Tajawal, etc.)
- **3 modes** — Auto (default), Force RTL, Force LTR
- **Floating toggle** — draggable on-page button to cycle modes
- **Popup settings** — enable/disable, mode selector, font picker with live preview
- **Persistent settings** — saved via `chrome.storage.local`
- **Works everywhere** — ChatGPT, Claude, WhatsApp Web, Google Docs, and all websites

## Installation

### From source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/OAbouHajar/AutoRTL.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the cloned `AutoRTL` folder
6. Done! The extension icon appears in the toolbar

### From Chrome Web Store

> Coming soon.

## Usage

1. **Navigate** to any website with Arabic text
2. **Type Arabic** in any input field — direction switches to RTL automatically
3. **Displayed text** containing Arabic is also fixed on page load
4. Click the **floating toggle** (bottom-right) to cycle: Auto → Force RTL → Force LTR
5. Click the **extension icon** in the toolbar to open settings:
   - Enable/disable the extension
   - Choose direction mode
   - Select a custom Arabic font
   - View live stats

## Project Structure

```
AutoRTL/
├── manifest.json       # Chrome Extension manifest (v3)
├── content.js          # Core logic (direction detection, DOM scanning, MutationObserver)
├── style.css           # Floating toggle button styles
├── popup.html          # Settings popup UI
├── popup.js            # Popup logic & settings management
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── LICENSE             # MIT License
├── README.md
├── CONTRIBUTING.md
└── .gitignore
```

## Supported Fonts

| Font | Style |
|------|-------|
| Noto Naskh Arabic | Serif (Naskh) |
| Amiri | Serif (Naskh) |
| Cairo | Sans-serif |
| Tajawal | Sans-serif |
| IBM Plex Sans Arabic | Sans-serif |
| Readex Pro | Sans-serif |
| Noto Kufi Arabic | Sans-serif (Kufi) |
| Almarai | Sans-serif |
| Scheherazade New | Serif (Naskh) |
| Lateef | Serif (Nastaliq) |

Fonts are loaded on-demand from Google Fonts only when selected.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Author

**OAbouHajar**

- GitHub: [@OAbouHajar](https://github.com/OAbouHajar)
- Facebook: [oabouhajar](https://www.facebook.com/oabouhajar/)

## License

This project is licensed under the [MIT License](LICENSE).
