import "server-only";
import { NextResponse } from "next/server";
import { requireRole } from "@/server/contexts/auth/application/roles";
import { prisma } from "@/server/lib/prisma";
import { PrismaUserRepository } from "@/server/repositories/prisma-user.repository";
const userRepository = new PrismaUserRepository(prisma);

export async function GET() {
  try {
    const hasAccess = await requireRole("admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await userRepository.findAll();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
