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
});
