/* ============================================================
   话费代充系统 - 用户端原型 模拟数据层
   仅用于前端原型演示，所有数据均为本地模拟
   ============================================================ */
window.MockDB = (function () {
  // ---- 已注册用户表（localStorage 持久化，用于手机号唯一性校验）----
  const USERS_KEY = "hc_users";
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function saveUsers(list) { localStorage.setItem(USERS_KEY, JSON.stringify(list)); }
  function findUserByPhone(phone) {
    return getUsers().find(function (u) { return u.phone === phone; }) || null;
  }
  function addUser(user) {
    var list = getUsers();
    list.push(user);
    saveUsers(list);
  }

  // ---- 登录失败次数记录（连续5次错误锁定30分钟）----
  const FAIL_KEY = "hc_login_fails";
  function getFailRecord(phone) {
    try {
      var map = JSON.parse(localStorage.getItem(FAIL_KEY) || "{}");
      return map[phone] || null;
    } catch (e) { return null; }
  }
  function setFailRecord(phone, count, lockedUntil) {
    var map = {};
    try { map = JSON.parse(localStorage.getItem(FAIL_KEY) || "{}"); } catch(e) {}
    map[phone] = { count: count, lockedUntil: lockedUntil || 0, lastFail: Date.now() };
    localStorage.setItem(FAIL_KEY, JSON.stringify(map));
  }
  function isPhoneLocked(phone) {
    var r = getFailRecord(phone);
    if (!r || !r.lockedUntil) return false;
    return Date.now() < r.lockedUntil;
  }
  function getLockRemaining(phone) {
    var r = getFailRecord(phone);
    if (!r || !r.lockedUntil) return 0;
    return Math.max(0, Math.ceil((r.lockedUntil - Date.now()) / 1000));
  }

  // ---- 验证码 mock（统一演示验证码：111111）----
  const CODE_KEY = "hc_sms_code";
  const DEMO_CODE = "111111";
  function generateCode(phone) {
    var obj = { phone: phone, code: DEMO_CODE, createdAt: Date.now() };
    try { localStorage.setItem(CODE_KEY, JSON.stringify(obj)); } catch(e) {}
    return DEMO_CODE;
  }
  function verifyCode(phone, inputCode) {
    try {
      var obj = JSON.parse(localStorage.getItem(CODE_KEY) || "{}");
      if (!obj || obj.phone !== phone) return false;
      // 5分钟内有效
      if (Date.now() - obj.createdAt > 5 * 60 * 1000) return false;
      return obj.code === inputCode;
    } catch (e) { return false; }
  }
  // 运营商（四选一）
  const CARRIERS = [
    { key: "cmcc", label: "中国移动", color: "#e63946" },
    { key: "cucc", label: "中国联通", color: "#2563eb" },
    { key: "ctcc", label: "中国电信", color: "#059669" },
    { key: "cbn",  label: "中国广电",  color: "#7c3aed" }
  ];

  // 面值配置（固定 8 种，含税 = 面值 × 1.06）
  const FACE_VALUES = [10, 20, 30, 50, 100, 200, 300, 500];
  const TAX_TYPES = {
    taxed: { key: "taxed", label: "含税（6% 专票）", desc: "平台开具增值税专用发票", rate: 0.06 },
    untaxed: { key: "untaxed", label: "未税（普票）", desc: "用户自行前往营业厅打印普通发票", rate: 0 }
  };

  // 当前登录用户（从 localStorage 读取，缺省为演示账号）
  function getSession() {
    try { return JSON.parse(localStorage.getItem("hc_session") || "null"); }
    catch (e) { return null; }
  }
  function setSession(s) { try { localStorage.setItem("hc_session", JSON.stringify(s)); } catch (e) {} }

  const PHONE_POOL = [
    "13800138001", "13912345678", "13600001111", "13522223333", "13744445555",
    "15066667777", "18899990000", "13112341234", "15988887777", "18655556666",
    "13322221111", "15233334444", "18900001234", "13777778888", "13455556666"
  ];

  function rndStatus() {
    const r = Math.random();
    if (r < 0.78) return "success";
    if (r < 0.88) return "process";
    if (r < 0.94) return "pending";
    return "fail";
  }
  const FAIL_REASONS = ["号码不存在/虚拟号", "携号转网", "通道不稳定"];

  // 生成订单明细
  function genDetails(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const st = rndStatus();
      arr.push({
        phone: PHONE_POOL[i % PHONE_POOL.length],
        status: st,
        reason: st === "fail" ? FAIL_REASONS[Math.floor(Math.random() * FAIL_REASONS.length)] : "",
        callbackAt: st !== "pending" ? "2026-07-28 1" + (Math.floor(Math.random() * 9) + 0) + ":" + (Math.floor(Math.random()*60)+"").padStart(2,"0") : ""
      });
    }
    return arr;
  }

  // 预置订单
  const ORDERS = [
    { id: "ORD20260728001", face: 100, tax: "taxed", total: 106, count: 50, status: "success",
      createdAt: "2026-07-28 10:24", finishedAt: "2026-07-28 10:41", details: genDetails(50) },
    // 预置短信群发任务（演示）：部分失败 → 失败条数退款
    (function () {
      var d = genDetails(30);
      // 强制 3 条失败，便于演示「失败条数自动退款」明细
      for (var i = 0; i < 3; i++) {
        d[i].status = "fail";
        d[i].reason = FAIL_REASONS[i % FAIL_REASONS.length];
        d[i].callbackAt = "2026-07-26 16:55";
      }
      return {
        id: "SMS20260726018", kind: "sms", template: "订单状态提醒", category: "通知类",
        unitPrice: 0.045, tax: "untaxed", count: 30, total: 1.35, status: "fail",
        createdAt: "2026-07-26 16:40", finishedAt: "2026-07-26 16:58", details: d
      };
    })(),
    { id: "ORD20260727012", face: 50, tax: "untaxed", total: 2500, count: 50, status: "process",
      createdAt: "2026-07-27 19:02", finishedAt: "", details: genDetails(50) },
    { id: "ORD20260726008", face: 200, tax: "taxed", total: 2120, count: 10, status: "fail",
      createdAt: "2026-07-26 14:33", finishedAt: "2026-07-26 14:50", details: genDetails(10) },
    { id: "ORD20260725003", face: 500, tax: "untaxed", total: 500, count: 1, status: "pending",
      createdAt: "2026-07-25 09:11", finishedAt: "", details: genDetails(1) }
  ];

  // 资金流水
  const FLOWS = [
    { id: "F20260728001", type: "扣款", amount: -106, after: 4894, op: "系统", time: "2026-07-28 10:24", note: "充值订单 ORD20260728001" },
    { id: "F20260727009", type: "加款", amount: 5000, after: 5000, op: "财务--admin", time: "2026-07-27 18:00", note: "企业预存款充值" },
    { id: "F20260725007", type: "失败退回", amount: 1000, after: 0, op: "系统", time: "2026-07-25 15:20", note: "订单 ORD20260725003 部分失败退回" },
    { id: "F20260720001", type: "扣款", amount: -318, after: 0, op: "系统", time: "2026-07-20 11:05", note: "充值订单 ORD20260720001" }
  ];

  // 佣金比例：直推 3‰、间推 2‰；仅推广「企业用户」产生佣金，个人用户推广无佣金
  const AGENT_COMMISSION = { directRate: 0.003, indirectRate: 0.002 };

  // 提现记录
  const WITHDRAWS = [
    { id: "W2026071501", amount: 320.00, bank: "招商银行 6225****8831", status: "已到账", time: "2026-07-15 16:20" }
  ];

  // 企业用户对公收款账户（企业用户充值时展示，便于公对公转账）
  const CORP_ACCOUNT = {
    company: "海拔信息科技（深圳）有限公司",
    bank: "招商银行深圳科技园支行",
    account: "7559 0223 4410 001",
    note: "转账时请务必在备注中填写您的登录账号，财务核对到账后 1 个工作日内为您加款。",
    support: "如对公充值有疑问，请联系您的专属商务或平台在线客服。"
  };

  // 个人充值可选金额
  const RECHARGE_AMOUNTS = [100, 200, 500, 1000, 2000];

  // 短信专属模板：由商务后台预先创建并完成定价，前端仅可查看、不可修改
  // price 为「未税」基准单价（元/条）；含税时页面按 ×1.06 展示（与话费充值一致）
  // 短信模板（均为后台预创建、定价的专属营销短信，前端只读不可改）
  const SMS_TEMPLATES = [
    { id: "T1", category: "营销类", name: "会员日大促",
      content: "【海拔科技】会员日专享：话费充值满100减10，再送5元券！点击 hc.ehaiba.com 立享，回TD退订。", price: 0.055 },
    { id: "T2", category: "营销类", name: "周年庆狂欢",
      content: "【海拔科技】周年庆狂欢！全场话费充值8折，老用户专属福利，速戳 aaa.com，回TD退订。", price: 0.060 },
    { id: "T3", category: "营销类", name: "节日礼遇",
      content: "【海拔科技】中秋礼遇：充值100元送5元，限时3天！错过等一年，戳 hc.ehaiba.com，回TD退订。", price: 0.058 },
    { id: "T4", category: "营销类", name: "专属福利券",
      content: "【海拔科技】您的专属福利券已到账（满50减3），本月底失效。立即使用 hc.ehaiba.com，回TD退订。", price: 0.052 }
  ];

  // 代理商直推成员（一级下线）；recharge 为该成员累计充值金额基数（仅企业用户据此产生佣金）
  const AGENT_DIRECT = [
    { name: "张伟", account: "zw_8821", type: "个人", phone: "13800138001", joinedAt: "2026-07-20 14:22", recharge: 800 },
    { name: "李娜", account: "ln_7733", type: "企业", phone: "13912345678", joinedAt: "2026-07-21 09:15", recharge: 2500 },
    { name: "王芳", account: "wf_6610", type: "个人", phone: "13600001111", joinedAt: "2026-07-21 16:48", recharge: 1200 },
    { name: "陈强", account: "cq_5542", type: "个人", phone: "13522223333", joinedAt: "2026-07-22 11:03", recharge: 600 },
    { name: "刘洋", account: "ly_4498", type: "企业", phone: "13744445555", joinedAt: "2026-07-23 10:30", recharge: 5000 },
    { name: "赵敏", account: "zm_3371", type: "个人", phone: "15066667777", joinedAt: "2026-07-24 13:20", recharge: 300 },
    { name: "孙磊", account: "sl_2256", type: "个人", phone: "18899990000", joinedAt: "2026-07-25 15:55", recharge: 1500 }
  ];

  // 代理商间推成员（二级下线，via 直推上级）
  const AGENT_INDIRECT = [
    { name: "周婷", account: "zt_1109", type: "个人", phone: "13112341234", via: "张伟", joinedAt: "2026-07-22 18:10", recharge: 500 },
    { name: "吴昊", account: "wh_0817", type: "企业", phone: "15988887777", via: "李娜", joinedAt: "2026-07-23 09:42", recharge: 3000 },
    { name: "郑爽", account: "zs_0724", type: "个人", phone: "18655556666", via: "张伟", joinedAt: "2026-07-24 20:15", recharge: 900 },
    { name: "冯雪", account: "fx_0633", type: "个人", phone: "13322221111", via: "王芳", joinedAt: "2026-07-25 08:33", recharge: 400 },
    { name: "蒋涛", account: "jt_0549", type: "企业", phone: "15233334444", via: "刘洋", joinedAt: "2026-07-25 14:08", recharge: 8000 },
    { name: "韩梅", account: "hm_0471", type: "个人", phone: "18900001234", via: "陈强", joinedAt: "2026-07-26 11:27", recharge: 700 },
    { name: "许斌", account: "xb_0388", type: "个人", phone: "13777778888", via: "赵敏", joinedAt: "2026-07-26 17:50", recharge: 200 },
    { name: "曹颖", account: "cy_0215", type: "个人", phone: "13455556666", via: "孙磊", joinedAt: "2026-07-27 10:05", recharge: 1100 }
  ];

  // 佣金明细：仅「企业用户」下线产生佣金（直推 3‰ / 间推 2‰），个人用户下线不产生佣金
  const COMMISSIONS = (function () {
    var list = [];
    AGENT_DIRECT.forEach(function (m, i) {
      if (m.type === "企业") {
        list.push({ id: "C2026D" + (i + 1), member: m.name, type: "直推",
          amount: Math.round(m.recharge * AGENT_COMMISSION.directRate * 100) / 100, time: m.joinedAt });
      }
    });
    AGENT_INDIRECT.forEach(function (m, i) {
      if (m.type === "企业") {
        list.push({ id: "C2026I" + (i + 1), member: m.name, type: "间推",
          amount: Math.round(m.recharge * AGENT_COMMISSION.indirectRate * 100) / 100, time: m.joinedAt });
      }
    });
    return list;
  })();

  return {
    CARRIERS, FACE_VALUES, TAX_TYPES, PHONE_POOL,
    getSession, setSession,
    ORDERS, FLOWS, COMMISSIONS, WITHDRAWS,
    CORP_ACCOUNT, RECHARGE_AMOUNTS,
    SMS_TEMPLATES,
    AGENT_DIRECT, AGENT_INDIRECT, AGENT_COMMISSION,
    genDetails,
    // 用户注册与查询
    findUserByPhone, addUser, getUsers,
    // 验证码
    generateCode, verifyCode,
    // 登录失败锁定
    isPhoneLocked, getLockRemaining, setFailRecord, getFailRecord,
    // 代理商统计（随会话变化）
    agentStats() {
      const s = getSession() || {};
      const direct = AGENT_DIRECT.length;
      const indirect = AGENT_INDIRECT.length;
      // 佣金拆分：仅企业用户下线产生佣金
      let directComm = 0, indirectComm = 0, directEnt = 0, indirectEnt = 0;
      AGENT_DIRECT.forEach(function (m) {
        if (m.type === "企业") { directComm += m.recharge * AGENT_COMMISSION.directRate; directEnt++; }
      });
      AGENT_INDIRECT.forEach(function (m) {
        if (m.type === "企业") { indirectComm += m.recharge * AGENT_COMMISSION.indirectRate; indirectEnt++; }
      });
      directComm = Math.round(directComm * 100) / 100;
      indirectComm = Math.round(indirectComm * 100) / 100;
      return {
        clients: s.agentClients || (direct + indirect),
        direct: direct,
        indirect: indirect,
        directEnt: directEnt,
        indirectEnt: indirectEnt,
        directComm: directComm,
        indirectComm: indirectComm,
        totalRecharge: s.agentRecharge || 86420,
        withdrawable: s.agentWithdrawable != null ? s.agentWithdrawable : 1286.50,
        withdrawn: s.agentWithdrawn != null ? s.agentWithdrawn : 320.00
      };
    }
  };
})();
