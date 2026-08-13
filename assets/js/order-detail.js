/* ============================================================
   订单详情页脚本（迭代 56：由弹窗改为独立页面展示）
   - 读取 URL ?id= 渲染对应订单（话费充值 / 短信群发）详情
   - 与「订单管理」列表共用同一套 MockDB 数据
   - 顶部函数声明为全局，供详情内联 oninput/onclick 调用
   ============================================================ */
var DB = App.DB;
var currentDetailOrder = null;
var currentDetailNorm = null;
var detailPageSize = 20;
var detailCurrentPage = 1;

/* ---------- 工具函数 ---------- */
// 订单级状态徽标：仅 进行中 / 已完成
function orderStatusBadge(st) {
  if (st === "success" || st === "fail") return '<span class="badge success">已完成</span>';
  return '<span class="badge process">进行中</span>';
}

// 充值单条状态
function rechargeRowBadge(st) {
  if (st === "success") return '<span class="badge success">充值成功</span>';
  if (st === "fail") return '<span class="badge fail">充值失败</span>';
  if (st === "pending") return '<span class="badge pending">待充值</span>';
  return '<span class="badge process">充值中</span>';
}

// 短信单条状态
function smsRowBadge(st) {
  if (st === "success") return '<span class="badge success">发送成功</span>';
  if (st === "fail") return '<span class="badge fail">发送失败</span>';
  return '<span class="badge process">发送中</span>';
}

// 获取税费标签
function getTaxLabel(tax) {
  return tax === "taxed" ? "含税（6%专票）" : "未税（普票）";
}

/* ---------- 明细状态规整（订单状态 ↔ 号码状态 一致） ---------- */
function getRechargeDetailsNorm(o) {
  var displayDone = (o.status === "success" || o.status === "fail");
  if (displayDone) {
    return o.details.map(function (d) {
      if (d.status === "process" || d.status === "pending") {
        return { phone: d.phone, status: "success", reason: "", callbackAt: d.callbackAt || "-" };
      }
      return d;
    });
  }
  var mapped = o.details.map(function (d) {
    if (d.status === "pending") {
      return { phone: d.phone, status: "process", reason: "", callbackAt: d.callbackAt || "-" };
    }
    return d;
  });
  var hasProcess = mapped.some(function (d) { return d.status === "process"; });
  if (!hasProcess && mapped.length) {
    mapped[0] = { phone: mapped[0].phone, status: "process", reason: "", callbackAt: mapped[0].callbackAt || "-" };
  }
  return mapped;
}

function getSmsDetailsNorm(o) {
  var displayDone = (o.status === "success" || o.status === "fail");
  if (displayDone) {
    return o.details.map(function (d) {
      if (d.status === "process" || d.status === "pending") {
        return { phone: d.phone, status: "success", reason: "", callbackAt: d.callbackAt || "-" };
      }
      return d;
    });
  }
  var mapped = o.details.map(function (d) {
    if (d.status === "pending") {
      return { phone: d.phone, status: "process", reason: "", callbackAt: d.callbackAt || "-" };
    }
    return d;
  });
  var hasProcess = mapped.some(function (d) { return d.status === "process"; });
  if (!hasProcess && mapped.length) {
    mapped[0] = { phone: mapped[0].phone, status: "process", reason: "", callbackAt: mapped[0].callbackAt || "-" };
  }
  return mapped;
}

/* ---------- 明细表格 ---------- */
function buildRechargeDetailTable(details) {
  return '<table class="table detail-sub-table"><thead><tr><th>手机号</th><th>状态</th><th>失败原因</th><th>回调时间</th></tr></thead><tbody>' +
    details.map(function (d) {
      return '<tr data-phone="' + d.phone + '" data-status="' + d.status + '">' +
        '<td>' + d.phone + '</td>' +
        '<td>' + rechargeRowBadge(d.status) + '</td>' +
        '<td>' + (d.reason || "-") + '</td>' +
        '<td>' + (d.callbackAt || "-") + '</td>' +
      '</tr>';
    }).join("") +
  '</tbody></table>';
}

function buildSmsDetailTable(details) {
  return '<table class="table detail-sub-table"><thead><tr><th>手机号</th><th>状态</th><th>发送结果说明</th><th>回调时间</th></tr></thead><tbody>' +
    details.map(function (d) {
      return '<tr data-phone="' + d.phone + '" data-status="' + d.status + '">' +
        '<td>' + d.phone + '</td>' +
        '<td>' + smsRowBadge(d.status) + '</td>' +
        '<td>' + (d.reason || "-") + '</td>' +
        '<td>' + (d.callbackAt || "-") + '</td>' +
      '</tr>';
    }).join("") +
  '</tbody></table>';
}

/* ---------- 充值订单详情 ---------- */
function renderRechargeDetail(o) {
  var carrierObj = null;
  if (o.carrier) carrierObj = DB.CARRIERS.find(function (c) { return c.key === o.carrier; }) || null;
  if (!carrierObj) {
    var h = 0;
    for (var ci = 0; ci < o.id.length; ci++) h = (h * 31 + o.id.charCodeAt(ci)) % DB.CARRIERS.length;
    carrierObj = DB.CARRIERS[h];
  }

  var unitRate = o.tax === "taxed" ? 1.06 : 1;
  var unit = o.face * unitRate;
  var totalAmt = unit * o.count;

  var normDetails = getRechargeDetailsNorm(o);
  var succ = normDetails.filter(function (d) { return d.status === "success"; }).length;
  var fail = normDetails.filter(function (d) { return d.status === "fail"; }).length;
  var proc = normDetails.filter(function (d) { return d.status === "process" || d.status === "pending"; }).length;
  var refundTotal = Math.round(unit * fail * 100) / 100;

  var html =
    '<div class="detail-section-title">基本信息</div>' +
    '<table class="table detail-info-table"><tbody>' +
      '<tr><td class="info-label">订单号</td><td><b>' + o.id + '</b></td></tr>' +
      '<tr><td class="info-label">订单类型</td><td>话费充值</td></tr>' +
      '<tr><td class="info-label">运营商</td><td>' + carrierObj.label + '</td></tr>' +
      '<tr><td class="info-label">面额</td><td><b>' + o.face + ' 元</b></td></tr>' +
      '<tr><td class="info-label">税费类型</td><td>' + getTaxLabel(o.tax) + '</td></tr>' +
      '<tr><td class="info-label">单价</td><td class="amount">' + App.fmtMoney(unit) + '</td></tr>' +
      '<tr><td class="info-label">总额</td><td class="amount">' + App.fmtMoney(totalAmt) + '</td></tr>' +
      '<tr><td class="info-label">状态</td><td>' + orderStatusBadge(o.status) + '</td></tr>' +
      '<tr><td class="info-label">提交时间</td><td>' + o.createdAt + '</td></tr>' +
    '</tbody></table>' +

    '<div class="tiles" style="margin-top:14px;margin-bottom:10px">' +
      '<div class="tile"><div class="n">' + o.count + '</div><div class="l">号码总数</div></div>' +
      '<div class="tile blue"><div class="n">' + proc + '</div><div class="l">充值中</div></div>' +
      '<div class="tile green"><div class="n">' + succ + '</div><div class="l">充值成功</div></div>' +
      '<div class="tile red"><div class="n">' + fail + '</div><div class="l">充值失败</div></div>' +
      '<div class="tile amber"><div class="n">' + App.fmtMoney(refundTotal) + '</div><div class="l">退款总额</div></div>' +
    '</div>' +

    '<div class="detail-toolbar">' +
      '<div class="detail-search">' +
        '<input type="text" id="detailPhoneSearch" placeholder="根据手机号筛选…" oninput="filterDetailRows(\'' + o.id + '\')" />' +
        '<select id="detailStatusFilter" onchange="filterDetailRows(\'' + o.id + '\')">' +
          '<option value="">全部状态</option>' +
          '<option value="success">充值成功</option>' +
          '<option value="fail">充值失败</option>' +
          '<option value="process">充值中</option>' +
        '</select>' +
      '</div>' +
      '<button class="btn btn-outline btn-sm" onclick="exportDetail(\'' + o.id + '\', \'recharge\')">导出数据</button>' +
    '</div>' +

    '<div class="detail-list-wrap" id="detailListWrap">' +
      buildRechargeDetailTable(normDetails) +
    '</div>' +

    '<div class="detail-pagination" id="detailPagination"></div>' +

    '<div class="detail-footer-note">充值失败账号由第三方返回失败结果，系统自动原路退回对应金额至用户账户。</div>';

  return html;
}

/* ---------- 短信订单详情 ---------- */
function renderSmsDetail(o, norm) {
  var succ = norm.filter(function (d) { return d.status === "success"; }).length;
  var fail = norm.filter(function (d) { return d.status === "fail"; }).length;
  var proc = norm.filter(function (d) { return d.status === "process"; }).length;
  var refundTotal = Math.round(o.unitPrice * fail * 100) / 100;

  var html =
    '<div class="detail-section-title">基本信息</div>' +
    '<table class="table detail-info-table"><tbody>' +
      '<tr><td class="info-label">订单号</td><td><b>' + o.id + '</b></td></tr>' +
      '<tr><td class="info-label">订单类型</td><td>短信群发</td></tr>' +
      '<tr><td class="info-label">税费类型</td><td>' + getTaxLabel(o.tax) + '</td></tr>' +
      '<tr><td class="info-label">单价</td><td class="amount">' + App.fmtMoney(o.unitPrice) + '/条</td></tr>' +
      '<tr><td class="info-label">总额</td><td class="amount">' + App.fmtMoney(o.total) + '</td></tr>' +
      '<tr><td class="info-label">状态</td><td>' + orderStatusBadge(o.status) + '</td></tr>' +
      '<tr><td class="info-label">提交时间</td><td>' + o.createdAt + '</td></tr>' +
    '</tbody></table>' +
    // 短信模板卡片：与「短信群发 → 选择模板」列表展示一致（模板名 + 短信签名 + 模板内容）
    (function () {
      var tp = (DB.SMS_TEMPLATES || []).find(function (x) { return x.name === o.template; });
      var tplName = tp ? tp.name : o.template;
      var sig = (tp && tp.signature) ? tp.signature : "海拔科技";
      var content = tp ? tp.content : "";
      return '<div class="detail-section-title">短信模板</div>' +
        '<div class="sms-tpl-picked">' +
          '<div class="sms-tpl-picked-head"><b>' + App.escapeHtml(tplName) + '</b></div>' +
          '<div class="sms-tpl-sig">短信签名：<b>' + App.escapeHtml(sig) + '</b></div>' +
          '<div class="sms-tpl-content">' + App.escapeHtml(content) + '</div>' +
          '<div class="sms-tpl-picked-foot">单条价格 <b>' + App.fmtMoney(o.unitPrice) + '</b> · ' + getTaxLabel(o.tax) + '</div>' +
        '</div>';
    })() +

    '<div class="tiles" style="margin-top:14px;margin-bottom:10px">' +
      '<div class="tile"><div class="n">' + o.count + '</div><div class="l">号码总数</div></div>' +
      '<div class="tile blue"><div class="n">' + proc + '</div><div class="l">发送中</div></div>' +
      '<div class="tile green"><div class="n">' + succ + '</div><div class="l">发送成功</div></div>' +
      '<div class="tile red"><div class="n">' + fail + '</div><div class="l">发送失败</div></div>' +
      '<div class="tile amber"><div class="n">' + App.fmtMoney(refundTotal) + '</div><div class="l">退款总额</div></div>' +
    '</div>' +

    '<div class="detail-toolbar">' +
      '<div class="detail-search">' +
        '<input type="text" id="detailPhoneSearch" placeholder="根据手机号筛选…" oninput="filterDetailRows(\'' + o.id + '\')" />' +
        '<select id="detailStatusFilter" onchange="filterDetailRows(\'' + o.id + '\')">' +
          '<option value="">全部状态</option>' +
          '<option value="success">发送成功</option>' +
          '<option value="fail">发送失败</option>' +
          '<option value="process">发送中</option>' +
        '</select>' +
      '</div>' +
      '<button class="btn btn-outline btn-sm" onclick="exportDetail(\'' + o.id + '\', \'sms\')">导出数据</button>' +
    '</div>' +

    '<div class="detail-list-wrap" id="detailListWrap">' +
      buildSmsDetailTable(norm) +
    '</div>' +

    '<div class="detail-pagination" id="detailPagination"></div>' +

    '<div class="detail-footer-note">发送失败条数由第三方返回失败结果，系统自动原路退回对应金额至用户账户。</div>';

  return html;
}

/* ---------- 详情内筛选 ---------- */
function filterDetailRows(orderId) {
  if (!currentDetailOrder) return;
  var phoneKw = (document.getElementById("detailPhoneSearch").value || "").trim();
  var statusF = document.getElementById("detailStatusFilter").value;
  var rows = document.querySelectorAll("#detailListWrap tbody tr");

  rows.forEach(function (row) {
    var show = true;
    if (phoneKw && row.dataset.phone.indexOf(phoneKw) === -1) show = false;
    if (statusF && row.dataset.status !== statusF) show = false;
    row.style.display = show ? "" : "none";
  });

  // 筛选后重置到第 1 页并重新应用分页
  detailCurrentPage = 1;
  applyDetailPagination();
}

/* ---------- 详情内分页 ---------- */
function getVisibleRows() {
  return Array.prototype.filter.call(
    document.querySelectorAll("#detailListWrap tbody tr"),
    function (r) { return r.style.display !== "none"; }
  );
}

function applyDetailPagination() {
  var visible = getVisibleRows();
  var totalVisible = visible.length;
  var totalPages = Math.max(1, Math.ceil(totalVisible / detailPageSize));
  if (detailCurrentPage > totalPages) detailCurrentPage = totalPages;

  var start = (detailCurrentPage - 1) * detailPageSize;
  visible.forEach(function (row, i) {
    row.style.display = (i >= start && i < start + detailPageSize) ? "" : "none";
  });

  renderDetailPaginationUI(totalPages, totalVisible);
}

function renderDetailPaginationUI(totalPages, totalVisible) {
  var wrap = document.getElementById("detailPagination");
  if (!wrap) return;
  if (totalPages <= 1) { wrap.innerHTML = ""; return; }

  wrap.innerHTML =
    '<button class="btn btn-outline btn-sm" onclick="goDetailPage(' + (detailCurrentPage - 1) + ')"' +
      (detailCurrentPage <= 1 ? ' disabled' : '') + '>上一页</button>' +
    '<span class="page-info">' + detailCurrentPage + ' / ' + totalPages +
      ' 页（共 ' + totalVisible + ' 条）</span>' +
    '<button class="btn btn-outline btn-sm" onclick="goDetailPage(' + (detailCurrentPage + 1) + ')"' +
      (detailCurrentPage >= totalPages ? ' disabled' : '') + '>下一页</button>';
}

function goDetailPage(p) {
  var visible = getVisibleRows();
  var totalPages = Math.max(1, Math.ceil(visible.length / detailPageSize));
  if (p < 1 || p > totalPages) return;
  detailCurrentPage = p;
  applyDetailPagination();
}

/* ---------- 详情内导出（模拟 CSV 下载） ---------- */
function exportDetail(orderId, kind) {
  if (!currentDetailOrder) return;
  var o = currentDetailOrder;
  var rows = [];

  if (kind === "recharge") {
    rows.push(["手机号", "状态", "失败原因", "回调时间"]);
    (currentDetailNorm || o.details).forEach(function (d) {
      var stMap = { success: "充值成功", fail: "充值失败", pending: "待充值", process: "充值中" };
      rows.push([d.phone, stMap[d.status] || d.status, d.reason || "", d.callbackAt || ""]);
    });
  } else {
    rows.push(["手机号", "状态", "发送结果说明", "回调时间"]);
    (currentDetailNorm || o.details).forEach(function (d) {
      var stMap = { success: "发送成功", fail: "发送失败", process: "发送中" };
      rows.push([d.phone, stMap[d.status] || d.status, d.reason || "", d.callbackAt || ""]);
    });
  }

  var csv = "﻿" + rows.map(function (r) { return r.join(","); }).join("\n");
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = orderId + "_明细.csv";
  a.click();
  URL.revokeObjectURL(url);
  App.toast("导出成功");
}

/* ---------- 页面初始化 ---------- */
function renderOrderDetail() {
  var params = new URLSearchParams(location.search);
  var id = params.get("id");
  var titleEl = document.getElementById("detailTitle");
  var bodyEl = document.getElementById("detailBody");

  function showError(msg) {
    titleEl.textContent = "订单详情";
    bodyEl.innerHTML = '<div class="empty-state"><div class="empty-inner"><div class="empty-icon">⚠️</div><div class="empty-text">' + msg + '</div></div></div>';
  }

  if (!id) { showError("缺少订单编号参数（?id=）"); return; }
  var o = DB.ORDERS.find(function (x) { return x.id === id; });
  if (!o) { showError("未找到订单：" + id); return; }

  currentDetailOrder = o;
  detailCurrentPage = 1;
  if (o.kind === "sms") {
    currentDetailNorm = getSmsDetailsNorm(o);
    titleEl.textContent = "短信订单详情 · " + id;
    bodyEl.innerHTML = renderSmsDetail(o, currentDetailNorm);
  } else {
    currentDetailNorm = getRechargeDetailsNorm(o);
    titleEl.textContent = "充值订单详情 · " + id;
    bodyEl.innerHTML = renderRechargeDetail(o);
  }

  // 渲染完成后应用分页（每页 20 条）
  applyDetailPagination();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderOrderDetail);
} else {
  renderOrderDetail();
}
