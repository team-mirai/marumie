import type { ResearchFundAccount } from "@/server/contexts/research-fund/domain/models/journal-posting";
import { buildGrantJournalWrite } from "@/server/contexts/research-fund/domain/services/grant-journal-builder";

const accounts: ResearchFundAccount[] = [
  { key: "grant-income", type: "income" },
  { key: "bank", type: "asset" },
];
function build(override: Partial<Parameters<typeof buildGrantJournalWrite>[0]> = {}) {
  return buildGrantJournalWrite({
    month: "2026-05",
    termStart: "2026-02-08",
    amount: 1_000_000,
    accounts,
    ...override,
  });
}

describe("buildGrantJournalWrite", () => {
  it("普通預金を借方、調査研究費収入を貸方にした2行と、月から決まる項目名・既定の支給日で組み立てる", () => {
    expect(build()).toEqual({
      status: "valid",
      value: {
        entryDate: "2026-05-01",
        description: "調査研究広報滞在費 5月分",
        amount: 1_000_000,
        hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        lines: [
          { side: "debit", accountKey: "bank", amount: 1_000_000 },
          { side: "credit", accountKey: "grant-income", amount: 1_000_000 },
        ],
      },
    });
  });

  it("当選月は当選日を既定の支給日にする", () => {
    expect(build({ month: "2026-02" })).toMatchObject({
      status: "valid",
      value: { entryDate: "2026-02-08" },
    });
  });

  it("手入力された支給日をそのまま仕訳日にする", () => {
    expect(build({ entryDate: "2026-05-21" })).toMatchObject({
      status: "valid",
      value: { entryDate: "2026-05-21" },
    });
  });

  it("既存の支給を編集するときは、保存済みの項目名をそのまま使う", () => {
    expect(build({ description: "調査研究広報滞在費 5月分（再登録）" })).toMatchObject({
      status: "valid",
      value: { description: "調査研究広報滞在費 5月分（再登録）" },
    });
  });

  it("支給日を変えると hash を作り直す", () => {
    const first = build({ entryDate: "2026-05-01" });
    const moved = build({ entryDate: "2026-05-21" });
    expect(first.status).toBe("valid");
    expect(moved.status).toBe("valid");
    if (first.status !== "valid" || moved.status !== "valid") return;
    expect(moved.value.hash).not.toBe(first.value.hash);
  });

  // hash は重複検知で保存済みの仕訳と突き合わせるので、組み立てを動かしても値が変わってはいけない。
  it.each([
    ["2026-05", undefined, undefined, "feb8d279e851ba36dd09521f66c47898d8c30829738e5c7412c167af7a00a068"],
    ["2026-08", undefined, undefined, "820618e39619248ec33d620237b750a1ccad6e324ff9085a68a90b8e80d1da1c"],
    ["2026-08", "2026-08-20", "調査研究広報滞在費 8月分", "4547f80448df086d8e8da5af56ac763cd7e5be67a9d24f967578c9783b130b66"],
  ] as const)("既存の支給の hash は変わらない（%s %s）", (month, entryDate, description, hash) => {
    expect(build({ month, entryDate, description })).toMatchObject({
      status: "valid",
      value: { hash },
    });
  });

  it.each([
    ["2026-06-01", "支給日はその月の日付を指定してください"],
    ["2026-04-30", "支給日はその月の日付を指定してください"],
    ["2026-05-32", "支給日は実在する日をYYYY-MM-DD形式で指定してください"],
    ["", "支給日は実在する日をYYYY-MM-DD形式で指定してください"],
  ])("その月の中にない支給日 %s は受け付けない", (entryDate, message) => {
    expect(build({ entryDate })).toMatchObject({
      status: "invalid",
      errors: [{ path: "entryDate", message }],
    });
  });

  it("当選月は当選日より前の支給日を受け付けない", () => {
    expect(build({ month: "2026-02", entryDate: "2026-02-07" })).toMatchObject({
      status: "invalid",
      errors: [{ message: "支給日は当選日以降の日付を指定してください" }],
    });
    expect(build({ month: "2026-02", entryDate: "2026-02-08" })).toMatchObject({ status: "valid" });
  });

  it.each([0, -1, 1.5, Number.NaN, "1000000" as unknown as number])(
    "不正な支給額 %p は受け付けない",
    (amount) => {
      expect(build({ amount })).toMatchObject({
        status: "invalid",
        errors: [{ message: "金額は1円以上の整数で指定してください" }],
      });
    },
  );

  it.each(["grant-income", "bank"])("%s が科目マスタに無ければ受け付けない", (missing) => {
    expect(build({ accounts: accounts.filter((a) => a.key !== missing) })).toMatchObject({
      status: "invalid",
      errors: [{ message: "科目が見つかりません" }],
    });
  });
});
