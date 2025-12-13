import { createClient } from "@/server/contexts/auth/application/client";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/server/lib/prisma";
import { PrismaUserRepository } from "@/server/repositories/prisma-user.repository";
const userRepository = new PrismaUserRepository(prisma);

export type { UserRole } from "@prisma/client";

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await userRepository.findByAuthId(user.id);
  if (dbUser) {
    return dbUser.role;
  }

  return user.user_metadata?.role || "user";
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let dbUser = await userRepository.findByAuthId(user.id);

  if (!dbUser && user.email) {
    dbUser = await userRepository.create({
      authId: user.id,
      email: user.email,
      role: "user",
    });
  }

  return dbUser;
}

export async function requireRole(requiredRole: UserRole): Promise<boolean> {
  const currentRole = await getCurrentUserRole();
  if (!currentRole) return false;
  if (requiredRole === "admin") {
    return currentRole === "admin";
  }
  return true;
}
