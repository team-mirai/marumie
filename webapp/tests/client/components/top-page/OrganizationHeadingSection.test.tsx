import { renderToStaticMarkup } from "react-dom/server";
import OrganizationHeadingSection from "@/client/components/top-page/OrganizationHeadingSection";

describe("OrganizationHeadingSection", () => {
  const html = renderToStaticMarkup(
    <OrganizationHeadingSection
      organizationName="安野貴博の政治団体"
      formalName="デジタル民主主義を考える会"
      photoUrl="/api/organizations/digimin/photo?v=abc"
      links={[{ type: "site", url: "https://example.com/", label: "公式サイト" }]}
      years={[
        { year: 2025, href: "/o/digimin/2025" },
        { year: 2026, href: "/o/digimin/2026" },
      ]}
      currentYear={2026}
    />,
  );
  const [pc, sp] = html.split("</section>");

  it("PC の見出しカードは SP では隠し、団体名・正式名と年・公式サイト・年の切り替えを出す", () => {
    expect(pc).toContain('class="hidden min-[641px]:block"');
    expect(pc).toContain("安野貴博の政治団体");
    expect(pc).toContain("デジタル民主主義を考える会・2026年");
    expect(pc).toContain("https://example.com/");
    expect(pc).toContain('href="/o/digimin/2025"');
  });

  it("SP は一番上のプロフィールカード（ミストの面に写真・団体名・正式名と年・年の切り替え）を出す", () => {
    expect(sp).toContain('aria-label="政治団体情報"');
    expect(sp).toContain('class="min-[641px]:hidden"');
    expect(sp).toContain("mist-surface mist-surface-group");
    expect(sp).toContain('aria-label="安野貴博の政治団体の代表者の写真"');
    expect(sp).toContain("安野貴博の政治団体");
    expect(sp).toContain('デジタル民主主義を考える会・<span class="whitespace-nowrap">2026年</span>');
    expect(sp).toContain('href="/o/digimin/2025"');
    expect(sp).toContain('href="/o/digimin/2026"');
    // 公式サイトと SNS は PC だけ
    expect(sp).not.toContain("https://example.com/");
  });
});
