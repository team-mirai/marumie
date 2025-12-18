import {
  isCounterpartRequired,
  isAboveDetailThreshold,
  requiresCounterpartDetail,
  COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD,
  COUNTERPART_REQUIRED_INCOME_CATEGORIES,
  COUNTERPART_REQUIRED_EXPENSE_CATEGORIES,
} from "@/server/contexts/report/domain/models/counterpart-assignment-rules";

describe("counterpart-assignment-rules", () => {
  describe("COUNTERPART_REQUIRED_INCOME_CATEGORIES", () => {
    it("借入金と交付金のみを含む", () => {
      expect(COUNTERPART_REQUIRED_INCOME_CATEGORIES).toContain("income_loan");
      expect(COUNTERPART_REQUIRED_INCOME_CATEGORIES).toContain("income_grant_from_hq");
      expect(COUNTERPART_REQUIRED_INCOME_CATEGORIES).toHaveLength(2);
    });
  });

  describe("COUNTERPART_REQUIRED_EXPENSE_CATEGORIES", () => {
    it("経常経費カテゴリを含む", () => {
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_utility_costs");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_office_supplies");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_office_expenses");
    });

    it("政治活動費カテゴリを含む", () => {
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_organizational_activity");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_election_related");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_publication");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_publicity");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_party_event");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_other_projects");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_research");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_donation_grant");
      expect(COUNTERPART_REQUIRED_EXPENSE_CATEGORIES).toContain("expense_other");
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
        expect(isCounterpartRequired("expense", "expense_utility_costs")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_office_supplies")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_office_expenses")).toBe(true);
      });

      it("政治活動費カテゴリでtrue", () => {
        expect(isCounterpartRequired("expense", "expense_organizational_activity")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_election_related")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_publication")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_publicity")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_party_event")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_other_projects")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_research")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_donation_grant")).toBe(true);
        expect(isCounterpartRequired("expense", "expense_other")).toBe(true);
      });

      it("未知のカテゴリでfalse", () => {
        expect(isCounterpartRequired("expense", "unknown_category")).toBe(false);
      });
    });

    describe("収入取引", () => {
      it("借入金でtrue", () => {
        expect(isCounterpartRequired("income", "income_loan")).toBe(true);
      });

      it("交付金でtrue", () => {
        expect(isCounterpartRequired("income", "income_grant_from_hq")).toBe(true);
      });

      it("個人からの寄附でfalse（寄附は対象外）", () => {
        expect(isCounterpartRequired("income", "income_donation_individual")).toBe(false);
      });

      it("その他の収入でfalse", () => {
        expect(isCounterpartRequired("income", "income_other")).toBe(false);
      });

      it("事業収入でfalse", () => {
        expect(isCounterpartRequired("income", "income_business")).toBe(false);
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
      expect(requiresCounterpartDetail("expense", "expense_office_expenses", 150_000)).toBe(true);
      expect(requiresCounterpartDetail("expense", "expense_organizational_activity", 100_000)).toBe(
        true,
      );
      expect(requiresCounterpartDetail("income", "income_loan", 200_000)).toBe(true);
      expect(requiresCounterpartDetail("income", "income_grant_from_hq", 100_000)).toBe(true);
    });

    it("対象カテゴリでも閾値未満でfalse", () => {
      expect(requiresCounterpartDetail("expense", "expense_office_expenses", 50_000)).toBe(false);
      expect(requiresCounterpartDetail("expense", "expense_organizational_activity", 99_999)).toBe(
        false,
      );
      expect(requiresCounterpartDetail("income", "income_loan", 0)).toBe(false);
    });

    it("閾値以上でも非対象カテゴリでfalse", () => {
      expect(requiresCounterpartDetail("income", "income_donation_individual", 150_000)).toBe(
        false,
      );
      expect(requiresCounterpartDetail("income", "income_other", 200_000)).toBe(false);
      expect(requiresCounterpartDetail("income", "income_business", 1_000_000)).toBe(false);
    });

    it("非対象カテゴリかつ閾値未満でfalse", () => {
      expect(requiresCounterpartDetail("income", "income_donation_individual", 50_000)).toBe(false);
    });
  });
});
