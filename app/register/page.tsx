"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Signal, User, Building2, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/session";
import { DB, type SessionUser } from "@/lib/data";
import { isValidPhone } from "@/lib/format";
import { AgreementModal } from "@/app/login/page";

type RegType = "personal" | "enterprise";

export default function RegisterPage() {
  const toast = useToast();
  const router = useRouter();
  const { loginAs } = useSession();

  const [type, setType] = useState<RegType>("personal");
  const [agree, setAgree] = useState(false);
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);

  // personal
  const [pPhone, setPPhone] = useState("");
  const [pCode, setPCode] = useState("");
  const [pPwd, setPPwd] = useState("");

  // enterprise
  const [company, setCompany] = useState("");
  const [creditCode, setCreditCode] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eCode, setECode] = useState("");
  const [ePwd, setEPwd] = useState("");

  const [errs, setErrs] = useState<Record<string, boolean>>({});

  const [cdP, setCdP] = useState(0);
  const [cdE, setCdE] = useState(0);
  const timerP = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerE = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerP.current) clearInterval(timerP.current);
      if (timerE.current) clearInterval(timerE.current);
    };
  }, []);

  const activePhone = type === "personal" ? pPhone.trim() : ePhone.trim();
  useEffect(() => {
    setPhoneExists(isValidPhone(activePhone) && !!DB.findUserByPhone(activePhone));
  }, [activePhone]);

  function sendCode(kind: "p" | "e") {
    const phone = kind === "p" ? pPhone.trim() : ePhone.trim();
    if (!isValidPhone(phone)) {
      toast("请先输入正确的手机号码");
      return;
    }
    const running = kind === "p" ? cdP : cdE;
    if (running > 0) return;
    const code = DB.generateCode(phone);
    toast("验证码已发送（演示验证码：" + code + "）");
    const setCd = kind === "p" ? setCdP : setCdE;
    const ref = kind === "p" ? timerP : timerE;
    setCd(60);
    ref.current = setInterval(() => {
      setCd((c) => {
        if (c <= 1) {
          if (ref.current) clearInterval(ref.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function finishRegister(user: SessionUser) {
    DB.addUser(user);
    loginAs(user);
    toast("注册成功，已自动登录");
    setTimeout(() => router.push("/"), 700);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) {
      toast("请先阅读并同意《用户协议》与《隐私政策》");
      return;
    }
    const next: Record<string, boolean> = {};
    let ok = true;

    if (type === "personal") {
      if (!isValidPhone(pPhone.trim())) {
        next.pPhone = true;
        ok = false;
      } else if (DB.findUserByPhone(pPhone.trim())) {
        toast("该手机号已注册，请直接登录");
        setTimeout(() => router.push("/login"), 800);
        return;
      }
      if (!/^\d{6}$/.test(pCode.trim())) {
        next.pCode = true;
        ok = false;
      } else if (!DB.verifyCode(pPhone.trim(), pCode.trim())) {
        toast("验证码错误或已过期");
        ok = false;
      }
      if (pPwd.length < 6) {
        next.pPwd = true;
        ok = false;
      }
      setErrs(next);
      if (!ok) return;
      finishRegister({
        type: "personal",
        account: pPhone.trim(),
        phone: pPhone.trim(),
        name: pPhone.trim() + "（个人）",
        password: pPwd,
        balance: 0,
        creditLimit: 0,
        usedCredit: 0,
        isAgent: false,
      });
    } else {
      if (!company.trim()) {
        next.company = true;
        ok = false;
      }
      if (!creditCode.trim()) {
        next.creditCode = true;
        ok = false;
      }
      if (!isValidPhone(ePhone.trim())) {
        next.ePhone = true;
        ok = false;
      } else if (DB.findUserByPhone(ePhone.trim())) {
        toast("该手机号已注册，请直接登录");
        setTimeout(() => router.push("/login"), 800);
        return;
      }
      if (!/^\d{6}$/.test(eCode.trim())) {
        next.eCode = true;
        ok = false;
      } else if (!DB.verifyCode(ePhone.trim(), eCode.trim())) {
        toast("验证码错误或已过期");
        ok = false;
      }
      if (ePwd.length < 6) {
        next.ePwd = true;
        ok = false;
      }
      setErrs(next);
      if (!ok) return;
      finishRegister({
        type: "enterprise",
        account: ePhone.trim(),
        phone: ePhone.trim(),
        name: company.trim(),
        password: ePwd,
        companyName: company.trim(),
        creditCode: creditCode.trim(),
        balance: 0,
        creditLimit: 20000,
        usedCredit: 0,
        isAgent: false,
      });
    }
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
              创建您的
              <br />
              话费代充账号
            </h2>
            <p className="mt-4 max-w-[360px] text-[14.5px] leading-relaxed text-white/85">
              选择个人 or 企业身份完成注册，注册成功即可使用全部用户端功能。
            </p>
          </div>
          <div className="relative flex flex-col gap-4">
            {[
              "个人用户：无需实名认证，注册即用",
              "企业用户：填写企业信息，账户唯一",
              "注册后均可申请成为代理商",
            ].map((t) => (
              <div key={t} className="flex items-start gap-3 text-[14px] text-white/90">
                <Check size={20} className="mt-0.5 shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <p className="relative text-[12px] text-white/60">© 2026 海拔科技 ehaiba.com</p>
        </aside>

        {/* 右侧表单 */}
        <main className="animate-fade-up d2 flex items-center justify-center py-4">
          <div className="w-full max-w-[460px] rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
            <h1 className="text-2xl font-black">注册</h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
              请先选择注册身份（仅影响注册所需资料，登录时不区分身份）。
            </p>

            {phoneExists && (
              <div className="mt-4 rounded-xl border border-[var(--color-danger)]/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
                该手机号已注册，请直接
                <Link href="/login" className="font-bold underline">
                  登录
                </Link>
              </div>
            )}

            {/* 身份选择 */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(
                [
                  ["personal", User, "个人用户", "自然人，零散充值"],
                  ["enterprise", Building2, "企业用户", "电销公司等批量充值"],
                ] as [RegType, typeof User, string, string][]
              ).map(([t, Icon, title, desc]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                    type === t
                      ? "border-primary bg-[var(--color-primary-light)] shadow-[var(--shadow-card)]"
                      : "border-border bg-card hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  {type === t && (
                    <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-white">
                      <Check size={13} />
                    </span>
                  )}
                  <Icon size={22} className={type === t ? "text-primary" : "text-muted"} />
                  <div className="mt-2 text-[14px] font-bold">{title}</div>
                  <div className="mt-0.5 text-[12px] text-muted">{desc}</div>
                </button>
              ))}
            </div>

            <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
              {type === "personal" ? (
                <>
                  <Field label="手机号码" error={errs.pPhone ? "请输入有效的11位手机号码" : ""}>
                    <input
                      className="field-input"
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="用于登录的手机号"
                      value={pPhone}
                      onChange={(e) => setPPhone(e.target.value.replace(/\D/g, ""))}
                    />
                  </Field>
                  <Field label="验证码" error={errs.pCode ? "请输入6位数字验证码" : ""}>
                    <CodeRow
                      value={pCode}
                      onChange={setPCode}
                      cd={cdP}
                      canSend={isValidPhone(pPhone.trim())}
                      onSend={() => sendCode("p")}
                    />
                  </Field>
                  <Field
                    label="密码"
                    error={errs.pPwd ? "密码至少6位" : ""}
                    hint="密码需至少6位，建议包含大小写字母与数字"
                  >
                    <input
                      className="field-input"
                      type="password"
                      placeholder="设置登录密码（至少6位）"
                      value={pPwd}
                      onChange={(e) => setPPwd(e.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="企业名称" error={errs.company ? "请输入企业名称" : ""}>
                    <input
                      className="field-input"
                      type="text"
                      placeholder="营业执照上的企业全称"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </Field>
                  <Field label="统一社会信用代码" error={errs.creditCode ? "请输入统一社会信用代码" : ""}>
                    <input
                      className="field-input"
                      type="text"
                      maxLength={18}
                      placeholder="18 位统一社会信用代码"
                      value={creditCode}
                      onChange={(e) => setCreditCode(e.target.value)}
                    />
                  </Field>
                  <Field label="联系电话" error={errs.ePhone ? "请输入有效的11位手机号码" : ""}>
                    <input
                      className="field-input"
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="企业管理员手机号"
                      value={ePhone}
                      onChange={(e) => setEPhone(e.target.value.replace(/\D/g, ""))}
                    />
                  </Field>
                  <Field label="验证码" error={errs.eCode ? "请输入6位数字验证码" : ""}>
                    <CodeRow
                      value={eCode}
                      onChange={setECode}
                      cd={cdE}
                      canSend={isValidPhone(ePhone.trim())}
                      onSend={() => sendCode("e")}
                    />
                  </Field>
                  <Field
                    label="密码"
                    error={errs.ePwd ? "密码至少6位" : ""}
                    hint="密码需至少6位，建议包含大小写字母与数字"
                  >
                    <input
                      className="field-input"
                      type="password"
                      placeholder="设置登录密码（至少6位）"
                      value={ePwd}
                      onChange={(e) => setEPwd(e.target.value)}
                    />
                  </Field>
                </>
              )}

              <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-relaxed text-muted">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                />
                <span>
                  我已阅读并同意{" "}
                  <button type="button" onClick={() => setAgreeOpen(true)} className="link-primary">
                    《用户协议》
                  </button>{" "}
                  与{" "}
                  <button type="button" onClick={() => setAgreeOpen(true)} className="link-primary">
                    《隐私政策》
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={!agree}
                className="mt-1 inline-flex h-[52px] w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f7842e,#e2560c)] text-[15px] font-bold text-white shadow-[var(--shadow-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(242,106,27,0.42)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
              >
                注册并登录
              </button>
            </form>

            <p className="mt-5 text-center text-[13.5px] text-muted">
              已有账号？
              <Link href="/login" className="link-primary ml-1">
                去登录
              </Link>
            </p>
          </div>
        </main>
      </div>

      <AgreementModal open={agreeOpen} onClose={() => setAgreeOpen(false)} />
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold">{label}</label>
      {children}
      {error ? (
        <p className="mt-1 text-[12px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[12px] text-muted-2">{hint}</p>
      ) : null}
    </div>
  );
}

function CodeRow({
  value,
  onChange,
  cd,
  canSend,
  onSend,
}: {
  value: string;
  onChange: (v: string) => void;
  cd: number;
  canSend: boolean;
  onSend: () => void;
}) {
  return (
    <div className="flex items-stretch gap-2.5">
      <input
        className="field-input flex-1"
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="请输入6位验证码"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend || cd > 0}
        className="min-w-[112px] shrink-0 rounded-xl bg-[linear-gradient(135deg,#f7842e,#e2560c)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-primary)] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:bg-none disabled:bg-surface disabled:text-muted-2 disabled:shadow-none"
      >
        {cd > 0 ? `${cd}秒后重发` : "获取验证码"}
      </button>
    </div>
  );
}
