import { buildNetCategoryAggregation } from "@/server/contexts/public-finance/domain/services/net-category-aggregator";

describe("buildNetCategoryAggregation", () => {
  describe("通常の仕訳", () => {
    it("貸方の収入科目を収入に、借方の支出科目を支出に集計する", () => {
      const result = buildNetCategoryAggregation(
        [
          { account: "個人からの寄附", amount: 1000000 },
          { account: "普通預金", amount: 800000 },
        ],
        [
          { account: "普通預金", amount: 1000000 },
          { account: "宣伝事業費", amount: 800000 },
        ],
      );

      expect(result.income).toEqual([
        { category: "寄附", subcategory: "個人からの寄附", totalAmount: 1000000 },
      ]);
      expect(result.expense).toEqual([
        { category: "政治活動費", subcategory: "宣伝費", totalAmount: 800000 },
      ]);
    });

    it("同じカテゴリ・サブカテゴリの科目は合算される", () => {
      const result = buildNetCategoryAggregation(
        [
          { account: "個人からの寄附", amount: 1000000 },
          { account: "個人からの寄附（特定寄附）", amount: 300000 },
        ],
        [],
      );

      expect(result.income).toEqual([
        { category: "寄附", subcategory: "個人からの寄附", totalAmount: 1300000 },
      ]);
    });
  });

  describe("返金の仕訳", () => {
    it("借方に来た収入科目は支出ノードにせず、同じ収入から差し引く", () => {
      const result = buildNetCategoryAggregation(
        [
          { account: "個人からの寄附", amount: 1000000 },
          { account: "普通預金", amount: 150000 },
        ],
        [
          { account: "普通預金", amount: 1000000 },
          { account: "個人からの寄附", amount: 150000 },
        ],
      );

      expect(result.income).toEqual([
        { category: "寄附", subcategory: "個人からの寄附", totalAmount: 850000 },
      ]);
      expect(result.expense).toEqual([]);
    });

    it("貸方に来た支出科目は収入ノードにせず、同じ支出から差し引く", () => {
      const result = buildNetCategoryAggregation(
        [
          { account: "組織活動費", amount: 20000 },
          { account: "普通預金", amount: 500000 },
        ],
        [
          { account: "組織活動費", amount: 500000 },
          { account: "普通預金", amount: 20000 },
        ],
      );

      expect(result.expense).toEqual([
        { category: "政治活動費", subcategory: "組織活動費", totalAmount: 480000 },
      ]);
      expect(result.income).toEqual([]);
    });

    it("返金だけの収入科目は正味がマイナスのまま返る", () => {
      const result = buildNetCategoryAggregation(
        [],
        [{ account: "個人からの寄附", amount: 50000 }],
      );

      expect(result.income).toEqual([
        { category: "寄附", subcategory: "個人からの寄附", totalAmount: -50000 },
      ]);
      expect(result.expense).toEqual([]);
    });
  });

  describe("BS科目", () => {
    it("BS科目は収入・支出のどちらにも現れない", () => {
      const result = buildNetCategoryAggregation(
        [
          { account: "普通預金", amount: 100000 },
          { account: "未払金/未払費用", amount: 30000 },
        ],
        [
          { account: "仮払金", amount: 100000 },
          { account: "立替金", amount: 30000 },
        ],
      );

      expect(result.income).toEqual([]);
      expect(result.expense).toEqual([]);
    });
  });

  describe("friendly-category モード", () => {
    it("subcategory をタグで置き換えたうえで正味を計算する", () => {
      const result = buildNetCategoryAggregation(
        [
          { account: "個人からの寄附", tag: "寄附", amount: 1000000 },
          { account: "普通預金", tag: "", amount: 150000 },
        ],
        [
          { account: "普通預金", tag: "寄附", amount: 1000000 },
          { account: "個人からの寄附", tag: "寄附", amount: 150000 },
        ],
        { useTagAsSubcategory: true },
      );

      expect(result.income).toEqual([
        { category: "寄附", subcategory: "寄附", totalAmount: 850000 },
      ]);
      expect(result.expense).toEqual([]);
    });

    it("タグが空文字の場合は subcategory なしとして扱う", () => {
      const result = buildNetCategoryAggregation(
        [{ account: "個人からの寄附", tag: "", amount: 1000000 }],
        [],
        { useTagAsSubcategory: true },
      );

      expect(result.income).toEqual([{ category: "寄附", totalAmount: 1000000 }]);
    });

    it("タグが異なれば別の項目として集計する", () => {
      const result = buildNetCategoryAggregation(
        [
          { account: "宣伝事業費", tag: "広報", amount: 10000 },
          { account: "普通預金", tag: "", amount: 300000 },
        ],
        [
          { account: "宣伝事業費", tag: "イベント", amount: 300000 },
          { account: "普通預金", tag: "広報", amount: 10000 },
        ],
        { useTagAsSubcategory: true },
      );

      expect(result.expense).toEqual([
        { category: "政治活動費", subcategory: "広報", totalAmount: -10000 },
        { category: "政治活動費", subcategory: "イベント", totalAmount: 300000 },
      ]);
    });
  });

  describe("未知の科目", () => {
    it("PL・BSどちらにも無い科目は現れた側の項目として扱う", () => {
      const result = buildNetCategoryAggregation(
        [{ account: "未知の収入", amount: 1000 }],
        [{ account: "未知の支出", amount: 2000 }],
      );

      expect(result.income).toEqual([{ category: "未知の収入", totalAmount: 1000 }]);
      expect(result.expense).toEqual([{ category: "未知の支出", totalAmount: 2000 }]);
    });
  });
});
