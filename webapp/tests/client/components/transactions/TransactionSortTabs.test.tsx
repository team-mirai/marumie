import { renderToStaticMarkup } from "react-dom/server";
import TransactionSortTabs from "@/client/components/transactions/TransactionSortTabs";

describe("TransactionSortTabs", () => {
  // 下線の伸びる動き（globals.css の .tab-underline）は aria-pressed で選んだタブを見分ける
  it("すべてのタブに下線の動きのクラスを付け、選んだタブだけ aria-pressed を true にする", () => {
    const html = renderToStaticMarkup(<TransactionSortTabs current="old" onChange={() => {}} />);
    const buttons = html.match(/<button[^>]*>[^<]*<\/button>/g) ?? [];
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      expect(button).toMatch(/class="tab-underline /);
    }
    const pressed = buttons.filter((button) => button.includes('aria-pressed="true"'));
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toContain("古い順");
  });

  // 幅 320px でも4つが1行に収まり、ページが横にスクロールしないように、375px 未満だけ文字と間隔を詰める
  it("375px 未満では文字を 14px、間隔を gap-1 に詰め、それ以上の幅は 15px・gap-1.5 のまま", () => {
    const html = renderToStaticMarkup(<TransactionSortTabs current="new" onChange={() => {}} />);
    const fieldset = html.match(/<fieldset[^>]*>/)?.[0] ?? "";
    expect(fieldset).toContain("gap-1.5");
    expect(fieldset).toContain("max-[374px]:gap-1");
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    for (const button of buttons) {
      expect(button).toContain("text-[15px]");
      expect(button).toContain("max-[374px]:text-[14px]");
    }
  });
});
