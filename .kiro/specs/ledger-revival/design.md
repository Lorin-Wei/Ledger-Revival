# Design Document — Ledger Revival

## Overview

Ledger Revival is a static web app made of one HTML page, one stylesheet, and four classic scripts. It has no build step, no dependencies, and no network access. Parsing, filtering, and export are pure functions with no DOM access, so they can be tested headlessly. Only `app.js` touches the DOM.

```
index.html          page shell + Content Security Policy
css/style.css       dark "graveyard" theme
js/csv.js           CSV decode / parse / stringify          (LR.csv)
js/parser.js        ledger line → record                    (LR.parser)
js/filter.js        keyword + column filters, stats         (LR.filter)
js/sample.js        synthetic sample text                   (LR.sample)
js/app.js           UI wiring and rendering
samples/legacy-export.csv   synthetic CSV for the import demo
tests/index.html, tests/tests.js, tests/run.ps1   headless test suite
```

Classic scripts sharing a `window.LR` namespace are used instead of ES modules, because Chrome blocks module scripts on `file://`. This keeps "double-click `index.html`" working (Req 7.3).

## Data model

```js
Record = {
  id: number,            // 1-based, in input order
  date: string,          // 'YYYY-MM-DD' or ''
  party: string,         // 单位/对象
  item: string,          // 事项
  amount: number|null,
  status: string,        // canonical status, or raw text if unknown
  owner: string,         // 责任人
  raw: string,           // original line / row, untouched
  unsure: { date, party, item, amount, status, owner }  // booleans
}
```

## Parsing pipeline (`LR.parser`)

### Entry points

- `parseText(text, opts) → { records, headerFields, skipped }`. Splits the input into lines, skips blank and separator-only lines, detects an optional header on the first content line, then parses each line.
- `parseRows(rows, opts) → same shape`. Used for CSV rows. If the first row is a header, columns are mapped by name. Otherwise each row's cells are joined with tabs and parsed like a text line.
- `opts.year` sets the fallback year (default: current year), which makes tests deterministic (Req 3.10).

### Pre-processing (`prep`)

1. Full-width ASCII (`！`–`～`) to half-width, ideographic space to a normal space, zero-width characters removed.
2. Thousands separators removed (`12,500.00` → `12500.00`), so commas can safely act as field separators.
3. Currency prefixes glued to their numbers (`RMB 7800` → `RMB7800`).

### Header detection

A line or row is a header when at least 2 cells, and at least half of all cells, match a known column name (`LABELS` synonyms, with any parenthesised text stripped, e.g. `金额(元)` → `金额`). The result is an index → field map. In text mode, a data line is parsed by position only if it splits into the same number of cells as the header. Otherwise it falls back to heuristics.

### Line heuristics (`parseLine`)

1. **Labels.** Find every `label :|=` occurrence. Each value runs to the next label. Values go through the field-specific parser. Anything the parser does not consume goes back into the pool.
2. **Tokenise.** Split on strong separators (tab, `|`, `,`, `;`, `、`, or 2+ spaces). If that yields a single token, split on whitespace.
3. **Peel.** For each token, in this order, cut out the first:
   - date (patterns in Req 3.2, calendar-validated),
   - amount (whole-token bare number, or a number with a currency prefix or suffix),
   - status (exact token match: sure. Substring match of a distinctive keyword: unsure).

   Cut points become separators, so a no-separator line like `2026年10月23日华信会计师事务所年度审计费25000元已完成吴昊` breaks into `华信会计师事务所年度审计费` and `吴昊`.
4. **Owner.** First a piece with an owner label and no colon (`经办人周婷`). Otherwise the last piece matching surname + 1–2 Han characters, excluding a stop-list of common two-character words (`安装`, `管理`, …). Sure when it is the last of 2+ pieces, unsure otherwise.
5. **Party.** A piece (or a whitespace word inside one) ending in an organisation suffix: sure. Otherwise a piece with an embedded suffix followed by more text is split there (`市政工程处管道维修` → `市政工程处` + `管道维修`): unsure. Otherwise, if 2+ pieces remain, the first one: unsure.
6. **Item.** The remaining pieces, joined with a space.
7. Empty fields are marked unsure.

### Missing years (Req 3.3)

A parse-local context keeps `lastYear`, the year of the most recent full date. `M月D日` uses `lastYear`, else `opts.year`, and is always unsure.

### Status normalisation

A keyword table maps to 已完成 / 进行中 / 待处理 / 已取消 / 已逾期. Negative forms (`未完成`, `未结清`) are listed explicitly and matched longest-first, so they never resolve to their positive substrings. English keywords match whole tokens only. Short, ambiguous Chinese words (`完成`, `关闭`, `取消`) match whole tokens only, so item text such as `完成验收报告` is left alone.

## CSV (`LR.csv`)

- `decode(ArrayBuffer)`: `TextDecoder('utf-8', {fatal: true})`. On failure, `TextDecoder('gbk')`. The BOM is stripped.
- `detectDelimiter(text)`: over the first 10 lines (ignoring quoted content), pick the candidate among `,` `;` `\t` with the highest consistent per-line count.
- `parse(text, delimiter)`: an RFC 4180 state machine that handles quotes, `""`, and CR/LF inside quotes.
- `recordsToCSV(records)`: header row, `\r\n` line endings, a `\uFEFF` BOM, quoting where needed, and formula-injection guarding of text cells (Req 5.4). Amount is written as a plain number.

## Filtering (`LR.filter`)

- `index(records)` adds a lower-cased haystack per record (all fields + raw) once after parsing.
- `apply(records, state)` is a single linear pass: keyword terms (AND), then date range (string compare on ISO dates), exact-match dropdowns, item contains, and amount range. A record with no date or no amount is excluded when the matching range filter is set.
- `distinct(records, field)` returns option values sorted with `localeCompare('zh')`.
- `sum(records)` adds up the amounts.

## UI (`app.js`)

- Results render at most 500 rows at a time, with a "show more" button, so 5,000 records stay responsive (Req 4.8). Filtering always runs over all records, and export uses all filtered records.
- Keyword and text inputs are debounced (120 ms).
- Every cell is built with `textContent`. Highlights are `<mark>` elements created through the DOM API, never via `innerHTML` (Req 6.4).
- Uncertain cells get a dashed underline and a tooltip.
- Export creates a `Blob` and an object URL, clicks a temporary `<a download>`, then revokes the URL.

## Privacy and security (Req 6)

The CSP is set in a `<meta>` tag:

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:;
connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'
```

`connect-src 'none'` makes `fetch`, XHR, WebSocket, and beacons fail even if code tried to use them. There are no third-party scripts, no fonts, and no analytics. No storage APIs are used.

## Error handling

- Empty input or an empty file: a status message, and no state change.
- File read or decode failure: a status message naming the file.
- An unparseable line still yields a record (all text in `item`, every field unsure), so no input is silently dropped.

## Testing

`tests/index.html` runs `tests/tests.js` against the pure modules and writes `PASS n/n` or `FAIL …` into the DOM. `tests/run.ps1` runs it in headless Chrome or Edge with `--dump-dom` and exits non-zero on failure. Coverage: every date and amount format, status normalisation, header mapping, labelled lines, no-separator lines, missing-year inference, CSV quoting and delimiters, export escaping and injection guard, filter combinations, determinism, and the full sample text.
