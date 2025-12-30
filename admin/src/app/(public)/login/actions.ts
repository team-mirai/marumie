"use server";

import { completeInviteSession as completeInviteSessionAction } from "@/server/contexts/auth/presentation/actions/complete-invite-session";

/**
 * クライアントコンポーネント用の Server Action ラッパー
 * processor.tsx から呼び出される
 */
export async function completeInviteSession(
  accessToken: string,
  refreshToken: string,
): Promise<{ ok: boolean; error?: string }> {
  return completeInviteSessionAction(accessToken, refreshToken);
}
