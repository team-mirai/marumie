"use client";
import "client-only";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProcessingNotice } from "@/client/components/auth/ProcessingNotice";
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
    <ProcessingNotice title="パスワードリセット処理中..." description="しばらくお待ちください。" />
  );
}
