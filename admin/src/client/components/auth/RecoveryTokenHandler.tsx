"use client";
import "client-only";
import { useEffect, useState } from "react";
import { completeInviteSession } from "@/server/contexts/auth/presentation/actions/complete-invite-session";

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
          const res = await completeInviteSession(accessToken, refreshToken);
          if (res.ok) {
            window.history.replaceState({}, document.title, window.location.pathname);
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
    <div className="bg-card rounded-xl p-4 mt-4">
      <h2>パスワードリセット処理中...</h2>
      <p>しばらくお待ちください。</p>
    </div>
  );
}
