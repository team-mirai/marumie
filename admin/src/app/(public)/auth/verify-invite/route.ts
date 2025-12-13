import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/server/contexts/auth/application/client";
import { createUser, getUserByAuthId } from "@/server/contexts/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && type === "invite") {
    const supabase = await createClient();

    // Verify the token hash and establish session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });

    if (error || !data.user) {
      console.error("Invite verification error:", error?.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error?.message || "invite_invalid")}`,
      );
    }

    // Create user in DB if not exists
    const existingUser = await getUserByAuthId(data.user.id);
    if (!existingUser && data.user.email) {
      await createUser({
        authId: data.user.id,
        email: data.user.email,
        role: "user",
      });
    }

    // Redirect to setup page for new invited users
    return NextResponse.redirect(`${origin}/auth/setup?from=invite`);
  }

  // Invalid request
  return NextResponse.redirect(`${origin}/login?error=invalid_invite_link`);
}
