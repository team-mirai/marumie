import { renderToStaticMarkup } from "react-dom/server";
import NotFound, { metadata } from "@/app/not-found";

describe("NotFound (/not-found)", () => {
  it("適切な metadata が設定されている", () => {
    expect(metadata.title).toBe("ページが見つかりません | みらいまる見え政治資金");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("404メッセージとトップページへのリンクが含まれるUIを返す", () => {
    const html = renderToStaticMarkup(<NotFound />);

    expect(html).toContain("404");
    expect(html).toContain("ページが見つかりません");
    expect(html).toContain("お探しのページは存在しないか、移動または削除された可能性があります。");
    expect(html).toContain("トップページへ戻る");
    expect(html).toContain('href="/"');
  });
});
