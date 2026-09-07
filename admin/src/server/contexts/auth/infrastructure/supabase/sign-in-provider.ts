import "server-only";

import type { Session } from "@supabase/supabase-js";
import type { AuthProviderName } from "@/server/contexts/auth/domain/models/auth-provider-config";

/**
 * アクセストークン（JWT）の amr クレームから認証方式の一覧を取り出す
 * 読み取れない場合は null（空配列と区別するため）
 */
function decodeAmrMethods(accessToken: string): string[] | null {
  const payloadSegment = accessToken.split(".")[1];
  if (!payloadSegment) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8"));
    if (typeof payload !== "object" || payload === null) {
      return null;
    }
    const amr = (payload as { amr?: unknown }).amr;
    if (!Array.isArray(amr)) {
      return null;
    }
    const methods = amr
      .map((entry) =>
        typeof entry === "object" && entry !== null
          ? (entry as { method?: unknown }).method
          : undefined,
      )
      .filter((method): method is string => typeof method === "string");
    return methods.length > 0 ? methods : null;
  } catch {
    return null;
  }
}

/**
 * このサインインで実際に使われた認証プロバイダーを判定する
 *
 * `app_metadata.provider` は「そのユーザーが最初に登録に使ったプロバイダー」であり、
 * メールと Google の両方の identity を持つユーザーでは実際のログイン方式と一致しない。
 * アクセストークンの amr（Authentication Methods References）クレームには
 * このセッションで使われた認証方式が入るため、そちらを正とする。
 *
 * @see https://supabase.com/docs/guides/auth/users
 */
export function resolveSignInProvider(session: Session): AuthProviderName | null {
  const methods = decodeAmrMethods(session.access_token);

  if (methods === null) {
    // amr を読めない場合のみ app_metadata にフォールバックする。
    // 精度は落ちるが、Google が主プロバイダーのユーザーは検出できる
    return session.user.app_metadata?.provider === "google" ? "google" : null;
  }

  // 本アプリで有効な OAuth プロバイダーは Google のみ。
  // 複数の方式が並ぶ場合も OAuth が含まれていれば Google ログインとして安全側に倒す
  if (methods.includes("oauth")) {
    return "google";
  }
  if (methods.includes("password")) {
    return "password";
  }
  // invite / recovery / magiclink などのメール経由フローはどちらでもない
  return null;
}
