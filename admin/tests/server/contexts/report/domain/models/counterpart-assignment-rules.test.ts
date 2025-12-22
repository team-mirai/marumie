import {
  isCounterpartRequired,
  isAboveDetailThreshold,
  requiresCounterpartDetail,
  ROUTINE_EXPENSE_THRESHOLD,
  POLITICAL_ACTIVITY_EXPENSE_THRESHOLD,
  ROUTINE_EXPENSE_CATEGORIES,
  POLITICAL_ACTIVITY_EXPENSE_CATEGORIES,
  COUNTERPART_REQUIRED_INCOME_CATEGORIES,
  COUNTERPART_REQUIRED_EXPENSE_CATEGORIES,
} from "@/server/contexts/report/domain/models/counterpart-assignment-rules";
import { PL_CATEGORIES } from "@/shared/utils/category-mapping";

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

  describe("閾値定数", () => {
    it("経常経費の閾値は10万円（100,000円）である", () => {
      expect(ROUTINE_EXPENSE_THRESHOLD).toBe(100_000);
    });

    it("政治活動費の閾値は5万円（50,000円）である", () => {
      expect(POLITICAL_ACTIVITY_EXPENSE_THRESHOLD).toBe(50_000);
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

  describe("isAboveDetailThreshold", () => {
    describe("経常経費カテゴリ（10万円閾値）", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      const routineCategory = PL_CATEGORIES["事務所費"].key;

      it("10万円以上でtrue", () => {
        expect(isAboveDetailThreshold(routineCategory, 100_000)).toBe(true);
        expect(isAboveDetailThreshold(routineCategory, 150_000)).toBe(true);
        expect(isAboveDetailThreshold(routineCategory, 1_000_000)).toBe(true);
      });

      it("10万円未満でfalse", () => {
        expect(isAboveDetailThreshold(routineCategory, 99_999)).toBe(false);
        expect(isAboveDetailThreshold(routineCategory, 50_000)).toBe(false);
        expect(isAboveDetailThreshold(routineCategory, 0)).toBe(false);
      });
    });

    describe("政治活動費カテゴリ（5万円閾値）", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      const politicalCategory = PL_CATEGORIES["組織活動費"].key;

      it("5万円以上でtrue", () => {
        expect(isAboveDetailThreshold(politicalCategory, 50_000)).toBe(true);
        expect(isAboveDetailThreshold(politicalCategory, 100_000)).toBe(true);
        expect(isAboveDetailThreshold(politicalCategory, 1_000_000)).toBe(true);
      });

      it("5万円未満でfalse", () => {
        expect(isAboveDetailThreshold(politicalCategory, 49_999)).toBe(false);
        expect(isAboveDetailThreshold(politicalCategory, 10_000)).toBe(false);
        expect(isAboveDetailThreshold(politicalCategory, 0)).toBe(false);
      });
    });

    describe("収入カテゴリ（閾値なし）", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      const incomeCategory = PL_CATEGORIES["借入金"].key;

      it("金額に関わらずtrue", () => {
        expect(isAboveDetailThreshold(incomeCategory, 0)).toBe(true);
        expect(isAboveDetailThreshold(incomeCategory, 1)).toBe(true);
        expect(isAboveDetailThreshold(incomeCategory, 1_000_000)).toBe(true);
      });
    });
  });

  describe("requiresCounterpartDetail", () => {
    describe("経常経費（10万円閾値）", () => {
      it("10万円以上でtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["事務所費"].key, 100_000)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["光熱水費"].key, 150_000)).toBe(true);
      });

      it("10万円未満でfalse", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["事務所費"].key, 99_999)).toBe(false);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["光熱水費"].key, 50_000)).toBe(false);
      });
    });

    describe("政治活動費（5万円閾値）", () => {
      it("5万円以上でtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["組織活動費"].key, 50_000)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["選挙関係費"].key, 100_000)).toBe(true);
      });

      it("5万円未満でfalse", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["組織活動費"].key, 49_999)).toBe(false);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("expense", PL_CATEGORIES["選挙関係費"].key, 10_000)).toBe(false);
      });
    });

    describe("収入カテゴリ（閾値なし）", () => {
      it("金額に関わらずtrue", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["借入金"].key, 0)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["借入金"].key, 1)).toBe(true);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["本部又は支部から供与された交付金に係る収入"].key, 100_000)).toBe(true);
      });
    });

    describe("非対象カテゴリ", () => {
      it("金額に関わらずfalse", () => {
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["個人からの寄附"].key, 150_000)).toBe(false);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["その他の収入"].key, 200_000)).toBe(false);
        // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
        expect(requiresCounterpartDetail("income", PL_CATEGORIES["機関紙誌の発行その他の事業による収入"].key, 1_000_000)).toBe(false);
      });
    });
  });
});
