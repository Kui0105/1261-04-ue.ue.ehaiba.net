"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileDown, Trash2, FolderOpen, Check, FileText, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FakeQr } from "@/components/ui/fake-qr";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/session";
import { DB } from "@/lib/data";
import { fmtMoney } from "@/lib/format";

const TAX_TYPES = DB.TAX_TYPES;
const DISCOUNT = DB.DISCOUNT;
const SMS_TEMPLATES = DB.SMS_TEMPLATES;

export default function SmsPage() {
  const toast = useToast();
  const router = useRouter();
  const { session } = useSession();

  const [tax, setTax] = useState<"taxed" | "untaxed">("taxed");
  const [tplId, setTplId] = useState<string | null>(null);
  const [phoneText, setPhoneText] = useState("");
  const [errs, setErrs] = useState<{ tax?: boolean; tpl?: boolean }>({});

  const [tplOpen, setTplOpen] = useState(false);
  const [pendingTplId, setPendingTplId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [wechatOpen, setWechatOpen] = useState(false);
  const [wechatTotal, setWechatTotal] = useState(0);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<string[]>([]);
  const [importInfo, setImportInfo] = useState<{ name: string; size: number; invalid: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [verifyCode, setVerifyCode] = useState("");
  const [sendCd, setSendCd] = useState(0);
  const sendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { phones, invalidPhones } = useMemo(() => {
    const lines = phoneText.split(/[\r\n]+/).map((x) => x.trim()).filter(Boolean);
    const valid: string[] = [];
    const invalid: string[] = [];
    lines.forEach((line) => {
      line
        .split(/[,，;；\s]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((p) => {
          if (/^1\d{10}$/.test(p)) valid.push(p);
          else if (p.length > 0) invalid.push(p);
        });
    });
    return { phones: valid.slice(0, 200), invalidPhones: invalid };
  }, [phoneText]);

  const t = TAX_TYPES[tax];
  const tpl = SMS_TEMPLATES.find((x) => x.id === tplId) || null;
  const unit = tpl ? (t.rate ? tpl.price * (1 + t.rate) : tpl.price) : 0;
  const count = phones.length;
  const total = Math.round(unit * count * 100) / 100;
  const payable = Math.round(total * DISCOUNT.rate * 100) / 100;
  const saveAmt = Math.round((total - payable) * 100) / 100;

  const canSubmit = !!tplId && count > 0;
  const isBalancePay = session?.type === "enterprise";

  useEffect(() => {
    return () => {
      if (sendTimer.current) clearInterval(sendTimer.current);
    };
  }, []);

  function openTplModal() {
    setPendingTplId(tplId);
    setTplOpen(true);
  }
  function confirmTpl() {
    setTplId(pendingTplId);
    setErrs((e) => ({ ...e, tpl: false }));
    setTplOpen(false);
  }

  function clearPhones() {
    if (
      (phones.length || invalidPhones.length) &&
      !window.confirm(`确认清空已导入的 ${phones.length + invalidPhones.length} 个号码？\n此操作不可撤销。`)
    )
      return;
    setPhoneText("");
  }

  function openImport() {
    setPendingImport([]);
    setImportInfo(null);
    setImportOpen(true);
  }

  function processFile(file: File) {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast("仅支持 .xlsx 和 .xls 格式");
      return;
    }
    setPendingImport(DB.PHONE_POOL.slice(0, 20));
    setImportInfo({ name: file.name, size: file.size, invalid: ["12345", "abc", "13800138"] });
    toast("文件解析完成，请确认导入");
  }

  function confirmImport() {
    if (!pendingImport.length) return;
    const existing = phoneText ? phoneText.trim().split(/[\r\n]+/) : [];
    const all = existing.concat(pendingImport);
    const seen: Record<string, boolean> = {};
    const dedup = all.filter((p) => {
      p = p.trim();
      if (!p || seen[p]) return false;
      seen[p] = true;
      return true;
    });
    setPhoneText(dedup.join("\n"));
    setImportOpen(false);
    toast("已导入 " + pendingImport.length + " 个号码");
  }

  function downloadTemplate() {
    const csv = "\uFEFF手机号码\n13800138001\n13912345678\n13600001111\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "短信号码模板.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("模板已下载");
  }

  function submitSend() {
    const next = { tax: !tax, tpl: !tplId };
    setErrs(next);
    if (next.tpl) return;
    if (!phones.length) {
      toast("请先导入发送号码");
      return;
    }
    setConfirmOpen(true);
  }

  function doConfirmPay() {
    setConfirmOpen(false);
    if (session?.type === "enterprise") {
      setVerifyCode("");
      setVerifyOpen(true);
    } else {
      openWechatPay(total);
    }
  }

  function sendVerifyCode() {
    if (sendCd > 0) return;
    DB.generateCode(session?.phone || "");
    setSendCd(60);
    sendTimer.current = setInterval(() => {
      setSendCd((c) => {
        if (c <= 1) {
          if (sendTimer.current) clearInterval(sendTimer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    toast("验证码已发送（演示验证码：111111）");
  }

  function createOrder() {
    const id = "SMS" + Date.now();
    DB.ORDERS.unshift({
      id,
      kind: "sms",
      template: tpl!.name,
      unitPrice: Math.round(unit * 1000) / 1000,
      tax,
      count: phones.length,
      total,
      status: "process",
      createdAt: new Date().toLocaleString("zh-CN").slice(0, 16),
      finishedAt: "",
      details: DB.genDetails(phones.length),
    });
  }

  function doVerifyPay() {
    const code = verifyCode.trim();
    if (!code) {
      toast("请输入验证码");
      return;
    }
    if (!DB.verifyCode(session?.phone || "", code)) {
      toast("验证码错误，请重试");
      return;
    }
    if (payable > 2000) {
      setVerifyOpen(false);
      toast("余额/预授信额度不足无法支付");
      return;
    }
    createOrder();
    if (session) {
      session.balance = Math.max(0, session.balance - total);
      DB.setSession(session);
    }
    setVerifyOpen(false);
    toast("支付成功");
    setTimeout(() => router.push("/orders"), 1000);
  }

  function openWechatPay(amount: number) {
    createOrder();
    setWechatTotal(amount);
    setWechatOpen(true);
    setTimeout(() => {
      setWechatOpen(false);
      toast("支付成功");
      setTimeout(() => router.push("/orders"), 600);
    }, 3000);
  }

  return (
    <AppShell active="sms" requireLogin>
      <div className="container-app py-8">
        <div className="animate-fade-up mb-6">
          <h1 className="text-2xl font-black tracking-tight">短信群发</h1>
          <p className="mt-1.5 text-[14px] text-muted">
            用户在短信群发页面编辑短信内容，导入目标号码列表，提交短信群发订单。
          </p>
        </div>

        <div className="flex flex-col gap-5 pb-40">
          {/* ① 税费类型 */}
          <Panel step="①" title="税费类型" required delay="d1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["taxed", "含税（6% 专票）", "平台开具增值税专用发票"],
                  ["untaxed", "未税（普票）", "用户自行前往营业厅打印普通发票"],
                ] as ["taxed" | "untaxed", string, string][]
              ).map(([key, title, desc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTax(key)}
                  className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-3.5 text-left transition-all duration-200 ${
                    tax === key
                      ? "border-primary bg-[var(--color-primary-light)] shadow-[var(--shadow-card)]"
                      : "border-border bg-card hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  {tax === key && (
                    <span className="absolute right-2 top-2 grid h-4.5 w-4.5 place-items-center rounded-full bg-primary p-0.5 text-white">
                      <Check size={12} />
                    </span>
                  )}
                  <span className="text-[15px] font-bold">{title}</span>
                  <span className="text-[12.5px] text-muted">{desc}</span>
                </button>
              ))}
            </div>
          </Panel>

          {/* ② 短信模板 */}
          <Panel step="②" title="短信模板" required error={errs.tpl ? "请先选择短信模板" : ""} delay="d2">
            {tpl ? (
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <b className="text-[15px]">{tpl.name}</b>
                  <button onClick={openTplModal} className="link-primary inline-flex items-center text-[13px]">
                    更换模板 <ChevronRight size={14} />
                  </button>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{tpl.content}</p>
                <p className="mt-2.5 text-[13px] text-muted">
                  单条价格 <b className="text-primary">{fmtMoney(unit)}</b> ·{" "}
                  {tax === "taxed" ? "含税（6% 专票）" : "未税（普票）"}
                </p>
              </div>
            ) : (
              <Button variant="outline" block onClick={openTplModal}>
                <FileText size={16} /> 选择短信模板
              </Button>
            )}
          </Panel>

          {/* ③ 发送号码 */}
          <Panel step="③" title="发送号码" delay="d3">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openImport}>
                <Upload size={15} /> 号码导入
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <FileDown size={15} /> 模板下载
              </Button>
              <Button variant="ghost" size="sm" onClick={clearPhones}>
                <Trash2 size={15} /> 清空号码
              </Button>
            </div>
            <label className="mb-1.5 block text-[13px] font-semibold">
              手机号码{" "}
              <span className="font-normal text-muted-2">（每行一个号码，支持手动输入或导入后编辑修改/新增）</span>
            </label>
            <textarea
              className="field-input font-mono"
              rows={8}
              placeholder={"13800138001\n13912345678\n13600001111"}
              value={phoneText}
              onChange={(e) => setPhoneText(e.target.value)}
            />
            <p className="mt-2 text-[13px] text-muted">
              已识别有效号码：<b className="text-foreground">{phones.length}</b> 个
              {invalidPhones.length > 0 && (
                <span>
                  ，<span className="font-semibold text-danger">{invalidPhones.length}</span> 个格式错误已标红
                </span>
              )}
            </p>
          </Panel>
        </div>
      </div>

      {/* 底部统计栏 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/92 backdrop-blur-xl shadow-[0_-8px_28px_rgba(64,44,24,0.08)]">
        <div className="container-app flex flex-wrap items-center justify-between gap-4 py-3.5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Stat label="合计总额" value={fmtMoney(total)} />
            <Stat label="税费类型" value={t.label.replace(/（.+）/, "").trim()} />
            <Stat label="单价" value={fmtMoney(unit)} />
            <Stat label="折扣" value={DISCOUNT.label} />
            <Stat label="号码数量" value={String(count)} />
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => router.push("/orders")}>
              前往订单管理
            </Button>
            <Button size="lg" onClick={submitSend} disabled={!canSubmit}>
              {canSubmit ? "提交订单" : "请先选择税费/模板/号码"}
            </Button>
          </div>
        </div>
      </div>

      {/* 选择模板弹窗 */}
      <Modal open={tplOpen} onClose={() => setTplOpen(false)} title="选择短信模板" maxWidth={560}>
        <div className="flex max-h-[56vh] flex-col gap-3 overflow-auto pr-1">
          {SMS_TEMPLATES.map((tp) => {
            const u = t.rate ? tp.price * (1 + t.rate) : tp.price;
            const active = tp.id === pendingTplId;
            return (
              <button
                key={tp.id}
                type="button"
                onClick={() => setPendingTplId(tp.id)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                  active
                    ? "border-primary bg-[var(--color-primary-light)] shadow-[var(--shadow-card)]"
                    : "border-border bg-card hover:border-[var(--color-border-strong)]"
                }`}
              >
                {active && (
                  <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-primary text-white">
                    <Check size={13} />
                  </span>
                )}
                <div className="text-[14.5px] font-bold">{tp.name}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{tp.content}</p>
                <div className="mt-2.5 text-[13px] text-muted">
                  单条价格 <b className="text-primary">{fmtMoney(u)}</b>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex gap-2.5">
          <Button variant="ghost" block onClick={() => setTplOpen(false)}>
            取消
          </Button>
          <Button block onClick={confirmTpl}>
            确定选择
          </Button>
        </div>
      </Modal>

      {/* 导入弹窗 */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="号码导入" maxWidth={520}>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? "border-primary bg-[var(--color-primary-light)]"
              : "border-[var(--color-border-strong)] hover:border-primary hover:bg-[var(--color-primary-light)]/50"
          }`}
        >
          <FolderOpen size={34} className="text-primary" />
          <p className="text-[14px] font-semibold">点击选择文件或拖拽 Excel 文件到此处</p>
          <p className="text-[12.5px] text-muted">支持 .xlsx 和 .xls 格式，表单内容仅需包含手机号码列</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.length && processFile(e.target.files[0])}
          />
        </div>
        {importInfo && (
          <div className="mt-4 space-y-1.5 rounded-xl bg-surface p-4 text-[13px]">
            <div className="font-semibold text-[var(--color-success)]">
              ✓ 文件：{importInfo.name}（{(importInfo.size / 1024).toFixed(1)} KB）
            </div>
            <div>
              识别到有效号码：<b>{pendingImport.length}</b> 个
            </div>
            {importInfo.invalid.length > 0 && (
              <div className="text-danger">
                ⚠ 格式错误号码：<b>{importInfo.invalid.length}</b> 个（已展示在下方）
              </div>
            )}
            <div className="pt-1 text-muted">
              <b className="text-foreground">预览：</b>
              {pendingImport.slice(0, 8).join(", ")}
              {pendingImport.length > 8 ? " ..." : ""}
            </div>
            {importInfo.invalid.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <b className="text-foreground">错误号码列表：</b>
                {importInfo.invalid.map((p) => (
                  <span key={p} className="rounded-md bg-danger-soft px-2 py-0.5 text-[12px] text-danger">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={() => setImportOpen(false)}>
            取消
          </Button>
          {pendingImport.length > 0 && <Button onClick={confirmImport}>确认导入</Button>}
        </div>
      </Modal>

      {/* 确认支付 */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="确认提交发送" maxWidth={540}>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="tbl">
            <tbody>
              <ConfirmRow k="短信模板" v={<b>{tpl?.name}</b>} />
              <ConfirmRow k="税费类型" v={tax === "taxed" ? "含税（6% 专票）" : "未税（普票）"} />
              <ConfirmRow k="单价金额" v={<span className="amount">{fmtMoney(unit)}</span>} />
              <ConfirmRow k="折扣" v={DISCOUNT.label} />
              <ConfirmRow k="优惠金额" v={<span className="amount">-{fmtMoney(saveAmt)}</span>} />
              <ConfirmRow k="号码数量" v={<b>{phones.length} 个</b>} />
              <tr className="bg-[var(--color-primary-light)]">
                <td colSpan={2} className="amount text-primary">
                  实付总额（{DISCOUNT.label}）：{fmtMoney(payable)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-surface px-4 py-3">
          <span className="text-[13px] font-semibold text-muted">支付方式</span>
          <span
            className={`badge ${isBalancePay ? "warning" : "success"}`}
            style={{ fontSize: 13, padding: "5px 12px" }}
          >
            {isBalancePay ? "余额支付" : "微信支付"}
          </span>
        </div>

        {isBalancePay && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BalCard n={fmtMoney(session?.balance ?? 0)} l="账户余额" />
            <BalCard n="¥2000.00" l="预授信额度" />
            <BalCard n={fmtMoney(payable)} l="本次消费金额" tone="danger" />
            <BalCard n={fmtMoney(-payable)} l="消费后余额" tone="success" />
          </div>
        )}

        <div className="mt-5 flex gap-2.5">
          <Button variant="ghost" block onClick={() => setConfirmOpen(false)}>
            取消
          </Button>
          <Button block onClick={doConfirmPay}>
            确认支付
          </Button>
        </div>
      </Modal>

      {/* 企业验证码 */}
      <Modal open={verifyOpen} onClose={() => setVerifyOpen(false)} title="安全验证" maxWidth={420}>
        <p className="mb-3.5 text-[14px] text-muted">
          为保障账户安全，订单金额将从账户余额扣减，验证码将发送至绑定手机号{" "}
          <b className="text-foreground">{session?.phone || "-"}</b>：
        </p>
        <div className="flex items-stretch gap-2.5">
          <input
            className="field-input flex-1"
            maxLength={6}
            placeholder="输入验证码"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
          />
          <Button variant="outline" size="sm" onClick={sendVerifyCode} disabled={sendCd > 0} className="min-w-[112px]">
            {sendCd > 0 ? `重新发送(${sendCd}s)` : "获取验证码"}
          </Button>
        </div>
        <p className="mt-2 text-[13px] text-muted">
          演示验证码：<b className="text-foreground">111111</b>
        </p>
        <div className="mt-5 flex gap-2.5">
          <Button variant="ghost" block onClick={() => setVerifyOpen(false)}>
            取消
          </Button>
          <Button block onClick={doVerifyPay}>
            确认支付
          </Button>
        </div>
      </Modal>

      {/* 微信扫码支付 */}
      <Modal open={wechatOpen} onClose={() => setWechatOpen(false)} title="微信扫码支付" maxWidth={360}>
        <div className="flex flex-col items-center gap-3 py-2">
          <FakeQr seed={"sms" + wechatTotal} size={200} />
          <p className="text-[16px] font-bold">支付金额：{fmtMoney(wechatTotal)}</p>
          <p className="text-[13px] text-muted">请使用微信扫描上方二维码完成支付…</p>
        </div>
      </Modal>
    </AppShell>
  );
}

function Panel({
  step,
  title,
  required,
  error,
  delay,
  children,
}: {
  step: string;
  title: string;
  required?: boolean;
  error?: string;
  delay?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`animate-fade-up ${delay || ""} rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]`}
    >
      <h3 className="mb-4 flex items-center gap-2 text-[16px] font-bold">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--color-primary-light)] text-[13px] font-black text-primary">
          {step}
        </span>
        {title}
        {required && (
          <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] font-semibold text-danger">必选</span>
        )}
      </h3>
      {children}
      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11.5px] text-muted">{label}</span>
      <span className="tnum text-[15px] font-bold">{value}</span>
    </div>
  );
}

function ConfirmRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <tr>
      <td className="w-[36%] text-muted">{k}</td>
      <td>{v}</td>
    </tr>
  );
}

function BalCard({ n, l, tone }: { n: string; l: string; tone?: "danger" | "success" }) {
  const color =
    tone === "danger" ? "text-danger" : tone === "success" ? "text-[var(--color-success)]" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <div className={`tnum text-[15px] font-bold ${color}`}>{n}</div>
      <div className="mt-0.5 text-[12px] text-muted">{l}</div>
    </div>
  );
}
