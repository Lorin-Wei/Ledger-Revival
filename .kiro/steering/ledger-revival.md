# Ledger Revival — project rules

These rules are hard constraints. Every change must keep them true.

## Privacy (core promise)
- No network requests of any kind with user data. Do not add `fetch`, XHR, WebSocket, `sendBeacon`, analytics, or remote fonts.
- Keep the CSP in `index.html` intact: `connect-src 'none'`, `form-action 'none'`, scripts and styles from `'self'` only.
- Never write user data to localStorage, sessionStorage, IndexedDB, or cookies.
- Render user text only with `textContent` / `createTextNode`. Never use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write` with user data.

## Stack
- Plain HTML, CSS, JavaScript. No build step, no framework, no backend, no API keys.
- At most two lightweight CDN libraries in total (currently zero; prefer keeping it zero).
- Use classic `<script>` files sharing the `window.LR` namespace, not ES modules, so `index.html` works from `file://`.
- All asset paths are relative so the app works on a GitHub Pages sub-path.

## Scope
- Out of scope: login, cloud sync, OCR / image recognition.
- Fields are fixed: date, party (单位/对象), item (事项), amount, status, owner (责任人).

## Code conventions
- `js/parser.js`, `js/csv.js`, `js/filter.js` are pure: no DOM, no globals besides `LR`. Only `js/app.js` touches the DOM.
- Comments in Chinese; identifiers in English.
- Sample data must be synthetic.

## Verification
- Run `pwsh tests/run.ps1` and `pwsh tests/run-ui.ps1`; both must print `PASS`.
- New parsing behaviour needs a test case in `tests/tests.js`.
