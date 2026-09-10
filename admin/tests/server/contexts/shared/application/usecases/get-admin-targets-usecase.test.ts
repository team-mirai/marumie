import { GetAdminTargetsUsecase } from "@/server/contexts/shared/application/usecases/get-admin-targets-usecase";
import { targetDestination, type AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
const org: AdminTarget = { kind: "political-organization", key: "org:1:2026", name: "団体A", year: 2026, organizationId: "1" };
const book: AdminTarget = { kind: "research-fund", key: "book:7", name: "議員A", year: 2026, politicianId: "3", bookId: "7", draftCount: 2 };
function setup() {
  const list = jest.fn().mockImplementation(async () => [org, book]);
  return new GetAdminTargetsUsecase({ list });
}
test.each([undefined, "invalid", "book:99", "org:99:2026"])("未選択・無効・削除済みの %s は他の対象に切り替えない", async (key) => {
  expect((await setup().execute(key, 2026)).currentTarget).toBeNull();
});
test("明示選択した帳簿をそのまま返し、一覧の先頭を選ばない", async () => {
  expect((await setup().execute(book.key, 2026)).currentTarget).toEqual(book);
  expect(targetDestination(book)).toBe("/politicians/3/books");
  expect(targetDestination(org)).toBe("/political-organizations");
});
test("年をまたいでも選択した団体・年度は変わらない", async () => {
  const result = await setup().execute("org:1:2024", 2026);
  expect(result.currentTarget).toEqual({ ...org, key: "org:1:2024", year: 2024 });
  expect(result.targets).toContainEqual(result.currentTarget);
});
test("対象が1つもなければ空リスト・未選択を返す", async () => {
  expect(await new GetAdminTargetsUsecase({ list: async () => [] }).execute(undefined, 2026)).toEqual({ targets: [], currentTarget: null });
});
