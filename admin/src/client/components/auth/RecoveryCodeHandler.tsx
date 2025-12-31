"use client";
import "client-only";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { exchangeCodeForSession } from "@/server/contexts/auth/presentation/actions/exchange-code-for-session";

export default function RecoveryCodeHandler() {
  const [processing, setProcessing] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get("code");
      if (!code) return;

      setProcessing(true);
      try {
        const res = await exchangeCodeForSession(code);
        if (res.ok) {
          window.location.replace("/auth/reset-password");
        } else {
          const err = encodeURIComponent(res.error || "recovery_error");
          window.location.replace(`/login?error=${err}`);
        }
      } catch (error) {
        console.error("Recovery code exchange failed:", error);
        const err = encodeURIComponent("recovery_error");
        window.location.replace(`/login?error=${err}`);
      } finally {
        setProcessing(false);
      }
    };
    run();
  }, [searchParams]);

  if (!processing) return null;

  return (
    <div className="bg-card rounded-xl p-4 mt-4">
      <h2>パスワードリセット処理中...</h2>
      <p>しばらくお待ちください。</p>
    </div>
  );
}
