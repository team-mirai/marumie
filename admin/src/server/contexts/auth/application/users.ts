"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { createClient } from "@/server/contexts/auth/application/client";
import { createAdminClient } from "@/server/contexts/auth/application/admin";

const userRepository = new PrismaUserRepository(prisma);

/**
 * 全ユーザー一覧を取得
 */
export async function getAllUsers() {
  return userRepository.findAll();
}

/**
 * authId でユーザーを取得
 */
export async function getUserByAuthId(authId: string) {
  return userRepository.findByAuthId(authId);
}

/**
 * ユーザーを作成
 */
export async function createUser(data: { authId: string; email: string; role?: UserRole }) {
  return userRepository.create(data);
}

/**
 * ユーザーのロールを更新
 */
export async function updateUserRole(userId: string, role: UserRole) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false as const, error: "User not found" };
  }

  const updatedUser = await userRepository.updateRole(user.authId, role);
  revalidatePath("/users");
  return { ok: true as const, user: updatedUser };
}

/**
 * ユーザーを招待
 */
export async function inviteUser(email: string) {
  if (!email || typeof email !== "string") {
    return { ok: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { ok: false, error: "Invalid email format" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.SITE_URL || "http://localhost:3001"}/auth/callback`,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/users");
  return { ok: true };
}

/**
 * パスワードを設定
 */
export async function setupPassword(password: string) {
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password,
    data: { password_set: true },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * サインアウト処理（API ルート用）
 */
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * OAuth コールバック処理（code を session に交換し、必要に応じてユーザーを作成）
 */
export async function exchangeCodeForSession(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return {
      ok: false as const,
      error: error?.message || "Authentication failed",
    };
  }

  // Check if user already exists in DB
  let dbUser = await userRepository.findByAuthId(data.user.id);

  if (!dbUser) {
    // Create user in DB for invited users
    const email = data.user.email;
    if (!email) {
      return { ok: false as const, error: "User email is required" };
    }
    dbUser = await userRepository.create({
      authId: data.user.id,
      email: email,
      role: "user",
    });
  }

  return {
    ok: true as const,
    user: dbUser,
    isNewUser: data.user.email_confirmed_at && !data.user.last_sign_in_at,
  };
}
