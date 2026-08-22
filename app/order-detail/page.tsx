"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, AlertTriangle, Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DB, type Order, type DetailRow } from "@/lib/data";
import { fmtMoney } from "@/lib/format";

const PAGE_SIZE = 20;
const DISCOUNT = DB.DISCOUNT;

function normDetails(o: Order): DetailRow[] {
  const displayDone = o.status === "success" || o.status === "fail";
  if (displayDone) {
    return o.details.map((d) =>
      d.status === "process" || d.status === "pending"
        ? { phone: d.phone, status: "success", reason: "", callbackAt: d.callbackAt || "-" }
        : d,
    );
  }
  const mapped = o.details.map((d) =>
    d.status === "pending"
      ? { phone: d.phone, status: "process" as const, reason: "", callbackAt: d.callbackAt || "-" }
      : d,
  );
  const hasProcess = mapped.some((d) => d.status === "process");
  if (!hasProcess && mapped.length) {
    mapped[0] = { phone: mapped[0].phone, status: "process", reason: "", callbackAt: mapped[0].callbackAt || "-" };
  }
  return mapped;
}

function DetailInner() {
  const params = useSearchParams();
  const toast = useToast();
  const id = params.get("id");
  const order = id ? DB.ORDERS.find((x) => x.id === id) : undefined;

  const [phoneKw, setPhoneKw] = useState("");
  const [statusF, setStatusF] = useState("");
  const [page, setPage] = useState(1);

  const norm = useMemo(() => (order ? normDetails(order) : []), [order]);

  const filtered = useMemo(
    () =>
      norm.filter((d) => {
        if (phoneKw && d.phone.indexOf(phoneKw) === -1) return false;
        if (statusF && d.status !== statusF) return false;
        return true;
      }),
    [norm, phoneKw, statusF],
  );

  if (!order) {
    return (
      <AppShell active="orders" requireLogin>
        <div className="container-app py-8">
          <Link href="/orders" className="link-primary mb-4 inline-flex items-center gap-1 text-[13.5px]">
            <ArrowLeft size={15} /> 返回订单列表
          </Link>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-20 text-muted shadow-[var(--shadow-card)]">
            <AlertTriangle size={40} className="text-warning" />
            <p className="text-[14px]">{id ? `未找到订单：${id}` : "缺少订单编号参数（?id=）"}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const isSms = order.kind === "sms";
  const succ = norm.filter((d) => d.status === "success").length;
  const fail = norm.filter((d) => d.status === "fail").length;
  const proc = norm.filter((d) => d.status === "process" || d.status === "pending").length;

  const unitRate = order.tax === "taxed" ? 1.06 : 1;
  const unit = isSms ? order.unitPrice ?? 0 : (order.face ?? 0) * unitRate;
  const totalAmt = isSms ? order.total : unit * order.count;
  const payable = Math.round(totalAmt * DISCOUNT.rate * 100) / 100;
  const saveAmt = Math.round((totalAmt - payable) * 100) / 100;
  const refundTotal = Math.round(unit * fail * 100) / 100;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  const carrierObj =
    DB.CARRIERS[
      (() => {
        let h = 0;
        for (let i = 0; i < order.id.length; i++) h = (h * 31 + order.id.charCodeAt(i)) % DB.CARRIERS.length;
        return h;
      })()
    ];

  const tpl = isSms ? DB.SMS_TEMPLATES.find((x) => x.name === order.template) : null;

  function statusText(st: string) {
    if (isSms)
      return st === "success" ? "发送成功" : st === "fail" ? "发送失败" : "发送中";
    return st === "success" ? "充值成功" : st === "fail" ? "充值失败" : st === "pending" ? "待充值" : "充值中";
  }
  function badgeClass(st: string) {
    return st === "success" ? "success" : st === "fail" ? "fail" : st === "pending" ? "pending" : "process";
  }

  function exportCsv() {
    const header = isSms ? ["手机号", "状态", "发送结果说明", "回调时间"] : ["手机号", "状态", "失败原因", "回调时间"];
    const rows = [header];
    norm.forEach((d) => rows.push([d.phone, statusText(d.status), d.reason || "", d.callbackAt || ""]));
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = order!.id + "_明细.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("导出成功");
  }

  const infoItems: [string, React.ReactNode][] = isSms
    ? [
        ["订单号", <b key="id">{order.id}</b>],
        ["订单类型", "短信群发"],
        ["号码总数", <b key="c">{order.count} 条</b>],
        ["税费类型", order.tax === "taxed" ? "含税（6%专票）" : "未税（普票）"],
        ["单价", <span key="u" className="amount">{fmtMoney(order.unitPrice ?? 0)}/条</span>],
        ["总额", <span key="t" className="amount">{fmtMoney(order.total)}</span>],
        ["优惠折扣", DISCOUNT.label],
        ["优惠金额", <span key="s" className="amount">-{fmtMoney(saveAmt)}</span>],
        ["实付总额", <span key="p" className="amount">{fmtMoney(payable)}</span>],
        ["状态", <StatusBadge key="st" done={order.status === "success" || order.status === "fail"} />],
        ["提交时间", order.createdAt],
      ]
    : [
        ["订单号", <b key="id">{order.id}</b>],
        ["订单类型", "话费充值"],
        ["运营商", carrierObj?.label || "-"],
        ["面额", <b key="f">{order.face} 元</b>],
        ["税费类型", order.tax === "taxed" ? "含税（6%专票）" : "未税（普票）"],
        ["单价", <span key="u" className="amount">{fmtMoney(unit)}</span>],
        ["总额", <span key="t" className="amount">{fmtMoney(totalAmt)}</span>],
        ["优惠折扣", DISCOUNT.label],
        ["优惠金额", <span key="s" className="amount">-{fmtMoney(saveAmt)}</span>],
        ["实付总额", <span key="p" className="amount">{fmtMoney(payable)}</span>],
        ["状态", <StatusBadge key="st" done={order.status === "success" || order.status === "fail"} />],
        ["提交时间", order.createdAt],
      ];

  const tiles = [
    { n: String(order.count), l: "号码总数", tone: "" },
    { n: String(proc), l: isSms ? "发送中" : "充值中", tone: "info" },
    { n: String(succ), l: isSms ? "发送成功" : "充值成功", tone: "success" },
    { n: String(fail), l: isSms ? "发送失败" : "充值失败", tone: "danger" },
    { n: fmtMoney(refundTotal), l: "退款总额", tone: "warning" },
  ];

  return (
    <AppShell active="orders" requireLogin>
      <div className="container-app py-8">
        <div className="animate-fade-up mb-5">
          <Link href="/orders" className="link-primary inline-flex items-center gap-1 text-[13.5px]">
            <ArrowLeft size={15} /> 返回订单列表
          </Link>
          <h1 className="mt-3 text-2xl font-black tracking-tight">
            {isSms ? "短信订单详情" : "充值订单详情"} · {order.id}
          </h1>
        </div>

        {/* 基本信息 */}
        <Section title="基本信息" delay="d1">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            {infoItems.map(([label, value], i) => (
              <div key={i}>
                <div className="text-[12.5px] text-muted">{label}</div>
                <div className="mt-1 text-[14.5px] font-medium">{value}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 短信模板卡片 */}
        {isSms && (
          <Section title="短信模板" delay="d2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <b className="text-[15px]">{tpl?.name || order.template}</b>
              <p className="mt-1.5 text-[13px] text-muted">
                短信签名：<b className="text-foreground">{tpl?.signature || "海拔科技"}</b>
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{tpl?.content || ""}</p>
            </div>
          </Section>
        )}

        {/* 统计 */}
        <div className="animate-fade-up d2 mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((t) => (
            <div key={t.l} className="rounded-2xl border border-border bg-card p-4 text-center shadow-[var(--shadow-card)]">
              <div
                className={`tnum text-2xl font-black ${
                  t.tone === "info"
                    ? "text-info"
                    : t.tone === "success"
                      ? "text-[var(--color-success)]"
                      : t.tone === "danger"
                        ? "text-danger"
                        : t.tone === "warning"
                          ? "text-warning"
                          : "text-foreground"
                }`}
              >
                {t.n}
              </div>
              <div className="mt-1 text-[12.5px] text-muted">{t.l}</div>
            </div>
          ))}
        </div>

        {/* 明细工具栏 + 表格 */}
        <div className="animate-fade-up d3 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex flex-wrap gap-2.5">
              <input
                className="field-input w-[220px]"
                placeholder="根据手机号筛选…"
                value={phoneKw}
                onChange={(e) => {
                  setPhoneKw(e.target.value);
                  setPage(1);
                }}
              />
              <select
                className="field-input w-[140px]"
                value={statusF}
                onChange={(e) => {
                  setStatusF(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">全部状态</option>
                <option value="success">{isSms ? "发送成功" : "充值成功"}</option>
                <option value="fail">{isSms ? "发送失败" : "充值失败"}</option>
                <option value="process">{isSms ? "发送中" : "充值中"}</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download size={15} /> 导出数据
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="tbl min-w-[640px]">
              <thead>
                <tr>
                  <th>手机号</th>
                  <th>状态</th>
                  <th>{isSms ? "发送结果说明" : "失败原因"}</th>
                  <th>回调时间</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((d, i) => (
                  <tr key={d.phone + i}>
                    <td className="font-mono text-[13px]">{d.phone}</td>
                    <td>
                      <span className={`badge ${badgeClass(d.status)}`}>{statusText(d.status)}</span>
                    </td>
                    <td className="text-[13px] text-muted">{d.reason || "-"}</td>
                    <td className="text-[13px] text-muted">{d.callbackAt || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 border-t border-border py-4">
              <Button variant="outline" size="sm" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>
                上一页
              </Button>
              <span className="text-[13px] text-muted">
                {curPage} / {totalPages} 页（共 {filtered.length} 条）
              </span>
              <Button variant="outline" size="sm" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>
                下一页
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          {isSms
            ? "发送失败条数由第三方返回失败结果，系统自动原路退回对应金额至用户账户。"
            : "充值失败账号由第三方返回失败结果，系统自动原路退回对应金额至用户账户。"}
        </p>
      </div>
    </AppShell>
  );
}

function Section({ title, delay, children }: { title: string; delay?: string; children: React.ReactNode }) {
  return (
    <section
      className={`animate-fade-up ${delay || ""} mb-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]`}
    >
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-bold">
        <span className="h-4 w-1 rounded-full bg-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatusBadge({ done }: { done: boolean }) {
  return <span className={`badge ${done ? "success" : "process"}`}>{done ? "已完成" : "进行中"}</span>;
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={null}>
      <DetailInner />
    </Suspense>
  );
}
