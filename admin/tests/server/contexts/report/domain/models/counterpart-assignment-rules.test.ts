import {
  isCounterpartRequired,
  requiresCounterpartDetail,
  getCounterpartDetailCriteria,
  ROUTINE_EXPENSE_CATEGORIES,
  POLITICAL_ACTIVITY_EXPENSE_CATEGORIES,
  COUNTERPART_REQUIRED_INCOME_CATEGORIES,
  COUNTERPART_REQUIRED_EXPENSE_CATEGORIES,
} from "@/server/contexts/report/domain/models/counterpart-assignment-rules";
import { PL_CATEGORIES } from "@/shared/accounting/account-category";

describe("counterpart-assignment-rules", () => {
  describe("COUNTERPART_REQUIRED_INCOME_CATEGORIES", () => {
    it("借入金と交付金のみを含む", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_INCOME_CATEGORIES).toContain(PL_CATEGORIES["借入金"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_INCOME_CATEGORIES).toContain(PL_CATEGORIES["本部又は支部から供与された交付金に係る収入"].key);
      expect(COUNTERPART_REQUIRED_INCOME_CATEGORIES).toHaveLength(2);
    });
  });

  describe("COUNTERPART_REQUIRED_EXPENSE_CATEGORIES", () => {
    it("経常経費カテゴリを含む", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["光熱水費"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["備品・消耗品費"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["事務所費"].key);
    });

    it("政治活動費カテゴリを含む", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["組織活動費"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["選挙関係費"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["機関紙誌の発行事業費"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["宣伝事業費"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["政治資金パーティー開催事業費"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["その他の事業費"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["調査研究費"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["寄附・交付金"].key);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain(PL_CATEGORIES["その他の経費"].key);
    });

    it("12カテゴリを含む", () => {
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toHaveLength(12);
    });
  });

  describe("カテゴリ分類", () => {
    it("経常経費カテゴリは3つ", () => {
      expect(ROUTINE_EXPENSE_CATEGORIES).toHaveLength(3);
    });

    it("政治活動費カテゴリは9つ", () => {
      expect(POLITICAL_ACTIVITY_EXPENSE_CATEGORIES).toHaveLength(9);
    });
  });

  describe("isCounterpartRequired", () => {
    describe("支出取引", () => {
      it("経常経費カテゴリでtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["光熱水費"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["備品・消耗品費"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["事務所費"].key)).toBe(true);
      });

      it("政治活動費カテゴリでtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["組織活動費"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["選挙関係費"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["機関紙誌の発行事業費"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["宣伝事業費"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["政治資金パーティー開催事業費"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["その他の事業費"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["調査研究費"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["寄附・交付金"].key)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("expense", PL_CATEGORIES["その他の経費"].key)).toBe(true);
      });

      it("未知のカテゴリでfalse", () => {
        expect(isCounterpartRequired("expense", "unknown_category")).toBe(false);
      });
    });

    describe("収入取引", () => {
      it("借入金でtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("income", PL_CATEGORIES["借入金"].key)).toBe(true);
      });

      it("交付金でtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("income", PL_CATEGORIES["本部又は支部から供与された交付金に係る収入"].key)).toBe(true);
      });

      it("個人からの寄附でfalse（寄附は対象外）", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("income", PL_CATEGORIES["個人からの寄附"].key)).toBe(false);
      });

      it("その他の収入でfalse", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("income", PL_CATEGORIES["その他の収入"].key)).toBe(false);
      });

      it("事業収入でfalse", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(isCounterpartRequired("income", PL_CATEGORIES["機関紙誌の発行その他の事業による収入"].key)).toBe(false);
      });
    });
  });

  describe("requiresCounterpartDetail", () => {
    describe("経常経費（5万円閾値）", () => {
      it("5万円以上でtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["事務所費"].key, 50_000, 50_000)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["光熱水費"].key, 150_000, 150_000)).toBe(true);
      });

      it("5万円未満でfalse", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["事務所費"].key, 49_999, 49_999)).toBe(false);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["光熱水費"].key, 10_000, 10_000)).toBe(false);
      });
    });

    describe("政治活動費（5万円閾値）", () => {
      it("5万円以上でtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["組織活動費"].key, 50_000, 50_000)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["選挙関係費"].key, 100_000, 100_000)).toBe(true);
      });

      it("5万円未満でfalse", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["組織活動費"].key, 49_999, 49_999)).toBe(false);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["選挙関係費"].key, 10_000, 10_000)).toBe(false);
      });
    });

    describe("収入カテゴリ（閾値なし）", () => {
      it("金額に関わらずtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["借入金"].key, 0, 0)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["借入金"].key, 1, 1)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["本部又は支部から供与された交付金に係る収入"].key, 100_000, 100_000)).toBe(true);
      });
    });

    describe("非対象カテゴリ", () => {
      it("金額に関わらずfalse", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["個人からの寄附"].key, 150_000, 150_000)).toBe(false);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["その他の収入"].key, 200_000, 200_000)).toBe(false);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["機関紙誌の発行その他の事業による収入"].key, 1_000_000, 1_000_000)).toBe(false);
      });
    });
  });

  describe("requiresCounterpartDetail の支出金額の求め方", () => {
    // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
    const office = PL_CATEGORIES["事務所費"].key;

    it("借方金額が 0 以下なら貸方金額で判定する（報告書の明細行と同じ）", () => {
      expect(requiresCounterpartDetail("expense", office, 0, 60_000)).toBe(true);
      expect(requiresCounterpartDetail("expense", office, 0, 40_000)).toBe(false);
    });

    it("借方金額が正なら貸方金額は使わない", () => {
      expect(requiresCounterpartDetail("expense", office, 40_000, 60_000)).toBe(false);
      expect(requiresCounterpartDetail("expense", office, 60_000, 0)).toBe(true);
    });

    it("円未満を四捨五入してから基準と比べる", () => {
      expect(requiresCounterpartDetail("expense", office, 49_999.5, 0)).toBe(true);
      expect(requiresCounterpartDetail("expense", office, 49_999.49, 0)).toBe(false);
    });
  });

  describe("getCounterpartDetailCriteria", () => {
    type Tx = {
      transactionType: "income" | "expense";
      categoryKey: string;
      debitAmount: number;
      creditAmount: number;
    };

    /** 絞り込み条件をデータベースと同じ意味で評価する */
    const matchesCriteria = (tx: Tx): boolean =>
      getCounterpartDetailCriteria().some(
        (criterion) =>
          criterion.transactionType === tx.transactionType &&
          criterion.categoryKeys.includes(tx.categoryKey) &&
          (criterion.amountConditions === null ||
            criterion.amountConditions.some((condition) => {
              if ("gte" in condition.debitAmount) {
                return tx.debitAmount >= condition.debitAmount.gte;
              }
              return (
                "creditAmount" in condition &&
                tx.debitAmount <= condition.debitAmount.lte &&
                tx.creditAmount >= condition.creditAmount.gte
              );
            })),
      );

    const categoryKeys = [
      ...COUNTERPART_REQUIRED_EXPENSE_CATEGORIES,
      ...COUNTERPART_REQUIRED_INCOME_CATEGORIES,
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      PL_CATEGORIES["個人からの寄附"].key,
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      PL_CATEGORIES["人件費"].key,
    ];
    const amounts = [0, 1, 10_000, 49_999, 49_999.49, 49_999.5, 50_000, 50_000.4, 150_000];

    it("絞り込み条件に当たる取引と requiresCounterpartDetail が true の取引が一致する", () => {
      for (const transactionType of ["income", "expense"] as const) {
        for (const categoryKey of categoryKeys) {
          for (const debitAmount of amounts) {
            for (const creditAmount of amounts) {
              const tx = { transactionType, categoryKey, debitAmount, creditAmount };
              expect({ tx, matched: matchesCriteria(tx) }).toEqual({
                tx,
                matched: requiresCounterpartDetail(
                  transactionType,
                  categoryKey,
                  debitAmount,
                  creditAmount,
                ),
              });
            }
          }
        }
      }
    });
  });
});
