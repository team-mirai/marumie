import { renderToStaticMarkup } from "react-dom/server";
import TransparencySection from "@/client/components/common/TransparencySection";

describe("TransparencySection", () => {
  it("政党ページは「党首もこれを見て…」の帯で、note へのリンクは「チームみらいのnoteの記事」", () => {
    const html = renderToStaticMarkup(<TransparencySection variant="party" />);
    expect(html).toContain(
      '党首もこれを見て、お金をやりくりしています<span aria-hidden="true">👀</span>',
    );
    expect(html).toContain("チームみらいのnoteの記事");
    expect(html).not.toContain("こちらのnote");
    expect(html).toContain('target="_blank"');
    expect(html).toContain("（別タブで開きます）");
  });

  it("すべての出入金ページは「党内の機密データの流出事故ではありません」の帯で、リンクは「こちらのnote」", () => {
    const html = renderToStaticMarkup(<TransparencySection variant="transactions" />);
    expect(html).toContain(
      '党内の機密データの流出事故ではありません<span aria-hidden="true">☺️</span>',
    );
    expect(html).toContain("チームみらいに関わる政治資金の流れは、まるごとここに反映されています。");
    expect(html).toContain("こちらのnote");
  });
});
