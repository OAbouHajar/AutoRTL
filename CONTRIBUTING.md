# Contributing to AutoRTL

Thank you for your interest in contributing! Here's how you can help.

## Getting Started

1. **Fork** this repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/AutoRTL.git
   cd AutoRTL
   ```
3. **Load** the extension in Chrome:
   - Go to `chrome://extensions`
   - Enable Developer Mode
   - Click "Load unpacked" and select the project folder
4. Make your changes and **test** on various websites

## How to Contribute

### Reporting Bugs

- Open an [issue](https://github.com/OAbouHajar/AutoRTL/issues)
- Include: browser version, website URL, steps to reproduce, expected vs. actual behavior
- Screenshots or screen recordings are very helpful

### Suggesting Features

- Open an issue with the `enhancement` label
- Describe the use case and expected behavior

### Submitting Code

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Make your changes
3. Test on at least 3 different websites (one should be a chat app like ChatGPT or WhatsApp Web)
4. Commit with a clear message:
   ```bash
   git commit -m "Add: brief description of change"
   ```
5. Push and open a Pull Request against `main`

## Code Style

- **ES6+** — use `const`/`let`, arrow functions, template literals
- **IIFE pattern** — all content script code inside `(() => { ... })()`
- **No global variables** — everything stays scoped
- **Comments** — add JSDoc for functions, inline comments for non-obvious logic
- **No dependencies** — pure vanilla JS, no external libraries in the extension bundle

## Architecture Overview

| File | Purpose |
|------|---------|
| `content.js` | Injected into all pages. Handles direction detection, DOM scanning, MutationObserver, floating toggle, font loading, and communication with popup. |
| `popup.html/js` | Extension popup UI. Reads/writes settings to `chrome.storage.local` and sends messages to the content script. |
| `style.css` | Styles for the floating toggle button injected into pages. |
| `manifest.json` | Extension metadata, permissions, and content script registration. |

## Testing Checklist

- [ ] Type Arabic text in an `<input>` — direction switches to RTL
- [ ] Type English text — direction switches back to LTR
- [ ] Mixed Arabic + English renders correctly
- [ ] Works on dynamically loaded inputs (e.g., ChatGPT, WhatsApp Web)
- [ ] Floating toggle cycles modes correctly
- [ ] Popup settings persist after page reload
- [ ] Font selector applies the chosen font to Arabic text
- [ ] Extension can be disabled/enabled without page reload
- [ ] No console errors

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
