/* Ledger Revival — 台账文本 → 结构化记录（纯函数，无 DOM、无网络） */
(function (root) {
  'use strict';

  var LR = root.LR = root.LR || {};

  var FIELDS = ['date', 'party', 'item', 'amount', 'status', 'owner'];

  /* ---------- 词表 ---------- */

  // 字段标签 / 表头同义词
  var LABELS = {
    date: ['日期', '时间', '发生日期', '登记日期', '业务日期', 'date'],
    party: ['单位/对象', '单位', '对象', '客户', '供应商', '往来单位', '对方单位', '部门', '对方', 'party', 'vendor', 'customer'],
    item: ['事项', '内容', '摘要', '事由', '用途', '说明', '项目', 'item', 'description', 'desc'],
    amount: ['金额', '费用', '款项', '价格', '合计', 'amount', 'total'],
    status: ['状态', '进度', 'status'],
    owner: ['责任人', '负责人', '经办人', '经手人', '联系人', 'owner', 'assignee']
  };

  var LABEL_TO_FIELD = {};
  Object.keys(LABELS).forEach(function (f) {
    LABELS[f].forEach(function (l) { LABEL_TO_FIELD[l.toLowerCase()] = f; });
  });

  // 状态关键词 → 规范状态
  var STATUS_GROUPS = {
    '已完成': ['已完成', '完成', '已结清', '结清', '已付款', '已付', '已支付', '已收款', '已收', '已办结', '办结',
      '已关闭', '关闭', '已解决', '已处理', '已归档', '已验收', 'done', 'completed', 'closed', 'paid', 'finished'],
    '进行中': ['进行中', '处理中', '办理中', '执行中', '跟进中', '审批中', '审核中', '施工中', '在办',
      'in progress', 'processing', 'ongoing', 'doing'],
    '待处理': ['待处理', '待办', '未处理', '未完成', '待付款', '待付', '未付', '未付款', '未支付', '待收款', '未收款',
      '未结清', '待审批', '待审核', '待确认', '未开始', '挂起', 'pending', 'todo', 'open', 'unpaid'],
    '已取消': ['已取消', '取消', '已作废', '作废', '已撤销', '撤销', 'cancelled', 'canceled', 'void'],
    '已逾期': ['已逾期', '逾期', '超期', 'overdue']
  };
  var CANONICAL_STATUSES = Object.keys(STATUS_GROUPS);

  var STATUS_EXACT = {};      // 小写关键词 → 规范状态
  var STATUS_SUBSTR = [];     // 允许在长文本中子串匹配的关键词（按长度降序）
  var SUBSTR_SHORT_OK = ['逾期', '超期', '作废', '挂起', '待办', '待付', '未付'];
  CANONICAL_STATUSES.forEach(function (canon) {
    STATUS_GROUPS[canon].forEach(function (k) {
      STATUS_EXACT[k.toLowerCase()] = canon;
      var isHan = /^[\u4e00-\u9fa5]+$/.test(k);
      if (isHan && (k.length >= 3 || SUBSTR_SHORT_OK.indexOf(k) >= 0)) STATUS_SUBSTR.push([k, canon]);
    });
  });
  STATUS_SUBSTR.sort(function (a, b) { return b[0].length - a[0].length; });

  // 常见姓氏（单姓 + 复姓）
  var SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤常温康施文牛樊葛邢安齐易乔伍庞颜倪庄聂章鲁岳翟殷詹申欧耿关兰焦俞左柳甘祝包宁尚符舒阮柯纪梅童凌毕单季裴霍涂成苗谷盛曲翁冉骆蓝路游辛靳管柴蒙鲍华喻祁蒲房滕屈饶解牟艾尤阳时穆农司卓古吉缪简车项连芦麦褚娄窦戚岑景党宫费卜冷晏席卫米柏宗瞿桂全佟应臧闵苟邬边卞姬师和仇栾隋商刁沙荣巫寇桑郎甄丛仲虞敖巩明佘池查麻苑迟邝';
  var COMPOUND_SURNAMES = ['欧阳', '司马', '上官', '诸葛', '东方', '皇甫', '令狐', '慕容', '尉迟', '公孙', '夏侯', '长孙'];

  // 以常见姓氏字开头、但不是人名的常用词
  var NAME_STOPWORDS = ('安装 管理 成本 方案 项目 高压 路灯 计划 包装 石材 钢材 水电 电费 水费 房租 申请 采购 报销 支付 付款 收款 ' +
    '维护 保养 检修 施工 设计 监理 验收 培训 会议 差旅 办公 宣传 物业 保洁 绿化 修缮 改造 更换 检测 咨询 服务 运输 租赁 ' +
    '材料 设备 工程 合同 发票 备用 其他 杂费 临时 应急 年度 季度 月度 日常 常规 安全 消防 通讯 网络 软件 硬件 系统 平台 ' +
    '数据 文件 资料 档案 印刷 打印 复印 快递 邮寄 餐费 招待 车辆 加油 停车 过路 住宿 交通 方便 文具 文印 明细 单据 ' +
    '冲红 冲销 退款 退货 押金 定金 尾款 首付 预付 余款 万元 金额 费用 江堤 管道 管网 路面 关于 应付 应收 成品 和解').split(' ');

  // 组织后缀：词尾出现即视为单位
  var ORG_SUFFIX_END = /(有限公司|有限责任公司|公司|集团|事务所|委员会|办公室|研究院|设计院|中心|银行|医院|学校|中学|小学|大学|学院|幼儿园|街道|社区|村委会|协会|工作室|局|处|厂|院|所|部|科|站|队|办|店|社|馆|行|委|村|镇)$/;
  // 组织后缀：嵌在长文本中间时用于切分（排除容易误切的单字后缀）
  var ORG_SUFFIX_EMBED = /^(.+?(?:有限公司|有限责任公司|公司|集团|事务所|委员会|办公室|研究院|设计院|中心|银行|医院|学校|中学|小学|大学|学院|街道|社区|局(?![部面势])|处(?![理置罚分])|厂(?![房区商家]))|.+?院(?![子内落]))(.{2,})$/;

  var OWNER_LABEL_NO_COLON = /^(.*?)(?:责任人|负责人|经办人|经手人|联系人)\s*([\u4e00-\u9fa5]{2,4})$/;

  /* ---------- 工具 ---------- */

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }
  function byLenDesc(a, b) { return b.length - a.length; }
  function trim(s) { return s.replace(/^[\s\u0001]+|[\s\u0001]+$/g, ''); }
  var SEP_TRIM = /^[\s,;|、\u0001]+|[\s,;|、\u0001]+$/g;
  function trimSep(s) { return s.replace(SEP_TRIM, ''); }
  var CUT = '\u0001';
  function cut(s, index, length) { return s.slice(0, index) + CUT + s.slice(index + length); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** 全角转半角、去零宽字符、去千分位、货币符号与数字合并 */
  function prep(s) {
    return String(s == null ? '' : s)
      .replace(/[\uFF01-\uFF5E]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/\u3000/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
      .replace(/(RMB|CNY|人民币|¥|￥|\$)\s+(?=[-+]?\d)/gi, '$1');
  }

  var STRONG_SEP = /\t|\s*\|\s*|\s*[,;、]\s*|\s{2,}/;
  function tokenize(line) {
    var parts = line.split(STRONG_SEP).map(trim).filter(Boolean);
    if (parts.length <= 1) parts = line.trim().split(/\s+/).filter(Boolean);
    return parts;
  }

  /* ---------- 日期 ---------- */

  function validDate(y, m, d) {
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
    var days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return d <= days[m - 1];
  }

  var DATE_PATTERNS = [
    { re: /(?<!\d)(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?!\d)/g, year: true },
    { re: /(?<!\d)(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})[日号]?/g, year: true },
    { re: /(?<!\d)(\d{4})(\d{2})(\d{2})(?!\d)/g, year: true, compact: true },
    { re: /(?<![\d年])(\d{1,2})月\s*(\d{1,2})[日号]?/g, year: false }
  ];

  /** 在字符串中找第一个合法日期。返回 { index, length, value, unsure } 或 null。 */
  function findDate(s, ctx) {
    for (var p = 0; p < DATE_PATTERNS.length; p++) {
      var pat = DATE_PATTERNS[p];
      pat.re.lastIndex = 0;
      var m;
      while ((m = pat.re.exec(s))) {
        var y, mo, d;
        if (pat.year) { y = +m[1]; mo = +m[2]; d = +m[3]; } else { y = ctx.lastYear || ctx.defaultYear; mo = +m[1]; d = +m[2]; }
        if (pat.compact && (y < 1990 || y > 2099)) continue;
        if (!validDate(y, mo, d)) continue;
        if (pat.year) ctx.lastYear = y;
        return { index: m.index, length: m[0].length, value: y + '-' + pad2(mo) + '-' + pad2(d), unsure: !pat.year };
      }
    }
    return null;
  }

  /* ---------- 金额 ---------- */

  var BARE_NUMBER = /^[-+]?\d+(?:\.\d+)?$/;
  var AMOUNT_RE = /(RMB|CNY|人民币|¥|￥|\$)?([-+]?)(\d+(?:\.\d+)?)\s*(万元|万|元|块)?/gi;

  function toAmount(numStr, sign, unit) {
    var v = parseFloat(numStr);
    if (unit === '万' || unit === '万元') v = v * 10000;
    v = Math.round(v * 100) / 100;
    return sign === '-' ? -v : v;
  }

  /** 找金额：整个 token 是裸数字，或数字带货币前缀/后缀。 */
  function findAmount(s) {
    var t = trim(s);
    if (BARE_NUMBER.test(t)) {
      return { index: s.indexOf(t), length: t.length, value: toAmount(t.replace(/^[-+]/, ''), t[0] === '-' ? '-' : '', '') };
    }
    AMOUNT_RE.lastIndex = 0;
    var m;
    while ((m = AMOUNT_RE.exec(s))) {
      if (!m[1] && !m[4]) continue;
      var sign = m[2];
      var start = m.index;
      // 负号只在开头、空白或货币符号后才算数（避免 “维修-500元” 这类连字符）
      if (sign && !m[1] && start > 0 && !/[\s\u0001(:=]/.test(s[start - 1])) sign = '';
      return { index: start, length: m[0].length, value: toAmount(m[3], sign, m[4]) };
    }
    return null;
  }

  /* ---------- 状态 ---------- */

  /** 精确匹配（整个 token）→ { value, unsure:false }；子串匹配 → unsure:true */
  function findStatus(s) {
    var t = trim(s).toLowerCase();
    if (STATUS_EXACT[t]) return { index: s.indexOf(trim(s)), length: trim(s).length, value: STATUS_EXACT[t], unsure: false };
    for (var i = 0; i < STATUS_SUBSTR.length; i++) {
      var idx = s.indexOf(STATUS_SUBSTR[i][0]);
      if (idx >= 0) return { index: idx, length: STATUS_SUBSTR[i][0].length, value: STATUS_SUBSTR[i][1], unsure: true };
    }
    return null;
  }

  /** 已标注的状态值：识别则规范化，否则保留原文并标为待核对 */
  function normalizeStatusValue(v) {
    var found = findStatus(v);
    if (found) return { value: found.value, unsure: false };
    return { value: trim(v), unsure: true };
  }

  /* ---------- 人名 / 单位 ---------- */

  function looksLikeName(s) {
    if (!/^[\u4e00-\u9fa5]{2,4}$/.test(s)) return false;
    if (NAME_STOPWORDS.indexOf(s) >= 0 || NAME_STOPWORDS.indexOf(s.slice(0, 2)) >= 0) return false;
    if (ORG_SUFFIX_END.test(s) || STATUS_EXACT[s]) return false;
    if (COMPOUND_SURNAMES.indexOf(s.slice(0, 2)) >= 0) return s.length >= 3;
    return s.length <= 3 && SURNAMES.indexOf(s[0]) >= 0;
  }

  /* ---------- 记录组装 ---------- */

  function emptyRecord(raw) {
    return {
      id: 0, date: '', party: '', item: '', amount: null, status: '', owner: '', raw: raw,
      unsure: { date: false, party: false, item: false, amount: false, status: false, owner: false }
    };
  }

  function appendText(rec, field, text) {
    rec[field] = rec[field] ? rec[field] + ' ' + text : text;
  }

  /**
   * 把一个已知字段的值写入记录（来自标签或表头列）。
   * 返回没被消费的剩余文本，交给启发式继续识别。
   */
  function assignKnown(rec, field, value, ctx) {
    var v = trimSep(value);
    if (!v) return '';
    if (field === 'date') {
      if (rec.date) return v;
      var d = findDate(v, ctx);
      if (!d) { rec.unsure.date = true; return v; }
      rec.date = d.value; rec.unsure.date = d.unsure;
      return trimSep(cut(v, d.index, d.length));
    }
    if (field === 'amount') {
      if (rec.amount != null) return v;
      var a = findAmount(v);
      if (!a) { rec.unsure.amount = true; return v; }
      rec.amount = a.value;
      return trimSep(cut(v, a.index, a.length));
    }
    if (field === 'status') {
      if (rec.status) return v;
      var st = normalizeStatusValue(v);
      rec.status = st.value; rec.unsure.status = st.unsure;
      return '';
    }
    if (field === 'owner') {
      if (rec.owner) return v;
      var words = v.split(/\s+/);
      rec.owner = words.shift();
      return words.join(' ');
    }
    appendText(rec, field, v);   // party / item
    return '';
  }

  var LABEL_RE = new RegExp('(?<![a-z])(' + Object.keys(LABEL_TO_FIELD).sort(byLenDesc).map(escapeRe).join('|') + ')\\s*[:=]\\s*', 'gi');

  /** 标签识别：“日期:xxx 单位:yyy”。返回未被标签覆盖的剩余文本。 */
  function applyLabels(rec, line, ctx) {
    LABEL_RE.lastIndex = 0;
    var matches = [];
    var m;
    while ((m = LABEL_RE.exec(line))) matches.push({ start: m.index, end: m.index + m[0].length, field: LABEL_TO_FIELD[m[1].toLowerCase()] });
    if (!matches.length) return line;

    var rest = [line.slice(0, matches[0].start)];
    matches.forEach(function (mt, i) {
      var valueEnd = i + 1 < matches.length ? matches[i + 1].start : line.length;
      rest.push(assignKnown(rec, mt.field, line.slice(mt.end, valueEnd), ctx));
    });
    return rest.map(trimSep).filter(Boolean).join('\t');
  }

  /** 从一个 token 中依次剥离日期、金额、状态，返回剩余碎片 */
  function peel(token, rec, ctx) {
    var s = token;
    if (!rec.date) {
      var d = findDate(s, ctx);
      if (d) { rec.date = d.value; rec.unsure.date = d.unsure; s = cut(s, d.index, d.length); }
    }
    if (rec.amount == null) {
      var a = findAmount(s);
      if (a) { rec.amount = a.value; rec.unsure.amount = false; s = cut(s, a.index, a.length); }
    }
    if (!rec.status) {
      var st = findStatus(s);
      if (st) { rec.status = st.value; rec.unsure.status = st.unsure; s = cut(s, st.index, st.length); }
    }
    return s.split(CUT).map(trimSep).filter(Boolean);
  }

  /** 启发式：从剩余碎片中找责任人、单位、事项 */
  function assignRest(rec, pieces) {
    var i;

    // 责任人：带标签但无冒号（“经办人周婷”）
    if (!rec.owner) {
      for (i = 0; i < pieces.length; i++) {
        var ml = pieces[i].match(OWNER_LABEL_NO_COLON);
        if (ml) {
          rec.owner = ml[2];
          pieces[i] = trimSep(ml[1]);
          break;
        }
      }
      pieces = pieces.filter(Boolean);
    }

    // 责任人：最后一个像人名的碎片
    if (!rec.owner) {
      for (i = pieces.length - 1; i >= 0; i--) {
        var words = pieces[i].split(/\s+/);
        var last = words[words.length - 1];
        if (looksLikeName(last)) {
          rec.owner = last;
          rec.unsure.owner = !(i === pieces.length - 1 && (pieces.length >= 2 || words.length >= 2));
          words.pop();
          pieces[i] = words.join(' ');
          break;
        }
      }
      pieces = pieces.filter(Boolean);
    }

    // 单位：词尾是组织后缀
    if (!rec.party) {
      outer:
      for (i = 0; i < pieces.length; i++) {
        var ws = pieces[i].split(/\s+/);
        for (var w = 0; w < ws.length; w++) {
          if (ws[w].length >= 2 && ORG_SUFFIX_END.test(ws[w])) {
            rec.party = ws[w];
            ws.splice(w, 1);
            pieces[i] = ws.join(' ');
            break outer;
          }
        }
      }
      pieces = pieces.filter(Boolean);
    }

    // 单位：组织后缀嵌在文本中间（“市政工程处管道维修”）
    if (!rec.party) {
      for (i = 0; i < pieces.length; i++) {
        var me = pieces[i].match(ORG_SUFFIX_EMBED);
        if (me && me[1].length >= 3) {
          rec.party = me[1];
          rec.unsure.party = true;
          pieces[i] = trimSep(me[2]);
          break;
        }
      }
      pieces = pieces.filter(Boolean);
    }

    // 单位：兜底取第一个碎片（至少还剩两个碎片时）
    if (!rec.party && pieces.length >= 2) {
      rec.party = pieces.shift();
      rec.unsure.party = true;
    }

    if (pieces.length) appendText(rec, 'item', pieces.join(' '));
  }

  function heuristic(rec, text, ctx) {
    var tokens = tokenize(text);
    var pieces = [];
    tokens.forEach(function (t) { pieces = pieces.concat(peel(t, rec, ctx)); });
    assignRest(rec, pieces);
  }

  function finalize(rec) {
    FIELDS.forEach(function (f) {
      var empty = f === 'amount' ? rec.amount == null : !rec[f];
      if (empty) rec.unsure[f] = true;
    });
    return rec;
  }

  /** 解析一行自由文本 */
  function parseLine(raw, ctx) {
    var rec = emptyRecord(raw);
    var rest = applyLabels(rec, prep(raw), ctx);
    if (rest) heuristic(rec, rest, ctx);
    return finalize(rec);
  }

  /** 按表头列映射解析一行单元格；未映射的列交给启发式 */
  function parseCells(cells, map, raw, ctx) {
    var rec = emptyRecord(raw);
    var pool = [];
    cells.forEach(function (cell, i) {
      var v = prep(cell);
      if (!trimSep(v)) return;
      var left = map[i] ? assignKnown(rec, map[i], v, ctx) : v;
      if (left) pool.push(left);
    });
    if (pool.length) heuristic(rec, pool.join('\t'), ctx);
    return finalize(rec);
  }

  /* ---------- 表头 ---------- */

  function headerKey(cell) {
    return prep(cell).toLowerCase().replace(/[(（][^)）]*[)）]/g, '').replace(/\s+/g, '').replace(/[:=]$/, '');
  }

  /** 若 cells 是表头则返回 index→field 映射，否则返回 null */
  function detectHeader(cells) {
    var map = [];
    var used = {};
    var hits = 0;
    cells.forEach(function (c, i) {
      var f = LABEL_TO_FIELD[headerKey(c)];
      if (f && !used[f]) { map[i] = f; used[f] = true; hits++; } else { map[i] = null; }
    });
    return hits >= 2 && hits * 2 >= cells.length ? map : null;
  }

  /* ---------- 入口 ---------- */

  var SEPARATOR_LINE = /^[\s\-=_*#~|,.·—]+$/;

  function makeCtx(opts) {
    return { lastYear: null, defaultYear: (opts && opts.year) || new Date().getFullYear() };
  }

  function number(records) {
    records.forEach(function (r, i) { r.id = i + 1; });
    return records;
  }

  /** 解析多行粘贴文本 */
  function parseText(text, opts) {
    var ctx = makeCtx(opts);
    var lines = String(text || '').split(/\r\n|\r|\n/);
    var records = [];
    var header = null;
    var skipped = 0;
    var seenContent = false;

    lines.forEach(function (line) {
      if (!line.trim() || SEPARATOR_LINE.test(line)) { if (line.trim()) skipped++; return; }
      var cells = tokenize(prep(line));
      if (!seenContent) {
        seenContent = true;
        header = detectHeader(cells);
        if (header) return;
      }
      if (header && cells.length === header.length) records.push(parseCells(cells, header, line, ctx));
      else records.push(parseLine(line, ctx));
    });

    return { records: number(records), headerFields: header, skipped: skipped };
  }

  /** 解析 CSV 行（string[][]） */
  function parseRows(rows, opts) {
    var ctx = makeCtx(opts);
    var records = [];
    var header = rows.length ? detectHeader(rows[0]) : null;
    rows.forEach(function (cells, idx) {
      if (header && idx === 0) return;
      var raw = cells.join(' | ');
      var rec = header ? parseCells(cells, header, raw, ctx) : parseLine(cells.join('\t'), ctx);
      rec.raw = raw;
      records.push(rec);
    });
    return { records: number(records), headerFields: header, skipped: 0 };
  }

  LR.parser = {
    FIELDS: FIELDS,
    CANONICAL_STATUSES: CANONICAL_STATUSES,
    parseText: parseText,
    parseRows: parseRows,
    // 以下导出供测试使用
    _prep: prep,
    _tokenize: tokenize,
    _findDate: findDate,
    _findAmount: findAmount,
    _findStatus: findStatus,
    _looksLikeName: looksLikeName,
    _detectHeader: detectHeader
  };
})(typeof window !== 'undefined' ? window : this);
