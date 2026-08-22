"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DB, type Order } from "@/lib/data";
import { fmtMoney } from "@/lib/format";

const PAGE_SIZE = 20;

type Filters = {
  orderId: string;
  kind: string;
  tax: string;
  status: string;
  timeStart: string;
  timeEnd: string;
};

const EMPTY: Filters = { orderId: "", kind: "", tax: "", status: "", timeStart: "", timeEnd: "" };

export default function OrdersPage() {
  const router = useRouter();
  const [form, setForm] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return DB.ORDERS.filter((o) => {
      if (applied.kind === "recharge" && o.kind === "sms") return false;
      if (applied.kind === "sms" && o.kind !== "sms") return false;
      if (applied.tax && o.tax !== applied.tax) return false;
      if (applied.status && o.status !== applied.status) return false;
      if (applied.orderId && o.id.toUpperCase().indexOf(applied.orderId.toUpperCase()) === -1) return false;
      if (applied.timeStart || applied.timeEnd) {
        const created = new Date(o.createdAt.replace(/-/g, "/"));
        if (applied.timeStart && created < new Date(applied.timeStart + " 00:00:00")) return false;
        if (applied.timeEnd && created > new Date(applied.timeEnd + " 23:59:59")) return false;
      }
      return true;
    });
  }, [applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageData = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  const countBy = (st: Order["status"]) => filtered.filter((o) => o.status === st).length;
  const tiles = [
    { n: filtered.length, l: "订单数量", tone: "" },
    { n: countBy("process") + countBy("pending"), l: "进行中", tone: "info" },
    { n: countBy("success") + countBy("fail"), l: "已完成", tone: "success" },
  ];

  function applyFilter() {
    setApplied(form);
    setPage(1);
  }
  function resetFilter() {
    setForm(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  }

  return (
    <AppShell active="orders" requireLogin>
      <div className="container-app py-8">
        <div className="animate-fade-up mb-6">
          <h1 className="text-2xl font-black tracking-tight">订单管理</h1>
          <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-muted">
            用户查看所有已提交的充值/短信单，支持按订单编号、订单类型、税费、状态、提交时间多维度筛选，快速定位和跟踪订单。
          </p>
        </div>

        {/* 汇总统计 */}
        <div className="animate-fade-up d1 mb-5 grid grid-cols-3 gap-4">
          {tiles.map((t) => (
            <div
              key={t.l}
              className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div
                className={`tnum text-3xl font-black ${
                  t.tone === "info" ? "text-info" : t.tone === "success" ? "text-[var(--color-success)]" : "text-primary"
                }`}
              >
                {t.n}
              </div>
              <div className="mt-1 text-[13px] text-muted">{t.l}</div>
            </div>
          ))}
        </div>

        {/* 筛选栏 */}
        <div className="animate-fade-up d2 mb-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <FField label="订单编号">
              <input
                className="field-input"
                placeholder="输入订单编号搜索"
                value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              />
            </FField>
            <FField label="订单类型">
              <select
                className="field-input"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                <option value="">全部</option>
                <option value="recharge">话费充值</option>
                <option value="sms">短信群发</option>
              </select>
            </FField>
            <FField label="税费">
              <select className="field-input" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })}>
                <option value="">全部</option>
                <option value="taxed">含税</option>
                <option value="untaxed">未税</option>
              </select>
            </FField>
            <FField label="状态">
              <select
                className="field-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="">全部</option>
                <option value="process">进行中</option>
                <option value="success">已完成</option>
              </select>
            </FField>
            <FField label="提交时间">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="field-input"
                  value={form.timeStart}
                  onChange={(e) => setForm({ ...form, timeStart: e.target.value })}
                />
                <span className="text-[13px] text-muted">至</span>
                <input
                  type="date"
                  className="field-input"
                  value={form.timeEnd}
                  onChange={(e) => setForm({ ...form, timeEnd: e.target.value })}
                />
              </div>
            </FField>
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button onClick={applyFilter}>
              <Search size={16} /> 查询
            </Button>
            <Button variant="outline" onClick={resetFilter}>
              <RotateCcw size={15} /> 重置
            </Button>
          </div>
        </div>

        {/* 订单列表 */}
        <div className="animate-fade-up d3 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="tbl min-w-[880px]">
              <thead>
                <tr>
                  <th>订单编号</th>
                  <th>类型</th>
                  <th>税费</th>
                  <th>成功/失败/总数</th>
                  <th>退款金额 / 支付总额</th>
                  <th>状态</th>
                  <th>提交时间</th>
                  <th className="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center gap-2 py-16 text-muted">
                        <ClipboardList size={38} className="text-muted-2" />
                        <span className="text-[14px]">暂无订单记录</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageData.map((o) => <OrderRow key={o.id} o={o} onDetail={() => router.push(`/order-detail?id=${encodeURIComponent(o.id)}`)} />)
                )}
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
      </div>
    </AppShell>
  );
}

function OrderRow({ o, onDetail }: { o: Order; onDetail: () => void }) {
  const succ = o.details ? o.details.filter((d) => d.status === "success").length : 0;
  const fail = o.details ? o.details.filter((d) => d.status === "fail").length : 0;
  const sfText = `${succ}/${fail}/${o.count}`;

  let refundAmt = 0;
  if (fail > 0 && o.unitPrice) refundAmt = Math.round(o.unitPrice * fail * 100) / 100;
  else if (fail > 0 && o.face) {
    const unitRate = o.tax === "taxed" ? 1.06 : 1;
    refundAmt = Math.round(o.face * unitRate * fail * 100) / 100;
  }
  const moneyCell = fail > 0 ? `${fmtMoney(refundAmt)} / ${fmtMoney(o.total)}` : fmtMoney(o.total);
  const done = o.status === "success" || o.status === "fail";

  return (
    <tr>
      <td>
        <span className="font-mono text-[13px] font-semibold">{o.id}</span>
      </td>
      <td>
        <span className={`badge ${o.kind === "sms" ? "info" : "gray"}`}>
          {o.kind === "sms" ? "短信群发" : "话费充值"}
        </span>
      </td>
      <td>{o.tax === "taxed" ? "含税" : "未税"}</td>
      <td className="tnum">{sfText}</td>
      <td className="tnum">{moneyCell}</td>
      <td>
        <span className={`badge ${done ? "success" : "process"}`}>{done ? "已完成" : "进行中"}</span>
      </td>
      <td className="whitespace-nowrap text-[13px] text-muted">{o.createdAt}</td>
      <td className="text-center">
        <button onClick={onDetail} className="link-primary text-[13px] font-semibold">
          查看详情
        </button>
      </td>
    </tr>
  );
}

function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold">{label}</label>
      {children}
    </div>
  );
}
