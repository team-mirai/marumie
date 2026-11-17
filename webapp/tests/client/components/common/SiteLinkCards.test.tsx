import { parse } from "node-html-parser";
import { renderToStaticMarkup } from "react-dom/server";
import SiteLinkCards from "@/client/components/common/SiteLinkCards";

describe("SiteLinkCards", () => {
  it("トップでは、カードを 1 枚ずつ 0.08 秒の時差をつけてフェードインさせる（v9）", () => {
    const document = parse(renderToStaticMarkup(<SiteLinkCards compactOnSp />));
    expect(document.querySelector("nav")?.hasAttribute("data-reveal")).toBe(false);
    const wrappers = document.querySelectorAll("nav > [data-reveal]");
    expect(wrappers.map((el) => el.getAttribute("style"))).toEqual([
      "--reveal-delay:0s",
      "--reveal-delay:0.08s",
      "--reveal-delay:0.16s",
    ]);
    expect(wrappers.map((el) => el.querySelector("a")?.text.includes(""))).toEqual([
      true,
      true,
      true,
    ]);
  });

  it("下層ページでは、カード3枚をまとめてフェードインさせる", () => {
    const document = parse(renderToStaticMarkup(<SiteLinkCards />));
    expect(document.querySelector("nav")?.getAttribute("data-reveal")).toBe("true");
    expect(document.querySelectorAll("nav > a")).toHaveLength(3);
  });
});
