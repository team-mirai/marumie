import { GetAdminTargetsUsecase } from "@/server/contexts/shared/application/usecases/get-admin-targets-usecase";
import { targetDestination, type AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
const org: AdminTarget = { kind: "political-organization", key: "org:1:2026", name: "団体A", year: 2026, organizationId: "1" };
const book: AdminTarget = { kind: "research-fund", key: "book:7", name: "議員A", year: 2026, politicianId: "3", bookId: "7", draftCount: 2 };
function setup() {
  const list = jest.fn().mockImplementation(async () => [org, book]);
  return new GetAdminTargetsUsecase({ list });
}
test.each([undefined, "invalid", "book:99", "org:99:2026"])("未選択・無効・削除済みの %s は他の対象に切り替えない", async (key) => {
  expect((await setup().execute(key, 2026, ["admin"])).currentTarget).toBeNull();
});
test("明示選択した帳簿をそのまま返し、一覧の先頭を選ばない", async () => {
  expect((await setup().execute(book.key, 2026, ["admin"])).currentTarget).toEqual(book);
  expect(targetDestination(book)).toBe("/politicians/3/books");
  expect(targetDestination(org)).toBe("/political-organizations");
});
test("年をまたいでも選択した団体・年度は変わらない", async () => {
  const result = await setup().execute("org:1:2024", 2026, ["admin"]);
  expect(result.currentTarget).toEqual({ ...org, key: "org:1:2024", year: 2024 });
  expect(result.targets).toContainEqual(result.currentTarget);
});
test("対象が1つもなければ空リスト・未選択を返す", async () => {
  expect(await new GetAdminTargetsUsecase({ list: async () => [] }).execute(undefined, 2026, ["admin"])).toEqual({ targets: [], currentTarget: null });
});
test("political_fund だけのユーザーには政治団体だけを出し、保存済みの議員室の選択も無効にする", async () => {
  const result = await setup().execute(book.key, 2026, ["political_fund"]);
  expect(result.targets).toEqual([org]);
  expect(result.currentTarget).toBeNull();
});
test("research_fund だけのユーザーには議員室だけを出し、保存済みの政治団体の選択も無効にする", async () => {
  const result = await setup().execute("org:1:2024", 2026, ["research_fund"]);
  expect(result.targets).toEqual([book]);
  expect(result.currentTarget).toBeNull();
});
test("両方のロールを持つユーザーには政治団体と議員室の両方を出す", async () => {
  const result = await setup().execute(book.key, 2026, ["political_fund", "research_fund"]);
  expect(result.targets).toEqual([org, book]);
  expect(result.currentTarget).toEqual(book);
});
describe("担当の議員室から始める（#1773）", () => {
  const older: AdminTarget = { ...book, key: "book:6", bookId: "6", year: 2025 };
  const other: AdminTarget = { ...book, key: "book:9", bookId: "9", politicianId: "4", name: "議員B" };
  const usecase = () => new GetAdminTargetsUsecase({ list: async () => [org, older, book, other] });

  test("担当がちょうど 1 人なら、未選択のときにその議員室の最新年度の帳簿を選んだ状態で始める", async () => {
    expect((await usecase().execute(undefined, 2026, ["research_fund"], ["3"])).currentTarget).toEqual(book);
  });
  test("明示的に選んだ対象があればそちらを優先する（担当外の議員室でも）", async () => {
    expect((await usecase().execute(other.key, 2026, ["research_fund"], ["3"])).currentTarget).toEqual(other);
  });
  test("保存済みの選択が無効になっても、担当の議員室にはフォールバックしない", async () => {
    expect((await usecase().execute("book:99", 2026, ["research_fund"], ["3"])).currentTarget).toBeNull();
  });
  test.each([[[]], [["3", "4"]]])("担当が 0 人・複数人（%p）なら未選択のまま", async (assigned) => {
    expect((await usecase().execute(undefined, 2026, ["research_fund"], assigned)).currentTarget).toBeNull();
  });
  test("担当の議員に帳簿が無ければ未選択のまま", async () => {
    expect((await usecase().execute(undefined, 2026, ["research_fund"], ["5"])).currentTarget).toBeNull();
  });
  test("research_fund ロールが無く議員室を選べないユーザーは、担当があっても未選択のまま", async () => {
    expect((await usecase().execute(undefined, 2026, ["political_fund"], ["3"])).currentTarget).toBeNull();
  });
});
