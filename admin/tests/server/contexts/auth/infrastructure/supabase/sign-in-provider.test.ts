import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { resolveSignInProvider } from "@/server/contexts/auth/infrastructure/supabase/sign-in-provider";

const encodeSegment = (payload: unknown): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const createAccessToken = (payload: unknown): string =>
  `${encodeSegment({ alg: "HS256", typ: "JWT" })}.${encodeSegment(payload)}.signature`;

const createSession = (accessToken: string, appMetadata: SupabaseUser["app_metadata"]): Session =>
  ({
    access_token: accessToken,
    refresh_token: "refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "auth-user-id", app_metadata: appMetadata } as SupabaseUser,
  }) as Session;

const createAmrToken = (methods: string[]): string =>
  createAccessToken({
    sub: "auth-user-id",
    amr: methods.map((method, index) => ({ method, timestamp: 1700000000 + index })),
  });

describe("resolveSignInProvider", () => {
  it("amrがoauthの場合はgoogleと判定する", () => {
    const session = createSession(createAmrToken(["oauth"]), { provider: "google" });

    expect(resolveSignInProvider(session)).toBe("google");
  });

  it("amrがpasswordの場合はpasswordと判定する", () => {
    const session = createSession(createAmrToken(["password"]), { provider: "email" });

    expect(resolveSignInProvider(session)).toBe("password");
  });

  it("招待・リカバリーなどのメール経由フローはnullと判定する", () => {
    expect(resolveSignInProvider(createSession(createAmrToken(["invite"]), {}))).toBeNull();
    expect(resolveSignInProvider(createSession(createAmrToken(["recovery"]), {}))).toBeNull();
    expect(resolveSignInProvider(createSession(createAmrToken(["magiclink"]), {}))).toBeNull();
  });

  it("app_metadata.providerがemailでもamrがoauthならgoogleと判定する", () => {
    // 招待（メール）で登録したあとに Google の identity を紐付けたユーザー。
    // app_metadata.provider は最初の登録方法（email）のまま残る
    const session = createSession(createAmrToken(["oauth"]), {
      provider: "email",
      providers: ["email", "google"],
    });

    expect(resolveSignInProvider(session)).toBe("google");
  });

  it("app_metadata.providerがgoogleでもamrがpasswordならpasswordと判定する", () => {
    const session = createSession(createAmrToken(["password"]), {
      provider: "google",
      providers: ["google", "email"],
    });

    expect(resolveSignInProvider(session)).toBe("password");
  });

  it("複数の認証方式が並ぶ場合はoauthを優先して安全側に倒す", () => {
    const session = createSession(createAmrToken(["password", "oauth"]), { provider: "email" });

    expect(resolveSignInProvider(session)).toBe("google");
  });

  it("amrを読めない場合はapp_metadata.providerにフォールバックせずindeterminateを返す", () => {
    // app_metadata.provider は初回登録時のプロバイダーでしかなく、
    // Google identity をあとから紐付けたユーザーでは "email" のまま残るため信頼できない
    const withoutAmr = createAccessToken({ sub: "auth-user-id" });

    expect(resolveSignInProvider(createSession(withoutAmr, { provider: "google" }))).toBe(
      "indeterminate",
    );
    expect(
      resolveSignInProvider(
        createSession(withoutAmr, { provider: "email", providers: ["email", "google"] }),
      ),
    ).toBe("indeterminate");
  });

  it("JWTとして解釈できないトークンでも例外を投げずindeterminateを返す", () => {
    expect(resolveSignInProvider(createSession("not-a-jwt", { provider: "google" }))).toBe(
      "indeterminate",
    );
    expect(resolveSignInProvider(createSession("", { provider: "email" }))).toBe("indeterminate");
    expect(
      resolveSignInProvider(createSession("header.!!not-base64-json!!.sig", { provider: "email" })),
    ).toBe("indeterminate");
  });

  it("amrが空配列の場合もindeterminateを返す", () => {
    const emptyAmr = createAccessToken({ sub: "auth-user-id", amr: [] });

    expect(resolveSignInProvider(createSession(emptyAmr, { provider: "google" }))).toBe(
      "indeterminate",
    );
  });
});
