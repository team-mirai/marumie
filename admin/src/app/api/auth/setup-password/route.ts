import "server-only";
import { NextResponse } from "next/server";
import { setupPassword } from "@/server/contexts/auth/presentation/actions/setup-password";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await setupPassword(password);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: "Password set successfully" });
  } catch (error) {
    console.error("Setup password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
