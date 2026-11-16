# Demo video script (target 2:40, hard limit 3:00)

Narration is in English for the judges. Read it at a normal pace. Each block is about as long as its time slot.
画面说明用中文，方便你操作。

---

### 0:00–0:20 · The dead ledger
**画面：** 打开一个记事本，里面是 `js/sample.js` 的 15 行示例文本（自己复制进去）。慢慢滚动。

> This is what our team's ledger looks like after the tool we used for it was retired. Same six facts on every line: date, who, what, how much, status, and who's handling it. But every line is written differently. Some have tabs, some have commas, and this one has no separators at all.

（最后一句时，鼠标指向 `2026年10月23日华信会计师事务所年度审计费25000元已完成吴昊` 那一行。）

### 0:20–0:50 · Revive
**画面：** 浏览器打开 GitHub Pages 地址。把记事本里的文本全选，粘贴进输入框，点 **⚰️ 复活**。

> Ledger Revival is a single static page. I paste the text and hit Revive.
> Every line becomes a record with six columns. Dates are normalised, "1.2万" becomes twelve thousand, and status words like "paid" or "awaiting approval" are mapped to five standard values.

（鼠标依次指第 3 行的 12,000.00、第 9 行那条无分隔符的记录。）

### 0:50–1:10 · Honest about guesses
**画面：** 指向带虚线下划线的单元格（第 4 行日期、第 8 行空的单位），再指右侧“原文”列。

> When the parser has to guess, the cell is underlined. This date had no year, so it took the year from the line above. The original text always stays on the right, so you can check every record against the source.

### 1:10–1:40 · Search, filter, export
**画面：** 搜索框输入 `费 已完成` → 4 条，高亮。点 **清除筛选**。状态下拉选 **已逾期** → 2 条。点 **导出 CSV**，用 Excel 打开下载的文件。

> Search takes multiple words, and every word has to match. Filters work by date, party, status, owner and amount, and the total updates as you filter.
> Export gives you exactly what's on screen, as a CSV that opens in Excel with the Chinese intact.

### 1:40–1:55 · Old CSV exports
**画面：** 点 **导入 CSV**，选 `samples/legacy-export.csv`。

> It also reads CSV files left behind by the old tool. Header names like 登记日期 or 金额(元) are mapped automatically, and GBK-encoded files from Chinese Excel work too.

### 1:55–2:15 · Nothing leaves the browser
**画面：** 按 F12 打开开发者工具 → **Network** 面板 → 清空 → 再点一次 **载入示例**、搜索、导出。面板保持为空。然后切到 **Elements**，展开 `<head>`，指向 CSP 那一行。

> No backend, no account, no API key. Watch the network tab while I use it: nothing. And that isn't just a promise. The page's Content Security Policy blocks every outbound connection, and one of the tests checks that the browser really enforces it.

### 2:15–2:40 · Built with Kiro
**画面：** 切到 Kiro。依次打开 `.kiro/specs/ledger-revival/requirements.md`（滚到 Requirement 3）、`design.md`（解析流水线那段）、`tasks.md`、`.kiro/steering/ledger-revival.md`。最后在终端运行 `pwsh tests/run.ps1`，显示 `PASS 22/22`。

> I built it with Kiro's spec workflow. Requirements with acceptance criteria first, then the design of the parsing pipeline, then tasks tied back to each requirement. A steering file holds the rules the code must never break, like no network calls and no innerHTML. And a hook runs the tests every time I save a file.

### 2:40–2:50 · Close
**画面：** 回到应用页面，结果表格。

> Ledger Revival. Old ledger text, back from the dead, and it never leaves your computer.

---

## 录制与上传

1. **录屏：** Windows 自带 `Win + Alt + R`（Xbox Game Bar）只能录单个窗口；要在浏览器、记事本、Kiro 之间切换，建议用 OBS Studio（免费）录整个屏幕。分辨率 1920×1080，浏览器缩放 125% 左右让文字更清楚。
2. **配音：** 可以边录边讲，也可以先录画面，再用剪映 / Clipchamp 配音并剪掉停顿。总长控制在 2:50 以内。
3. **字幕：** 建议加英文字幕（剪映可以自动识别生成），评委不一定开声音。
4. **上传 YouTube：** 可见性选 **Unlisted（不公开）** 或 **Public**，不要选 Private。标题：`Ledger Revival (台账复活台) — Kiroween 2026`。
5. 复制视频链接，填到 Devpost 的 **Demo video URL**。
