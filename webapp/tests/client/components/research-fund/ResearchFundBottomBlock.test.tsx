import { renderToStaticMarkup } from "react-dom/server";
import ResearchFundBottomBlock from "@/client/components/research-fund/ResearchFundBottomBlock";

describe("ResearchFundBottomBlock", () => {
  const html = renderToStaticMarkup(
    <ResearchFundBottomBlock dataNote="2026年2月の当選以降、仕訳が完了した支出を掲載しています。" />,
  );

  it("データについては議員ページ用の3項目にする", () => {
    expect(html).toContain("まる見え政治資金について");
    expect(html).toContain("調研費のデータについて");
    expect(html).toContain("2026年2月の当選以降、仕訳が完了した支出を掲載しています。");
    expect(html).toContain("免責事項");
    // 政党ページ用の項目は出さない
    expect(html).not.toContain("データの出典");
    expect(html).not.toContain("調査研究費について");
  });

  it("免責事項に使途等報告書を含める", () => {
    expect(html).toContain("「調査研究広報滞在費に係る使途等報告書」");
  });

  it("共通の帯とカードも出す", () => {
    expect(html).toContain("少しずつ進んでいますがまだまだです");
    expect(html).toContain("よくあるご質問");
  });
});
