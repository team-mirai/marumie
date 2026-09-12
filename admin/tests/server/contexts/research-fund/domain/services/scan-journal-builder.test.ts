import type { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";
import type { ResearchFundAccount } from "@/server/contexts/research-fund/domain/models/journal-posting";
import { buildScanDraftEntries } from "@/server/contexts/research-fund/domain/services/scan-journal-builder";

const accounts: ResearchFundAccount[] = [
  { key: "bank", type: "asset" },
  { key: "cash", type: "asset" },
  { key: "taxi", type: "expense" },
  { key: "meetings", type: "expense" },
  { key: "needs-review", type: "expense" },
];

function receipt(items: ExtractedReceipt["items"]): ExtractedReceipt {
  return { date: "2026-04-01", items };
}

describe("buildScanDraftEntries", () => {
  it("creates one balanced expense entry per item", () => {
    const result = buildScanDraftEntries(
      receipt([
        { item: "タクシー代", amount: 1200, category_key: "taxi", note: null, split_group: null },
      ]),
      { documentId: "42", accounts },
    );
    expect(result.status).toBe("valid");
    if (result.status !== "valid") return;
    expect(result.value).toHaveLength(1);
    const [entry] = result.value;
    expect(entry).toMatchObject({
      entryDate: "2026-04-01",
      description: "タクシー代",
      accountKey: "taxi",
      amount: 1200,
      note: null,
      // 1 明細だけなら分割していないので split_group は付けない
      splitGroup: null,
    });
    expect(entry.lines).toEqual([
      { side: "debit", accountKey: "taxi", amount: 1200 },
      { side: "credit", accountKey: "bank", amount: 1200 },
    ]);
  });

  it("keeps an unresolved category as needs-review instead of guessing", () => {
    const result = buildScanDraftEntries(
      receipt([
        { item: "用途不明", amount: 500, category_key: "needs-review", note: null, split_group: null },
      ]),
      { documentId: "42", accounts },
    );
    expect(result.status).toBe("valid");
    if (result.status !== "valid") return;
    expect(result.value[0].accountKey).toBe("needs-review");
  });

  it("groups every item of a multi-item document under one split group", () => {
    const result = buildScanDraftEntries(
      receipt([
        { item: "会議費", amount: 3000, category_key: "meetings", note: "打合せ", split_group: "a" },
        { item: "タクシー代", amount: 900, category_key: "taxi", note: null, split_group: "a" },
      ]),
      { documentId: "42", accounts },
    );
    expect(result.status).toBe("valid");
    if (result.status !== "valid") return;
    expect(result.value.map((entry) => entry.splitGroup)).toEqual(["doc-42", "doc-42"]);
    expect(result.value[0].note).toBe("打合せ");
  });

  it("namespaces the split group by document so two documents never collide", () => {
    const items: ExtractedReceipt["items"] = [
      { item: "会議費", amount: 3000, category_key: "meetings", note: null, split_group: "a" },
      { item: "タクシー代", amount: 900, category_key: "taxi", note: null, split_group: "a" },
    ];
    const first = buildScanDraftEntries(receipt(items), { documentId: "1", accounts });
    const second = buildScanDraftEntries(receipt(items), { documentId: "2", accounts });
    expect(first.status === "valid" && first.value[0].splitGroup).toBe("doc-1");
    expect(second.status === "valid" && second.value[0].splitGroup).toBe("doc-2");
  });

  it("falls back to a document-wide group when the model gave no split key", () => {
    const result = buildScanDraftEntries(
      receipt([
        { item: "会議費", amount: 3000, category_key: "meetings", note: null, split_group: null },
        { item: "タクシー代", amount: 900, category_key: "taxi", note: null, split_group: null },
      ]),
      { documentId: "42", accounts },
    );
    expect(result.status === "valid" && result.value.map((e) => e.splitGroup)).toEqual([
      "doc-42",
      "doc-42",
    ]);
  });

  it("produces the same hash for the same document so a reprocess can be detected", () => {
    const input = receipt([
      { item: "タクシー代", amount: 1200, category_key: "taxi", note: null, split_group: null },
    ]);
    const first = buildScanDraftEntries(input, { documentId: "42", accounts });
    const second = buildScanDraftEntries(input, { documentId: "42", accounts });
    const expected = JournalEntryHash.generate({
      entryDate: "2026-04-01",
      amount: 1200,
      description: "タクシー代",
      documentId: "42",
    });
    expect(first.status === "valid" && first.value[0].hash).toBe(
      second.status === "valid" ? second.value[0].hash : null,
    );
    expect(expected.status === "valid" && first.status === "valid").toBe(true);
    if (expected.status === "valid" && first.status === "valid")
      expect(first.value[0].hash).toBe(expected.value);
  });

  it("keeps identical items distinct so a duplicate line is not dropped", () => {
    const item = {
      item: "書籍",
      amount: 3000,
      category_key: "meetings" as const,
      note: null,
      split_group: null,
    };
    const result = buildScanDraftEntries(receipt([item, item, item]), {
      documentId: "42",
      accounts,
    });
    expect(result.status).toBe("valid");
    if (result.status !== "valid") return;
    expect(new Set(result.value.map((e) => e.hash)).size).toBe(3);
    // 1 件目は連番なしの hash のまま（既存データとの互換を保つ）
    const plain = JournalEntryHash.generate({
      entryDate: "2026-04-01",
      amount: 3000,
      description: "書籍",
      documentId: "42",
    });
    expect(plain.status === "valid" && result.value[0].hash).toBe(
      plain.status === "valid" ? plain.value : null,
    );
  });

  it("produces the same hashes when the same multi-item document is reprocessed", () => {
    const item = {
      item: "書籍",
      amount: 3000,
      category_key: "meetings" as const,
      note: null,
      split_group: null,
    };
    const input = receipt([item, item]);
    const first = buildScanDraftEntries(input, { documentId: "42", accounts });
    const second = buildScanDraftEntries(input, { documentId: "42", accounts });
    expect(first.status === "valid" && first.value.map((e) => e.hash)).toEqual(
      second.status === "valid" ? second.value.map((e) => e.hash) : null,
    );
  });

  it("groups every item of a document under one splitGroup even if keys disagree", () => {
    const result = buildScanDraftEntries(
      receipt([
        { item: "資料A", amount: 1000, category_key: "meetings", note: null, split_group: "a" },
        { item: "資料B", amount: 2000, category_key: "meetings", note: null, split_group: "b" },
      ]),
      { documentId: "42", accounts },
    );
    expect(result.status === "valid" && result.value.map((e) => e.splitGroup)).toEqual([
      "doc-42",
      "doc-42",
    ]);
  });

  it("gives different documents different hashes for the same receipt content", () => {
    const input = receipt([
      { item: "タクシー代", amount: 1200, category_key: "taxi", note: null, split_group: null },
    ]);
    const first = buildScanDraftEntries(input, { documentId: "1", accounts });
    const second = buildScanDraftEntries(input, { documentId: "2", accounts });
    expect(first.status === "valid" && second.status === "valid").toBe(true);
    if (first.status !== "valid" || second.status !== "valid") return;
    expect(first.value[0].hash).not.toBe(second.value[0].hash);
  });

  it("reports an unknown category instead of creating an entry with no account", () => {
    const result = buildScanDraftEntries(
      receipt([
        { item: "謎", amount: 100, category_key: "taxi", note: null, split_group: null },
        { item: "謎2", amount: 100, category_key: "donation", note: null, split_group: null },
      ]),
      { documentId: "42", accounts },
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors[0]).toMatchObject({
      path: "items.1.category_key",
      code: "RF_INVALID_ACCOUNT",
    });
  });

  it("reports a missing settlement account rather than building an unbalanced entry", () => {
    const result = buildScanDraftEntries(
      receipt([
        { item: "タクシー代", amount: 1200, category_key: "taxi", note: null, split_group: null },
      ]),
      { documentId: "42", accounts: accounts.filter((account) => account.key !== "bank") },
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors[0].path).toBe("assetAccount");
  });
});
