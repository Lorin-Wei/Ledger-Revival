# Implementation Plan

- [x] 1. Project skeleton and privacy shell
  - Create `index.html` with the CSP meta tag, layout regions, and the privacy notice; `css/style.css`; empty `LR` namespace scripts.
  - _Requirements: 6.2, 6.5, 7.3_

- [x] 2. CSV module (`js/csv.js`)
  - `decode` (UTF-8 with fatal fallback to GBK), `detectDelimiter`, RFC 4180 `parse`, `recordsToCSV` with BOM, quoting, and formula-injection guard.
  - _Requirements: 2.1, 2.2, 2.3, 5.2, 5.3, 5.4_

- [x] 3. Parser module (`js/parser.js`)
  - [x] 3.1 Pre-processing, tokeniser, and header detection / column mapping.
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.4, 2.5_
  - [x] 3.2 Field detectors: labels, date (with calendar validation and year inference), amount, status normalisation, owner, party, item; uncertainty flags.
    - _Requirements: 3.1–3.9_
  - [x] 3.3 `parseText` and `parseRows` entry points, deterministic with `opts.year`.
    - _Requirements: 3.10_

- [x] 4. Filter module (`js/filter.js`)
  - Haystack index, multi-term keyword AND, date/amount ranges, dropdown equality, item contains, distinct values, sum.
  - _Requirements: 4.3, 4.4, 4.5, 4.6_

- [x] 5. UI wiring (`js/app.js`)
  - Revive / sample / CSV import / clear actions; status messages.
  - Table rendering with uncertainty marks, status chips, DOM-built highlights, 500-row paging.
  - Filter controls, stats line, clear filters, export button state and download.
  - _Requirements: 1.4, 4.1, 4.2, 4.6, 4.7, 4.8, 5.1, 5.5, 6.3, 6.4_

- [x] 6. Synthetic samples
  - `js/sample.js` mixed-format text; `samples/legacy-export.csv` with header, quoted commas, and an embedded newline.
  - _Requirements: 1.4, 7.4_

- [x] 7. Headless test suite
  - `tests/index.html`, `tests/tests.js`, `tests/run.ps1`; cover every detector, CSV round-trip, export escaping, filters, and the full sample.
  - _Requirements: all parsing, CSV, and filter criteria_

- [x] 8. Documentation and release
  - Single-page `README.md` (purpose, usage, formats, privacy, local use, GitHub Pages), MIT `LICENSE`, `.nojekyll`.
  - _Requirements: 7.1, 7.2, 7.3_
