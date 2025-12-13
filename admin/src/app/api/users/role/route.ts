import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireRole } from "@/server/contexts/auth/application/roles";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/common/infrastructure/repositories/prisma-user.repository";
const userRepository = new PrismaUserRepository(prisma);

export async function PATCH(request: NextRequest) {
  try {
    const hasAccess = await requireRole("admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing userId or role" },
        { status: 400 },
      );
    }

    if (!["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Find user by id first to get authId
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await userRepository.updateRole(
      user.authId,
      role as UserRole,
    );
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
