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

  // 面值配置（固定 6 种，含税 = 面值 × 1.06）
  const FACE_VALUES = [30, 50, 100, 200, 300, 500];
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
    { id: "ORD20260728001", face: 100, tax: "taxed", total: 5300, count: 50, status: "success",
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
    // 进行中短信群发任务（演示）：包含 发送中 / 发送成功 / 发送失败 三种状态
    (function () {
      var d = genDetails(25);
      // 保证进行中订单明细中存在 发送中 / 发送成功 / 发送失败
      d[0].status = "process"; d[0].reason = ""; d[0].callbackAt = "";
      d[1].status = "success"; d[1].reason = ""; d[1].callbackAt = "2026-08-12 15:30";
      d[2].status = "fail"; d[2].reason = FAIL_REASONS[0]; d[2].callbackAt = "2026-08-12 15:30";
      return {
        id: "SMS20260812001", kind: "sms", template: "会员日大促", category: "营销类",
        unitPrice: 0.05, tax: "untaxed", count: 25, total: 1.25, status: "process",
        createdAt: "2026-08-12 15:20", finishedAt: "", details: d
      };
    })(),
    { id: "ORD20260727012", face: 50, tax: "untaxed", total: 2500, count: 50, status: "process",
      createdAt: "2026-07-27 19:02", finishedAt: "", details: genDetails(50) },
    { id: "ORD20260726008", face: 200, tax: "taxed", total: 2120, count: 10, status: "fail",
      createdAt: "2026-07-26 14:33", finishedAt: "2026-07-26 14:50", details: genDetails(10) },
    { id: "ORD20260725003", face: 500, tax: "untaxed", total: 500, count: 1, status: "pending",
      createdAt: "2026-07-25 09:11", finishedAt: "", details: genDetails(1) }
  ];

  // 资金流水（按时间倒序排列，最新在前）
  // type 取值：话费充值 / 短信群发 / 平台充值 / 平台扣减 / 订单退款
  // account 取值：系统余额 / 微信支付
  const FLOWS = [
    { id: "F20260813015", type: "短信群发",   amount: -1.25, after: 8764.32, account: "系统余额", orderId: "SMS20260812001", time: "2026-08-13 16:30" },
    { id: "F20260813014", type: "话费充值",   amount: -5300,  after: 8765.57, account: "系统余额", orderId: "ORD20260728001", time: "2026-08-13 11:05" },
    { id: "F20260813013", type: "订单退款",   amount: 212,    after: 14065.57,account: "系统余额", orderId: "ORD20260726008", time: "2026-08-12 17:22" },
    { id: "F20260813012", type: "短信群发",   amount: -1.35,  after: 13853.57,account: "系统余额", orderId: "SMS20260726018", time: "2026-08-12 16:58" },
    { id: "F20260813011", type: "话费充值",   amount: -2500,  after: 13854.92,account: "系统余额", orderId: "ORD20260727012", time: "2026-08-12 14:33" },
    { id: "F20260813010", type: "平台充值",   amount: 5000,   after: 16354.92,account: "系统余额", orderId: "",           time: "2026-08-11 09:00" },
    { id: "F20260813009", type: "微信支付",   amount: 1000,   after: 11354.92,account: "微信支付", orderId: "",           time: "2026-08-10 15:40" },
    { id: "F20260813008", type: "话费充值",   amount: -2120,  after: 10354.92,account: "系统余额", orderId: "ORD20260726008", time: "2026-08-09 10:18" },
    { id: "F20260813007", type: "平台扣减",   amount: -50,    after: 12474.92,account: "系统余额", orderId: "",           time: "2026-08-08 16:50" },
    { id: "F20260813006", type: "短信群发",   amount: -3.80,  after: 12524.92,account: "系统余额", orderId: "SMS20260730005",time: "2026-08-07 11:20" },
    { id: "F20260813005", type: "话费充值",   amount: -500,   after: 12528.72,account: "系统余额", orderId: "ORD20260725003", time: "2026-08-06 09:30" },
    { id: "F20260813004", type: "订单退款",   amount: 150,    after: 13028.72,account: "系统余额", orderId: "ORD20260724002", time: "2026-08-05 14:10" },
    { id: "F20260813003", type: "平台充值",   amount: 10000,  after: 12878.72,account: "系统余额", orderId: "",           time: "2026-08-04 10:00" },
    { id: "F20260813002", type: "话费充值",   amount: -2650,  after: 2878.72, account: "系统余额", orderId: "ORD20260723006", time: "2026-08-03 16:45" },
    { id: "F20260813001", type: "短信群发",   amount: -2.70,  after: 5528.72, account: "系统余额", orderId: "SMS20260728003", time: "2026-08-02 13:25" },
    { id: "F20260731005", type: "平台充值",   amount: 3000,   after: 5531.42, account: "系统余额", orderId: "",           time: "2026-07-31 11:00" },
    { id: "F20260731004", type: "话费充值",   amount: -1590,  after: 2531.42, account: "系统余额", orderId: "ORD20260729004", time: "2026-07-30 15:20" },
    { id: "F20260731003", type: "订单退款",   amount: 80,     after: 4121.42, account: "系统余额", orderId: "ORD20260728003", time: "2026-07-29 17:35" },
    { id: "F20260731002", type: "短信群发",   amount: -5.80,  after: 4041.42, account: "系统余额", orderId: "SMS20260727002", time: "2026-07-28 19:10" },
    { id: "F20260731001", type: "话费充值",   amount: -3180,  after: 4047.22, account: "系统余额", orderId: "ORD20260727001", time: "2026-07-27 10:55" },
    { id: "F20260726021", type: "话费充值",   amount: -1590,  after: 3980.42, account: "系统余额", orderId: "ORD20260726007", time: "2026-07-26 17:30" },
    { id: "F20260726020", type: "短信群发",   amount: -4.20,  after: 5570.42, account: "系统余额", orderId: "SMS20260725001", time: "2026-07-26 16:10" },
    { id: "F20260726019", type: "平台充值",   amount: 2000,   after: 5574.62, account: "系统余额", orderId: "",            time: "2026-07-26 09:20" },
    { id: "F20260725018", type: "订单退款",   amount: 60,     after: 3574.62, account: "系统余额", orderId: "ORD20260725002", time: "2026-07-25 18:05" },
    { id: "F20260725017", type: "平台扣减",   amount: -30,    after: 3514.62, account: "系统余额", orderId: "",            time: "2026-07-25 14:40" },
    { id: "F20260725016", type: "话费充值",   amount: -530,   after: 3544.62, account: "系统余额", orderId: "ORD20260725001", time: "2026-07-25 11:25" },
    { id: "F20260725015", type: "微信支付",   amount: 500,    after: 4074.62, account: "微信支付", orderId: "",            time: "2026-07-25 09:00" },
    { id: "F20260724014", type: "短信群发",   amount: -3.00,  after: 3574.62, account: "系统余额", orderId: "SMS20260724002", time: "2026-07-24 20:15" },
    { id: "F20260724013", type: "订单退款",   amount: 90,     after: 3577.62, account: "系统余额", orderId: "ORD20260724001", time: "2026-07-24 16:50" },
    { id: "F20260724012", type: "话费充值",   amount: -2650,  after: 3487.62, account: "系统余额", orderId: "ORD20260724003", time: "2026-07-24 13:30" },
    { id: "F20260724011", type: "平台充值",   amount: 3000,   after: 6137.62, account: "系统余额", orderId: "",            time: "2026-07-24 09:30" },
    { id: "F20260723010", type: "话费充值",   amount: -1060,  after: 3137.62, account: "系统余额", orderId: "ORD20260723005", time: "2026-07-23 17:45" },
    { id: "F20260723009", type: "短信群发",   amount: -6.50,  after: 4197.62, account: "系统余额", orderId: "SMS20260723001", time: "2026-07-23 14:20" },
    { id: "F20260723008", type: "平台扣减",   amount: -45,    after: 4204.12, account: "系统余额", orderId: "",            time: "2026-07-23 10:05" },
    { id: "F20260723007", type: "平台充值",   amount: 1500,   after: 4249.12, account: "系统余额", orderId: "",            time: "2026-07-23 09:00" },
    { id: "F20260722006", type: "话费充值",   amount: -2120,  after: 2749.12, account: "系统余额", orderId: "ORD20260722006", time: "2026-07-22 16:30" },
    { id: "F20260722005", type: "订单退款",   amount: 120,    after: 4869.12, account: "系统余额", orderId: "ORD20260722004", time: "2026-07-22 13:15" },
    { id: "F20260722004", type: "短信群发",   amount: -2.30,  after: 4749.12, account: "系统余额", orderId: "SMS20260722003", time: "2026-07-22 10:50" },
    { id: "F20260722003", type: "平台扣减",   amount: -25,    after: 4751.42, account: "系统余额", orderId: "",            time: "2026-07-22 09:40" },
    { id: "F20260721002", type: "微信支付",   amount: 800,    after: 4776.42, account: "微信支付", orderId: "",            time: "2026-07-21 19:00" },
    { id: "F20260721001", type: "话费充值",   amount: -318,   after: 3976.42, account: "系统余额", orderId: "ORD20260721001", time: "2026-07-21 15:10" }
  ];

  // 佣金比例：直推 3‰、间推 2‰；仅推广「企业用户」产生佣金，个人用户推广无佣金
  const AGENT_COMMISSION = { directRate: 0.003, indirectRate: 0.002 };

  // 提现记录
  const WITHDRAWS = [
    { id: "W2026071501", amount: 320.00, bank: "招商银行 6225****8831", accountName: "张三", status: "已到账", time: "2026-07-15 16:20", voucher: true },
    { id: "W2026080102", amount: 1000.00, bank: "建设银行 4367****1234", accountName: "张三", status: "待审核", time: "2026-08-01 10:30" },
    { id: "W2026081203", amount: 500.00, bank: "招商银行 6225****8831", accountName: "张三", status: "待打款", time: "2026-08-12 09:05" },
    { id: "W2026080504", amount: 2680.00, bank: "工商银行 6212****5566", accountName: "张三", status: "驳回", time: "2026-08-05 14:12", rejectReason: "银行卡号与开户名不一致，打款失败，请核对收款信息后重新提交提现申请。" }
  ];

  // 可通明细（代理商中心展示：下级用户的消费订单记录）
  const CONSUMPTION_DETAILS = [
    { id: "CD2026072001", user: "李明辉", amount: 1060.00, time: "2026-07-20 14:22" },
    { id: "CD2026072502", user: "王建国", amount: 530.00, time: "2026-07-25 09:15" },
    { id: "CD2026080303", user: "赵晓燕", amount: 2120.00, time: "2026-08-03 11:40" },
    { id: "CD202080504", user: "陈志强", amount: 106.00, time: "2026-08-05 16:55" },
    { id: "CD202080805", user: "李明辉", amount: 3180.00, time: "2026-08-08 10:20" },
    { id: "CD202081006", user: "周文博", amount: 1590.00, time: "2026-08-10 13:05" },
    { id: "CD202081107", user: "王建国", amount: 2120.00, time: "2026-08-11 09:30" },
    { id: "CD202081208", user: "孙丽华", amount: 530.00, time: "2026-08-12 15:18" }
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
    { id: "T1", name: "会员日大促", signature: "海拔科技",
      content: "【海拔科技】会员日专享：话费充值满100减10，再送5元券！点击 hc.ehaiba.com 立享，回TD退订。", price: 0.055 },
    { id: "T2", name: "周年庆狂欢", signature: "海拔科技",
      content: "【海拔科技】周年庆狂欢！全场话费充值8折，老用户专属福利，速戳 aaa.com，回TD退订。", price: 0.060 },
    { id: "T3", name: "节日礼遇", signature: "海拔科技",
      content: "【海拔科技】中秋礼遇：充值100元送5元，限时3天！错过等一年，戳 hc.ehaiba.com，回TD退订。", price: 0.058 },
    { id: "T4", name: "专属福利券", signature: "海拔科技",
      content: "【海拔科技】您的专属福利券已到账（满50减3），本月底失效。立即使用 hc.ehaiba.com，回TD退订。", price: 0.052 },
    { id: "T5", name: "订单状态提醒", signature: "海拔科技", category: "通知类",
      content: "【海拔科技】您尾号0000的订单状态已更新，点击 ehaiba.com 查看详情，回TD退订。", price: 0.045 }
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
    var seq = 0;
    function add(member, type, recharge, time) {
      seq++;
      var rate = type === "直推" ? AGENT_COMMISSION.directRate : AGENT_COMMISSION.indirectRate;
      list.push({
        id: "C2026" + (type === "直推" ? "D" : "I") + String(seq).padStart(3, "0"),
        member: member,
        type: type,
        amount: Math.round(recharge * rate * 100) / 100,
        time: time
      });
    }
    // 直推企业（含真实下线 李娜 / 刘洋，其余为演示扩充，共 13 条）
    add("李娜", "直推", 2500, "2026-07-21 09:15");
    add("刘洋", "直推", 5000, "2026-07-23 10:30");
    add("杭州普瑞科技", "直推", 8200, "2026-07-26 11:20");
    add("成都锐进网络", "直推", 3600, "2026-07-27 14:05");
    add("武汉顺达贸易", "直推", 15000, "2026-07-28 09:48");
    add("南京康华实业", "直推", 6400, "2026-07-29 16:30");
    add("青岛海风传媒", "直推", 9800, "2026-07-30 10:12");
    add("苏州精工制造", "直推", 4300, "2026-07-31 13:55");
    add("长沙湘江物流", "直推", 7600, "2026-08-01 11:40");
    add("西安长空信息", "直推", 5900, "2026-08-02 15:25");
    add("厦门鹭岛通信", "直推", 11200, "2026-08-03 09:30");
    add("天津滨海电子", "直推", 4700, "2026-08-04 17:10");
    add("重庆山城科技", "直推", 8800, "2026-08-05 10:45");
    // 间推企业（含真实下线 吴昊 / 蒋涛，其余为演示扩充，共 12 条）
    add("吴昊", "间推", 3000, "2026-07-23 09:42");
    add("蒋涛", "间推", 8000, "2026-07-25 14:08");
    add("合肥徽商贸易", "间推", 5200, "2026-07-28 18:20");
    add("郑州中原数据", "间推", 9100, "2026-07-30 11:05");
    add("昆明滇池网络", "间推", 3400, "2026-07-31 15:50");
    add("哈尔滨北辰科技", "间推", 6700, "2026-08-01 09:25");
    add("沈阳盛京实业", "间推", 12500, "2026-08-02 14:40");
    add("济南齐鲁贸易", "间推", 4800, "2026-08-03 16:15");
    add("福州闽江通信", "间推", 7300, "2026-08-04 10:55");
    add("太原晋阳数据", "间推", 5600, "2026-08-05 13:30");
    add("南宁邕江网络", "间推", 3900, "2026-08-06 11:10");
    add("兰州黄河科技", "间推", 8100, "2026-08-07 15:45");
    return list;
  })();

  return {
    CARRIERS, FACE_VALUES, TAX_TYPES, PHONE_POOL,
    getSession, setSession,
    ORDERS, FLOWS, COMMISSIONS, WITHDRAWS, CONSUMPTION_DETAILS,
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
