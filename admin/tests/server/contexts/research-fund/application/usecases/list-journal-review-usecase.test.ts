import { ListJournalReviewUsecase } from "@/server/contexts/research-fund/application/usecases/list-journal-review-usecase";
import { entry, setup } from "./journal-review-test-helpers";
test("一覧には費用科目だけを渡す", async () => {
  const { repository } = setup();
  const data = await new ListJournalReviewUsecase(repository).execute("1");
  expect(data.entries).toEqual([entry]); expect(data.accounts.map(a => a.key)).toEqual(["taxi", "needs-review"]); expect(data.advancers).toEqual(["秘書A"]);
});
