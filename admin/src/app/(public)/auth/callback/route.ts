import "server-only";
import { NextResponse } from "next/server";
import { exchangeCodeForSession } from "@/server/contexts/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const result = await exchangeCodeForSession(code);

    if (result.ok) {
      // For invited users (email confirmed but no previous sign in), redirect to setup
      if (result.isNewUser) {
        return NextResponse.redirect(`${origin}/auth/setup`);
      }

      // Redirect to the admin panel after successful authentication
      return NextResponse.redirect(`${origin}/`);
    }

    console.error("Auth callback error:", result.error);
  }

  // If there was an error or no code, redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
