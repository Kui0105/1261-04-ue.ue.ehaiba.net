"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Smartphone,
  MessageSquare,
  ShieldCheck,
  Zap,
  Layers,
  Receipt,
  Handshake,
  Headphones,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { CARRIERS } from "@/lib/data";

const FEATURES = [
  {
    Icon: Layers,
    title: "批量话费充值",
    desc: "支持三网号码批量导入，一键发起大批量充值，实时回执到账状态。",
  },
  {
    Icon: MessageSquare,
    title: "短信群发触达",
    desc: "内置合规营销与通知模板，签名报备，秒级触达海量用户。",
  },
  {
    Icon: Zap,
    title: "极速稳定到账",
    desc: "多通道智能路由，充值成功率高，失败自动退款，到账更安心。",
  },
  {
    Icon: Receipt,
    title: "含税专票开具",
    desc: "支持含税（6% 增值税专票）与未税普票，财务对账清晰无忧。",
  },
  {
    Icon: Handshake,
    title: "代理分佣体系",
    desc: "直推 / 间推两级分佣，客户消费实时结算佣金，透明可提现。",
  },
  {
    Icon: ShieldCheck,
    title: "安全资金保障",
    desc: "账户余额与信用额度双模式，交易全程加密，资金流水可追溯。",
  },
];

const STATS = [
  { num: "99.6%", label: "充值成功率" },
  { num: "3 秒", label: "平均到账" },
  { num: "1200万+", label: "累计充值笔数" },
  { num: "24 / 7", label: "专属客服" },
];

export default function HomePage() {
  const { session } = useSession();

  return (
    <AppShell active="home">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(1000px 500px at 82% -8%, rgba(242,106,27,0.16), transparent 60%), radial-gradient(680px 420px at 6% 10%, rgba(245,158,11,0.12), transparent 60%)",
          }}
        />
        <div className="container-app grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-card px-3.5 py-1.5 text-[13px] font-semibold text-primary shadow-[var(--shadow-card)]">
              <Zap size={14} /> 企业级话费代充与短信群发平台
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.15] tracking-tight text-balance md:text-[52px]">
              让每一笔<span className="text-primary">话费充值</span>
              <br />
              极速、稳定、可对账
            </h1>
            <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-muted">
              三网话费批量充值、短信群发触达、订单全流程管理与代理商分佣，一站式满足个人与企业的营销与充值需求。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={session ? "/recharge" : "/login"}>
                <Button size="lg">
                  立即充值 <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href={session ? "/sms" : "/login"}>
                <Button size="lg" variant="outline">
                  <MessageSquare size={18} /> 短信群发
                </Button>
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-muted">
              {["失败自动退款", "专票 / 普票开具", "多通道智能路由"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-primary" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up d2 relative">
            <div className="relative mx-auto max-w-[460px]">
              <div className="animate-float overflow-hidden rounded-[24px] border border-border bg-card shadow-[var(--shadow-pop)]">
                <Image
                  src="/images/hero-recharge.png"
                  alt="话费充值平台示意"
                  width={920}
                  height={920}
                  priority
                  className="h-auto w-full"
                />
              </div>
              <div className="absolute -left-4 bottom-8 flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-[var(--shadow-pop)] backdrop-blur">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-success-soft)] text-[var(--color-success)]">
                  <CheckCircle2 size={20} />
                </span>
                <div>
                  <p className="text-[13px] font-bold">充值成功</p>
                  <p className="text-[12px] text-muted">50 个号码 · 已到账</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 运营商 */}
      <section className="container-app pb-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-[13px] font-semibold text-muted">全面支持</span>
          {CARRIERS.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13.5px] font-semibold shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      </section>

      {/* 功能特性 */}
      <section className="container-app py-14">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="text-3xl font-black tracking-tight text-balance">一个平台，覆盖充值全场景</h2>
          <p className="mt-3 text-[15px] text-muted">从批量充值到分佣结算，业务链路全打通</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`animate-fade-up d${(i % 6) + 1} group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-pop)]`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary-light)] text-primary transition-colors duration-300 group-hover:bg-[linear-gradient(135deg,#f7842e,#e2560c)] group-hover:text-white">
                <f.Icon size={24} />
              </span>
              <h3 className="mt-4 text-[17px] font-bold">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 数据带 */}
      <section className="container-app pb-14">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-card px-6 py-8 text-center transition-colors hover:bg-[var(--color-primary-light)]">
              <p className="tnum text-3xl font-black text-primary">{s.num}</p>
              <p className="mt-1.5 text-[13.5px] text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 快捷入口 */}
      <section className="container-app pb-16">
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            href={session ? "/recharge" : "/login"}
            className="group relative overflow-hidden rounded-3xl border border-border p-8 text-white shadow-[var(--shadow-pop)]"
            style={{ background: "linear-gradient(135deg,#f7842e,#d2560e)" }}
          >
            <div className="relative z-10">
              <Smartphone size={30} />
              <h3 className="mt-4 text-2xl font-black">话费充值</h3>
              <p className="mt-2 max-w-[320px] text-[14px] text-white/85">
                批量导入号码，选择面值一键充值，实时查看到账进度。
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold">
                前往充值 <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
            <span className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          </Link>

          <Link
            href={session ? "/sms" : "/login"}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
          >
            <div className="relative z-10">
              <span className="grid h-[46px] w-[46px] place-items-center rounded-2xl bg-[var(--color-primary-light)] text-primary">
                <MessageSquare size={26} />
              </span>
              <h3 className="mt-4 text-2xl font-black">短信群发</h3>
              <p className="mt-2 max-w-[320px] text-[14px] text-muted">
                精选合规模板，批量号码触达，营销通知一步到位。
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-primary">
                前往群发 <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="border-t border-border bg-card/60">
        <div className="container-app flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2 text-[13.5px] text-muted">
            <Headphones size={16} className="text-primary" />
            专属客服 7×24 小时在线为您服务
          </div>
          <p className="text-[13px] text-muted-2">话费代充系统 · 仅供前端原型演示</p>
        </div>
      </footer>
    </AppShell>
  );
}
