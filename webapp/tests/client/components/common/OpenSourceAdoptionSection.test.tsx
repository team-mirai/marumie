import { renderToStaticMarkup } from "react-dom/server";
import OpenSourceAdoptionSection from "@/client/components/common/OpenSourceAdoptionSection";

describe("OpenSourceAdoptionSection", () => {
  const html = renderToStaticMarkup(<OpenSourceAdoptionSection />);

  it("見出しと、ボタンへ案内する本文を出す", () => {
    expect(html).toContain("オープンソースでだれでも使える");
    expect(html).toContain("まる見え政治資金を使いたい<wbr/>議員／政治団体の方へ");
    expect(html).toContain(
      "本ツールはすでにオープンソースとして無料で公開されており、あらゆる議員・政治団体のみなさんにお使いいただけます。導入についてご興味のある方は、下のボタンからご登録ください。",
    );
  });

  it("「導入を希望する」は新しいフォームを別タブで開く黒い丸ボタンにする", () => {
    expect(html).toMatch(
      /<a href="https:\/\/forms\.gle\/sPx3jFbYCSRamqEE6" target="_blank" rel="noopener noreferrer" aria-label="導入を希望する（Googleフォームが別タブで開きます）" class="[^"]*rounded-full bg-\[#0B0F0E\][^"]*">導入を希望する<svg/,
    );
    expect(html).not.toContain("docs.google.com/forms");
  });

  it("ボタンの横にソースコード（GitHub）へのリンクを並べる", () => {
    expect(html).toContain('aria-label="ソースコードを見る（GitHubが別タブで開きます）"');
    expect(html).toContain('href="https://github.com/team-mirai/marumie"');
    expect(html.indexOf("導入を希望する")).toBeLessThan(html.indexOf("ソースコードを見る（GitHub）"));
  });
});
