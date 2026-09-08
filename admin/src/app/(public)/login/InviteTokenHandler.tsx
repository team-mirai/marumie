"use client";
import { useEffect, useState } from "react";
import { ProcessingNotice } from "@/client/components/auth/ProcessingNotice";
import { completeInviteSession } from "@/server/contexts/auth/presentation/actions/complete-invite-session";

export default function InviteTokenHandler() {
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

      if (type === "invite" && accessToken && refreshToken) {
        setProcessing(true);
        try {
          const res = await completeInviteSession(accessToken, refreshToken);
          if (res.ok) {
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.replace("/auth/setup?from=invite");
          } else {
            const err = encodeURIComponent(res.error || "invite_error");
            window.location.replace(`/login?error=${err}`);
          }
        } finally {
          setProcessing(false);
        }
      }
    };
    run();
  }, []);

  if (!processing) return null;

  return (
    <ProcessingNotice
      title="招待を処理しています..."
      description="アカウントの準備をしています。しばらくお待ちください。"
    />
  );
}
