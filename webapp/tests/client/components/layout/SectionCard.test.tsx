import { renderToStaticMarkup } from "react-dom/server";
import SectionCard from "@/client/components/layout/SectionCard";

function render(props: { updatedAt: string; updatedAtNote?: string; revealHeading?: boolean }) {
  return renderToStaticMarkup(
    <SectionCard
      id="balance-sheet"
      iconSrc="/icons/balance.svg"
      iconLabel="Balance sheet icon"
      eyebrow="チームみらい・2026年"
      title="貸借対照表"
      {...props}
    >
      <p>本文</p>
    </SectionCard>,
  );
}

describe("SectionCard", () => {
  it("更新日は PC・SP ともカードの右下（本文の後）に 1 か所だけ出す", () => {
    const html = render({ updatedAt: "2026.10.23 更新" });
    expect(html.match(/2026\.10\.23 更新/g)).toHaveLength(1);
    expect(html.indexOf("2026.10.23 更新")).toBeGreaterThan(html.indexOf("本文"));
    expect(html).toMatch(/<div class="-mt-4 text-right [^"]*tabular-nums[^"]*">2026\.10\.23 更新<\/div>/);
    expect(html).not.toContain("min-[641px]:hidden");
  });

  it("補足は更新日の前に並べる", () => {
    const html = render({ updatedAt: "2026.10.23 更新", updatedAtNote: "2026年2-8月分" });
    expect(html).toContain("2026年2-8月分　2026.10.23 更新");
  });

  it("画面に入るときのフェードインの対象にする", () => {
    expect(render({ updatedAt: "" })).toMatch(/<section id="balance-sheet" data-reveal="true"/);
  });

  it("見出しは画面に入るときに下からせり上がる（v9 の mask）", () => {
    expect(render({ updatedAt: "" })).toMatch(
      /<h2 data-reveal="mask"[^>]*><span class="reveal-line"><span>貸借対照表<\/span><\/span><\/h2>/,
    );
  });

  it("revealHeading を false にすると見出しは動かさない", () => {
    const html = render({ updatedAt: "", revealHeading: false });
    expect(html).toMatch(/<h2 class="[^"]*">貸借対照表<\/h2>/);
    expect(html).not.toContain("reveal-line");
  });
});
