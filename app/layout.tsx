import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui/toast";

const noto = Noto_Sans_SC({
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "话费代充系统 · 企业级充值与短信群发平台",
  description:
    "面向个人与企业的话费代充系统，支持三网话费批量充值、短信群发、订单管理、账户余额与代理商分佣，安全稳定、极速到账。",
  keywords: ["话费充值", "话费代充", "短信群发", "企业充值", "代理商", "批量充值"],
};

export const viewport: Viewport = {
  themeColor: "#f26a1b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${noto.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
