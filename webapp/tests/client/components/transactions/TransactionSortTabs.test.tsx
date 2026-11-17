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
});
