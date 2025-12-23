import {
  validateCounterpartInput,
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";

describe("validateCounterpartInput", () => {
  describe("名前のバリデーション", () => {
    it("空の名前はエラーを返す", () => {
      const errors = validateCounterpartInput({ name: "", address: null });
      expect(errors).toContain("名前は必須です");
    });

    it("空白のみの名前はエラーを返す", () => {
      const errors = validateCounterpartInput({ name: "   ", address: null });
      expect(errors).toContain("名前は必須です");
    });

    it("有効な名前はエラーを返さない", () => {
      const errors = validateCounterpartInput({ name: "テスト取引先", address: null });
      expect(errors).toHaveLength(0);
    });

    it("最大文字数を超える名前はエラーを返す", () => {
      const longName = "あ".repeat(MAX_NAME_LENGTH + 1);
      const errors = validateCounterpartInput({ name: longName, address: null });
      expect(errors).toContain(`名前は${MAX_NAME_LENGTH}文字以内で入力してください`);
    });

    it("最大文字数ちょうどの名前はエラーを返さない", () => {
      const maxName = "あ".repeat(MAX_NAME_LENGTH);
      const errors = validateCounterpartInput({ name: maxName, address: null });
      expect(errors).toHaveLength(0);
    });
  });

  describe("住所のバリデーション", () => {
    it("nullの住所はエラーを返さない", () => {
      const errors = validateCounterpartInput({ name: "テスト", address: null });
      expect(errors).toHaveLength(0);
    });

    it("空の住所はエラーを返さない", () => {
      const errors = validateCounterpartInput({ name: "テスト", address: "" });
      expect(errors).toHaveLength(0);
    });

    it("有効な住所はエラーを返さない", () => {
      const errors = validateCounterpartInput({ name: "テスト", address: "東京都千代田区" });
      expect(errors).toHaveLength(0);
    });

    it("最大文字数を超える住所はエラーを返す", () => {
      const longAddress = "あ".repeat(MAX_ADDRESS_LENGTH + 1);
      const errors = validateCounterpartInput({ name: "テスト", address: longAddress });
      expect(errors).toContain(`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`);
    });

    it("最大文字数ちょうどの住所はエラーを返さない", () => {
      const maxAddress = "あ".repeat(MAX_ADDRESS_LENGTH);
      const errors = validateCounterpartInput({ name: "テスト", address: maxAddress });
      expect(errors).toHaveLength(0);
    });
  });

  describe("複合バリデーション", () => {
    it("名前と住所の両方が無効な場合は両方のエラーを返す", () => {
      const longName = "あ".repeat(MAX_NAME_LENGTH + 1);
      const longAddress = "あ".repeat(MAX_ADDRESS_LENGTH + 1);
      const errors = validateCounterpartInput({ name: longName, address: longAddress });
      expect(errors).toHaveLength(2);
      expect(errors).toContain(`名前は${MAX_NAME_LENGTH}文字以内で入力してください`);
      expect(errors).toContain(`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`);
    });

    it("空の名前と長すぎる住所の場合は両方のエラーを返す", () => {
      const longAddress = "あ".repeat(MAX_ADDRESS_LENGTH + 1);
      const errors = validateCounterpartInput({ name: "", address: longAddress });
      expect(errors).toHaveLength(2);
      expect(errors).toContain("名前は必須です");
      expect(errors).toContain(`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`);
    });
  });
});
