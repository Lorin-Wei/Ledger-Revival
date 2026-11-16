/* 按 ?shot=<id> 渲染一帧视频画面。所有文本用 textContent 写入。 */
(function () {
  'use strict';

  var stage = document.getElementById('stage');
  var caption = document.getElementById('caption');
  var id = new URLSearchParams(location.search).get('shot');

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function load(path, binary) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('GET', path);
      if (binary) x.responseType = 'arraybuffer';
      x.onload = function () { resolve(x.response); };
      x.onerror = reject;
      x.send();
    });
  }
  function windowBox(title, url, light) {
    var win = h('div', 'win');
    var bar = h('div', 'bar' + (light ? ' light' : ''));
    bar.appendChild(h('span', 'dot')); bar.appendChild(h('span', 'dot')); bar.appendChild(h('span', 'dot'));
    if (url) bar.appendChild(h('span', 'url', url)); else bar.appendChild(h('span', null, '  ' + title));
    var body = h('div', 'body');
    win.appendChild(bar); win.appendChild(body);
    return { win: win, body: body };
  }
  function ring(el, color) {
    if (!el) return;
    el.style.outline = '4px solid ' + (color || '#fbbf24');
    el.style.outlineOffset = '2px';
    el.style.borderRadius = '6px';
  }
  function codeView(lines, start, opts) {
    var box = h('div', 'code');
    lines.forEach(function (t, i) {
      var ln = h('div', 'ln');
      ln.appendChild(h('span', 'no', String(start + i)));
      var cls = 'tx';
      if (/^#{1,3} /.test(t)) cls += ' h';
      else if (opts && opts.okRe && opts.okRe.test(t)) cls += ' ok';
      else if (/^\s*-\s|^\d+\.\s/.test(t)) cls += ' k';
      if (opts && opts.mark && opts.mark.test(t)) cls += ' mark';
      ln.appendChild(h('span', cls, t || ' '));
      box.appendChild(ln);
    });
    return box;
  }

  var render = {
    card: function (s) {
      var c = h('div', 'card');
      c.appendChild(h('div', 'ghost', '👻'));
      c.appendChild(h('h1', null, s.title));
      c.appendChild(h('p', null, s.subtitle));
      stage.appendChild(c);
    },

    notepad: function (s) {
      var w = windowBox('ledger-old.txt - 记事本', null, true);
      var pad = h('div', 'notepad');
      window.LR.sample.split('\n').forEach(function (line, i) {
        var span = h('span', i + 1 === s.highlightLine ? 'hl' : null, line);
        pad.appendChild(span);
        pad.appendChild(document.createTextNode('\n'));
      });
      w.body.appendChild(pad);
      stage.appendChild(w.win);
    },

    app: async function (s) {
      var w = windowBox(null, 'https://<you>.github.io/ledger-revival/');
      var f = h('iframe', 'app-frame');
      f.src = '../../index.html';
      w.body.appendChild(f);
      stage.appendChild(w.win);
      await new Promise(function (r) { f.addEventListener('load', r); });

      var win = f.contentWindow;
      var d = f.contentDocument;
      var $ = function (x) { return d.getElementById(x); };
      // 视频里让表格整体随页面滚动，避免内部滚动条遮挡
      var wrap = d.querySelector('.table-wrap');
      wrap.style.maxHeight = 'none';

      if (s.action === 'paste') {
        $('raw-input').value = window.LR.sample;
        $('raw-input').scrollTop = 0;
      } else if (s.action === 'csv') {
        var buf = await load('../../samples/legacy-export.csv', true);
        var dt = new win.DataTransfer();
        dt.items.add(new win.File([buf], 'legacy-export.csv', { type: 'text/csv' }));
        $('file-input').files = dt.files;
        $('file-input').dispatchEvent(new win.Event('change'));
        await wait(300);
        $('btn-sample').blur();
      } else {
        $('btn-sample').click();
        await wait(100);
      }

      if (s.action === 'search') {
        $('f-keyword').value = '费 已完成';
        $('f-keyword').dispatchEvent(new win.Event('input'));
        await wait(300);
      }
      if (s.action === 'filter-overdue') {
        $('f-status').value = '已逾期';
        $('f-status').dispatchEvent(new win.Event('change'));
        await wait(50);
      }

      (s.ring || []).forEach(function (x) { ring($(x)); });
      (s.ringCells || []).forEach(function (rc) {
        var tr = d.querySelectorAll('#tbody tr')[rc[0] - 1];
        if (tr) ring(tr.children[rc[1]]);
      });
      if (s.ringUnsure) d.querySelectorAll('#tbody td.unsure').forEach(function (td) { ring(td); });

      // 滚动到要展示的区域
      var target = null, offset = 0;
      if (s.action === 'table') { target = wrap; offset = -8; }
      else if (s.action === 'search' || s.action === 'filter-overdue') { target = $('result-panel'); offset = -8; }
      else if (s.action === 'csv') { target = $('status-msg'); offset = -10; }
      if (target) {
        win.scrollTo(0, target.getBoundingClientRect().top + win.scrollY + offset);
      }
    },

    csvview: function () {
      var recs = window.LR.parser.parseText(window.LR.sample, { year: 2026 }).records;
      var rows = window.LR.csv.parse(window.LR.csv.recordsToCSV(recs));
      var w = windowBox('ledger-revival-20261116-1732.csv（导出文件，UTF-8 BOM）', null, true);
      var wrapEl = h('div', 'sheet-wrap');
      var t = h('table', 'sheet');
      var head = h('tr');
      head.appendChild(h('th', null, ''));
      'ABCDEFG'.split('').forEach(function (c) { head.appendChild(h('th', null, c)); });
      t.appendChild(head);
      rows.slice(0, 16).forEach(function (r, i) {
        var tr = h('tr');
        tr.appendChild(h('th', null, String(i + 1)));
        r.forEach(function (c, j) { tr.appendChild(h('td', j === 3 && i > 0 ? 'n' : null, c)); });
        t.appendChild(tr);
      });
      wrapEl.appendChild(t);
      w.body.appendChild(wrapEl);
      stage.appendChild(w.win);
    },

    privacy: async function () {
      var html = await load('../../index.html');
      var cspLine = html.split(/\r?\n/).filter(function (l) { return /Content-Security-Policy/.test(l); })[0] || '';
      var policy = (cspLine.match(/content="([^"]+)"/) || [])[1] || '';
      var left = windowBox('index.html');
      var lines = ['<meta http-equiv="Content-Security-Policy"', '      content="'].concat(
        policy.split(';').map(function (p) { return '        ' + p.trim() + ';'; }), ['      ">']);
      left.body.appendChild(codeView(lines, 5, { mark: /connect-src|form-action/ }));

      var ui = await load('build/tests-ui.txt');
      var uiLines = ui.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).slice(0, 15);
      var right = windowBox('pwsh tests/run-ui.ps1');
      right.body.appendChild(codeView(uiLines, 1, { okRe: /^(ok|PASS)/, mark: /CSP|localStorage|HTML/ }));

      var split = h('div', 'split');
      split.appendChild(left.win); split.appendChild(right.win);
      stage.appendChild(split);
    },

    file: async function (s) {
      var text = await load(s.file);
      var lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).slice(s.from - 1, s.to);
      var w = windowBox('Kiro — ' + s.label);
      w.body.appendChild(codeView(lines, s.from, { mark: s.mark ? new RegExp(s.mark) : null }));
      stage.appendChild(w.win);
    },

    tests: async function () {
      var unit = await load('build/tests-unit.txt');
      var hook = await load('../../.kiro/hooks/run-tests-on-save.json');
      var left = windowBox('pwsh tests/run.ps1');
      left.body.appendChild(codeView(unit.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).slice(0, 24), 1, { okRe: /^(ok|PASS)/ }));
      var right = windowBox('Kiro — .kiro/hooks/run-tests-on-save.json');
      right.body.appendChild(codeView(hook.split(/\r?\n/), 1, { mark: /PostFileSave|run\.ps1/ }));
      var split = h('div', 'split');
      split.appendChild(left.win); split.appendChild(right.win);
      stage.appendChild(split);
    }
  };

  load('shots.json').then(async function (txt) {
    var shots = JSON.parse(txt);
    var s = shots.filter(function (x) { return x.id === id; })[0];
    if (!s) { caption.textContent = 'unknown shot ' + id; return; }
    caption.textContent = s.caption || s.say;
    await render[s.kind](s);
    document.title = 'READY';
  }).catch(function (e) { caption.textContent = 'ERROR ' + e.message; });
})();
