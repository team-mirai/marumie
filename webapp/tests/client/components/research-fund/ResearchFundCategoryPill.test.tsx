import { renderToStaticMarkup } from "react-dom/server";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";

describe("ResearchFundCategoryPill", () => {
  it("説明を持つ科目は、表示名の右に情報アイコンのボタンと説明文を持つ", () => {
    const html = renderToStaticMarkup(
      <ResearchFundCategoryPill
        category={{
          label: "交通費",
          color: "#0369A1",
          description: "航空券をのぞく電車・バス・タクシー代",
        }}
      />,
    );

    expect(html.indexOf("交通費")).toBeLessThan(html.indexOf("<button"));
    expect(html).toContain('aria-label="交通費の説明"');
    expect(html).toContain("航空券をのぞく電車・バス・タクシー代");
    expect(html).toMatch(/aria-describedby="([^"]+)"[\s\S]*id="\1"/);
  });

  it("説明の無い科目は、アイコンを付けず今まで通りのピルを出す", () => {
    const html = renderToStaticMarkup(
      <ResearchFundCategoryPill category={{ label: "航空券代", color: "#0369A1" }} />,
    );

    expect(html).not.toContain("<button");
    expect(html).toBe(
      '<span class="inline-flex items-center whitespace-nowrap rounded-full border bg-white px-3 py-px text-xs font-medium leading-5" style="border-color:#0369A1;color:#0369A1">航空券代</span>',
    );
  });
});
