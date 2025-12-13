import "server-only";
import { NextResponse } from "next/server";
import { requireRole } from "@/server/contexts/auth/application/roles";
import { createAdminClient } from "@/server/contexts/auth/application/admin";

export async function POST(request: Request) {
  try {
    // Check if user has admin role
    const hasAccess = await requireRole("admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Send invitation using Supabase Admin API
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.SITE_URL || "http://localhost:3001"}/auth/callback`,
    });

    if (error) {
      console.error("Supabase invitation error:", error);
      return NextResponse.json(
        {
          error: error.message || "Failed to send invitation",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Invitation sent successfully",
      user: data.user,
    });
  } catch (error) {
    console.error("Error sending invitation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
