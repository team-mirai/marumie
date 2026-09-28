import {
  formatResearchFundSelectorLabel,
  groupResearchFundPoliticians,
} from "@/client/lib/organization-selector";
import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";

function politician(name: string, ready: boolean): ResearchFundPoliticianEntry {
  return {
    slug: name,
    name,
    ready,
    statusLabel: ready ? "2026年2月〜8月分を公開中" : "準備中",
  };
}

describe("groupResearchFundPoliticians", () => {
  it("公開中の議員だけを選べる行にし、準備中の議員は「先頭の氏名 ほかN人」にまとめる", () => {
    const result = groupResearchFundPoliticians([
      politician("安野貴博", false),
      politician("峰島侑也", true),
      politician("議員A", false),
      politician("議員B", false),
    ]);

    expect(result.selectable.map((entry) => entry.name)).toEqual(["峰島侑也"]);
    expect(result.upcomingLabel).toBe("安野貴博 ほか2人");
  });

  it("準備中が1人だけなら氏名だけを出す", () => {
    expect(groupResearchFundPoliticians([politician("安野貴博", false)]).upcomingLabel).toBe(
      "安野貴博",
    );
  });

  it("準備中が居なければまとめの行は出さない", () => {
    expect(groupResearchFundPoliticians([politician("峰島侑也", true)]).upcomingLabel).toBeNull();
  });
});

describe("formatResearchFundSelectorLabel", () => {
  it("調研費ページの表示名は「{氏名}（調研費）」", () => {
    expect(formatResearchFundSelectorLabel("峰島侑也")).toBe("峰島侑也（調研費）");
  });
});
