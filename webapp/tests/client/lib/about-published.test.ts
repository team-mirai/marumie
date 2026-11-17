import {
  buildAboutPublishedSummary,
  describeAboutPublishedSummary,
} from "@/client/lib/about-published";

const party = { slug: "team-mirai", displayName: "チームみらい", orgName: null, hasPhoto: false };
const group = {
  slug: "digimin",
  displayName: "安野貴博",
  orgName: "デジタル民主主義を考える会",
  hasPhoto: true,
};

describe("buildAboutPublishedSummary", () => {
  it("政党・議員の調研費・議員の政治団体を数え、合計を出す", () => {
    const summary = buildAboutPublishedSummary([party], [group], {
      2026: [
        { slug: "anno", name: "安野貴博", nameKana: "あんの たかひろ", hasPhoto: true },
        { slug: "mineshima", name: "峰島侑也", nameKana: "みねしま ゆうや", hasPhoto: false },
      ],
    });

    expect(summary.total).toBe(4);
    expect(summary.parties.items).toEqual([{ slug: "team-mirai", name: "チームみらい" }]);
    expect(summary.politicians.items).toEqual([
      {
        slug: "anno",
        name: "安野貴博",
        photoUrl: "/api/research-fund/politicians/anno/photo",
      },
      { slug: "mineshima", name: "峰島侑也", photoUrl: null },
    ]);
    expect(summary.groups.items).toEqual([
      { slug: "digimin", label: "安野貴博（デジタル民主主義を考える会）", hasPhoto: true },
    ]);
  });

  it("複数の年度に調研費がある議員は1人として数え、年度をまたいで五十音順に並べる", () => {
    const summary = buildAboutPublishedSummary([], [], {
      2025: [{ slug: "anno", name: "安野貴博", nameKana: "あんの", hasPhoto: false }],
      2026: [
        { slug: "mineshima", name: "峰島侑也", nameKana: "みねしま", hasPhoto: false },
        { slug: "anno", name: "安野貴博", nameKana: "あんの", hasPhoto: false },
      ],
    });

    expect(summary.total).toBe(2);
    expect(summary.politicians.items.map((item) => item.slug)).toEqual(["anno", "mineshima"]);
  });

  it("政治団体の正式名が未登録なら名前だけにする", () => {
    const summary = buildAboutPublishedSummary([], [{ ...group, orgName: null }], {});
    expect(summary.groups.items[0].label).toBe("安野貴博");
  });
});

describe("describeAboutPublishedSummary", () => {
  it("合計と内訳を読み上げ用に並べる", () => {
    const summary = buildAboutPublishedSummary([party], [group], {
      2026: [{ slug: "anno", name: "安野貴博", nameKana: "あんの", hasPhoto: false }],
    });
    expect(describeAboutPublishedSummary(summary)).toBe(
      "3（政党1、議員の調研費1、議員の政治団体1）",
    );
  });

  it("0件の区分は省く", () => {
    const summary = buildAboutPublishedSummary([party], [], {});
    expect(describeAboutPublishedSummary(summary)).toBe("1（政党1）");
  });

  it("何も公開していなければ0だけにする", () => {
    expect(describeAboutPublishedSummary(buildAboutPublishedSummary([], [], {}))).toBe("0");
  });
});
