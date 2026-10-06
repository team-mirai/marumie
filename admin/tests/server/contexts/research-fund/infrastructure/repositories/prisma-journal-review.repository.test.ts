import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaJournalReviewRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository";
import type { JournalWrite, ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
const entry = { id: "9007199254740993", updatedAt: "2026-08-01T00:00:00.000Z" } as ReviewEntry;
const input: JournalWrite = { entryDate: "2026-08-01", description: "移動", amount: 1200, accountKey: "taxi", note: "公開", memo: "非公開", hash: "hash", status: "approved", lines: [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 1200 }] };
function rowWithLines(lines = input.lines) {
  return {
    id: BigInt(entry.id), entryDate: new Date(input.entryDate), createdAt: new Date(input.entryDate),
    updatedAt: new Date(entry.updatedAt), description: input.description, note: null, memo: null,
    status: "draft", source: "manual", documentId: null, splitGroup: null, document: null,
    payeeId: null, payeeLinkSource: null,
    lines: lines.map(line => ({ ...line, amount: new Prisma.Decimal(line.amount),
      account: { type: line.side === "debit" ? "expense" : "asset" } })),
  };
}
function setup(count = 1) {
  const tx = { researchFundJournalEntry: { updateMany: jest.fn().mockResolvedValue({ count }), deleteMany: jest.fn().mockResolvedValue({ count }), findMany: jest.fn(), findFirst: jest.fn().mockResolvedValue(rowWithLines()), create: jest.fn().mockResolvedValue({ id: BigInt(entry.id) }) }, researchFundJournalLine: { deleteMany: jest.fn(), createMany: jest.fn() }, researchFundAccount: { findMany: jest.fn() }, researchFundBook: { findUnique: jest.fn(), update: jest.fn() }, researchFundPayee: { count: jest.fn().mockResolvedValue(1), create: jest.fn().mockResolvedValue({ id: BigInt(9), politicianId: BigInt(5), name: "東京タクシー", postalCode: null, address: "", invoiceRegistrationNumber: null }) }, $queryRaw: jest.fn() };
  const transaction = jest.fn(async fn => fn(tx));
  const repository = new PrismaJournalReviewRepository({ ...tx, $transaction: transaction } as unknown as PrismaClient);
  return { repository, tx, transaction };
}
test("公開状態と更新日時をDBで照合してから同一トランザクションで行を置換", async () => {
  const { repository, tx, transaction } = setup(); await repository.update("1", entry, input);
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({ where: expect.objectContaining({ id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["draft", "approved"] }, updatedAt: new Date(entry.updatedAt) }), data: expect.objectContaining({ status: "approved", memo: "非公開" }) });
  expect(tx.researchFundJournalLine.deleteMany).toHaveBeenCalledWith({ where: { entryId: BigInt(entry.id) } });
  expect(tx.researchFundJournalLine.createMany).toHaveBeenCalledWith({ data: input.lines.map(l => ({ ...l, entryId: BigInt(entry.id) })) });
});
test("競合した場合は複式行を変更しない。削除も拒否", async () => {
  const { repository, tx } = setup(0);
  await expect(repository.update("1", entry, input)).rejects.toThrow("更新・公開");
  expect(tx.researchFundJournalLine.deleteMany).not.toHaveBeenCalled(); expect(tx.researchFundJournalLine.createMany).not.toHaveBeenCalled();
  await expect(repository.discard("1", entry)).rejects.toThrow("更新・公開");
});
test("手動作成の source と帳簿、作成者、行を保存する", async () => {
  const { repository, tx } = setup(); await expect(repository.create("1", input, "user")).resolves.toBe(entry.id);
  expect(tx.researchFundJournalEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ bookId: BigInt(1), createdById: "user", source: "manual", lines: { create: input.lines } }) });
});
test("同じ日付・金額・項目名の仕訳がある一意制約違反は、作成・更新とも登録済みのエラーにする", async () => {
  const { repository, tx } = setup();
  const duplicate = new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" });
  tx.researchFundJournalEntry.create.mockRejectedValue(duplicate);
  await expect(repository.create("1", input, "user")).rejects.toThrow("すでに登録されています");
  tx.researchFundJournalEntry.updateMany.mockRejectedValue(duplicate);
  await expect(repository.update("1", entry, input)).rejects.toThrow("すでに登録されています");
  expect(tx.researchFundJournalLine.createMany).not.toHaveBeenCalled();
});
test("一意制約以外のエラーはそのまま投げる", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.create.mockRejectedValue(new Error("connection lost"));
  await expect(repository.create("1", input, "user")).rejects.toThrow("connection lost");
});
test("一覧は帳簿内の支出と支給に限定し、BigInt/Decimal/Dateとスキャン情報を変換", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findMany.mockResolvedValue([{ id: BigInt(entry.id), entryDate: new Date(input.entryDate), createdAt: new Date("2026-08-02"), updatedAt: new Date(entry.updatedAt), description: "移動", note: "公開", memo: "非公開", source: "scan", status: "draft", splitGroup: "split", documentId: BigInt(3), lines: [{ side: "debit", accountKey: "taxi", account: { type: "expense" }, amount: new Prisma.Decimal(1200) }, { side: "credit", accountKey: "bank", account: { type: "asset" }, amount: new Prisma.Decimal(1200) }], document: { scanJobs: [{ createdAt: new Date("2026-08-03"), model: "later", prompt: { version: 2 } }, { createdAt: new Date("2026-08-01"), model: "original", prompt: { version: 1 } }] } }]);
  const rows = await repository.list("1"); expect(rows[0]).toMatchObject({ id: entry.id, amount: 1200, documentId: "3", memo: "非公開", model: "original", promptVersion: 1 });
  expect(tx.researchFundJournalEntry.findMany.mock.calls[0][0].where).toMatchObject({ bookId: BigInt(1), OR: [{ source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } } }, { source: "grant", lines: { some: { side: "credit", accountKey: "grant-income" } } }] });
});

test("支給は貸方の調査研究費収入から金額を取り、確認済として一覧に並ぶ", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findMany.mockResolvedValue([{ id: BigInt(entry.id), entryDate: new Date("2026-05-01"), createdAt: new Date("2026-05-01"), updatedAt: new Date(entry.updatedAt), description: "調査研究広報滞在費 5月分", note: null, memo: null, source: "grant", status: "approved", splitGroup: null, documentId: null, document: null, lines: [{ side: "debit", accountKey: "bank", account: { type: "asset" }, amount: new Prisma.Decimal(1000000) }, { side: "credit", accountKey: "grant-income", account: { type: "income" }, amount: new Prisma.Decimal(1000000) }] }]);
  await expect(repository.list("1")).resolves.toEqual([expect.objectContaining({ id: entry.id, entryDate: "2026-05-01", description: "調査研究広報滞在費 5月分", amount: 1000000, accountKey: "grant-income", source: "grant", status: "approved", documentId: null })]);
});

test("手動仕訳を取得し、書類・メモの欠損値を表示用に変換する", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findFirst.mockResolvedValue({
    id: BigInt(entry.id), entryDate: new Date(input.entryDate), updatedAt: new Date(entry.updatedAt),
    createdAt: new Date(input.entryDate), description: "移動", note: null, memo: null,
    status: "draft", source: "manual", documentId: null, splitGroup: null, document: null,
    payeeId: null, payeeLinkSource: null,
    lines: [{ side: "credit", accountKey: "bank", account: { type: "asset" }, amount: new Prisma.Decimal(1200) },
      { side: "debit", accountKey: "taxi", account: { type: "expense" }, amount: new Prisma.Decimal(1200) }],
  });
  await expect(repository.find("1", entry.id)).resolves.toEqual({
    id: entry.id, entryDate: input.entryDate, updatedAt: entry.updatedAt, description: "移動",
    note: "", memo: "", status: "draft", source: "manual", documentId: null, splitGroup: null,
    model: null, promptVersion: null, amount: 1200, accountKey: "taxi", advancedBy: null, settledAt: null,
    payeeId: null, payeeLinkSource: null, receiptAbsenceReason: null, issuer: null,
  });
  tx.researchFundJournalEntry.findFirst.mockResolvedValue(null);
  await expect(repository.find("9", entry.id)).resolves.toBeNull();
});
test("科目は表示順に取得し、帳簿が存在しなければ年度を返さない", async () => {
  const { repository, tx } = setup();
  const accounts = [{ key: "taxi", label: "タクシー代", type: "expense", legalLabel: "⑨ 滞在費" }];
  tx.researchFundAccount.findMany.mockResolvedValue(accounts);
  await expect(repository.accounts()).resolves.toEqual(accounts);
  expect(tx.researchFundAccount.findMany).toHaveBeenCalledWith({ orderBy: { displayOrder: "asc" } });
  tx.researchFundBook.findUnique.mockResolvedValue({ financialYear: 2026 });
  await expect(repository.year("1")).resolves.toBe(2026);
  expect(tx.researchFundBook.findUnique).toHaveBeenCalledWith({ where: { id: BigInt(1) } });
  tx.researchFundBook.findUnique.mockResolvedValue(null);
  await expect(repository.year("1")).resolves.toBeNull();
});
test("空の公開・非公開メモはNULLで保存し、破棄でも競合条件を適用する", async () => {
  const { repository, tx } = setup();
  await repository.create("1", { ...input, note: "", memo: "" }, "user");
  expect(tx.researchFundJournalEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ note: null, memo: null }) });
  await repository.discard("1", entry);
  expect(tx.researchFundJournalEntry.deleteMany).toHaveBeenCalledWith({ where: {
    id: BigInt(entry.id), bookId: BigInt(1), updatedAt: new Date(entry.updatedAt),
    status: { in: ["draft", "approved"] }, source: { in: ["manual", "scan"] },
    lines: { some: { side: "debit", account: { type: "expense" } } }, settledAt: null,
  } });
});


test.each([
  ["複数の費用借方", [{ side: "debit", accountKey: "taxi", amount: 500 }, { side: "debit", accountKey: "books-newspapers", amount: 700 }, { side: "credit", accountKey: "bank", amount: 1200 }]],
  ["複数の貸方", [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 500 }, { side: "credit", accountKey: "cash", amount: 700 }]],
  ["現金決済", [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "cash", amount: 1200 }]],
  ["貸借不一致", [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 500 }]],
  ["借方のみ", [{ side: "debit", accountKey: "taxi", amount: 1200 }]],
] as const)("%sは一覧・取得から除外し、更新時も既存行を保持する", async (_name, lines) => {
  const { repository, tx } = setup();
  const unsupported = rowWithLines([...lines]);
  tx.researchFundJournalEntry.findMany.mockResolvedValue([unsupported, rowWithLines()]);
  await expect(repository.list("1")).resolves.toHaveLength(1);
  tx.researchFundJournalEntry.findFirst.mockResolvedValue(unsupported);
  await expect(repository.find("1", entry.id)).resolves.toBeNull();
  await expect(repository.update("1", entry, input)).rejects.toThrow("この形式の仕訳は編集できません");
  expect(tx.researchFundJournalLine.deleteMany).not.toHaveBeenCalled();
  expect(tx.researchFundJournalLine.createMany).not.toHaveBeenCalled();
});

test("一括の確認済は下書きのみを1トランザクションで進め、複式行は作り直さない", async () => {
  const { repository, tx, transaction } = setup();
  const other = { id: "5", updatedAt: "2026-08-02T00:00:00.000Z" } as ReviewEntry;
  await repository.approveMany("1", [entry, other]);
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenNthCalledWith(1, { where: { id: BigInt(entry.id), bookId: BigInt(1), status: "draft", updatedAt: new Date(entry.updatedAt), source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } } }, data: { status: "approved" } });
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: expect.objectContaining({ id: BigInt(other.id), updatedAt: new Date(other.updatedAt) }) }));
  expect(tx.researchFundJournalLine.deleteMany).not.toHaveBeenCalled();
  expect(tx.researchFundJournalLine.createMany).not.toHaveBeenCalled();
});
test("一括の確認済は1件でも競合したらトランザクションを中止する", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  await expect(repository.approveMany("1", [entry, { id: "5", updatedAt: entry.updatedAt } as ReviewEntry])).rejects.toThrow("更新・公開");
});
test("一括の破棄は下書きの支出だけを1トランザクションで削除する", async () => {
  const { repository, tx, transaction } = setup();
  const other = { id: "5", updatedAt: "2026-08-02T00:00:00.000Z" } as ReviewEntry;
  await repository.discardMany("1", [entry, other]);
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundJournalEntry.deleteMany).toHaveBeenNthCalledWith(1, { where: { id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["draft", "approved"] }, updatedAt: new Date(entry.updatedAt), source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } }, settledAt: null } });
  expect(tx.researchFundJournalEntry.deleteMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: expect.objectContaining({ id: BigInt(other.id), updatedAt: new Date(other.updatedAt) }) }));
});
test("一括の破棄は1件でも競合したらトランザクションを中止する", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  await expect(repository.discardMany("1", [entry, { id: "5", updatedAt: entry.updatedAt } as ReviewEntry])).rejects.toThrow("更新・公開");
});
test("一括で下書きに戻すのは1つのトランザクションで確認済の支出・更新日時を照合して状態だけを戻す", async () => {
  const { repository, tx, transaction } = setup();
  const other = { id: "5", updatedAt: "2026-08-02T00:00:00.000Z" } as ReviewEntry;
  await repository.revertManyToDraft("1", [entry, other]);
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenNthCalledWith(1, { where: { id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["approved"] }, updatedAt: new Date(entry.updatedAt), source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } } }, data: { status: "draft" } });
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: expect.objectContaining({ id: BigInt(other.id), updatedAt: new Date(other.updatedAt) }) }));
});
test("一括で下書きに戻すのは1件でも競合したらトランザクションを中止する", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  await expect(repository.revertManyToDraft("1", [entry, { id: "5", updatedAt: entry.updatedAt } as ReviewEntry])).rejects.toThrow("更新・公開");
});
test("複数取得は帳簿と支出の形式で絞り、扱えない形式は除外する", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findMany.mockResolvedValue([rowWithLines(), rowWithLines([{ side: "debit", accountKey: "taxi", amount: 1200 }])]);
  await expect(repository.findMany("1", [entry.id, "5"])).resolves.toHaveLength(1);
  expect(tx.researchFundJournalEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { bookId: BigInt(1), id: { in: [BigInt(entry.id), BigInt(5)] }, source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } } } }));
});

test("取り下げは公開中・更新日時を照合して確認済に戻し、公開日時を消す", async () => {
  const { repository, tx } = setup();
  await repository.unpublish("1", entry);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({ where: {
    id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["published"] }, updatedAt: new Date(entry.updatedAt),
    source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } },
  }, data: { status: "approved", publishedAt: null } });
});
function setupUnpublish(publishedThrough: string | null, latestPublished: string | null, count = 1) {
  const context = setup(count);
  context.tx.researchFundBook.findUnique.mockResolvedValue({ publishedThrough: publishedThrough && new Date(publishedThrough) });
  context.tx.researchFundJournalEntry.findFirst.mockResolvedValue(latestPublished && { entryDate: new Date(latestPublished) });
  return context;
}
test("取り下げたら、公開範囲を残った公開中の仕訳の最新月末まで同じトランザクションで戻す", async () => {
  const { repository, tx, transaction } = setupUnpublish("2027-04-30", "2026-09-12");
  await repository.unpublish("1", entry);
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundJournalEntry.findFirst).toHaveBeenCalledWith({ where: { bookId: BigInt(1), status: "published" }, orderBy: { entryDate: "desc" }, select: { entryDate: true } });
  expect(tx.researchFundBook.update).toHaveBeenCalledWith({ where: { id: BigInt(1) }, data: { publishedThrough: new Date("2026-09-30") } });

  // 同じ帳簿の取り下げと直列化するため、仕訳を更新する前に帳簿の行をロックする
  const [sql, ...values] = tx.$queryRaw.mock.calls[0];
  expect(sql.join("?")).toContain("FOR UPDATE");
  expect(values).toEqual([BigInt(1)]);
  expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.researchFundJournalEntry.updateMany.mock.invocationCallOrder[0]);
});
test("取り下げた仕訳より新しい月や同じ月の公開中の仕訳が残っていれば、公開範囲は変えない", async () => {
  const later = setupUnpublish("2026-09-30", "2026-09-01");
  await later.repository.unpublish("1", entry);
  expect(later.tx.researchFundBook.update).not.toHaveBeenCalled();
});
test("公開中の仕訳がすべて無くなったら、公開範囲を未設定にする", async () => {
  const { repository, tx } = setupUnpublish("2026-09-30", null);
  await repository.unpublish("1", entry);
  expect(tx.researchFundBook.update).toHaveBeenCalledWith({ where: { id: BigInt(1) }, data: { publishedThrough: null } });
});
test("すでに確認済に戻っているなど競合したら取り下げを拒否し、公開範囲も変えない", async () => {
  const { repository, tx } = setupUnpublish("2027-04-30", "2026-09-12", 0);
  await expect(repository.unpublish("1", entry)).rejects.toThrow("状態が変わりました");
  expect(tx.researchFundBook.findUnique).not.toHaveBeenCalled();
  expect(tx.researchFundBook.update).not.toHaveBeenCalled();
});
test("下書きに戻すのは確認済の支出・更新日時を照合して状態だけを戻す", async () => {
  const { repository, tx } = setup();
  await repository.revertToDraft("1", entry);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({ where: {
    id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["approved"] }, updatedAt: new Date(entry.updatedAt),
    source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } },
  }, data: { status: "draft" } });
});
test("支給は支出の形式で照合するため下書きに戻らない", async () => {
  const { repository, tx } = setup();
  await repository.revertToDraft("1", { ...entry, source: "grant" } as ReviewEntry);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ source: { in: ["manual", "scan"] } }) }));
});
test("別の操作で更新・公開されていたら下書きに戻すのを拒否する", async () => {
  const { repository } = setup(0);
  await expect(repository.revertToDraft("1", entry)).rejects.toThrow("画面を再読み込み");
});

const grantWhere = { source: "grant", lines: { some: { side: "credit", accountKey: "grant-income" } } };
test("取得は支出と支給の両方を対象にする", async () => {
  const { repository, tx } = setup();
  await repository.find("1", entry.id);
  expect(tx.researchFundJournalEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { bookId: BigInt(1), id: BigInt(entry.id), OR: [{ source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } } }, grantWhere] } }));
});
test("支給の更新・取り下げは支給の形式と更新日時で照合する", async () => {
  const { repository, tx } = setup();
  const grant = { ...entry, source: "grant" } as ReviewEntry;
  tx.researchFundJournalEntry.findFirst.mockResolvedValue({ ...rowWithLines([{ side: "debit", accountKey: "bank", amount: 1200 }, { side: "credit", accountKey: "grant-income", amount: 1200 }]), source: "grant" });
  await repository.update("1", grant, { ...input, lines: [{ side: "debit", accountKey: "bank", amount: 1200 }, { side: "credit", accountKey: "grant-income", amount: 1200 }] });
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["draft", "approved"] }, updatedAt: new Date(entry.updatedAt), ...grantWhere } }));
  expect(tx.researchFundJournalLine.createMany).toHaveBeenCalled();
  await repository.unpublish("1", grant);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenLastCalledWith({ where: { id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["published"] }, updatedAt: new Date(entry.updatedAt), ...grantWhere }, data: { status: "approved", publishedAt: null } });
});
test("当選日は帳簿の議員から YYYY-MM-DD で返し、帳簿が無ければ null", async () => {
  const { repository, tx } = setup();
  tx.researchFundBook.findUnique.mockResolvedValue({ politician: { termStart: new Date("2026-07-15T00:00:00.000Z") } });
  await expect(repository.termStart("1")).resolves.toBe("2026-07-15");
  tx.researchFundBook.findUnique.mockResolvedValue(null);
  await expect(repository.termStart("1")).resolves.toBeNull();
});

// --- 立替者と精算 ---
test("一覧は立替者と精算日（日付だけ）を変換して返す", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findFirst.mockResolvedValue({ ...rowWithLines(), advancedBy: "秘書A", settledAt: new Date("2026-09-30T00:00:00.000Z") });
  await expect(repository.find("1", entry.id)).resolves.toMatchObject({ advancedBy: "秘書A", settledAt: "2026-09-30" });
});
test("立替者の候補は同じ政治家の全帳簿から重複なく集める", async () => {
  const { repository, tx } = setup();
  tx.researchFundBook.findUnique.mockResolvedValue({ politicianId: BigInt(7) });
  tx.researchFundJournalEntry.findMany.mockResolvedValue([{ advancedBy: "秘書A" }, { advancedBy: "秘書B" }]);
  await expect(repository.advancers("1")).resolves.toEqual(["秘書A", "秘書B"]);
  expect(tx.researchFundJournalEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { book: { politicianId: BigInt(7) }, advancedBy: { not: null } }, distinct: ["advancedBy"],
  }));
});
test("帳簿が無ければ立替者の候補は空", async () => {
  const { repository, tx } = setup();
  tx.researchFundBook.findUnique.mockResolvedValue(null);
  await expect(repository.advancers("1")).resolves.toEqual([]);
  expect(tx.researchFundJournalEntry.findMany).not.toHaveBeenCalled();
});
test("立替者の設定は公開中も対象にし、未精算であることをDBでも照合する", async () => {
  const { repository, tx, transaction } = setup();
  await repository.setAdvancedBy("1", [entry], "秘書A");
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({
    where: expect.objectContaining({ id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["draft", "approved", "published"] }, updatedAt: new Date(entry.updatedAt), settledAt: null, source: { in: ["manual", "scan"] } }),
    data: { advancedBy: "秘書A" },
  });
});
test("立替の解除は NULL を保存する", async () => {
  const { repository, tx } = setup();
  await repository.setAdvancedBy("1", [entry], null);
  expect(tx.researchFundJournalEntry.updateMany.mock.calls[0][0].data).toEqual({ advancedBy: null });
});
test("精算は確認済・公開中の未精算の立替だけを対象にし、精算日を日付として保存する", async () => {
  const { repository, tx, transaction } = setup();
  await repository.settleMany("1", [entry], "2026-09-30");
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({
    where: expect.objectContaining({ status: { in: ["approved", "published"] }, advancedBy: { not: null }, settledAt: null }),
    data: { settledAt: new Date("2026-09-30T00:00:00.000Z") },
  });
});
test("未精算に戻すのは精算済だけを対象にする", async () => {
  const { repository, tx } = setup();
  await repository.unsettleMany("1", [entry]);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({
    where: expect.objectContaining({ settledAt: { not: null } }), data: { settledAt: null },
  });
});
test.each(["setAdvancedBy", "settleMany", "unsettleMany"] as const)("%s は1件でも競合したらトランザクションを中止する", async method => {
  const { repository, tx } = setup(0);
  tx.researchFundJournalEntry.updateMany.mockResolvedValue({ count: 0 });
  const other = { id: "5", updatedAt: entry.updatedAt } as ReviewEntry;
  const run = method === "setAdvancedBy"
    ? repository.setAdvancedBy("1", [entry, other], "秘書A")
    : method === "settleMany"
      ? repository.settleMany("1", [entry, other], "2026-09-30")
      : repository.unsettleMany("1", [entry, other]);
  await expect(run).rejects.toThrow("再読み込み");
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledTimes(1);
});
test("支払先と紐づけ元を取得する", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findFirst.mockResolvedValue({ ...rowWithLines(), payeeId: BigInt(7), payeeLinkSource: "manual" });
  await expect(repository.find("1", entry.id)).resolves.toMatchObject({ payeeId: "7", payeeLinkSource: "manual" });
});
test("帳簿の議員を返す。帳簿が無ければ null", async () => {
  const { repository, tx } = setup();
  tx.researchFundBook.findUnique.mockResolvedValue({ politicianId: BigInt(7) });
  await expect(repository.politicianId("1")).resolves.toBe("7");
  tx.researchFundBook.findUnique.mockResolvedValue(null);
  await expect(repository.politicianId("1")).resolves.toBeNull();
});
test("支払先の紐づけは公開中・精算済も対象にし、紐づけ元を手動と記録して AI の確信度・根拠を消す", async () => {
  const { repository, tx, transaction } = setup();
  await repository.setPayee("1", [entry], "7");
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundPayee.count).toHaveBeenCalledWith({ where: { id: BigInt(7), politician: { books: { some: { id: BigInt(1) } } } } });
  const call = tx.researchFundJournalEntry.updateMany.mock.calls[0][0];
  expect(call.where).toEqual(expect.objectContaining({ id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["draft", "approved", "published"] }, updatedAt: new Date(entry.updatedAt), source: { in: ["manual", "scan"] } }));
  expect(call.where).not.toHaveProperty("settledAt");
  expect(call.data).toEqual({ payeeId: BigInt(7), payeeLinkSource: "manual", payeeLinkConfidence: null, payeeLinkReason: null });
});
test("支払先の紐づけを外すと紐づけ元も消す", async () => {
  const { repository, tx } = setup();
  await repository.setPayee("1", [entry], null);
  expect(tx.researchFundPayee.count).not.toHaveBeenCalled();
  expect(tx.researchFundJournalEntry.updateMany.mock.calls[0][0].data).toEqual({ payeeId: null, payeeLinkSource: null, payeeLinkConfidence: null, payeeLinkReason: null });
});
test("帳簿と別の議員（別テナント）の支払先は DB でも照合して紐づけない", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.count.mockResolvedValue(0);
  await expect(repository.setPayee("1", [entry], "8")).rejects.toThrow("支払先が見つかりません");
  expect(tx.researchFundJournalEntry.updateMany).not.toHaveBeenCalled();
});
test("支払先の紐づけは1件でも競合したらトランザクションを中止する", async () => {
  const { repository, tx } = setup(0);
  const other = { id: "5", updatedAt: entry.updatedAt } as ReviewEntry;
  await expect(repository.setPayee("1", [entry, other], "7")).rejects.toThrow("再読み込み");
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledTimes(1);
});
const payeeInput = { name: "東京タクシー", postalCode: null, address: "", invoiceRegistrationNumber: null };
test("支払先の作成と紐づけを同じトランザクションで行う", async () => {
  const { repository, tx, transaction } = setup();
  await expect(repository.createPayeeAndSetPayee("1", [entry], "5", payeeInput)).resolves.toEqual({ id: "9", politicianId: "5", ...payeeInput });
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundPayee.create).toHaveBeenCalledWith({ data: { ...payeeInput, politicianId: BigInt(5) } });
  expect(tx.researchFundJournalEntry.updateMany.mock.calls[0][0].data).toEqual({ payeeId: BigInt(9), payeeLinkSource: "manual", payeeLinkConfidence: null, payeeLinkReason: null });
});
test("作成した支払先の紐づけが競合したらトランザクションごと中止し、支払先も残さない", async () => {
  const { repository, tx } = setup(0);
  await expect(repository.createPayeeAndSetPayee("1", [entry], "5", payeeInput)).rejects.toThrow("再読み込み");
  expect(tx.researchFundPayee.create).toHaveBeenCalledTimes(1);
});
test("同じ名称・住所の支払先があれば、登録済みのエラーにして紐づけない", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
  await expect(repository.createPayeeAndSetPayee("1", [entry], "5", payeeInput)).rejects.toThrow("同じ名称・住所の支払先がすでに登録されています");
  expect(tx.researchFundJournalEntry.updateMany).not.toHaveBeenCalled();
});
test("徴し難かった事情を取得する", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findFirst.mockResolvedValue({ ...rowWithLines(), receiptAbsenceReason: "自動券売機で購入" });
  await expect(repository.find("1", entry.id)).resolves.toMatchObject({ receiptAbsenceReason: "自動券売機で購入" });
});
test("徴し難かった事情は公開中・精算済も対象にし、書類の無い支出だけを更新する", async () => {
  const { repository, tx } = setup();
  await repository.setReceiptAbsenceReason("1", entry, "自動券売機で購入");
  const call = tx.researchFundJournalEntry.updateMany.mock.calls[0][0];
  expect(call.where).toEqual(expect.objectContaining({ id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["draft", "approved", "published"] }, updatedAt: new Date(entry.updatedAt), source: { in: ["manual", "scan"] }, documentId: null }));
  expect(call.where).not.toHaveProperty("settledAt");
  expect(call.data).toEqual({ receiptAbsenceReason: "自動券売機で購入" });
  await repository.setReceiptAbsenceReason("1", entry, null);
  expect(tx.researchFundJournalEntry.updateMany.mock.calls[1][0].data).toEqual({ receiptAbsenceReason: null });
});
test("徴し難かった事情は競合したら（書類が付いた場合を含む）変更しない", async () => {
  const { repository } = setup(0);
  await expect(repository.setReceiptAbsenceReason("1", entry, "自動券売機で購入")).rejects.toThrow("再読み込み");
});

test("仕訳を作った読み取りの原文から発行元を添える（古い形式の原文なら null）", async () => {
  const { repository, tx } = setup();
  const job = (rawJson: unknown) => ({ createdAt: new Date("2026-08-01"), model: "m", prompt: { version: 1 }, rawJson });
  const scanned = (rawJson: unknown) => ({ ...rowWithLines(), source: "scan", documentId: BigInt(3), document: { scanJobs: [job(rawJson)] } });
  tx.researchFundJournalEntry.findMany.mockResolvedValue([
    scanned({ date: "2026-08-01", issuer: { name: "JR東日本", address: "東京都渋谷区", phone: null, invoice_registration_number: null }, items: [] }),
    { ...scanned({ date: "2026-08-01", items: [] }), id: BigInt(2) },
  ]);
  const [withIssuer, legacy] = await repository.list("1");
  expect(withIssuer.issuer).toEqual({ name: "JR東日本", address: "東京都渋谷区", phone: null, invoice_registration_number: null });
  expect(legacy.issuer).toBeNull();
});
