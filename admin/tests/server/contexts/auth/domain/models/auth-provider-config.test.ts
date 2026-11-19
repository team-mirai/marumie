import { AuthProviderConfig } from "@/server/contexts/auth/domain/models/auth-provider-config";

describe("AuthProviderConfig", () => {
  describe("parse", () => {
    it("カンマ区切りの値をパースする", () => {
      expect(AuthProviderConfig.parse("password,google")).toEqual({
        providers: ["password", "google"],
      });
    });

    it("未設定の場合はpasswordのみにフォールバックする", () => {
      expect(AuthProviderConfig.parse(undefined)).toEqual({ providers: ["password"] });
      expect(AuthProviderConfig.parse("")).toEqual({ providers: ["password"] });
    });

    it("不明な値は無視する", () => {
      expect(AuthProviderConfig.parse("google,github")).toEqual({ providers: ["google"] });
    });

    it("有効な値が1つもない場合はpasswordのみにフォールバックする", () => {
      expect(AuthProviderConfig.parse("github,saml")).toEqual({ providers: ["password"] });
    });

    it("空白・大文字・重複を正規化する", () => {
      expect(AuthProviderConfig.parse(" Password , GOOGLE , password ")).toEqual({
        providers: ["password", "google"],
      });
    });
  });

  describe("isEnabled", () => {
    it("設定に含まれるプロバイダーを有効と判定する", () => {
      const config = AuthProviderConfig.parse("password,google");
      expect(AuthProviderConfig.isEnabled(config, "password")).toBe(true);
      expect(AuthProviderConfig.isEnabled(config, "google")).toBe(true);
    });

    it("設定に含まれないプロバイダーを無効と判定する", () => {
      const config = AuthProviderConfig.parse("google");
      expect(AuthProviderConfig.isEnabled(config, "password")).toBe(false);
      expect(AuthProviderConfig.isEnabled(config, "google")).toBe(true);
    });
  });
});
