import { renderToStaticMarkup } from "react-dom/server";
import MistHeadingCard from "@/client/components/common/MistHeadingCard";

describe("MistHeadingCard", () => {
  const html = renderToStaticMarkup(
    <MistHeadingCard
      ariaLabel="政党情報"
      avatar={<span>ロゴ</span>}
      title="チームみらいの収支"
      subtitle="2026年"
      updatedAt="2026.10.23 更新"
      yearSwitch={{ sp: <nav>SPの年</nav>, pc: <nav>PCの年</nav> }}
    >
      <p>本文</p>
    </MistHeadingCard>,
  );
  // 前半が SP のミストの面、後半が PC の見出しの行と本文
  const pcStart = html.indexOf('class="hidden items-center gap-4 min-[641px]:flex"');
  const sp = html.slice(0, pcStart);
  const rest = html.slice(pcStart);

  it("SP はミストの面に見出しとすりガラスの年の切り替えを出し、PC では隠す", () => {
    expect(sp).toContain("mist-surface");
    expect(sp).toContain("min-[641px]:hidden");
    expect(sp).toContain("チームみらいの収支");
    expect(sp).toContain("SPの年");
    expect(sp).not.toContain("PCの年");
  });

  it("PC は白いカードの中の見出しの行に、見出しと黒い年の切り替えを出す", () => {
    expect(rest).toContain("チームみらいの収支");
    expect(rest).toContain("2026年");
    expect(rest).toContain('<div class="ml-auto flex-shrink-0"><nav>PCの年</nav></div>');
    expect(rest).not.toContain("mist-surface");
  });

  it("更新日は PC・SP ともにカードの右下に 1 つだけ出す", () => {
    expect(html.split("2026.10.23 更新")).toHaveLength(2);
    expect(rest.indexOf("本文")).toBeLessThan(rest.indexOf("2026.10.23 更新"));
    expect(html).toContain('<div class="-mt-1 flex justify-end"><span');
  });
});
