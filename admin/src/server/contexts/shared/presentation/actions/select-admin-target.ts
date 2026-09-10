"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { targetDestination } from "@/server/contexts/shared/domain/models/admin-target";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";

export async function selectAdminTarget(key: string) {
  // loader 内で認証を確認し、最新の選択肢から ID を検証する。
  const { targets, cookieName } = await loadAdminTargets();
  const target = targets.find((item) => item.key === key);
  if (!target)
    return { success: false as const, error: "対象が見つかりません。再読み込みしてください" };
  (await cookies()).set(cookieName, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/(auth)", "layout");
  return { success: true as const, destination: targetDestination(target) };
}
