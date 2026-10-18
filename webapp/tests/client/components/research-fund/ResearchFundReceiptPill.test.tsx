import { renderToStaticMarkup } from "react-dom/server";
import ResearchFundReceiptPill from "@/client/components/research-fund/ResearchFundReceiptPill";

describe("ResearchFundReceiptPill", () => {
  it("公開用の版が作成済みなら、領収書を開くボタンにする", () => {
    const html = renderToStaticMarkup(<ResearchFundReceiptPill ready onClick={() => {}} />);

    expect(html).toContain("<button");
    expect(html).toContain('aria-label="領収書を見る"');
  });

  it("公開用の版がまだ無ければ、開けない準備中の表示にする", () => {
    const html = renderToStaticMarkup(<ResearchFundReceiptPill ready={false} onClick={() => {}} />);

    expect(html).not.toContain("<button");
    expect(html).toContain("領収書準備中");
  });
});
