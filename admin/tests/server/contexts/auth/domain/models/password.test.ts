import { Password } from "@/server/contexts/auth/domain/models/password";
import type { PasswordValidationResult } from "@/server/contexts/auth/domain/models/password";

describe("Password", () => {
  describe("MIN_LENGTH", () => {
    it("最小文字数が6であること", () => {
      expect(Password.MIN_LENGTH).toBe(6);
    });
  });

  describe("validate", () => {
    describe("有効なパスワードの場合", () => {
      it("最小文字数ちょうどのパスワードは有効", () => {
        const result = Password.validate("123456");

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("最小文字数より長いパスワードは有効", () => {
        const result = Password.validate("password123");

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("非常に長いパスワードも有効", () => {
        const longPassword = "a".repeat(100);
        const result = Password.validate(longPassword);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("特殊文字を含むパスワードも有効", () => {
        const result = Password.validate("p@ss!w0rd");

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("日本語を含むパスワードも有効", () => {
        const result = Password.validate("パスワード123");

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe("無効なパスワードの場合", () => {
      it("空文字列は無効", () => {
        const result = Password.validate("");

        expect(result.valid).toBe(false);
        expect(result.error).toBe("パスワードは6文字以上で設定してください");
      });

      it("最小文字数未満のパスワードは無効", () => {
        const result = Password.validate("12345");

        expect(result.valid).toBe(false);
        expect(result.error).toBe("パスワードは6文字以上で設定してください");
      });

      it("1文字のパスワードは無効", () => {
        const result = Password.validate("a");

        expect(result.valid).toBe(false);
        expect(result.error).toBe("パスワードは6文字以上で設定してください");
      });

      it("スペースのみのパスワードでも6文字以上なら有効", () => {
        const result = Password.validate("      ");

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe("境界値テスト", () => {
      it("5文字のパスワードは無効", () => {
        const result = Password.validate("12345");

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("6文字のパスワードは有効", () => {
        const result = Password.validate("123456");

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("7文字のパスワードは有効", () => {
        const result = Password.validate("1234567");

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe("戻り値の型", () => {
      it("有効な場合はPasswordValidationResult型を返す", () => {
        const result: PasswordValidationResult = Password.validate("validpassword");

        expect(typeof result.valid).toBe("boolean");
        expect(result.valid).toBe(true);
      });

      it("無効な場合はPasswordValidationResult型を返す", () => {
        const result: PasswordValidationResult = Password.validate("short");

        expect(typeof result.valid).toBe("boolean");
        expect(result.valid).toBe(false);
        expect(typeof result.error).toBe("string");
      });
    });
  });
});
