import "server-only";

import type { Session } from "@supabase/supabase-js";
import type { SignInProvider } from "@/server/contexts/auth/domain/models/auth-session";

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
 * 判定には必ずアクセストークンの amr（Authentication Methods References）クレームを使う。
 * amr にはこのセッションで使われた認証方式が入る。
 * 一方 `app_metadata.provider` は「そのユーザーが最初に登録に使ったプロバイダー」であり、
 * メール登録後に Google の identity をリンクしたユーザーでは Google ログインでも
 * "email" のまま残るため、認可の判定には使えない（フォールバックにも使わない）。
 *
 * @see https://supabase.com/docs/guides/auth/jwt-fields
 * @see https://supabase.com/docs/guides/auth/users
 */
export function resolveSignInProvider(session: Session): SignInProvider {
  const methods = decodeAmrMethods(session.access_token);

  if (methods === null) {
    // amr が読めないセッションは、使われた認証方式を特定できない。
    // 「メール経由フロー（null）」と区別できるよう判定不能として返し、
    // 認可の判定が必要な呼び出し元にはこのセッションを拒否させる
    return "indeterminate";
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
