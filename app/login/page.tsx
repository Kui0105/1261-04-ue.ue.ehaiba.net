"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Signal, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/session";
import { Modal } from "@/components/ui/modal";
import { DB, type SessionUser } from "@/lib/data";
import { isValidPhone } from "@/lib/format";

type Mode = "password" | "smscode";

function LoginInner() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const { loginAs } = useSession();

  const [mode, setMode] = useState<Mode>("password");
  const [agreeOpen, setAgreeOpen] = useState(false);

  // password form
  const [pPhone, setPPhone] = useState("");
  const [pPwd, setPPwd] = useState("");
  const [pAgree, setPAgree] = useState(false);
  const [pErr, setPErr] = useState<{ phone?: boolean; pwd?: boolean }>({});

  // sms form
  const [sPhone, setSPhone] = useState("");
  const [sCode, setSCode] = useState("");
  const [sAgree, setSAgree] = useState(false);
  const [sErr, setSErr] = useState<{ phone?: boolean; code?: boolean }>({});
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [lockText, setLockText] = useState("");

  const currentPhone = mode === "password" ? pPhone.trim() : sPhone.trim();

  useEffect(() => {
    if (currentPhone && DB.isPhoneLocked(currentPhone)) {
      const remain = DB.getLockRemaining(currentPhone);
      const m = Math.floor(remain / 60);
      const s = remain % 60;
      setLockText(`连续5次密码错误，请在 ${m}分${s < 10 ? "0" : ""}${s}秒 后重试。`);
    } else {
      setLockText("");
    }
  }, [currentPhone, mode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function doLogin(user: SessionUser) {
    const phone = user.account || user.phone;
    if (phone) DB.setFailRecord(phone, 0, 0);
    loginAs(user);
    toast("登录成功");
    setTimeout(() => router.push(params.get("redirect") || "/"), 600);
  }

  function onSendCode() {
    const phone = sPhone.trim();
    if (!isValidPhone(phone)) {
      toast("请先输入正确的手机号码");
      return;
    }
    if (countdown > 0) return;
    const code = DB.generateCode(phone);
    toast("验证码已发送（演示验证码：" + code + "）");
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function submitPwd(e: React.FormEvent) {
    e.preventDefault();
    if (!pAgree) {
      toast("请先阅读并同意《用户协议》与《隐私政策》");
      return;
    }
    const err = { phone: !isValidPhone(pPhone.trim()), pwd: !pPwd };
    setPErr(err);
    if (err.phone || err.pwd) return;
    if (pPhone.trim() && DB.isPhoneLocked(pPhone.trim())) return;

    let user = DB.findUserByPhone(pPhone.trim());
    if (!user) {
      toast("该手机号未注册，已使用演示账号登录");
      user = {
        type: "personal",
        account: pPhone.trim(),
        phone: pPhone.trim(),
        name: pPhone.trim() + "（个人）",
        balance: 5000,
        creditLimit: 20000,
        usedCredit: 1050,
      };
    }
    doLogin(user);
  }

  function submitSms(e: React.FormEvent) {
    e.preventDefault();
    if (!sAgree) {
      toast("请先阅读并同意《用户协议》与《隐私政策》");
      return;
    }
    const err = { phone: !isValidPhone(sPhone.trim()), code: !/^\d{6}$/.test(sCode.trim()) };
    setSErr(err);
    if (err.phone || err.code) return;
    if (!DB.verifyCode(sPhone.trim(), sCode.trim())) {
      toast("验证码错误，请输入 111111（演示验证码）");
      return;
    }
    let user = DB.findUserByPhone(sPhone.trim());
    if (!user) {
      toast("该手机号未注册，已使用演示账号登录");
      user = {
        type: "personal",
        account: sPhone.trim(),
        phone: sPhone.trim(),
        name: sPhone.trim() + "（个人）",
        balance: 5000,
        creditLimit: 0,
        usedCredit: 0,
      };
    }
    doLogin(user);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur-xl">
        <div className="container-app flex h-16 items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#f7842e,#e2560c)] text-white shadow-[var(--shadow-primary)] transition-transform group-hover:scale-105">
              <Signal size={19} />
            </span>
            <span className="text-[17px] font-black tracking-tight">话费代充系统</span>
          </Link>
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-black/5 hover:text-foreground"
          >
            返回首页
          </Link>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1200px] items-stretch gap-0 px-5 py-8 lg:grid-cols-2 lg:gap-10">
        {/* 左侧介绍 */}
        <aside
          className="animate-fade-up relative hidden overflow-hidden rounded-3xl p-10 text-white shadow-[var(--shadow-pop)] lg:flex lg:flex-col lg:justify-between"
          style={{ background: "linear-gradient(150deg,#f7842e 0%,#d2560e 55%,#a8410a 100%)" }}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/[0.07]" />
          <div className="relative">
            <h2 className="text-3xl font-black leading-snug text-balance">
              欢迎使用
              <br />
              话费代充系统
            </h2>
            <p className="mt-4 max-w-[360px] text-[14.5px] leading-relaxed text-white/85">
              企业批量充值、个人在线直充、代理商分销推广，一个账号全搞定。
            </p>
          </div>
          <div className="relative flex flex-col gap-4">
            {[
              ["个人 / 企业 / 代理商 ", "同一账号体系", " 登录"],
              ["千级号码批量导入，", "订单状态全链路追踪", ""],
              ["两级分销，", "佣金自动结算、随时提现", ""],
            ].map((row, i) => (
              <div key={i} className="flex items-start gap-3 text-[14px] text-white/90">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
                <span>
                  {row[0]}
                  <b className="font-bold text-white">{row[1]}</b>
                  {row[2]}
                </span>
              </div>
            ))}
          </div>
          <p className="relative text-[12px] text-white/60">© 2026 海拔科技 ehaiba.com</p>
        </aside>

        {/* 右侧表单 */}
        <main className="animate-fade-up d2 flex items-center justify-center">
          <div className="w-full max-w-[420px] rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
            <h1 className="text-2xl font-black">登录</h1>
            <p className="mt-1.5 text-[14px] text-muted">请选择登录方式并填写信息。</p>

            {/* 模式切换 */}
            <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--color-border-strong)]">
              {(
                [
                  ["password", "密码登录"],
                  ["smscode", "验证码登录"],
                ] as [Mode, string][]
              ).map(([m, label], i) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2.5 text-sm font-semibold transition-colors ${i === 0 ? "border-r border-[var(--color-border-strong)]" : ""} ${
                    mode === m ? "bg-[var(--color-primary-light)] text-primary" : "bg-card text-muted hover:bg-black/[0.03]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {lockText && (
              <div className="mt-4 rounded-xl border border-[var(--color-danger)]/25 bg-danger-soft px-4 py-3 text-[13px] leading-relaxed text-danger">
                <b>该账号已临时锁定</b>
                <br />
                {lockText}
              </div>
            )}

            {mode === "password" ? (
              <form onSubmit={submitPwd} noValidate className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold">手机号码</label>
                  <input
                    className="field-input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="请输入11位手机号码"
                    value={pPhone}
                    onChange={(e) => setPPhone(e.target.value.replace(/\D/g, ""))}
                  />
                  {pErr.phone && <p className="mt-1 text-[12px] text-danger">请输入有效的11位手机号码</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold">密码</label>
                  <input
                    className="field-input"
                    type="password"
                    placeholder="请输入登录密码"
                    value={pPwd}
                    onChange={(e) => setPPwd(e.target.value)}
                  />
                  {pErr.pwd && <p className="mt-1 text-[12px] text-danger">请输入密码</p>}
                </div>
                <AgreeRow checked={pAgree} onChange={setPAgree} onOpen={() => setAgreeOpen(true)} />
                <SubmitButton disabled={!pAgree}>登 录</SubmitButton>
              </form>
            ) : (
              <form onSubmit={submitSms} noValidate className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold">手机号码</label>
                  <input
                    className="field-input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="请输入11位手机号码"
                    value={sPhone}
                    onChange={(e) => setSPhone(e.target.value.replace(/\D/g, ""))}
                  />
                  {sErr.phone && <p className="mt-1 text-[12px] text-danger">请输入有效的11位手机号码</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold">验证码</label>
                  <div className="flex items-stretch gap-2.5">
                    <input
                      className="field-input flex-1"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="请输入6位验证码"
                      value={sCode}
                      onChange={(e) => setSCode(e.target.value.replace(/\D/g, ""))}
                    />
                    <button
                      type="button"
                      onClick={onSendCode}
                      disabled={!isValidPhone(sPhone.trim()) || countdown > 0}
                      className="min-w-[112px] shrink-0 rounded-xl bg-[linear-gradient(135deg,#f7842e,#e2560c)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-primary)] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:bg-none disabled:bg-surface disabled:text-muted-2 disabled:shadow-none"
                    >
                      {countdown > 0 ? `${countdown}秒后重发` : "获取验证码"}
                    </button>
                  </div>
                  {sErr.code && <p className="mt-1 text-[12px] text-danger">请输入6位验证码</p>}
                </div>
                <AgreeRow checked={sAgree} onChange={setSAgree} onOpen={() => setAgreeOpen(true)} />
                <SubmitButton disabled={!sAgree}>登 录</SubmitButton>
              </form>
            )}

            <p className="mt-5 text-center text-[13.5px] text-muted">
              还没有账号？
              <Link href="/register" className="link-primary ml-1">
                立即注册
              </Link>
            </p>
          </div>
        </main>
      </div>

      <AgreementModal open={agreeOpen} onClose={() => setAgreeOpen(false)} />
    </div>
  );
}

function AgreeRow({
  checked,
  onChange,
  onOpen,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-relaxed text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
      />
      <span>
        我已阅读并同意{" "}
        <button type="button" onClick={onOpen} className="link-primary">
          《用户协议》
        </button>{" "}
        与{" "}
        <button type="button" onClick={onOpen} className="link-primary">
          《隐私政策》
        </button>
      </span>
    </label>
  );
}

function SubmitButton({ disabled, children }: { disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-1 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f7842e,#e2560c)] text-[15px] font-bold text-white shadow-[var(--shadow-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(242,106,27,0.42)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-primary)]"
    >
      {children}
      <ArrowRight size={18} />
    </button>
  );
}

export function AgreementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="用户协议与隐私政策" maxWidth={560}>
      <div className="max-h-[60vh] overflow-auto pr-1">
        <h4 className="mb-1.5 text-[15px] font-bold">一、用户协议</h4>
        <p className="text-[13px] leading-[1.75] text-muted">
          欢迎使用话费代充系统（以下简称"本平台"）。在注册或使用本平台服务前，请您务必仔细阅读并充分理解本协议的全部内容，特别是以加粗形式提示的责任豁免、限制条款等。一旦勾选同意并完成登录/注册，即视为您已阅读、理解并同意接受本协议各项条款的约束。
        </p>
        <p className="mt-2 text-[13px] leading-[1.75] text-muted">
          您承诺所提供的账号信息真实、准确、完整、合法，并自行妥善保管账号及密码；因账号保管不善导致的损失由您自行承担。本平台按现状提供充值、短信群发等服务，不承诺服务的不间断性与及时性，法律法规另有强制性规定的除外。
        </p>
        <h4 className="mb-1.5 mt-4 text-[15px] font-bold">二、隐私政策</h4>
        <p className="text-[13px] leading-[1.75] text-muted">
          我们高度重视您的个人信息保护。本平台仅在为您提供服务所必需的范围内收集手机号、验证码、企业资质等必要信息，并采用加密等安全措施加以保护，不会在未经您授权的情况下向第三方披露，法律法规或监管部门另有要求的除外。
        </p>
        <p className="mt-2 text-[13px] leading-[1.75] text-muted">
          您有权查询、更正自己的个人信息，并可依法律规定要求删除。更多说明详见平台公示的完整版《用户协议》与《隐私政策》。
        </p>
        <p className="mt-3.5 text-[12px] text-muted-2">
          （本内容为原型演示文本，正式上线前请替换为经法务审核的正式条款。）
        </p>
      </div>
    </Modal>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
