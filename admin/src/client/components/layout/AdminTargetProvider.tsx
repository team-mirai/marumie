"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

type TargetContext = {
  targets: AdminTarget[];
  currentTarget: AdminTarget | null;
  syncKey: string;
  open: boolean;
  setOpen: (open: boolean) => void;
};
const Context = createContext<TargetContext | null>(null);

export function AdminTargetProvider({
  targets,
  currentTarget,
  syncKey,
  children,
}: Omit<TargetContext, "open" | "setOpen"> & { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // cookie は全タブで共有される。古い対象の画面・フォームも同時に更新する。
    const sync = (event: StorageEvent) => {
      if (event.key !== syncKey || !event.newValue) return;
      try {
        const { destination } = JSON.parse(event.newValue);
        if (
          typeof destination === "string" &&
          /^(\/politicians\/[1-9]\d*\/books|\/political-organizations)$/.test(destination)
        ) {
          window.location.assign(destination);
        }
      } catch {
        window.location.reload();
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [syncKey]);
  return (
    <Context.Provider value={{ targets, currentTarget, syncKey, open, setOpen }}>
      {children}
    </Context.Provider>
  );
}

export function useAdminTarget() {
  const context = useContext(Context);
  if (!context) throw new Error("AdminTargetProvider is required");
  return context;
}
