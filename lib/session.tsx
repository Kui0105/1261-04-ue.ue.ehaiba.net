"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DB, type SessionUser } from "./data";

interface SessionCtx {
  session: SessionUser | null;
  ready: boolean;
  loginAs: (user: Partial<SessionUser>) => SessionUser;
  logout: () => void;
  updateSession: (patch: Partial<SessionUser>) => void;
  refresh: () => void;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setSession(DB.getSession());
  }, []);

  useEffect(() => {
    setSession(DB.getSession());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "hc_session") setSession(DB.getSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const loginAs = useCallback((user: Partial<SessionUser>) => {
    const s = Object.assign(
      {
        loggedIn: true,
        type: "personal",
        account: "",
        name: "",
        balance: 5000,
        creditLimit: 0,
        usedCredit: 0,
        isAgent: false,
      },
      user,
    ) as SessionUser;
    DB.setSession(s);
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem("hc_session");
    setSession(null);
  }, []);

  const updateSession = useCallback((patch: Partial<SessionUser>) => {
    const cur = DB.getSession() || ({} as SessionUser);
    const next = Object.assign({}, cur, patch) as SessionUser;
    DB.setSession(next);
    setSession(next);
  }, []);

  return (
    <Ctx.Provider value={{ session, ready, loginAs, logout, updateSession, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
