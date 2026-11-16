/* Ledger Revival — 界面逻辑。所有用户文本都通过 textContent 渲染，绝不使用 innerHTML。 */
(function () {
  'use strict';

  var LR = window.LR;
  var PAGE = 500;
  var STATUS_CLASS = { '已完成': 's-done', '进行中': 's-doing', '待处理': 's-todo', '已取消': 's-cancel', '已逾期': 's-overdue' };
  var money = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  var state = { records: [], filtered: [], limit: PAGE };

  function $(id) { return document.getElementById(id); }

  var el = {
    input: $('raw-input'), revive: $('btn-revive'), sample: $('btn-sample'), file: $('file-input'), clear: $('btn-clear'),
    msg: $('status-msg'), panel: $('result-panel'), keyword: $('f-keyword'), reset: $('btn-reset'), exportBtn: $('btn-export'),
    dateFrom: $('f-date-from'), dateTo: $('f-date-to'), party: $('f-party'), item: $('f-item'),
    amountMin: $('f-amount-min'), amountMax: $('f-amount-max'), status: $('f-status'), owner: $('f-owner'),
    stats: $('stats'), tbody: $('tbody'), empty: $('empty-msg'), more: $('btn-more')
  };

  /* ---------- 消息 ---------- */

  function say(text, isError) {
    el.msg.textContent = text;
    el.msg.classList.toggle('error', !!isError);
  }

  /* ---------- 载入记录 ---------- */

  function load(result, sourceLabel) {
    var records = LR.filter.index(result.records);
    if (!records.length) {
      say('没有找到可解析的行。', true);
      return;
    }
    state.records = records;
    fillSelect(el.party, LR.filter.distinct(records, 'party'));
    fillSelect(el.status, LR.filter.distinct(records, 'status'));
    fillSelect(el.owner, LR.filter.distinct(records, 'owner'));
    resetFilters();
    el.panel.hidden = false;

    var parts = ['已从' + sourceLabel + '复活 ' + records.length + ' 条记录'];
    if (result.headerFields) parts.push('已识别表头');
    if (result.skipped) parts.push('跳过 ' + result.skipped + ' 行分隔线');
    var unsure = LR.filter.unsureCount(records);
    parts.push(unsure ? unsure + ' 个字段待核对' : '全部字段识别确定');
    say('🧟 ' + parts.join(' · ') + '。');
  }

  function fillSelect(select, values) {
    select.replaceChildren();
    var all = document.createElement('option');
    all.value = '';
    all.textContent = '全部';
    select.appendChild(all);
    values.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
  }

  /* ---------- 筛选 ---------- */

  function filterState() {
    return {
      keyword: el.keyword.value, dateFrom: el.dateFrom.value, dateTo: el.dateTo.value,
      party: el.party.value, status: el.status.value, owner: el.owner.value,
      item: el.item.value, amountMin: el.amountMin.value, amountMax: el.amountMax.value
    };
  }

  function resetFilters() {
    [el.keyword, el.dateFrom, el.dateTo, el.party, el.status, el.owner, el.item, el.amountMin, el.amountMax]
      .forEach(function (c) { c.value = ''; });
    refresh();
  }

  function refresh() {
    state.filtered = LR.filter.apply(state.records, filterState());
    state.limit = PAGE;
    render();
  }

  var timer = null;
  function refreshSoon() {
    clearTimeout(timer);
    timer = setTimeout(refresh, 120);
  }

  /* ---------- 渲染 ---------- */

  /** 把 text 中命中的关键词包成 <mark>，全部通过 DOM API 创建 */
  function appendHighlighted(parent, text, terms) {
    if (!text) return;
    if (!terms.length) { parent.appendChild(document.createTextNode(text)); return; }
    var lower = text.toLowerCase();
    var ranges = [];
    terms.forEach(function (t) {
      var from = 0, i;
      while ((i = lower.indexOf(t, from)) >= 0) { ranges.push([i, i + t.length]); from = i + t.length; }
    });
    if (!ranges.length) { parent.appendChild(document.createTextNode(text)); return; }
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [ranges[0]];
    ranges.slice(1).forEach(function (r) {
      var last = merged[merged.length - 1];
      if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push(r);
    });
    var pos = 0;
    merged.forEach(function (r) {
      if (r[0] > pos) parent.appendChild(document.createTextNode(text.slice(pos, r[0])));
      var m = document.createElement('mark');
      m.textContent = text.slice(r[0], r[1]);
      parent.appendChild(m);
      pos = r[1];
    });
    if (pos < text.length) parent.appendChild(document.createTextNode(text.slice(pos)));
  }

  function cell(tr, cls, text, terms, unsure) {
    var td = document.createElement('td');
    td.className = cls;
    if (unsure) {
      td.classList.add('unsure');
      td.title = '自动识别不确定，请对照原文核对';
      if (!text) td.classList.add('empty');
    }
    appendHighlighted(td, text, terms);
    tr.appendChild(td);
    return td;
  }

  function row(r, terms) {
    var tr = document.createElement('tr');
    cell(tr, 'id', String(r.id), []);
    cell(tr, 'date', r.date, terms, r.unsure.date);
    cell(tr, 'party', r.party, terms, r.unsure.party);
    cell(tr, 'item', r.item, terms, r.unsure.item);
    var amt = cell(tr, 'amount', r.amount == null ? '' : money.format(r.amount), [], r.unsure.amount);
    if (r.amount < 0) amt.classList.add('neg');

    var st = document.createElement('td');
    st.className = 'status';
    if (r.unsure.status) { st.classList.add('unsure'); st.title = '自动识别不确定，请对照原文核对'; }
    if (r.status) {
      var chip = document.createElement('span');
      chip.className = 'chip ' + (STATUS_CLASS[r.status] || 's-other');
      appendHighlighted(chip, r.status, terms);
      st.appendChild(chip);
    } else {
      st.classList.add('empty');
    }
    tr.appendChild(st);

    cell(tr, 'owner', r.owner, terms, r.unsure.owner);
    cell(tr, 'raw', r.raw, terms);
    return tr;
  }

  function render() {
    var terms = LR.filter.terms(el.keyword.value);
    var shown = state.filtered.slice(0, state.limit);
    var frag = document.createDocumentFragment();
    shown.forEach(function (r) { frag.appendChild(row(r, terms)); });
    el.tbody.replaceChildren(frag);

    var total = state.records.length;
    var visible = state.filtered.length;
    el.empty.hidden = visible > 0;
    el.more.hidden = visible <= state.limit;
    el.more.textContent = '显示更多（已显示 ' + shown.length + ' / ' + visible + ' 条）';
    el.exportBtn.disabled = visible === 0;
    el.exportBtn.textContent = '⬇ 导出 CSV（' + visible + ' 条）';

    el.stats.replaceChildren();
    [['显示 ', visible], [' / 共 ', total], [' 条 · 金额合计 ¥', money.format(LR.filter.sum(state.filtered))]]
      .forEach(function (p) {
        el.stats.appendChild(document.createTextNode(p[0]));
        var b = document.createElement('strong');
        b.textContent = String(p[1]);
        el.stats.appendChild(b);
      });
  }

  /* ---------- 导出 ---------- */

  function exportCSV() {
    if (!state.filtered.length) return;
    var blob = new Blob([LR.csv.recordsToCSV(state.filtered)], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ledger-revival-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    say('已导出 ' + state.filtered.length + ' 条记录（文件在本机生成，未经过任何服务器）。');
  }

  /* ---------- 事件 ---------- */

  el.revive.addEventListener('click', function () {
    var text = el.input.value;
    if (!text.trim()) { say('请先粘贴台账文本，或点击“载入示例”。', true); return; }
    load(LR.parser.parseText(text), '粘贴文本');
  });

  el.sample.addEventListener('click', function () {
    el.input.value = LR.sample;
    load(LR.parser.parseText(LR.sample), '示例文本');
  });

  el.file.addEventListener('change', function () {
    var f = el.file.files && el.file.files[0];
    if (!f) return;
    f.arrayBuffer().then(function (buf) {
      var text = LR.csv.decode(buf);
      if (!text.trim()) { say('文件“' + f.name + '”是空的。', true); return; }
      if (/\.txt$/i.test(f.name)) {
        el.input.value = text;
        load(LR.parser.parseText(text), '文件“' + f.name + '”');
      } else {
        load(LR.parser.parseRows(LR.csv.parse(text)), '文件“' + f.name + '”');
      }
    }).catch(function () {
      say('无法读取文件“' + f.name + '”。', true);
    }).then(function () {
      el.file.value = '';   // 允许重复选择同一个文件
    });
  });

  el.clear.addEventListener('click', function () {
    el.input.value = '';
    state.records = [];
    state.filtered = [];
    el.tbody.replaceChildren();
    el.panel.hidden = true;
    say('已清空。');
  });

  el.reset.addEventListener('click', resetFilters);
  el.exportBtn.addEventListener('click', exportCSV);
  el.more.addEventListener('click', function () { state.limit += PAGE; render(); });

  [el.keyword, el.item, el.amountMin, el.amountMax].forEach(function (c) { c.addEventListener('input', refreshSoon); });
  [el.dateFrom, el.dateTo, el.party, el.status, el.owner].forEach(function (c) { c.addEventListener('change', refresh); });

  // Ctrl/⌘ + Enter 直接复活
  el.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) el.revive.click();
  });
})();
