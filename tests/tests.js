/* Ledger Revival — 无依赖测试套件。结果写入 #out，首行为 PASS n/n 或 FAIL k/n。 */
(function () {
  'use strict';

  var LR = window.LR;
  var P = LR.parser;
  var results = [];

  function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function test(name, fn) {
    try { fn(); results.push({ name: name, ok: true }); }
    catch (e) { results.push({ name: name, ok: false, err: e.message }); }
  }
  function expect(actual, expected, label) {
    if (!eq(actual, expected)) throw new Error((label || '') + ' expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual));
  }
  function pick(r) { return { date: r.date, party: r.party, item: r.item, amount: r.amount, status: r.status, owner: r.owner }; }
  function one(line) { return P.parseText(line, { year: 2026 }).records[0]; }

  /* ---------- 日期 ---------- */
  test('date formats', function () {
    var ctx = { lastYear: null, defaultYear: 2026 };
    [['2026-10-03', '2026-10-03'], ['2026/1/5', '2026-01-05'], ['2026.11.08', '2026-11-08'], ['20261015', '2026-10-15'],
      ['2026年10月8日', '2026-10-08'], ['2026年 3月 9号', '2026-03-09']].forEach(function (c) {
      expect(P._findDate(c[0], ctx).value, c[1], c[0]);
    });
  });
  test('invalid calendar dates rejected', function () {
    var ctx = { lastYear: null, defaultYear: 2026 };
    expect(P._findDate('2023-02-30', ctx), null);
    expect(P._findDate('2024-02-29', ctx).value, '2024-02-29');
    expect(P._findDate('2023-13-01', ctx), null);
  });
  test('missing year uses previous full date, else default; marked unsure', function () {
    var res = P.parseText('2024-12-30 甲公司 A 1元\n1月2日 乙公司 B 2元', { year: 2026 });
    expect(res.records[1].date, '2024-01-02');
    expect(res.records[1].unsure.date, true);
    expect(one('3月4日 乙公司 B 2元').date, '2026-03-04');
  });

  /* ---------- 金额 ---------- */
  test('amount formats', function () {
    [['¥18420.50', 18420.5], ['3600元', 3600], ['1.2万', 12000], ['0.07万元', 700], ['RMB7800', 7800], ['￥9999', 9999],
      ['-1200元', -1200], ['6800', 6800], ['$12.5', 12.5]].forEach(function (c) {
      expect(P._findAmount(c[0]).value, c[1], c[0]);
    });
    expect(P._findAmount('3号楼'), null);
  });
  test('thousands separators and currency spacing in prep', function () {
    expect(P._prep('¥18,420.50'), '¥18420.50');
    expect(P._prep('RMB 7,800'), 'RMB7800');
    expect(P._prep('１２，５００元'), '12500元');
  });

  /* ---------- 状态 ---------- */
  test('status normalisation', function () {
    [['已付款', '已完成'], ['待付', '待处理'], ['审批中', '进行中'], ['已作废', '已取消'], ['逾期', '已逾期'],
      ['未完成', '待处理'], ['未结清', '待处理'], ['DONE', '已完成']].forEach(function (c) {
      expect(P._findStatus(c[0]).value, c[1], c[0]);
    });
  });
  test('short ambiguous status words only match whole tokens', function () {
    expect(P._findStatus('完成验收报告'), null);
    expect(P._findStatus('完成').value, '已完成');
  });

  /* ---------- 人名 ---------- */
  test('name detection', function () {
    expect(P._looksLikeName('王建国'), true);
    expect(P._looksLikeName('欧阳娜娜'), true);
    expect(P._looksLikeName('安装'), false);
    expect(P._looksLikeName('城西供电局'), false);
    expect(P._looksLikeName('维修'), false);
  });

  /* ---------- 整行解析 ---------- */
  var SAMPLE_EXPECTED = [
    { date: '2026-10-03', party: '城西供电局', item: '第三季度电费', amount: 18420.5, status: '已完成', owner: '王建国' },
    { date: '2026-10-05', party: '晨光印刷有限公司', item: '宣传册印制', amount: 3600, status: '待处理', owner: '李晓红' },
    { date: '2026-10-08', party: '市政工程管理处', item: '北门管道抢修', amount: 12000, status: '进行中', owner: '张伟' },
    { date: '2026-10-09', party: '恒达物业服务中心', item: '9月物业费', amount: 6800, status: '已完成', owner: '刘洋' },
    { date: '2026-10-12', party: '蓝鲸网络科技公司', item: '机房交换机维保', amount: 4500, status: '进行中', owner: '陈静' },
    { date: '2026-10-15', party: '第一人民医院', item: '职工体检', amount: 32000, status: '已完成', owner: '赵敏' },
    { date: '2026-10-18', party: '绿野园林公司', item: '厂区绿化补种', amount: 2350, status: '已逾期', owner: '孙磊' },
    { date: '2026-10-21', party: '', item: '采购办公用品', amount: 860, status: '待处理', owner: '周婷' },
    { date: '2026-10-23', party: '华信会计师事务所', item: '年度审计费', amount: 25000, status: '已完成', owner: '吴昊' },
    { date: '2026-10-26', party: '城东自来水公司', item: '10月水费', amount: 1275.8, status: '已取消', owner: '郑凯' },
    { date: '2026-10-28', party: '东方物流集团', item: '设备运输', amount: 7800, status: '进行中', owner: '何芳' },
    { date: '2026-10-30', party: '市第二中学', item: '实习合作协议盖章', amount: null, status: '待处理', owner: '马超' },
    { date: '2026-11-02', party: '行政部', item: '安保服务费 冲红', amount: -1200, status: '已完成', owner: '罗斌' },
    { date: '2026-11-05', party: '行政部', item: '会议茶歇', amount: 560, status: '已完成', owner: '林悦' },
    { date: '2026-11-08', party: '星河软件公司', item: 'OA系统年费', amount: 9999, status: '已逾期', owner: '郭峰' }
  ];

  test('full sample text parses to expected records', function () {
    var res = P.parseText(LR.sample, { year: 2026 });
    expect(res.records.length, SAMPLE_EXPECTED.length, 'count');
    expect(res.skipped, 1, 'skipped');
    res.records.forEach(function (r, i) { expect(pick(r), SAMPLE_EXPECTED[i], 'line ' + (i + 1)); });
  });

  test('uncertainty flags', function () {
    var res = P.parseText(LR.sample, { year: 2026 });
    expect(res.records[0].unsure, { date: false, party: false, item: false, amount: false, status: false, owner: false }, 'line1');
    expect(res.records[3].unsure.date, true, 'missing year');
    expect(res.records[7].unsure.party, true, 'empty party');
    expect(res.records[8].unsure.party, true, 'embedded split');
    expect(res.records[11].unsure.amount, true, 'empty amount');
  });

  test('determinism', function () {
    var a = P.parseText(LR.sample, { year: 2026 });
    var b = P.parseText(LR.sample, { year: 2026 });
    expect(a, b);
  });

  test('header line maps columns by position', function () {
    var res = P.parseText('日期 单位 事项 金额 状态 责任人\n2026-01-02 甲方 安装 100 完成 李四', { year: 2026 });
    expect(res.headerFields, ['date', 'party', 'item', 'amount', 'status', 'owner']);
    expect(res.records.length, 1);
    expect(pick(res.records[0]), { date: '2026-01-02', party: '甲方', item: '安装', amount: 100, status: '已完成', owner: '李四' });
    expect(res.records[0].unsure.party, false);
  });

  test('unparseable line still yields a record', function () {
    var r = one('随便写的一句话');
    expect(r.item, '随便写的一句话');
    expect(r.unsure.date && r.unsure.amount && r.unsure.status, true);
  });

  /* ---------- CSV ---------- */
  test('csv parse with quotes, escaped quotes, newline in field', function () {
    var rows = LR.csv.parse('a,b,c\r\n1,"x, y","say ""hi"""\n2,"line1\nline2",\n\n');
    expect(rows, [['a', 'b', 'c'], ['1', 'x, y', 'say "hi"'], ['2', 'line1\nline2', '']]);
  });
  test('csv delimiter detection', function () {
    expect(LR.csv.detectDelimiter('a;b;c\n1;2;3'), ';');
    expect(LR.csv.detectDelimiter('a\tb\n1\t2'), '\t');
    expect(LR.csv.detectDelimiter('a,b\n"1;2",3'), ',');
  });
  test('csv decode utf-8 with BOM and GBK fallback', function () {
    var utf8 = new Uint8Array([0xEF, 0xBB, 0xBF, 0xE6, 0x97, 0xA5]);   // BOM + 日
    expect(LR.csv.decode(utf8.buffer), '日');
    var gbk = new Uint8Array([0xC8, 0xD5, 0xC6, 0xDA]);   // 日期 (GBK)
    expect(LR.csv.decode(gbk.buffer), '日期');
  });
  test('csv rows with header aliases', function () {
    var text = '登记日期,往来单位,摘要,金额(元),进度,经办人\n2026-09-02,城西供电局,"8月电费","16,880.00",已付款,王建国\n2026-09-30,华信会计师事务所,半年度审计,,已取消,吴昊';
    var res = P.parseRows(LR.csv.parse(text), { year: 2026 });
    expect(res.records.length, 2);
    expect(pick(res.records[0]), { date: '2026-09-02', party: '城西供电局', item: '8月电费', amount: 16880, status: '已完成', owner: '王建国' });
    expect(res.records[1].amount, null);
    expect(res.records[0].raw, '2026-09-02 | 城西供电局 | 8月电费 | 16,880.00 | 已付款 | 王建国');
  });
  test('csv rows without header use heuristics', function () {
    var res = P.parseRows([['2026-01-02', '甲公司', '打印纸', '¥300', '已付', '王五']], { year: 2026 });
    expect(pick(res.records[0]), { date: '2026-01-02', party: '甲公司', item: '打印纸', amount: 300, status: '已完成', owner: '王五' });
  });

  /* ---------- 导出 ---------- */
  test('export: BOM, header, quoting, injection guard, numeric amount', function () {
    var out = LR.csv.recordsToCSV([{ date: '2026-01-02', party: '=HYPERLINK("x")', item: 'a,b', amount: -5, status: '已完成', owner: '@me', raw: 'line "q"' }]);
    expect(out.charAt(0), '\uFEFF');
    var lines = out.slice(1).split('\r\n');
    expect(lines[0], '日期,单位/对象,事项,金额,状态,责任人,原文');
    expect(lines[1], '2026-01-02,"\'=HYPERLINK(""x"")","a,b",-5,已完成,\'@me,"line ""q"""');
  });
  test('export round-trips through parse', function () {
    var recs = P.parseText(LR.sample, { year: 2026 }).records;
    var rows = LR.csv.parse(LR.csv.recordsToCSV(recs));
    expect(rows.length, recs.length + 1);
    expect(rows[3][2], '北门管道抢修');
    expect(rows[3][3], '12000');
  });

  /* ---------- 筛选 ---------- */
  test('filters', function () {
    var recs = LR.filter.index(P.parseText(LR.sample, { year: 2026 }).records);
    var F = LR.filter.apply;
    expect(F(recs, {}).length, 15);
    expect(F(recs, { keyword: '物业' }).length, 1);
    expect(F(recs, { keyword: '行政部 茶歇' }).map(function (r) { return r.id; }), [14]);
    expect(F(recs, { keyword: 'oa' }).length, 1, 'case-insensitive');
    expect(F(recs, { status: '已逾期' }).length, 2);
    expect(F(recs, { dateFrom: '2026-11-01' }).length, 3);
    expect(F(recs, { dateFrom: '2026-10-10', dateTo: '2026-10-20' }).length, 3);
    expect(F(recs, { amountMin: '10000' }).length, 4);
    expect(F(recs, { amountMax: '0' }).length, 1);
    expect(F(recs, { item: '费', status: '已完成' }).length, 4);
    expect(F(recs, { party: '行政部', owner: '林悦' }).length, 1);
    expect(LR.filter.sum(F(recs, { party: '行政部' })), -640);
    expect(LR.filter.distinct(recs, 'status').length, 5);
  });

  test('performance: 5,000 records parse and filter', function () {
    var lines = [];
    for (var i = 0; i < 5000; i++) lines.push(LR.sample.split('\n')[i % 14]);
    var t0 = performance.now();
    var recs = LR.filter.index(P.parseText(lines.join('\n'), { year: 2026 }).records);
    var t1 = performance.now();
    LR.filter.apply(recs, { keyword: '公司 已完成', amountMin: '1000' });
    var t2 = performance.now();
    if (t2 - t1 > 100) throw new Error('filter took ' + Math.round(t2 - t1) + 'ms');
    results.push({ name: '  (parse 5000: ' + Math.round(t1 - t0) + 'ms, filter: ' + Math.round(t2 - t1) + 'ms)', ok: true, info: true });
  });

  /* ---------- 输出 ---------- */
  var real = results.filter(function (r) { return !r.info; });
  var failed = real.filter(function (r) { return !r.ok; });
  var head = (failed.length ? 'FAIL ' + failed.length : 'PASS ' + real.length) + '/' + real.length;
  document.getElementById('out').textContent = head + '\n' + results.map(function (r) {
    return (r.info ? '' : (r.ok ? 'ok   ' : 'FAIL ')) + r.name + (r.err ? '\n       ' + r.err : '');
  }).join('\n');
})();
