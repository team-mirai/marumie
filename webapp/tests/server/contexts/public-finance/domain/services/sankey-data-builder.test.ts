import { buildNetCategoryAggregation } from "@/server/contexts/public-finance/domain/services/net-category-aggregator";
import { SankeyDataBuilder } from "@/server/contexts/public-finance/domain/services/sankey-data-builder";

describe("SankeyDataBuilder", () => {
  const builder = new SankeyDataBuilder();

  it("正味が0未満の項目はノード・リンクを生成しない", () => {
    const sankeyData = builder.build({
      income: [
        { category: "寄附", subcategory: "個人からの寄附", totalAmount: 1000000 },
        { category: "寄附", subcategory: "政治団体からの寄附", totalAmount: -50000 },
      ],
      expense: [{ category: "政治活動費", subcategory: "宣伝費", totalAmount: 800000 }],
    });

    expect(sankeyData.nodes.map((node) => node.label)).not.toContain("政治団体からの寄附");
    expect(sankeyData.links.every((link) => link.value > 0)).toBe(true);

    // マイナスの項目を除いた残りだけがカテゴリの合計になる
    const incomeCategoryId = sankeyData.nodes.find((node) => node.label === "寄附")?.id;
    const totalId = sankeyData.nodes.find((node) => node.label === "合計")?.id;
    const categoryLink = sankeyData.links.find(
      (link) => link.source === incomeCategoryId && link.target === totalId,
    );
    expect(categoryLink?.value).toBe(1000000);
  });

  it("正味が0の項目もノード・リンクを生成しない", () => {
    const sankeyData = builder.build({
      income: [{ category: "借入金", totalAmount: 0 }],
      expense: [{ category: "政治活動費", subcategory: "宣伝費", totalAmount: 800000 }],
    });

    expect(sankeyData.nodes.map((node) => node.label)).not.toContain("借入金");
  });

  it("カテゴリ内の全項目がマイナスの場合はカテゴリノードごと現れない", () => {
    const sankeyData = builder.build({
      income: [{ category: "寄附", subcategory: "個人からの寄附", totalAmount: -50000 }],
      expense: [],
    });

    expect(sankeyData.nodes.map((node) => node.label)).toEqual(["合計"]);
    expect(sankeyData.links).toEqual([]);
  });

  it("負の項目が無い場合は従来どおりノード・リンクを生成する", () => {
    const sankeyData = builder.build({
      income: [{ category: "寄附", subcategory: "個人からの寄附", totalAmount: 1000000 }],
      expense: [{ category: "政治活動費", subcategory: "宣伝費", totalAmount: 600000 }],
    });

    const labels = sankeyData.nodes.map((node) => node.label);
    expect(labels).toEqual(
      expect.arrayContaining(["個人からの寄附", "寄附", "合計", "政治活動費", "宣伝費"]),
    );
    // 収入 > 支出 の差額は「(仕訳中)」として支出側に積まれる
    expect(labels).toContain("(仕訳中)");
  });

  describe("借入金の返済", () => {
    // 借入 300万・返済 500万・寄附 400万・宣伝費 100万の年度
    const creditSide = [
      { account: "借入金", amount: 3000000 },
      { account: "個人からの寄附", amount: 4000000 },
      { account: "普通預金", amount: 6000000 },
    ];
    const debitSide = [
      { account: "普通預金", amount: 7000000 },
      { account: "借入金", amount: 5000000 },
      { account: "宣伝事業費", amount: 1000000 },
    ];

    function findLinkValue(
      sankeyData: ReturnType<SankeyDataBuilder["build"]>,
      sourceLabel: string,
      targetLabel: string,
    ): number | undefined {
      const sourceId = sankeyData.nodes.find((node) => node.label === sourceLabel)?.id;
      const targetId = sankeyData.nodes.find((node) => node.label === targetLabel)?.id;
      return sankeyData.links.find((link) => link.source === sourceId && link.target === targetId)
        ?.value;
    }

    it("返済額が借入額を上回っても借入金ノードが残り、返済は政治活動費 / その他の経費に計上される", () => {
      const sankeyData = builder.build(buildNetCategoryAggregation(creditSide, debitSide));

      expect(findLinkValue(sankeyData, "借入金", "合計")).toBe(3000000);
      expect(findLinkValue(sankeyData, "合計", "政治活動費")).toBe(6000000);
      expect(findLinkValue(sankeyData, "政治活動費", "その他の経費")).toBe(5000000);
      expect(findLinkValue(sankeyData, "政治活動費", "宣伝費")).toBe(1000000);
    });

    it("friendly-category モードでも借入金ノードが残り、返済は政治活動費に計上される", () => {
      const sankeyData = builder.build(
        buildNetCategoryAggregation(
          creditSide.map((item) => ({ ...item, tag: "" })),
          debitSide.map((item) => ({
            ...item,
            tag: item.account === "借入金" ? "借入金の返済" : "",
          })),
          { useTagAsSubcategory: true },
        ),
      );

      expect(findLinkValue(sankeyData, "借入金", "合計")).toBe(3000000);
      expect(findLinkValue(sankeyData, "政治活動費", "借入金の返済")).toBe(5000000);
    });
  });
});
