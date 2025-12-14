import "server-only";
import { NextResponse } from "next/server";
import { requireRole, inviteUser } from "@/server/contexts/auth";

export async function POST(request: Request) {
  try {
    const hasAccess = await requireRole("admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    const result = await inviteUser(email);

    if (!result.ok) {
      // バリデーションエラーのみクライアントに返し、それ以外は内部エラーとして隠す
      const isValidationError =
        result.error === "Email is required" ||
        result.error === "Invalid email format";
      if (isValidationError) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      console.error("Invite user failed:", result.error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.error("Error sending invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
