# Requirements Document

## Introduction

**Ledger Revival (台账复活台)** — Kiroween 2026, Resurrection category.

Many teams still keep their ledgers (台账) as semi-structured text: lines pasted from chat, old Word tables, notepad files, or CSV exports from tools that no longer exist. Every line holds the same kinds of facts (a date, a counterparty, what happened, an amount, a status, who is responsible), but in a different order and format each time.

Ledger Revival brings that dead text back to life as structured, searchable records. It is a static, single-folder web app. All processing happens in the user's browser, and no data is ever sent to any server.

### Constraints

- Plain HTML, CSS, and JavaScript only. At most two lightweight libraries from a CDN (the current design uses none).
- No backend, no database, no API keys.
- All data stays in the browser. The app makes no network requests with user data.
- Deployable as-is to GitHub Pages, and also usable by opening `index.html` from disk.

### Out of scope

User login, cloud sync, OCR or image recognition, server-side storage.

## Glossary

- **Ledger line**: one record of input, either one line of pasted text or one CSV row.
- **Record**: the structured result of parsing a ledger line, with six fields: date, party, item, amount, status, owner.
- **Party (单位/对象)**: the organisation or person the record is about.
- **Item (事项)**: the description of what happened.
- **Owner (责任人)**: the person responsible for the record.
- **Uncertain field**: a field filled by a weak heuristic, or left empty, which the user should check.

## Requirements

### Requirement 1: Paste ledger text

**User Story:** As a team member holding old ledger text, I want to paste it in as-is, so that I don't have to clean it up first.

#### Acceptance Criteria

1. WHEN the user pastes multi-line text and starts parsing THEN the system SHALL treat each non-empty line as one ledger line.
2. The system SHALL accept lines whose fields are separated by tabs, `|`, commas (half- or full-width), `、`, semicolons, or whitespace, and lines with no separators at all.
3. WHEN the first line consists of recognisable column names (e.g. `日期 单位 事项 金额 状态 责任人`) THEN the system SHALL use it as a header that maps the following lines' columns to fields, and SHALL NOT output it as a record.
4. WHEN the user clicks "load sample" THEN the system SHALL fill the input with synthetic sample ledger text covering the supported formats.
5. The system SHALL ignore blank lines and lines containing only separator characters (e.g. `-----`).

### Requirement 2: Import CSV

**User Story:** As a team member with a CSV export from an old tool, I want to import the file directly, so that its rows become records.

#### Acceptance Criteria

1. WHEN the user selects a `.csv` or `.txt` file THEN the system SHALL read it locally with the File API, without uploading it.
2. The system SHALL parse quoted fields, escaped quotes (`""`), and line breaks inside quoted fields, and SHALL auto-detect comma, semicolon, or tab as the delimiter.
3. The system SHALL decode UTF-8 (with or without BOM), and SHALL fall back to GBK when the file is not valid UTF-8.
4. WHEN the CSV header contains recognisable column names THEN the system SHALL map those columns to fields directly, and SHALL apply field detection to any column it cannot map.
5. WHEN the CSV has no recognisable header THEN the system SHALL apply field detection to every row's cells.

### Requirement 3: Detect fields

**User Story:** As a user, I want the six fields to be detected automatically, so that I get structured records without manual tagging.

#### Acceptance Criteria

1. The system SHALL detect explicit labels such as `日期:`, `单位：`, `金额=`, `负责人:` and assign the labelled value to the matching field.
2. **Date**: the system SHALL recognise `YYYY-MM-DD`, `YYYY/M/D`, `YYYY.M.D`, `YYYYMMDD`, `YYYY年M月D日`, and `M月D日`, and SHALL output dates as `YYYY-MM-DD`. Invalid calendar dates (e.g. `2023-02-30`) SHALL NOT be accepted.
3. WHEN a date has no year THEN the system SHALL take the year from the nearest preceding record with a full date, else the current year, and SHALL mark the date as uncertain.
4. **Amount**: the system SHALL recognise numbers with currency markers (`¥`, `￥`, `$`, `RMB`, `元`, `万元`, `万`), thousands separators, decimals, and negatives, and SHALL output a plain number (e.g. `1.2万` → `12000`).
5. **Status**: the system SHALL recognise common status words and normalise them to one of: 已完成, 进行中, 待处理, 已取消, 已逾期.
6. **Owner**: the system SHALL recognise a labelled person, or a 2–3 character Chinese name starting with a common surname.
7. **Party**: the system SHALL recognise text ending in an organisation suffix (e.g. 公司, 局, 处, 中心, 银行, 医院, 学校, 部).
8. **Item**: the system SHALL use the remaining unassigned text as the item.
9. The system SHALL mark a field as uncertain when it was filled by a weak heuristic or when it is empty.
10. Parsing the same input twice SHALL produce identical records.

### Requirement 4: Show, search, and filter results

**User Story:** As a user, I want to see the records in a table and narrow them down, so that I can find what I need quickly.

#### Acceptance Criteria

1. WHEN parsing finishes THEN the system SHALL show the records in a table with columns: #, date, party, item, amount, status, owner, original text.
2. The system SHALL visually mark uncertain fields.
3. WHEN the user types in the keyword box THEN the system SHALL show only records where every space-separated term appears in some field or in the original text (case-insensitive), and SHALL highlight the matches.
4. The system SHALL provide column filters: date range (from/to), party, status, and owner as dropdowns of existing values, item text contains, and amount range (min/max).
5. WHEN keyword and filters are both set THEN the system SHALL show only records matching all of them.
6. The system SHALL show the number of visible records, the total number of records, and the sum of visible amounts.
7. WHEN the user clicks "clear filters" THEN the system SHALL reset the keyword and all column filters.
8. The table SHALL stay responsive (filtering under 100 ms) with 5,000 records.

### Requirement 5: Export CSV

**User Story:** As a user, I want to export the result, so that I can open it in Excel or bring it into another tool.

#### Acceptance Criteria

1. WHEN the user clicks export THEN the system SHALL download a CSV of the currently visible records, generated in the browser.
2. The CSV SHALL use UTF-8 with BOM so that Excel shows Chinese correctly, and SHALL quote fields containing commas, quotes, or line breaks.
3. The CSV SHALL include a header row: 日期, 单位/对象, 事项, 金额, 状态, 责任人, 原文.
4. The system SHALL prefix text cells beginning with `=`, `+`, `-`, or `@` with `'` to prevent formula injection, except for numeric amount cells.
5. IF there are no visible records THEN the export button SHALL be disabled.

### Requirement 6: Privacy

**User Story:** As a user handling internal ledgers, I want a guarantee that my data never leaves my computer, so that I can use the tool on sensitive records.

#### Acceptance Criteria

1. The app SHALL make no network requests containing user data.
2. The page SHALL declare a Content Security Policy that blocks all outbound connections (`connect-src 'none'`, `form-action 'none'`) and only allows scripts and styles from its own origin.
3. The app SHALL NOT write user data to localStorage, IndexedDB, or cookies. Closing or reloading the page discards the data.
4. The app SHALL render all user-provided text as text, never as HTML.
5. The UI SHALL show a short privacy notice stating that data is processed locally.

### Requirement 7: Documentation and deployment

**User Story:** As a judge or new user, I want a one-page README, so that I understand what the app does and how it handles data.

#### Acceptance Criteria

1. The repository SHALL contain a single-page `README.md` covering purpose, usage, supported formats, the privacy statement, local use, and GitHub Pages deployment.
2. The repository SHALL contain an OSI-approved open source license.
3. The app SHALL work when served from a GitHub Pages sub-path (all asset paths relative).
4. The repository SHALL contain only synthetic sample data.
