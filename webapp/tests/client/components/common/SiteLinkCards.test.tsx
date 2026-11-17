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

  it("ホバーで内側に緑の枠を出し、外側の影は残し、丸い矢印は緑の地に白い矢印にする（v9）", () => {
    for (const document of [
      parse(renderToStaticMarkup(<SiteLinkCards compactOnSp />)),
      parse(renderToStaticMarkup(<SiteLinkCards />)),
    ]) {
      for (const card of document.querySelectorAll("nav a")) {
        const className = card.getAttribute("class") ?? "";
        expect(className).toContain("hover:bg-[#E2F6F3]");
        expect(className).toContain(
          "hover:shadow-[inset_0_0_0_1.5px_#0F8472,0_2px_6px_rgba(11,15,14,0.06),0_8px_24px_rgba(11,15,14,0.06)]",
        );
        const circle = card.querySelector('[aria-hidden="true"]')?.getAttribute("class") ?? "";
        expect(circle).toContain("group-hover:bg-[#0F8472]");
        expect(circle).toContain("group-hover:text-white");
      }
    }
  });
});
