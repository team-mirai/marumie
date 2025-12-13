import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/server/contexts/auth/application/client";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the user's password and mark password as set
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
      data: { password_set: true },
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json(
        {
          error: updateError.message || "Failed to update password",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Password set successfully" });
  } catch (error) {
    console.error("Setup password error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
