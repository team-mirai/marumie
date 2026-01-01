"use client";
import "client-only";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/client/components/ui";
import { completeRecoverySession } from "@/server/contexts/auth/presentation/actions/complete-recovery-session";

export default function RecoveryTokenHandler() {
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const run = async () => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.substring(1)
        : window.location.hash;
      if (!hash) return;
      const params = new URLSearchParams(hash);
      const type = params.get("type");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (type === "recovery" && accessToken && refreshToken) {
        setProcessing(true);
        try {
          const res = await completeRecoverySession(accessToken, refreshToken);
          if (res.ok) {
            window.location.replace("/auth/reset-password");
          } else {
            const err = encodeURIComponent(res.error || "recovery_error");
            window.location.replace(`/login?error=${err}`);
          }
        } catch (error) {
          console.error("Recovery token exchange failed:", error);
          const err = encodeURIComponent("recovery_error");
          window.location.replace(`/login?error=${err}`);
        } finally {
          setProcessing(false);
        }
      }
    };
    run();
  }, []);

  if (!processing) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>パスワードリセット処理中...</CardTitle>
        <CardDescription>しばらくお待ちください。</CardDescription>
      </CardHeader>
    </Card>
  );
}
