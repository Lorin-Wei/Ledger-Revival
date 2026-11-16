/* Ledger Revival — 关键词搜索与按列筛选（纯函数） */
(function (root) {
  'use strict';

  var LR = root.LR = root.LR || {};

  /** 为每条记录建立小写检索文本（字段 + 原文），解析后调用一次 */
  function index(records) {
    records.forEach(function (r) {
      r._hay = [r.date, r.party, r.item, r.amount == null ? '' : String(r.amount), r.status, r.owner, r.raw]
        .join('\n').toLowerCase();
    });
    return records;
  }

  function terms(q) {
    return String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  function num(v) {
    if (v === '' || v == null) return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  /**
   * state: { keyword, dateFrom, dateTo, party, status, owner, item, amountMin, amountMax }
   * 所有条件同时满足才保留。
   */
  function apply(records, state) {
    var s = state || {};
    var ts = terms(s.keyword);
    var itemQ = String(s.item || '').trim().toLowerCase();
    var min = num(s.amountMin);
    var max = num(s.amountMax);

    return records.filter(function (r) {
      for (var i = 0; i < ts.length; i++) if (r._hay.indexOf(ts[i]) < 0) return false;
      if (s.dateFrom && (!r.date || r.date < s.dateFrom)) return false;
      if (s.dateTo && (!r.date || r.date > s.dateTo)) return false;
      if (s.party && r.party !== s.party) return false;
      if (s.status && r.status !== s.status) return false;
      if (s.owner && r.owner !== s.owner) return false;
      if (itemQ && r.item.toLowerCase().indexOf(itemQ) < 0) return false;
      if (min != null && (r.amount == null || r.amount < min)) return false;
      if (max != null && (r.amount == null || r.amount > max)) return false;
      return true;
    });
  }

  function distinct(records, field) {
    var seen = {};
    records.forEach(function (r) { if (r[field]) seen[r[field]] = true; });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'zh'); });
  }

  function sum(records) {
    var total = records.reduce(function (acc, r) { return acc + (r.amount || 0); }, 0);
    return Math.round(total * 100) / 100;
  }

  function unsureCount(records) {
    var n = 0;
    records.forEach(function (r) {
      Object.keys(r.unsure).forEach(function (k) { if (r.unsure[k]) n++; });
    });
    return n;
  }

  LR.filter = { index: index, terms: terms, apply: apply, distinct: distinct, sum: sum, unsureCount: unsureCount };
})(typeof window !== 'undefined' ? window : this);
