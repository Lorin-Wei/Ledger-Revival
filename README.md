# 台账复活台 · Ledger Revival

> Kiroween 2026 · **Resurrection** — bring dead, semi-structured ledger text back to life as searchable, structured records.
> 把老旧的、半结构化的台账文本，复活成可搜索、可筛选、可导出的结构化记录。

**在线使用 / Live demo:** <https://lorin-wei.github.io/Ledger-Revival/>

## 它解决什么问题

很多团队的台账还躺在聊天记录、记事本、旧 Word 表格，或者早已下线的老系统导出的 CSV 里。每一行都记录着同样的几件事（日期、单位、事项、金额、状态、责任人），但格式各不相同：

```
2026-10-03  城西供电局  第三季度电费  ¥18,420.50  已付款  王建国
2026年10月8日，市政工程管理处，北门管道抢修，1.2万，进行中，张伟
日期:2026.10.12 单位:蓝鲸网络科技公司 事项:机房交换机维保 金额:¥4,500 状态:审批中 负责人:陈静
2026年10月23日华信会计师事务所年度审计费25000元已完成吴昊
```

台账复活台会自动识别出这 6 个字段，生成一张统一的表格，供你搜索、筛选和导出。

## 使用方法

1. 把台账文本粘贴到输入框（每行一条），点 **⚰️ 复活**（或按 Ctrl+Enter）。也可以点 **导入 CSV** 选择本地文件，或点 **载入示例** 先体验。
2. 在结果表格里用 **关键词搜索**（空格分隔多个词，需同时命中），或按 **日期范围 / 单位 / 事项 / 金额范围 / 状态 / 责任人** 筛选。
3. 带 **虚线下划线** 的单元格表示识别不确定，请对照最右侧的“原文”列核对。
4. 点 **导出 CSV**，导出当前筛选结果（UTF-8 BOM 编码，Excel 可直接打开中文）。

示例 CSV：[`samples/legacy-export.csv`](samples/legacy-export.csv)

## 支持的格式

| 内容 | 支持 |
|---|---|
| 分隔方式 | Tab、`\|`、半角/全角逗号、分号、`、`、空格，或完全没有分隔符 |
| 字段标签 | `日期:` `单位：` `事项=` `金额:` `状态:` `负责人:` `经办人张三` 等，顺序任意 |
| 表头 | 首行是 `日期 单位 事项 金额 状态 责任人` 这类列名时按列对应；CSV 表头支持同义词（`登记日期`、`往来单位`、`摘要`、`金额(元)`、`进度`、`经办人`…） |
| 日期 | `2026-10-03` `2026/10/3` `2026.10.3` `20261003` `2026年10月3日` `10月3日`（缺年份时沿用上一条记录的年份），会校验日期是否真实存在 |
| 金额 | `¥` `￥` `$` `RMB` `元` `万` `万元`、千分位、小数、负数；`1.2万` 会转成 `12000` |
| 状态 | 归一为 已完成 / 进行中 / 待处理 / 已取消 / 已逾期（如 `已付款`→已完成、`审批中`→进行中、`未结清`→待处理、`作废`→已取消） |
| CSV | 引号字段、`""` 转义、字段内换行；自动识别逗号/分号/Tab 分隔；UTF-8（有无 BOM 均可）与 GBK 编码 |

## 隐私声明

**你的数据不会离开你的电脑。**

- 所有解析、搜索、筛选、导出都在浏览器本地完成。没有后端、没有数据库、没有 API Key，也没有统计或埋点。
- 页面通过 Content Security Policy 设置了 `connect-src 'none'` 和 `form-action 'none'`，浏览器会拦截所有外发请求（fetch、XHR、WebSocket、表单提交）。即使代码有误，数据也发不出去。
- 不使用任何第三方脚本、CDN 或网络字体，只加载与页面同源的文件。
- 不写入 localStorage、IndexedDB 或 Cookie。刷新或关闭页面后，数据随即消失。
- 导入的文件通过 File API 在本地读取；导出的 CSV 在本地生成后直接下载。
- 你输入的所有文本都按纯文本渲染，不会被当成 HTML 执行。

你可以自行验证：打开浏览器开发者工具的 Network 面板，使用过程中不会出现任何请求。

## 本地运行

不需要安装任何东西。下载或克隆仓库后，双击 `index.html` 即可使用（也可以断网使用）。

## 部署到 GitHub Pages

1. 把本仓库推送到 GitHub。
2. 进入仓库 **Settings → Pages**，Source 选 **Deploy from a branch**，Branch 选 `main`、目录选 `/ (root)`，保存。
3. 一两分钟后访问 `https://lorin-wei.github.io/Ledger-Revival/`。

所有资源都使用相对路径，部署在子路径下也能正常工作。

## 项目结构

```
index.html            页面与 CSP
css/style.css         暗色主题
js/parser.js          字段识别（纯函数）
js/csv.js             CSV 解码 / 解析 / 导出
js/filter.js          搜索与筛选
js/app.js             界面逻辑
js/sample.js          合成示例数据
samples/              合成示例 CSV
tests/                无头浏览器测试（tests/run.ps1、tests/run-ui.ps1）
.kiro/                Kiro spec（需求 / 设计 / 任务）、steering 与 hook
```

零依赖：只用原生 HTML、CSS、JavaScript，没有构建步骤。

## 如何用 Kiro 构建

- **Spec 驱动**：`.kiro/specs/ledger-revival/` 下的 `requirements.md`（EARS 格式验收标准）→ `design.md`（解析流水线、CSP、数据模型）→ `tasks.md`，每个任务都对应到具体需求编号。
- **Steering**：`.kiro/steering/ledger-revival.md` 固化了项目的硬约束（零网络、零存储、禁止 innerHTML、最多两个 CDN 库），让每次生成的代码都遵守隐私承诺。
- **Hook**：保存 `js/` 下的文件时自动运行无头测试套件。

## 测试

需要本机装有 Chrome 或 Edge（Windows PowerShell）：

```powershell
pwsh tests/run.ps1      # 解析、CSV、筛选单元测试
pwsh tests/run-ui.ps1   # 在真实页面上做 UI 冒烟测试（含 CSP 断网验证）
```

也可以直接用浏览器打开 `tests/index.html` 查看结果。

## 不做什么

不做用户登录、云同步、OCR 图片识别。这是刻意的取舍：工具越小，越容易被信任。

## 示例数据

仓库中的所有示例数据均为虚构，不涉及任何真实单位或个人。

## License

[MIT](LICENSE)
