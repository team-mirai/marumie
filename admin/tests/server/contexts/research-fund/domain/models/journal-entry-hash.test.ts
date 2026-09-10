import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";

const content: JournalEntryHash = {
  entryDate: "2026-09-10",
  amount: 1200,
  description: "タクシー代",
  documentId: "123",
};

describe("JournalEntryHash.generate", () => {
  it("同じ内容をキー順に依存せず決定的なSHA-256にする", () => {
    const result = JournalEntryHash.generate(content);
    expect(result).toEqual({ status: "valid", value: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(
      JournalEntryHash.generate({
        documentId: "123",
        description: "タクシー代",
        amount: 1200,
        entryDate: "2026-09-10",
      }),
    ).toEqual(result);
    expect(JournalEntryHash.generate({ ...content })).toEqual(result);
  });

  it.each([
    { entryDate: "2026-09-11" },
    { amount: 1201 },
    { description: "電車代" },
    { documentId: "124" },
    { documentId: null },
  ])("同一性を構成する各項目の変更 %j でhashが変わる", (change) => {
    expect(JournalEntryHash.generate({ ...content, ...change })).not.toEqual(
      JournalEntryHash.generate(content),
    );
  });

  it("書類なしは未指定とnullで同じhashになる", () => {
    expect(JournalEntryHash.generate({ ...content, documentId: undefined })).toEqual(
      JournalEntryHash.generate({ ...content, documentId: null }),
    );
  });

  it("区切り文字を含む項目名と書類IDを混同しない", () => {
    expect(
      JournalEntryHash.generate({ ...content, description: "a|b", documentId: "c" }),
    ).not.toEqual(JournalEntryHash.generate({ ...content, description: "a", documentId: "b|c" }));
  });

  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "2026-09-00",
    "2026-9-1",
    "invalid",
    "",
    "2026-09-10T00:00:00Z",
  ])("不正な暦日 %s を拒否する", (entryDate) => {
    expect(JournalEntryHash.generate({ ...content, entryDate })).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_INVALID_DATE" }],
    });
  });

  it("うるう日を受け付ける", () => {
    expect(JournalEntryHash.generate({ ...content, entryDate: "2024-02-29" }).status).toBe("valid");
  });

  it.each([0, -1, 0.5, NaN, Infinity, 1_000_000_000_000])(
    "不正な金額 %s をhash化しない",
    (amount) => {
      expect(JournalEntryHash.generate({ ...content, amount })).toMatchObject({
        status: "invalid",
        errors: [{ code: "RF_INVALID_AMOUNT" }],
      });
    },
  );

  it("空の項目名や書類IDを拒否する", () => {
    expect(JournalEntryHash.generate({ ...content, description: " " })).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_INVALID_DESCRIPTION" }],
    });
    expect(JournalEntryHash.generate({ ...content, documentId: " " })).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_INVALID_DOCUMENT" }],
    });
  });
});
