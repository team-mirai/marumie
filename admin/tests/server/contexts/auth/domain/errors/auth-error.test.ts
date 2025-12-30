import {
  AuthError,
  AUTH_ERROR_MESSAGES,
  type AuthErrorCode,
} from "@/server/contexts/auth/domain/errors/auth-error";

describe("AuthError", () => {
  describe("constructor", () => {
    it("エラーコードとメッセージを設定する", () => {
      const error = new AuthError("AUTH_FAILED", "認証に失敗しました");

      expect(error.code).toBe("AUTH_FAILED");
      expect(error.message).toBe("認証に失敗しました");
      expect(error.name).toBe("AuthError");
    });

    it("causeを設定できる", () => {
      const originalError = new Error("Original error");
      const error = new AuthError("NETWORK_ERROR", "ネットワークエラー", originalError);

      expect(error.cause).toBe(originalError);
    });

    it("causeなしでも作成できる", () => {
      const error = new AuthError("SESSION_EXPIRED", "セッション切れ");

      expect(error.cause).toBeUndefined();
    });
  });

  describe("instanceof", () => {
    it("AuthErrorはErrorを継承している", () => {
      const error = new AuthError("AUTH_FAILED", "test");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthError);
    });
  });
});

describe("AUTH_ERROR_MESSAGES", () => {
  const errorCodes: AuthErrorCode[] = [
    "AUTH_FAILED",
    "SESSION_EXPIRED",
    "INVALID_TOKEN",
    "NETWORK_ERROR",
    "INSUFFICIENT_PERMISSION",
    "USER_NOT_FOUND",
    "INVALID_EMAIL",
    "WEAK_PASSWORD",
    "INVITE_FAILED",
  ];

  it("すべてのエラーコードに対応するメッセージが定義されている", () => {
    for (const code of errorCodes) {
      expect(AUTH_ERROR_MESSAGES[code]).toBeDefined();
      expect(typeof AUTH_ERROR_MESSAGES[code]).toBe("string");
      expect(AUTH_ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it("AUTH_FAILEDのメッセージが正しい", () => {
    expect(AUTH_ERROR_MESSAGES.AUTH_FAILED).toBe(
      "メールアドレスまたはパスワードが正しくありません"
    );
  });

  it("SESSION_EXPIREDのメッセージが正しい", () => {
    expect(AUTH_ERROR_MESSAGES.SESSION_EXPIRED).toBe(
      "セッションの有効期限が切れました。再度ログインしてください"
    );
  });

  it("INSUFFICIENT_PERMISSIONのメッセージが正しい", () => {
    expect(AUTH_ERROR_MESSAGES.INSUFFICIENT_PERMISSION).toBe(
      "この操作を行う権限がありません"
    );
  });
});
