/* Ledger Revival — CSV 读写（纯函数，无 DOM、无网络） */
(function (root) {
  'use strict';

  var LR = root.LR = root.LR || {};

  /** 把文件字节解码成文本：优先 UTF-8（严格模式），失败则按 GBK 解码。 */
  function decode(buffer) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (e) {
      return new TextDecoder('gbk').decode(buffer);
    }
  }

  /** 在前 10 行（忽略引号内内容）中统计候选分隔符，选每行数量最稳定且最多的那个。 */
  function detectDelimiter(text) {
    var candidates = [',', ';', '\t'];
    var lines = [];
    var cur = '';
    var inQuotes = false;
    for (var i = 0; i < text.length && lines.length < 10; i++) {
      var ch = text[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (!inQuotes && (ch === '\n' || ch === '\r')) {
        if (cur.trim()) lines.push(cur);
        cur = '';
        continue;
      }
      if (!inQuotes) cur += ch;
    }
    if (cur.trim() && lines.length < 10) lines.push(cur);

    var best = ',';
    var bestScore = 0;
    candidates.forEach(function (d) {
      var counts = lines.map(function (l) { return l.split(d).length - 1; });
      var min = counts.length ? Math.min.apply(null, counts) : 0;
      if (min > bestScore) { bestScore = min; best = d; }
    });
    return best;
  }

  /** RFC 4180 解析：支持引号字段、"" 转义、引号内换行。返回 string[][]。 */
  function parse(text, delimiter) {
    text = String(text || '').replace(/^\uFEFF/, '');
    var d = delimiter || detectDelimiter(text);
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    var n = text.length;

    while (i < n) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"' && field === '') { inQuotes = true; i++; continue; }
      if (ch === d) { row.push(field); field = ''; i++; continue; }
      if (ch === '\r' || ch === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
        if (ch === '\r' && text[i + 1] === '\n') i++;
        i++; continue;
      }
      field += ch; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }

    // 去掉完全空白的行
    return rows.filter(function (r) {
      return r.some(function (c) { return c.trim() !== ''; });
    });
  }

  function escapeCell(value) {
    var s = value == null ? '' : String(value);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /** 防止 Excel 公式注入：以 = + - @ 制表符 回车 开头的文本前加单引号。 */
  function guard(value) {
    var s = value == null ? '' : String(value);
    return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  }

  function stringify(rows) {
    return '\uFEFF' + rows.map(function (r) { return r.map(escapeCell).join(','); }).join('\r\n') + '\r\n';
  }

  var EXPORT_HEADER = ['日期', '单位/对象', '事项', '金额', '状态', '责任人', '原文'];

  /** 记录 → CSV 文本（UTF-8 BOM，Excel 可直接打开中文）。金额输出纯数字，不做注入防护。 */
  function recordsToCSV(records) {
    var rows = [EXPORT_HEADER];
    records.forEach(function (r) {
      rows.push([
        guard(r.date),
        guard(r.party),
        guard(r.item),
        r.amount == null ? '' : String(r.amount),
        guard(r.status),
        guard(r.owner),
        guard(r.raw)
      ]);
    });
    return stringify(rows);
  }

  LR.csv = {
    decode: decode,
    detectDelimiter: detectDelimiter,
    parse: parse,
    stringify: stringify,
    guard: guard,
    recordsToCSV: recordsToCSV,
    EXPORT_HEADER: EXPORT_HEADER
  };
})(typeof window !== 'undefined' ? window : this);
