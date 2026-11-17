import { renderToStaticMarkup } from "react-dom/server";
import YearSegment from "@/client/components/common/YearSegment";

describe("YearSegment", () => {
  const linkYears = [
    { year: 2025, href: "/o/team-mirai/2025" },
    { year: 2026, href: "/o/team-mirai/2026" },
  ];

  it("選んだ年の位置に丸を置き、v9 と同じ速さと緩急で横に滑らせる", () => {
    const html = renderToStaticMarkup(<YearSegment years={linkYears} currentYear={2026} />);
    expect(html).toContain("transform:translateX(100%)");
    expect(html).toContain("width:calc((100% - 6px) / 2)");
    expect(html).toContain("transition-transform duration-500 ease-[cubic-bezier(.2,.7,.1,1)]");
    // 「動きを減らす」設定では滑らせない
    expect(html).toContain("motion-reduce:transition-none");
  });

  it("先頭の年を選んでいるときは丸を動かさない位置に置く", () => {
    const html = renderToStaticMarkup(<YearSegment years={linkYears} currentYear={2025} />);
    expect(html).toContain("transform:translateX(0%)");
    expect(html).toContain('aria-current="page"');
  });

  it("丸の色はミストの上では白、白いカードの上では黒にする", () => {
    const mist = renderToStaticMarkup(<YearSegment years={linkYears} currentYear={2026} />);
    const plain = renderToStaticMarkup(
      <YearSegment years={linkYears} currentYear={2026} tone="plain" />,
    );
    expect(mist).toMatch(/aria-hidden="true" class="[^"]*bg-white /);
    expect(plain).toMatch(/aria-hidden="true" class="[^"]*bg-black/);
  });

  it("その場で切り替える年でも、選んだ年の位置に丸を置く", () => {
    const html = renderToStaticMarkup(
      <YearSegment
        years={[{ year: 2025 }, { year: 2026 }]}
        currentYear={2025}
        onSelect={() => {}}
      />,
    );
    expect(html).toContain("transform:translateX(0%)");
    expect(html).toContain('aria-pressed="true"');
  });
});
