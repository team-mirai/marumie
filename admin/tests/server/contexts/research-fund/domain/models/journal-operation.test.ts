import { JournalOperation, type OperableEntry } from "@/server/contexts/research-fund/domain/models/journal-operation";

const base: OperableEntry = { id: "1", description: "タクシー代", source: "manual", status: "draft", advancedBy: null, settledAt: null, entryDate: "2026-08-01", amount: 1200 };
const operations = ["edit", "approve", "revertToDraft", "discard", "unpublish", "setAdvancedBy", "settle", "unsettle"] as const;
type Operation = (typeof operations)[number];
function judge(operation: Operation, entry: OperableEntry) {
  return operation === "edit" ? JournalOperation.edit(entry, entry.amount) : JournalOperation[operation](entry);
}

// 仕訳の状態ごとに、受け付ける操作の一覧（可否表）。表に無い操作は受け付けない。
const table: [string, Partial<OperableEntry>, Operation[]][] = [
  ["下書きの支出", {}, ["edit", "approve", "discard", "setAdvancedBy"]],
  ["確認済の支出", { status: "approved" }, ["edit", "revertToDraft", "discard", "setAdvancedBy"]],
  ["公開中の支出", { status: "published" }, ["unpublish", "setAdvancedBy"]],
  ["下書きの未精算の立替", { advancedBy: "秘書A" }, ["edit", "approve", "discard", "setAdvancedBy"]],
  ["確認済の未精算の立替", { status: "approved", advancedBy: "秘書A" }, ["edit", "revertToDraft", "discard", "setAdvancedBy", "settle"]],
  ["公開中の未精算の立替", { status: "published", advancedBy: "秘書A" }, ["unpublish", "setAdvancedBy", "settle"]],
  ["確認済の精算済の立替", { status: "approved", advancedBy: "秘書A", settledAt: "2026-09-01" }, ["edit", "unsettle"]],
  ["公開中の精算済の立替", { status: "published", advancedBy: "秘書A", settledAt: "2026-09-01" }, ["unpublish", "unsettle"]],
  ["スキャンの下書き", { source: "scan" }, ["edit", "approve", "discard", "setAdvancedBy"]],
  ["確認済の支給", { source: "grant", status: "approved" }, ["edit"]],
  ["公開中の支給", { source: "grant", status: "published" }, ["unpublish"]],
];
describe.each(table)("%s", (_, overrides, allowed) => {
  const entry = { ...base, ...overrides };
  it.each(operations)("%s", operation => {
    const rejection = judge(operation, entry);
    if (allowed.includes(operation)) expect(rejection).toBeNull();
    else {
      expect(rejection).toEqual({ one: expect.any(String), many: expect.any(String) });
      expect(rejection?.one).not.toBe("");
    }
  });
});

describe("却下理由", () => {
  const published = { ...base, status: "published" as const };
  const settled = { ...base, status: "approved" as const, advancedBy: "秘書A", settledAt: "2026-09-01" };
  const grant = { ...base, source: "grant" as const, status: "approved" as const };
  it.each([
    ["edit", published, "公開中の仕訳は編集・破棄できません", "「タクシー代」は公開中です"],
    ["approve", published, "公開中の仕訳は編集・破棄できません", "「タクシー代」は公開中です"],
    ["discard", published, "公開中の仕訳は編集・破棄できません", "「タクシー代」は公開中です"],
    ["revertToDraft", published, "確認済の仕訳だけを下書きに戻せます", "「タクシー代」は公開中です"],
    ["revertToDraft", base, "確認済の仕訳だけを下書きに戻せます", "「タクシー代」は確認済ではありません"],
    ["approve", { ...base, status: "approved" as const }, "仕訳は下書きと確認済みの間、確認済みから公開済み、公開済みから確認済みへのみ変更できます", "「タクシー代」は下書きではありません"],
    ["unpublish", base, "公開中の仕訳だけを確認済に戻せます", "「タクシー代」は公開中ではありません"],
    ["revertToDraft", settled, "精算済の仕訳は下書きに戻せません。先に未精算に戻してください", "「タクシー代」は精算済です（先に未精算に戻してください）"],
    ["discard", settled, "精算済の仕訳は破棄できません。先に未精算に戻してください", "「タクシー代」は精算済です（先に未精算に戻してください）"],
    ["setAdvancedBy", settled, "精算済の仕訳は立替者を変更できません。先に未精算に戻してください", "「タクシー代」は精算済です（先に未精算に戻してください）"],
    ["settle", settled, "「タクシー代」はすでに精算済です", "「タクシー代」はすでに精算済です"],
    ["settle", { ...base, status: "approved" as const }, "「タクシー代」は立替ではありません", "「タクシー代」は立替ではありません"],
    ["unsettle", { ...base, advancedBy: "秘書A" }, "精算済の仕訳だけを未精算に戻せます", "「タクシー代」は未精算です"],
    ["approve", grant, "支給はすでに確認済です", "この画面で扱えない仕訳が選ばれています"],
    ["revertToDraft", grant, "支給は下書きに戻せません", "この画面で扱えない仕訳が選ばれています"],
    ["discard", grant, "支給は破棄できません", "この画面で扱えない仕訳が選ばれています"],
    ["setAdvancedBy", grant, "支給には立替者を設定できません", "立替者を設定できない仕訳（支給・返還など）が選ばれています"],
    ["settle", grant, "支給は精算できません", "精算できない仕訳（支給・返還など）が選ばれています"],
  ] as const)("%s: %j", (operation, entry, one, many) => {
    expect(judge(operation, entry)).toEqual({ one, many });
  });
});

describe("JournalOperation.edit", () => {
  const settled = { ...base, status: "approved" as const, advancedBy: "秘書A", settledAt: "2026-09-01" };
  it("精算済の仕訳は金額を変えなければ編集できる", () => {
    expect(JournalOperation.edit(settled, 1200)).toBeNull();
  });
  it("精算済の仕訳は金額を変更できない", () => {
    expect(JournalOperation.edit(settled, 1500)?.one).toBe("精算済の仕訳は金額を変更できません。先に未精算に戻してください");
  });
  it("未精算の仕訳は金額を変更できる", () => {
    expect(JournalOperation.edit({ ...settled, settledAt: null }, 1500)).toBeNull();
  });
});
