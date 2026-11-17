import { parse } from "node-html-parser";
import { renderToStaticMarkup } from "react-dom/server";
import HomeSectionHeading from "@/client/components/home/HomeSectionHeading";

describe("HomeSectionHeading", () => {
  const document = parse(
    renderToStaticMarkup(
      <HomeSectionHeading id="members" title="所属議員の調研費" description="説明文" />,
    ),
  );
  const heading = document.querySelector("h2#members");

  it("見出しは 900 の太さで描く", () => {
    expect(heading?.text).toBe("所属議員の調研費");
    expect(heading?.classList.contains("font-black")).toBe(true);
  });

  it("書体は指定せず、ページ全体の指定（Noto Sans JP が先頭）を引き継ぐ", () => {
    // ヒラギノを先頭にすると、Mac では W6 に頭打ちになり v9 より細く描かれる
    const className = heading?.getAttribute("class") ?? "";
    expect(className).not.toContain("font-family");
    expect(className).not.toContain("Hiragino");
  });
});
