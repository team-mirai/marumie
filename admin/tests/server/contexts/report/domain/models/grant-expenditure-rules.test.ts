import {
  canSetGrantExpenditureFlag,
  validateGrantExpenditureFlagUpdate,
  type GrantExpenditureFlagValidationResult,
} from "@/server/contexts/report/domain/models/grant-expenditure-rules";

describe("grant-expenditure-rules", () => {
  describe("canSetGrantExpenditureFlag", () => {
    it("支出取引の場合はtrueを返す", () => {
      expect(canSetGrantExpenditureFlag("expense")).toBe(true);
    });

    it("収入取引の場合はfalseを返す", () => {
      expect(canSetGrantExpenditureFlag("income")).toBe(false);
    });
  });

  describe("validateGrantExpenditureFlagUpdate", () => {
    describe("支出取引の場合", () => {
      it("isValid: trueを返す", () => {
        const result = validateGrantExpenditureFlagUpdate("expense");
        expect(result.isValid).toBe(true);
      });

      it("errorMessageは含まれない", () => {
        const result = validateGrantExpenditureFlagUpdate("expense");
        expect(result.errorMessage).toBeUndefined();
      });
    });

    describe("収入取引の場合", () => {
      it("isValid: falseを返す", () => {
        const result = validateGrantExpenditureFlagUpdate("income");
        expect(result.isValid).toBe(false);
      });

      it("適切なエラーメッセージを返す", () => {
        const result = validateGrantExpenditureFlagUpdate("income");
        expect(result.errorMessage).toBe("交付金フラグは支出取引のみに設定できます");
      });
    });
  });

  describe("GrantExpenditureFlagValidationResult型", () => {
    it("成功時の結果オブジェクトの形式が正しい", () => {
      const result: GrantExpenditureFlagValidationResult = validateGrantExpenditureFlagUpdate("expense");
      expect(result).toEqual({ isValid: true });
    });

    it("失敗時の結果オブジェクトの形式が正しい", () => {
      const result: GrantExpenditureFlagValidationResult = validateGrantExpenditureFlagUpdate("income");
      expect(result).toEqual({
        isValid: false,
        errorMessage: "交付金フラグは支出取引のみに設定できます",
      });
    });
  });
});
