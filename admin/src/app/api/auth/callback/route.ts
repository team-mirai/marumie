import "server-only";
import { NextResponse } from "next/server";
import { exchangeCodeForSession } from "@/server/contexts/auth/presentation/actions/exchange-code-for-session";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    try {
      const result = await exchangeCodeForSession(code);

      if (result.ok) {
        // 招待経由の新規ユーザーはパスワード設定へ（Google 経由のユーザーは不要）
        if (result.requiresPasswordSetup) {
          return NextResponse.redirect(`${origin}/auth/setup`);
        }

        // Redirect to the admin panel after successful authentication
        return NextResponse.redirect(`${origin}/`);
      }

      console.error("Auth callback error:", result.error);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(result.error)}`);
    } catch (e) {
      console.error("Auth callback exception:", e);
    }
  }

  // If there was an error or no code, redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
