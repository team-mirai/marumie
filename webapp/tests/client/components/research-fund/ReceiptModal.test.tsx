import { renderToStaticMarkup } from "react-dom/server";
import ReceiptModal from "@/client/components/research-fund/ReceiptModal";
import type {
  ResearchFundCategoryView,
  ResearchFundExpenseView,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

const category: ResearchFundCategoryView = { label: "タクシー代", color: "#111111" };

function expense(
  overrides: Partial<ResearchFundExpenseView> = {},
): ResearchFundExpenseView {
  return {
    id: "1",
    entryId: "12",
    date: "2026-04-23",
    month: "2026-04",
    description: "タクシー代",
    amount: 1200,
    detailed: category,
    legal: { label: "⑨ 滞在費", color: "#111111" },
    note: null,
    splitGroup: null,
    hasReceipt: true,
    receiptKind: "image",
    ...overrides,
  };
}

function render(overrides: Partial<ResearchFundExpenseView> = {}): string {
  return renderToStaticMarkup(
    <ReceiptModal expense={expense(overrides)} category={category} onClose={() => {}} />,
  );
}

describe("ReceiptModal", () => {
  it("画像の領収書はこれまで通り img で表示する", () => {
    const html = render({ receiptKind: "image" });

    expect(html).toContain('<img src="/api/research-fund/receipts/12"');
    expect(html).not.toContain("別のタブで開いて");
  });

  it("PDF の領収書は img で描かず、原本を開くリンクを出す", () => {
    const html = render({ receiptKind: "pdf" });

    expect(html).not.toContain("<img");
    expect(html).toContain("PDF形式の領収書です");
    expect(html).toContain('href="/api/research-fund/receipts/12"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("種類が判定できない領収書もリンクから開ける", () => {
    const html = render({ receiptKind: null });

    expect(html).not.toContain("<img");
    expect(html).toContain("この形式の領収書はここでは表示できません");
    expect(html).toContain('href="/api/research-fund/receipts/12"');
  });
});
