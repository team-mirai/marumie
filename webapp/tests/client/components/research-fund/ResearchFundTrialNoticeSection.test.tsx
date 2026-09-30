import { renderToStaticMarkup } from "react-dom/server";
import ResearchFundTrialNoticeSection from "@/client/components/research-fund/ResearchFundTrialNoticeSection";

describe("ResearchFundTrialNoticeSection", () => {
  it("見出しに議員の氏名を入れ、試験公開の説明を出す", () => {
    const html = renderToStaticMarkup(<ResearchFundTrialNoticeSection politicianName="峰島侑也" />);

    expect(html).toContain("峰島侑也の調研費、法律より一足先に試験公開中👉");
    expect(html).toContain(
      "国民にとってわかりやすく、納得感のある公開のあり方を探るため、法令で義務付けられた公開に先行して試験的に公開しています。今後、チームみらい所属の他の議員11名分の調研費や、党独自の使用ガイドラインも順次公開していきます。ご感想やご意見はこちらの",
    );
    expect(html).toContain("にお寄せください。");
  });

  it("「ご意見フォーム」をフォームを別タブで開くリンクにする", () => {
    const html = renderToStaticMarkup(<ResearchFundTrialNoticeSection politicianName="峰島侑也" />);

    expect(html).toContain(
      '<a href="https://docs.google.com/forms/d/1A-smuVBxS9ar8Z7PuP4TeZpc1Re9EhqmFdTWjrzgFHg/viewform" target="_blank" rel="noopener noreferrer" class="font-bold underline hover:no-underline">ご意見フォーム</a>',
    );
  });
});
