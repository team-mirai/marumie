import { BalanceSheet } from "@/server/contexts/public-finance/domain/models/balance-sheet";

describe("BalanceSheet domain model", () => {
  describe("fromInput", () => {
    it("純資産ありの場合", () => {
      const result = BalanceSheet.fromInput({
        currentAssets: 1_000_000,
        borrowingIncome: 500_000,
        borrowingExpense: 200_000,
        currentLiabilities: 100_000,
      });

      expect(result.left.currentAssets).toBe(1_000_000);
      expect(result.left.fixedAssets).toBe(0);
      expect(result.right.fixedLiabilities).toBe(300_000);
      expect(result.right.currentLiabilities).toBe(100_000);
      expect(result.right.netAssets).toBe(600_000);
      expect(result.left.debtExcess).toBe(0);
    });

    it("債務超過の場合", () => {
      const result = BalanceSheet.fromInput({
        currentAssets: 100_000,
        borrowingIncome: 1_000_000,
        borrowingExpense: 0,
        currentLiabilities: 200_000,
      });

      expect(result.left.currentAssets).toBe(100_000);
      expect(result.left.fixedAssets).toBe(0);
      expect(result.right.fixedLiabilities).toBe(1_000_000);
      expect(result.right.currentLiabilities).toBe(200_000);
      expect(result.right.netAssets).toBe(0);
      expect(result.left.debtExcess).toBe(1_100_000);
    });

    it("資産と負債が等しい場合", () => {
      const result = BalanceSheet.fromInput({
        currentAssets: 500_000,
        borrowingIncome: 300_000,
        borrowingExpense: 0,
        currentLiabilities: 200_000,
      });

      expect(result.left.currentAssets).toBe(500_000);
      expect(result.right.fixedLiabilities).toBe(300_000);
      expect(result.right.currentLiabilities).toBe(200_000);
      expect(result.right.netAssets).toBe(0);
      expect(result.left.debtExcess).toBe(0);
    });

    it("すべてゼロの場合", () => {
      const result = BalanceSheet.fromInput({
        currentAssets: 0,
        borrowingIncome: 0,
        borrowingExpense: 0,
        currentLiabilities: 0,
      });

      expect(result.left.currentAssets).toBe(0);
      expect(result.left.fixedAssets).toBe(0);
      expect(result.right.fixedLiabilities).toBe(0);
      expect(result.right.currentLiabilities).toBe(0);
      expect(result.right.netAssets).toBe(0);
      expect(result.left.debtExcess).toBe(0);
    });
  });

  describe("calculateFixedLiabilities", () => {
    it("借入金収入から支出を引いた値を返す", () => {
      expect(BalanceSheet.calculateFixedLiabilities(500_000, 200_000)).toBe(300_000);
    });

    it("借入金支出が収入を上回る場合は負の値を返す", () => {
      expect(BalanceSheet.calculateFixedLiabilities(200_000, 500_000)).toBe(-300_000);
    });

    it("借入金収入と支出が等しい場合はゼロを返す", () => {
      expect(BalanceSheet.calculateFixedLiabilities(500_000, 500_000)).toBe(0);
    });

    it("借入金がない場合はゼロを返す", () => {
      expect(BalanceSheet.calculateFixedLiabilities(0, 0)).toBe(0);
    });
  });

  describe("calculateNetAssetsAndDebtExcess", () => {
    it("資産が負債を上回る場合は純資産あり、債務超過なし", () => {
      const [netAssets, debtExcess] = BalanceSheet.calculateNetAssetsAndDebtExcess(
        1_000_000,
        0,
        300_000,
        200_000,
      );

      expect(netAssets).toBe(500_000);
      expect(debtExcess).toBe(0);
    });

    it("負債が資産を上回る場合は純資産なし、債務超過あり", () => {
      const [netAssets, debtExcess] = BalanceSheet.calculateNetAssetsAndDebtExcess(
        100_000,
        0,
        300_000,
        500_000,
      );

      expect(netAssets).toBe(0);
      expect(debtExcess).toBe(700_000);
    });

    it("資産と負債が等しい場合は純資産ゼロ、債務超過なし", () => {
      const [netAssets, debtExcess] = BalanceSheet.calculateNetAssetsAndDebtExcess(
        500_000,
        0,
        300_000,
        200_000,
      );

      expect(netAssets).toBe(0);
      expect(debtExcess).toBe(0);
    });

    it("すべてゼロの場合は純資産ゼロ、債務超過なし", () => {
      const [netAssets, debtExcess] = BalanceSheet.calculateNetAssetsAndDebtExcess(0, 0, 0, 0);

      expect(netAssets).toBe(0);
      expect(debtExcess).toBe(0);
    });

    it("固定資産を含む場合の計算", () => {
      const [netAssets, debtExcess] = BalanceSheet.calculateNetAssetsAndDebtExcess(
        500_000,
        200_000,
        300_000,
        100_000,
      );

      expect(netAssets).toBe(300_000);
      expect(debtExcess).toBe(0);
    });
  });
});
