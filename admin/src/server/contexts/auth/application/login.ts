"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/server/contexts/auth/application/client";

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
