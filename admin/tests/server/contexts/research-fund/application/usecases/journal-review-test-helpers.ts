import type { JournalEdit, ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";

/** 仕訳の確認画面の usecase のテストで共有する入力・仕訳とモック */
export const input: JournalEdit = { entryDate: "2026-08-01", description: "視察の移動", amount: 1200, accountKey: "taxi", note: "公開メモ", memo: "内部メモ" };
export const entry: ReviewEntry = { ...input, id: "2", source: "scan", documentId: "3", splitGroup: "group", status: "draft", updatedAt: "2026-08-01T12:00:00.000Z", model: "test-model", promptVersion: 1, advancedBy: null, settledAt: null, payeeId: null, payeeLinkSource: null, receiptAbsenceReason: null, issuer: null };
export const grantInput: JournalEdit = { entryDate: "2026-08-01", description: "調査研究広報滞在費 8月分", amount: 1_000_000, accountKey: "grant-income", note: "", memo: "" };
export const grant = { ...grantInput, source: "grant" as const, documentId: null, splitGroup: null, status: "approved" as const, model: null, promptVersion: null };
export const target = { id: entry.id, updatedAt: entry.updatedAt };
// 立替者と精算（事務所内の管理情報。公開内容は変えない）
export const advanced = { ...entry, status: "approved" as const, advancedBy: "秘書A" };
export const settled = { ...advanced, settledAt: "2026-09-01" };

export function setup(overrides: Partial<ReviewEntry> = {}) {
  const repository = { list: jest.fn().mockResolvedValue([entry]), find: jest.fn().mockResolvedValue({ ...entry, ...overrides }), findMany: jest.fn().mockResolvedValue([{ ...entry, ...overrides }]), approveMany: jest.fn(), discardMany: jest.fn(), revertManyToDraft: jest.fn(), unpublish: jest.fn(), revertToDraft: jest.fn(), accounts: jest.fn().mockResolvedValue([{ key: "taxi", label: "タクシー代", type: "expense" }, { key: "needs-review", label: "要確認", type: "expense" }, { key: "bank", label: "普通預金", type: "asset" }, { key: "grant-income", label: "調査研究費収入", type: "income" }]), year: jest.fn().mockResolvedValue(2026), termStart: jest.fn().mockResolvedValue("2026-07-15"), create: jest.fn().mockResolvedValue("10"), update: jest.fn(), discard: jest.fn(), advancers: jest.fn().mockResolvedValue(["秘書A"]), setAdvancedBy: jest.fn(), politicianId: jest.fn().mockResolvedValue("5"), setPayee: jest.fn(), setReceiptAbsenceReason: jest.fn(), createPayeeAndSetPayee: jest.fn(), settleMany: jest.fn(), unsettleMany: jest.fn() };
  const cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  return { repository, cacheInvalidator };
}
