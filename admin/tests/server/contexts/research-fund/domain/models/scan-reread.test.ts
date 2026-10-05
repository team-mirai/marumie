import {
  planReread,
  validateRereadSelection,
  previewReread,
  REREAD_INSTRUCTION_MAX_LENGTH,
  validateRereadInstruction,
} from "@/server/contexts/research-fund/domain/models/scan-reread";
import { SCAN_BATCH_MAX_DOCUMENTS } from "@/server/contexts/research-fund/domain/models/scan-batch";

describe("validateRereadInstruction", () => {
  it("前後の空白を落として受け付ける", () => {
    expect(validateRereadInstruction("  駐車場代は別の科目に  ")).toEqual({
      status: "valid",
      value: "駐車場代は別の科目に",
    });
  });

  it.each(["", "   "])("空の指示は受け付けない", (value) => {
    expect(validateRereadInstruction(value)).toMatchObject({ status: "invalid" });
  });

  it("長すぎる指示は受け付けない", () => {
    expect(
      validateRereadInstruction("あ".repeat(REREAD_INSTRUCTION_MAX_LENGTH + 1)),
    ).toMatchObject({ status: "invalid" });
    expect(validateRereadInstruction("あ".repeat(REREAD_INSTRUCTION_MAX_LENGTH))).toMatchObject({
      status: "valid",
    });
  });
});

describe("validateRereadSelection", () => {
  it("下書きが選ばれていなければ受け付けない", () => {
    expect(validateRereadSelection([])).toMatchObject({
      status: "invalid",
      errors: [{ message: "読み直す下書きを選んでください" }],
    });
  });

  it("1件以上選ばれていれば受け付ける", () => {
    expect(validateRereadSelection(["1"])).toEqual({ status: "valid", value: undefined });
  });
});

describe("planReread", () => {
  it("確認済・公開中の仕訳を含む書類を外して数える", () => {
    expect(
      planReread([
        { documentId: "1", hasReviewedEntries: false },
        { documentId: "2", hasReviewedEntries: true },
        { documentId: "1", hasReviewedEntries: false },
      ]),
    ).toEqual({ status: "valid", value: { documentIds: ["1"], excludedCount: 1 } });
  });

  it("すべての書類に確認済・公開中の仕訳があれば、その理由で受け付けない", () => {
    expect(planReread([{ documentId: "1", hasReviewedEntries: true }])).toMatchObject({
      status: "invalid",
      errors: [{ message: "選んだ下書きの書類には確認済・公開中の仕訳があるため、読み直せません" }],
    });
  });

  it("書類の紐づいた下書きが無ければ受け付けない", () => {
    expect(planReread([])).toMatchObject({
      status: "invalid",
      errors: [{ message: "書類の紐づいた下書きを選んでください" }],
    });
  });

  it("1回に読み直せる書類の上限を超えたら受け付けない", () => {
    const candidates = Array.from({ length: SCAN_BATCH_MAX_DOCUMENTS + 1 }, (_, i) => ({
      documentId: String(i + 1),
      hasReviewedEntries: false,
    }));
    expect(planReread(candidates)).toMatchObject({ status: "invalid" });
  });
});

describe("previewReread", () => {
  const entries = [
    { id: "1", status: "draft" as const, documentId: "10", advancedBy: null },
    { id: "2", status: "draft" as const, documentId: "10", advancedBy: null },
    { id: "3", status: "draft" as const, documentId: "20", advancedBy: null },
    { id: "4", status: "approved" as const, documentId: "20", advancedBy: null },
    { id: "5", status: "draft" as const, documentId: null, advancedBy: null },
  ];

  it("選んでいない同じ書類の下書きも作り直す対象に数える", () => {
    expect(previewReread([entries[0]], entries)).toEqual({
      documentCount: 1,
      draftCount: 2,
      excludedDocumentCount: 0,
      withoutDocumentCount: 0,
      mixedAdvancerDocumentCount: 0,
    });
  });

  it("確認済・公開中を含む書類と書類のない下書きは対象外として数える", () => {
    expect(previewReread([entries[0], entries[2], entries[4]], entries)).toEqual({
      documentCount: 1,
      draftCount: 2,
      excludedDocumentCount: 1,
      withoutDocumentCount: 1,
      mixedAdvancerDocumentCount: 0,
    });
  });

  it("立替者が混ざっている書類は、引き継げない書類として数える", () => {
    const mixed = [
      { ...entries[0], advancedBy: "秘書A" },
      { ...entries[1], advancedBy: "秘書B" },
    ];
    expect(previewReread([mixed[0]], mixed).mixedAdvancerDocumentCount).toBe(1);
  });

  it("書類の下書きの立替者が1種類だけなら引き継げる書類として扱う", () => {
    const same = [
      { ...entries[0], advancedBy: "秘書A" },
      { ...entries[1], advancedBy: "秘書A" },
    ];
    expect(previewReread([same[0]], same).mixedAdvancerDocumentCount).toBe(0);
  });
});
