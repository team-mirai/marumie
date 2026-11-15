import { renderToStaticMarkup } from "react-dom/server";
import PoliticianInitialAvatar from "@/client/components/layout/header/PoliticianInitialAvatar";

describe("PoliticianInitialAvatar", () => {
  it("顔写真があれば写真を出す", () => {
    const html = renderToStaticMarkup(
      <PoliticianInitialAvatar
        name="サンプル太郎"
        photoUrl="/api/research-fund/politicians/sample-taro/photo"
        size="lg"
      />,
    );

    expect(html).toContain("<img");
    expect(html).toContain("/api/research-fund/politicians/sample-taro/photo");
    expect(html).not.toContain("サ");
  });

  it("顔写真が未登録なら名前の1文字目を出す", () => {
    const html = renderToStaticMarkup(
      <PoliticianInitialAvatar name="サンプル太郎" photoUrl={null} size="sm" />,
    );

    expect(html).not.toContain("<img");
    expect(html).toContain(">サ</span>");
  });
});
