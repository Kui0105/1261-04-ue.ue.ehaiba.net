"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2200);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed left-1/2 bottom-10 z-[300] -translate-x-1/2 rounded-xl bg-foreground/92 px-5 py-3 text-sm font-medium text-white shadow-[var(--shadow-pop)] backdrop-blur transition-all duration-300 ${
          show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
        style={{ backgroundColor: "rgba(36,28,20,0.94)" }}
      >
        {msg}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
