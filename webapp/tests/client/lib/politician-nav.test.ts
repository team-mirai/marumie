import { buildPoliticianNav, politicianPageHref } from "@/client/lib/politician-nav";

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

describe("politicianPageHref", () => {
  it("slug の区間をエンコードして年度のページを指す", () => {
    expect(politicianPageHref("sample-taro", 2026)).toBe("/p/sample-taro/2026");
  });
});
