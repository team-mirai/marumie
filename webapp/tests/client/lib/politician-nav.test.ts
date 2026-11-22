import {
  buildPoliticianNav,
  mergeNavMembersAcrossYears,
  politicianPageHref,
} from "@/client/lib/politician-nav";

const A = { slug: "a", name: "議員A" };
const B = { slug: "b", name: "議員B" };
const C = { slug: "c", name: "議員C" };

describe("buildPoliticianNav", () => {
  it("表示順でぐるっと回るように前後の議員を決め、ほかの議員から表示中の議員を除く", () => {
    const nav = buildPoliticianNav([A, B, C], "a");

    expect(nav?.prev).toBe(C);
    expect(nav?.next).toBe(B);
    expect(nav?.others).toEqual([B, C]);
    expect(nav?.members.map((member) => member.current)).toEqual([true, false, false]);
  });

  it("最後の議員の次は最初の議員", () => {
    const nav = buildPoliticianNav([A, B, C], "c");

    expect(nav?.prev).toBe(B);
    expect(nav?.next).toBe(A);
  });

  it("公開中の議員が 1 人以下なら出さない", () => {
    expect(buildPoliticianNav([A], "a")).toBeNull();
    expect(buildPoliticianNav([A], "hidden")).toBeNull();
    expect(buildPoliticianNav([], "hidden")).toBeNull();
  });

  it("プレビューで非公開の議員を見ているときは、公開中の議員だけをたどり、どれも表示中にしない", () => {
    const nav = buildPoliticianNav([A, B], "hidden");

    expect(nav?.prev).toBe(B);
    expect(nav?.next).toBe(A);
    expect(nav?.others).toEqual([A, B]);
    expect(nav?.members.every((member) => !member.current)).toBe(true);
  });
});

describe("mergeNavMembersAcrossYears", () => {
  const card = (slug: string, comingSoon = false) => ({ slug, name: `議員${slug}`, comingSoon });

  it("表示中の年度に公開していない議員も、公開している一番新しい年度へのリンクとして並べる", () => {
    // 2025年は anno だけ公開、2026年は全員公開
    const members = mergeNavMembersAcrossYears(2025, [
      { financialYear: 2025, members: [card("anno")] },
      { financialYear: 2026, members: [card("anno"), card("mineshima"), card("takayama")] },
    ]);

    expect(members.map((member) => [member.slug, member.financialYear])).toEqual([
      ["anno", 2025],
      ["mineshima", 2026],
      ["takayama", 2026],
    ]);
    // 切り替える先があるので、前後の切り替えが出る
    expect(buildPoliticianNav(members, "anno")?.next.slug).toBe("mineshima");
  });

  it("並び順は新しい年度の一覧にそろえ、新しい年度に出てこない議員は後ろに足す", () => {
    const members = mergeNavMembersAcrossYears(2025, [
      { financialYear: 2025, members: [card("c"), card("old")] },
      { financialYear: 2026, members: [card("a"), card("b"), card("c")] },
    ]);

    expect(members.map((member) => [member.slug, member.financialYear])).toEqual([
      ["a", 2026],
      ["b", 2026],
      ["c", 2025],
      ["old", 2025],
    ]);
  });

  it("最新の年度を見ているときは、その年度の一覧のまま変えない", () => {
    const members = mergeNavMembersAcrossYears(2026, [
      { financialYear: 2025, members: [card("a")] },
      { financialYear: 2026, members: [card("a"), card("b"), card("soon", true)] },
    ]);

    expect(members.map((member) => [member.slug, member.financialYear, member.comingSoon])).toEqual([
      ["a", 2026, false],
      ["b", 2026, false],
      ["soon", 2026, true],
    ]);
  });

  it("「準備中」だけの議員は表示中の年度の準備中のページへ、どこかの年度に公開していればその年度へ", () => {
    const members = mergeNavMembersAcrossYears(2025, [
      { financialYear: 2025, members: [card("a"), card("b", true), card("soon", true)] },
      { financialYear: 2026, members: [card("a"), card("b"), card("soon", true)] },
    ]);

    expect(members.map((member) => [member.slug, member.financialYear, member.comingSoon])).toEqual([
      ["a", 2025, false],
      ["b", 2026, false],
      ["soon", 2025, true],
    ]);
  });
});

describe("politicianPageHref", () => {
  it("slug の区間をエンコードして年度のページを指す", () => {
    expect(politicianPageHref("sample-taro", 2026)).toBe("/p/sample-taro/2026");
  });
});
