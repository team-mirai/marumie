"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/server/contexts/auth/application/client";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";

const userRepository = new PrismaUserRepository(prisma);

export async function loginWithPassword(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const encoded = encodeURIComponent(error.message || "auth_error");
    redirect(`/login?error=${encoded}`);
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function completeInviteSession(accessToken: string, refreshToken: string) {
  if (!accessToken || !refreshToken) {
    return { ok: false, error: "missing_tokens" };
  }

  const supabase = await createClient();
  const { error: setError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (setError) {
    return { ok: false, error: setError.message };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: userError?.message || "no_user" };
  }

  const existing = await userRepository.findByAuthId(user.id);
  if (!existing && user.email) {
    await userRepository.create({
      authId: user.id,
      email: user.email,
      role: "user",
    });
  }

  return { ok: true };
}
