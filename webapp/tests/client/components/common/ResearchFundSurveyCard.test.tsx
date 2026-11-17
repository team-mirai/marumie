import { renderToStaticMarkup } from "react-dom/server";
import ResearchFundSurveyCard from "@/client/components/common/ResearchFundSurveyCard";

describe("ResearchFundSurveyCard", () => {
  it("見出しでラベル付けしたセクションに、アンケートの見出し・説明・ボタンを出す", () => {
    const html = renderToStaticMarkup(<ResearchFundSurveyCard headingId="home-survey-heading" />);
    expect(html).toContain('<section aria-labelledby="home-survey-heading"');
    expect(html).toContain("アンケート</span>");
    expect(html).toContain(
      '<h2 id="home-survey-heading" class="',
    );
    expect(html).toContain("調研費の公開について<wbr/>ご意見をお聞かせください</h2>");
    expect(html).toContain(
      "調研費の内容や使い方のガイドラインについて意見を募集しています。いただいた声をもとに今後改善して参ります",
    );
  });

  it("「アンケートに答える」は Google フォームを別タブで開く", () => {
    const html = renderToStaticMarkup(<ResearchFundSurveyCard headingId="x" />);
    expect(html).toContain('href="https://forms.gle/MSYSfpJRU9AR1B7s9"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="アンケートに答える（Googleフォームが別タブで開きます）"');
    expect(html).toContain("アンケートに答える<svg");
  });

  it("セクションの中に置くときは見出しを h3 にできる", () => {
    const html = renderToStaticMarkup(
      <ResearchFundSurveyCard headingId="about-survey-heading" headingLevel="h3" />,
    );
    expect(html).toContain('<h3 id="about-survey-heading"');
    expect(html).not.toContain("<h2");
  });
});
