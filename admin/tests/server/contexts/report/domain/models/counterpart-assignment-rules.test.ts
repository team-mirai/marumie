import {
  isCounterpartRequired,
  isAboveDetailThreshold,
  requiresCounterpartDetail,
  COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD,
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

  describe("COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD", () => {
    it("10万円（100,000円）である", () => {
      expect(COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD).toBe(100_000);
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
    it("閾値以上でtrue", () => {
      expect(isAboveDetailThreshold(100_000)).toBe(true);
      expect(isAboveDetailThreshold(150_000)).toBe(true);
      expect(isAboveDetailThreshold(1_000_000)).toBe(true);
    });

    it("閾値未満でfalse", () => {
      expect(isAboveDetailThreshold(99_999)).toBe(false);
      expect(isAboveDetailThreshold(50_000)).toBe(false);
      expect(isAboveDetailThreshold(0)).toBe(false);
    });

    it("閾値ちょうどでtrue", () => {
      expect(isAboveDetailThreshold(COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD)).toBe(true);
    });
  });

  describe("requiresCounterpartDetail", () => {
    it("対象カテゴリかつ閾値以上でtrue", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("expense", PL_CATEGORIES["事務所費"].key, 150_000)).toBe(true);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("expense", PL_CATEGORIES["組織活動費"].key, 100_000)).toBe(
        true,
      );
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("income", PL_CATEGORIES["借入金"].key, 200_000)).toBe(true);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("income", PL_CATEGORIES["本部又は支部から供与された交付金に係る収入"].key, 100_000)).toBe(true);
    });

    it("対象カテゴリでも閾値未満でfalse", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("expense", PL_CATEGORIES["事務所費"].key, 50_000)).toBe(false);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("expense", PL_CATEGORIES["組織活動費"].key, 99_999)).toBe(
        false,
      );
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("income", PL_CATEGORIES["借入金"].key, 0)).toBe(false);
    });

    it("閾値以上でも非対象カテゴリでfalse", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("income", PL_CATEGORIES["個人からの寄附"].key, 150_000)).toBe(
        false,
      );
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("income", PL_CATEGORIES["その他の収入"].key, 200_000)).toBe(false);
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("income", PL_CATEGORIES["機関紙誌の発行その他の事業による収入"].key, 1_000_000)).toBe(false);
    });

    it("非対象カテゴリかつ閾値未満でfalse", () => {
      // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
      expect(requiresCounterpartDetail("income", PL_CATEGORIES["個人からの寄附"].key, 50_000)).toBe(false);
    });
  });
});
