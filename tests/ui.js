/* Ledger Revival — UI 冒烟测试：在 iframe 中驱动 index.html。 */
(function () {
  'use strict';

  var out = document.getElementById('out');
  var frame = document.getElementById('app');
  var mode = new URLSearchParams(location.search).get('mode') || 'sample';
  var checks = [];

  function check(name, ok, info) { checks.push({ name: name, ok: !!ok, info: info }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function finish() {
    var failed = checks.filter(function (c) { return !c.ok; });
    out.textContent = (failed.length ? 'FAIL ' + failed.length : 'PASS ' + checks.length) + '/' + checks.length + '\n' +
      checks.map(function (c) { return (c.ok ? 'ok   ' : 'FAIL ') + c.name + (c.info != null ? '  [' + c.info + ']' : ''); }).join('\n');
  }

  function readFile(path) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('GET', path);
      x.responseType = 'arraybuffer';
      x.onload = function () { resolve(x.response); };
      x.onerror = reject;
      x.send();
    });
  }

  frame.addEventListener('load', function () {
    run().catch(function (e) { check('unexpected error', false, e.message); }).then(finish);
  });

  async function run() {
    var w = frame.contentWindow;
    var d = frame.contentDocument;
    check('scripts loaded under CSP', w.LR && w.LR.parser && w.LR.csv && w.LR.filter);

    // CSP 应阻止任何外发请求：必须收到 connect-src 违规事件，而不只是普通网络错误
    var violation = null;
    d.addEventListener('securitypolicyviolation', function (e) { violation = e.effectiveDirective || e.violatedDirective; });
    var blocked = false;
    try { await w.fetch('https://example.com/collect', { method: 'POST', body: 'x' }); } catch (e) { blocked = true; }
    await wait(50);
    check('CSP blocks outbound fetch (connect-src violation)', blocked && /^connect-src/.test(violation || ''), violation);

    if (mode === 'csv') {
      var buf = await readFile('../samples/legacy-export.csv');
      var dt = new w.DataTransfer();
      dt.items.add(new w.File([buf], 'legacy-export.csv', { type: 'text/csv' }));
      var input = d.getElementById('file-input');
      input.files = dt.files;
      input.dispatchEvent(new w.Event('change'));
      await wait(500);
      var rows = d.querySelectorAll('#tbody tr');
      check('csv import renders 8 rows', rows.length === 8, rows.length);
      check('csv header recognised', /已识别表头/.test(d.getElementById('status-msg').textContent), d.getElementById('status-msg').textContent);
      var r3 = rows[2] && rows[2].children;
      check('csv quoted newline kept in item', r3 && r3[3].textContent.indexOf('\n') > 0, r3 && JSON.stringify(r3[3].textContent));
      check('csv 施工中 → 进行中', r3 && r3[5].textContent === '进行中');
      var r7 = rows[6] && rows[6].children;
      check('csv 1.5万 → 15,000.00', r7 && r7[4].textContent === '15,000.00', r7 && r7[4].textContent);
      return;
    }

    d.getElementById('btn-sample').click();
    await wait(200);
    var trs = d.querySelectorAll('#tbody tr');
    check('sample renders 15 rows', trs.length === 15, trs.length);
    check('result panel visible', !d.getElementById('result-panel').hidden);
    check('uncertain cells marked', d.querySelectorAll('#tbody td.unsure').length > 0, d.querySelectorAll('#tbody td.unsure').length);
    check('export enabled', !d.getElementById('btn-export').disabled);

    // 关键词搜索 + 高亮
    var kw = d.getElementById('f-keyword');
    kw.value = '行政部 茶歇';
    kw.dispatchEvent(new w.Event('input'));
    await wait(250);
    check('keyword filters to 1 row', d.querySelectorAll('#tbody tr').length === 1, d.querySelectorAll('#tbody tr').length);
    check('matches highlighted with <mark>', d.querySelectorAll('#tbody mark').length >= 2, d.querySelectorAll('#tbody mark').length);

    // 无结果 → 导出禁用
    kw.value = '不存在的词';
    kw.dispatchEvent(new w.Event('input'));
    await wait(250);
    check('no result disables export', d.getElementById('btn-export').disabled && !d.getElementById('empty-msg').hidden);

    // 下拉筛选
    d.getElementById('btn-reset').click();
    var st = d.getElementById('f-status');
    st.value = '已逾期';
    st.dispatchEvent(new w.Event('change'));
    await wait(50);
    check('status dropdown filters to 2 rows', d.querySelectorAll('#tbody tr').length === 2);
    d.getElementById('btn-reset').click();
    await wait(50);
    check('clear filters restores 15 rows', d.querySelectorAll('#tbody tr').length === 15);

    // 用户文本不会被当作 HTML
    var ta = d.getElementById('raw-input');
    ta.value = '2026-01-01 <img src=x onerror=alert(1)>公司 测试 1元 完成 王五';
    d.getElementById('btn-revive').click();
    await wait(100);
    check('user text rendered as text, not HTML', d.querySelectorAll('#tbody img').length === 0 && /<img/.test(d.getElementById('tbody').textContent));

    // 存储 API 未被写入
    check('no localStorage / cookies written', w.localStorage.length === 0 && d.cookie === '');

    // 恢复示例用于截图
    d.getElementById('btn-sample').click();
    await wait(100);
  }
})();
