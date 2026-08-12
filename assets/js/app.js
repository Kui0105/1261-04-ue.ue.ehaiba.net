/* ============================================================
   话费代充系统 - 用户端原型 共享逻辑
   ============================================================ */
window.App = (function () {
  const DB = window.MockDB;

  /* ---------- 工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function fmtMoney(n) {
    n = Number(n) || 0;
    return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    let el = $("#app-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "app-toast"; el.className = "toast"; document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------- 会话 / 登录态 ---------- */
  function getSession() { return DB.getSession(); }
  function isLogin() { return !!DB.getSession(); }

  function loginAs(user) {
    const s = Object.assign({
      loggedIn: true,
      type: "personal",        // personal | enterprise
      account: "", name: "",
      balance: 5000, creditLimit: 0, usedCredit: 0,
      isAgent: false
    }, user);
    DB.setSession(s);
    return s;
  }
  function logout() { localStorage.removeItem("hc_session"); }

  // 默认演示账号（方便评审直接进入系统）
  function ensureDemoAccount() {
    if (!isLogin()) {
      loginAs({ type: "enterprise", account: "13800138000", name: "示例电销企业", balance: 5000, creditLimit: 20000, usedCredit: 1050 });
    }
    return getSession();
  }

  /* ---------- 顶部导航渲染（移动端用顶栏下方的图标子导航） ---------- */
  const NAV_ITEMS = [
    { key: "home", label: "首页", href: "index.html", icon: "🏠" },
    { key: "recharge", label: "话费充值", href: "recharge.html", icon: "📱" },
    { key: "sms", label: "短信群发", href: "sms.html", icon: "💬" },
    { key: "orders", label: "订单管理", href: "orders.html", icon: "📋" },
    { key: "account", label: "账户中心", href: "account.html", icon: "💰" },
    { key: "agent", label: "代理商中心", href: "agent.html", icon: "🤝" }
  ];

  function renderTopbar(activeKey) {
    const s = getSession();
    const navHtml = NAV_ITEMS.map(it =>
      `<a href="${it.href}" class="${it.key === activeKey ? "active" : ""}">${it.label}</a>`
    ).join("");

    const right = s
      ? `<span style="font-size:13px;color:var(--text-2)" class="mobile-hide">${escapeHtml(s.name || s.account)}</span>
         <button class="btn btn-ghost btn-sm mobile-hide" id="btnLogout">退出</button>`
      : `<a href="login.html" class="btn btn-outline btn-sm">登录 / 注册</a>`;

    // 移动端子导航图标+文字条（位于顶栏下方）
    const iconNav = '<nav class="icon-nav">' +
      NAV_ITEMS.map(it =>
        `<a href="${it.href}" class="icon-nav-item ${it.key === activeKey ? "active" : ""}"><span class="icon-nav-icon">${it.icon}</span><span class="icon-nav-label">${it.label}</span></a>`
      ).join("") +
      '</nav>';

    const bar = document.createElement("header");
    bar.className = "topbar";
    bar.innerHTML = `<div class="inner">
      <a href="index.html" class="logo"><span class="mark"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></span> 话费代充系统</a>
      <nav class="nav">${navHtml}</nav>
      <div class="nav-actions">${right}</div>
    </div>`;
    document.body.prepend(bar);

    // 绑定退出按钮事件（不用 inline onclick，更可靠）
    var btnLogout = bar.querySelector("#btnLogout");
    if (btnLogout) btnLogout.addEventListener("click", logoutAndGo);

    // 移动端子导航图标+文字条（仅登录时显示，未登录不注入）
    if (s) {
      const subnav = document.createElement("nav");
      subnav.className = "subnav";
      subnav.innerHTML = iconNav;
      bar.insertAdjacentElement("afterend", subnav);
    }
  }

  function logoutAndGo() {
    var ok = true;
    try { ok = confirm("确认退出登录？\n退出后将清除当前登录状态，需重新登录。"); } catch(e) { ok = true; }
    if (ok === false) return;
    logout();
    location.href = "index.html";
  }

  /* ---------- 受保护页面：未登录跳登录 ---------- */
  function requireLogin(activeKey) {
    renderTopbar(activeKey);
    if (!isLogin()) {
      toast("请先登录后再访问");
      setTimeout(() => location.href = "login.html?redirect=" + encodeURIComponent(location.pathname.split("/").pop()), 700);
      return false;
    }
    return true;
  }

  /* ---------- 状态徽标 ---------- */
  function statusBadge(status) {
    const map = {
      success: ["success", "充值成功"],
      pending: ["pending", "待充值"],
      process: ["process", "充值中"],
      fail: ["fail", "充值失败"]
    };
    const [cls, txt] = map[status] || ["gray", status];
    return `<span class="badge ${cls}">${txt}</span>`;
  }

  // 订单（批次）层级：批量订单不存在整体“充值失败”，个别号码失败统称“部分失败”
  function orderStatusBadge(status) {
    if (status === "fail") return '<span class="badge fail">部分失败</span>';
    return statusBadge(status);
  }

  return {
    DB, $, $all, fmtMoney, escapeHtml, toast,
    getSession, isLogin, loginAs, logout, ensureDemoAccount,
    renderTopbar, logoutAndGo, requireLogin, statusBadge, orderStatusBadge
  };
})();
