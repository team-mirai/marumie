import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { updateUserRole } from "@/server/contexts/auth/presentation/actions/update-user-role";
import type { UserRole } from "@prisma/client";

export async function PATCH(request: NextRequest) {
  try {
    const hasAccess = await requireRole("admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: "Missing userId or role" }, { status: 400 });
    }

    if (!["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const result = await updateUserRole(userId, role as UserRole);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.user);
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
