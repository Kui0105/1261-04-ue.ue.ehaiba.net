"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Smartphone,
  MessageSquare,
  PhoneCall,
  ClipboardList,
  Wallet,
  Handshake,
  Signal,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { useToast } from "@/components/ui/toast";
import { EditPasswordModal } from "@/components/ui/edit-password-modal";

type NavKey = "home" | "recharge" | "sms" | "voiceback" | "orders" | "account" | "agent" | "";

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  Icon: typeof Home;
  todo?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "首页", href: "/", Icon: Home },
  { key: "recharge", label: "话费充值", href: "/recharge", Icon: Smartphone },
  { key: "sms", label: "短信群发", href: "/sms", Icon: MessageSquare },
  { key: "voiceback", label: "语音回收", href: "", Icon: PhoneCall, todo: true },
  { key: "orders", label: "订单管理", href: "/orders", Icon: ClipboardList },
  { key: "account", label: "账户中心", href: "/account", Icon: Wallet },
  { key: "agent", label: "代理商中心", href: "/agent", Icon: Handshake },
];

export function AppShell({
  active = "",
  requireLogin = false,
  children,
}: {
  active?: NavKey;
  requireLogin?: boolean;
  children: React.ReactNode;
}) {
  const { session, ready, logout } = useSession();
  const toast = useToast();
  const router = useRouter();
  const [pwdOpen, setPwdOpen] = useState(false);

  useEffect(() => {
    if (requireLogin && ready && !session) {
      toast("请先登录后再访问");
      const t = setTimeout(() => router.push("/login"), 700);
      return () => clearTimeout(t);
    }
  }, [requireLogin, ready, session, router, toast]);

  function onLogout() {
    if (typeof window !== "undefined") {
      const ok = window.confirm("确认退出登录？\n退出后将清除当前登录状态，需重新登录。");
      if (!ok) return;
    }
    logout();
    router.push("/");
  }

  const blocked = requireLogin && ready && !session;

  return (
    <div className="min-h-screen">
      {/* 顶栏 */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#f7842e,#e2560c)] text-white shadow-[var(--shadow-primary)] transition-transform duration-300 group-hover:scale-105">
              <Signal size={19} />
            </span>
            <span className="text-[17px] font-black tracking-tight">话费代充系统</span>
          </Link>

          {/* PC 导航 */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((it) =>
              it.todo ? (
                <button
                  key={it.key}
                  onClick={() => toast("语音回收功能待开放")}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-[var(--color-primary-light)] hover:text-primary"
                >
                  {it.label}
                </button>
              ) : (
                <Link
                  key={it.key}
                  href={it.href}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-primary-light)] hover:text-primary ${
                    it.key === active ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  {it.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2.5">
            {session ? (
              <>
                <span className="hidden max-w-[160px] truncate text-[13px] text-muted sm:inline">
                  {session.name || session.account}
                </span>
                <button
                  onClick={() => setPwdOpen(true)}
                  className="hidden rounded-lg px-3 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-black/5 hover:text-foreground sm:inline"
                >
                  编辑
                </button>
                <button
                  onClick={onLogout}
                  className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  style={{ ["--tw-bg-opacity" as string]: "1" }}
                >
                  退出
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-xl border border-[var(--color-border-strong)] bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                登录 / 注册
              </Link>
            )}
          </div>
        </div>

        {/* 图标子导航（登录后显示） */}
        {session && (
          <div className="border-t border-border/60 bg-surface/60">
            <nav className="mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-3 py-2">
              {NAV_ITEMS.map((it) => {
                const Icon = it.Icon;
                const isActive = it.key === active;
                const inner = (
                  <span
                    className={`flex min-w-[68px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--color-primary-light)] text-primary"
                        : "text-muted hover:bg-black/[0.03] hover:text-foreground"
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                    {it.label}
                  </span>
                );
                return it.todo ? (
                  <button key={it.key} onClick={() => toast("语音回收功能待开放")}>
                    {inner}
                  </button>
                ) : (
                  <Link key={it.key} href={it.href}>
                    {inner}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* 内容 */}
      <main className={blocked ? "opacity-0" : ""}>{children}</main>

      <EditPasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}
