## Inspiration

My team used to have a small internal tool for keeping our ledger: who we paid, what for, how much, whether it was done, and who was handling it. When the tool was retired, nobody migrated the data properly. What's left is spread across chat logs, a few notepad files, old Word tables and CSV exports from the tool itself.

The information is all still there. Every line has the same six things in it: a date, a counterparty, what happened, an amount, a status and a person. But every line writes them differently. One person uses tabs, another uses full-width commas, someone writes `1.2万` instead of `12000`, and some lines have no separators at all because they were typed on a phone:

```
2026年10月23日华信会计师事务所年度审计费25000元已完成吴昊
```

You can't search that, filter it, or add it up. So for the Resurrection category I wanted to bring that dead text back as proper records, without asking anyone to retype it.

(All names and companies in the demo are made up. I didn't want real internal data anywhere near a public repo.)

## What it does

You paste ledger text, one record per line, or import a CSV. Ledger Revival picks out six fields from each line:

- **date** (`2026-10-03`, `2026/10/3`, `20261003`, `2026年10月3日`, or just `10月3日`)
- **party** (单位/对象), the company, department or person the record is about
- **item** (事项), what happened
- **amount** (`¥18,420.50`, `3,600元`, `1.2万`, `RMB 7,800`, negatives)
- **status**, mapped to one of five values (已完成 / 进行中 / 待处理 / 已取消 / 已逾期)
- **owner** (责任人)

The result is a table you can search by keyword and filter by date range, party, status, owner, item text and amount range. One click exports what you're looking at as a CSV that opens in Excel without garbled Chinese.

When the parser has to guess, the cell gets a dashed underline, and the original line is always shown in the last column so you can check it. I'd rather show "I'm not sure" than quietly put the wrong thing in a column.

Everything runs in the browser. There is no server, no account and no API key. Ledgers are exactly the kind of data people aren't allowed to paste into random websites, so this was the main design constraint, not a feature I added at the end.

## How we built it

Plain HTML, CSS and JavaScript. No framework, no build step, no libraries. It deploys to GitHub Pages as-is, and you can also just double-click `index.html` and use it offline.

I built it with Kiro's spec workflow:

1. **Requirements.** I started with a different idea (scanned site drawings with OCR), wrote a requirements doc for it, and then cut the scope hard: no backend, no OCR, no login, no cloud sync. The final `requirements.md` has 7 requirements with acceptance criteria in EARS format. Things like "an invalid calendar date such as 2023-02-30 SHALL NOT be accepted" ended up as test cases almost word for word.
2. **Design.** `design.md` describes the parsing pipeline step by step (normalise, read labels, tokenise, peel out date/amount/status, then guess owner, party and item from what's left), the data model, and the exact Content Security Policy.
3. **Tasks.** `tasks.md` maps each task back to requirement numbers, so I could check off what was actually covered.

I also added a **steering file** with the rules the code must never break: no network calls, no localStorage, no `innerHTML` with user text, classic scripts instead of ES modules. And there's a **hook** that runs the test suite every time a file in `js/` is saved.

The code is split so the parts that matter can be tested without a page: `parser.js`, `csv.js` and `filter.js` are pure functions, and only `app.js` touches the DOM. Tests run in headless Chrome through a small PowerShell script: 22 unit tests, plus a UI smoke test that loads the real page in an iframe, clicks through it, and imports the sample CSV.

## Challenges we ran into

**Chinese text has no word boundaries.** For a line like `市政工程管理处北门管道抢修`, the parser has to decide where the party ends and the item starts. I split on organisation suffixes (公司, 局, 处, 中心…). That broke right away on words like 处理 ("handle"), where 处 isn't a suffix at all, so the split rule now has exceptions for the common cases.

**Status words hide inside other words.** 完成 means "done", but 未完成 means "not done", and 完成验收报告 is a task description that just happens to start with 完成. Matching longest keyword first fixed the first case. For the second, short ambiguous words now only count when they stand alone as a whole token.

**Telling names from ordinary words.** A Chinese name is usually a surname plus one or two characters. But 安装 (install), 管理 (manage) and 方案 (plan) also start with characters that are common surnames. I ended up with a stop-list of everyday words and a rule that a guessed name is only "sure" when it's the last field on the line.

**Commas mean two things.** `3,600` is a number, but `,` is also a field separator. Thousands separators are removed before splitting. `RMB 7,800` had a similar problem: the parser saw `RMB` as a separate piece and stuck it in the item column, so currency prefixes now get glued to the number first.

**GBK files.** Real CSV exports from Chinese Excel are often GBK, not UTF-8. The importer tries strict UTF-8 first and falls back to GBK if that fails.

**Testing the privacy claim honestly.** My first test for "outbound requests are blocked" passed, but it would also have passed without the CSP, because a cross-origin fetch from `file://` fails anyway. The test now waits for a real `connect-src` CSP violation event, so it only passes if the policy is what's actually blocking the request.

**ES modules don't work from `file://`** in Chrome, which would have broken "just double-click it". So the code uses classic scripts sharing one namespace.

## Accomplishments that we're proud of

- A line with no separators at all, like the 华信会计师事务所 example above, comes out as six correct fields.
- The privacy promise is enforced by the browser, not just written in the README. The CSP blocks every outbound connection, and a test checks it.
- 5,000 lines parse in about 150 ms, and filtering takes about 1 ms on my laptop.
- Zero dependencies. The whole app is a handful of files you can read in one sitting.

## What we learned

Writing the requirements before the code helped most at the edges. Questions like "what happens when a date has no year?" or "what if the amount column is empty?" got decided once, in the spec, instead of being improvised in the code. (A missing year now comes from the previous record that had one.)

I also learned that cutting scope was the most useful decision in the whole project. The OCR version would have needed a backend or API keys, and that would have cancelled out the one thing that makes this tool safe to use on internal data.

## What's next for Ledger Revival (台账复活台)

- Let users fix a cell in the table and keep that correction in the export.
- Custom column mappings for CSV exports from specific old systems.
- Support for more ledger habits I haven't seen yet. If you have a weird format, I'd like a (made-up) sample of it.
