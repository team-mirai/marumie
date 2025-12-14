import "server-only";
import { NextResponse } from "next/server";
import { requireRole, getAllUsers } from "@/server/contexts/auth";

export async function GET() {
  try {
    const hasAccess = await requireRole("admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
