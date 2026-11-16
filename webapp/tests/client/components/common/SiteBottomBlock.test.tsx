import { renderToStaticMarkup } from "react-dom/server";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";

describe("SiteBottomBlock", () => {
  const html = renderToStaticMarkup(<SiteBottomBlock />);

  it("一言コメントの帯は v9 の文言にし、絵文字は読み上げない", () => {
    expect(html).toContain(
      "少しずつ進んでいますがまだまだです。今後も改善を続けます<span aria-hidden=\"true\">🏃🏃‍♀️</span>",
    );
    expect(html).toContain(
      "政治資金の徹底的な透明化に向けて、国民の皆さまとともに着実に歩んでまいります。",
    );
  });

  it("一言コメントの帯の文字は見出し PC 26px・SP 20px、本文 PC 18px・SP 14px", () => {
    expect(html).toMatch(/<h2 class="[^"]*text-\[20px\] min-\[641px\]:text-\[26px\]/);
    expect(html).toMatch(/<p class="[^"]*text-\[14px\] min-\[641px\]:text-\[18px\]/);
  });

  it("ABOUT カードの説明は「政治とカネ解決に向けて」", () => {
    expect(html).toContain("政治とカネ解決に向けて");
    expect(html).not.toContain("4つの特徴");
  });

  it("データについては出典と免責事項の2項目で、調研費の説明は出典の末尾にまとめる", () => {
    expect(html).toContain("データの出典");
    expect(html).toContain(
      "また、所属する国会議員の調研費（調査研究広報滞在費）は、2026年2月の当選以降に仕訳が完了した支出を、議員ごとに掲載しています。",
    );
    expect(html).toContain("「政治資金収支報告書」「選挙運動費用収支報告書」並びに「調査研究広報滞在費に係る使途等報告書」");
    expect(html).not.toContain("まる見え政治資金について");
    expect(html).not.toContain("調査研究費について");
    expect(html).not.toContain("アクションボード");
    expect(html).not.toContain("一層踏み込んだ公開を目指してまいります");
  });

  it("下層ページでは「公開の範囲と出典」の見出しを付けない", () => {
    expect(html).not.toContain("公開の範囲と出典");
  });

  it("トップでは「データについて」の小見出しと「公開の範囲と出典」の見出しを付ける", () => {
    const home = renderToStaticMarkup(<SiteBottomBlock notesVariant="home" />);
    expect(home).toContain("公開の範囲と出典");
    expect(home).toContain('aria-label="データについて"');
  });
});
