/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { JournalLegalCategoryOverrideField } from "@/client/components/research-fund/JournalLegalCategoryOverrideField";
import { JournalPublicFields } from "@/client/components/research-fund/JournalPublicFields";
import type {
  ReviewAccount,
  ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";

// アイコンは ESM のみで配布されているので、テストでは空の要素に置き換える
jest.mock(
  "@phosphor-icons/react/dist/ssr",
  () => new Proxy({}, { get: (_, name) => (name === "__esModule" ? false : () => null) }),
);

const accounts: ReviewAccount[] = [
  { key: "ai-tools", label: "AIツール", type: "expense", legalCategoryKey: "office", legalLabel: "④ 事務所費" },
  { key: "books", label: "書籍", type: "expense", legalCategoryKey: "research", legalLabel: "⑦ 調査研究費" },
  { key: "lodging", label: "宿泊費", type: "expense", legalCategoryKey: "stay", legalLabel: "⑨ 滞在費" },
  { key: "needs-review", label: "要確認", type: "expense", legalCategoryKey: null, legalLabel: null },
];
const override = { key: "research", label: "⑦ 調査研究費", reason: "提出済みの報告書に合わせる" };

const base: ReviewEntry = {
  id: "1",
  entryDate: "2025-08-01",
  description: "AIツール利用料",
  amount: 3000,
  accountKey: "ai-tools",
  note: "",
  memo: "",
  source: "manual",
  documentId: null,
  splitGroup: null,
  status: "approved",
  updatedAt: "2025-08-01T00:00:00.000Z",
  model: null,
  promptVersion: null,
  advancedBy: null,
  settledAt: null,
  payeeId: null,
  payeeLinkSource: null,
  receiptAbsent: false,
  receiptAbsenceReason: null,
  receiptNumber: null,
  issuer: null,
  legalCategoryOverride: null,
};

function renderField(entry: Partial<ReviewEntry> = {}, allowed = true) {
  const onSave = jest.fn();
  render(
    <JournalLegalCategoryOverrideField
      entry={{ ...base, ...entry }}
      accounts={accounts}
      allowed={allowed}
      pending={false}
      onSave={onSave}
    />,
  );
  return { onSave };
}

describe("JournalLegalCategoryOverrideField（#1880）", () => {
  it("上書き中の仕訳では、上書き中であること・指定した区分・科目の既定・理由を見せる", () => {
    renderField({ legalCategoryOverride: { key: "research", label: "⑦ 調査研究費", reason: "提出済みの報告書に合わせる" } });

    expect(screen.getByText("上書き中")).toBeTruthy();
    expect(screen.getByText("⑦ 調査研究費")).toBeTruthy();
    expect(screen.getByText("科目の既定：④ 事務所費")).toBeTruthy();
    expect(screen.getByText("理由：提出済みの報告書に合わせる")).toBeTruthy();
  });

  it("区分と理由を指定して保存する。選択肢に科目の既定の区分は出さない", () => {
    const { onSave } = renderField();
    fireEvent.click(screen.getByRole("button", { name: "法定区分を上書きする" }));

    const select = screen.getByLabelText("区分の上書き");
    expect(screen.queryByRole("option", { name: "④ 事務所費" })).toBeNull();
    const save = screen.getByRole("button", { name: "上書きを保存" });
    fireEvent.change(select, { target: { value: "research" } });
    // 理由が無ければ保存できない
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("上書きの理由"), { target: { value: "提出済みの報告書に合わせる" } });
    fireEvent.click(save);

    expect(onSave).toHaveBeenCalledWith({ legalCategoryKey: "research", reason: "提出済みの報告書に合わせる" });
  });

  it("上書きを外す", () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const { onSave } = renderField({ legalCategoryOverride: { key: "research", label: "⑦ 調査研究費", reason: "理由" } });

    fireEvent.click(screen.getByRole("button", { name: "外す" }));

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it("公開中の仕訳では操作を出さず、変更できない理由を見せる", () => {
    renderField({ status: "published", legalCategoryOverride: { key: "research", label: "⑦ 調査研究費", reason: "理由" } });

    expect(screen.queryByRole("button", { name: "法定区分の上書きを編集" })).toBeNull();
    expect(screen.queryByRole("button", { name: "外す" })).toBeNull();
    expect(screen.getByText(/公開中の仕訳の法定区分は変更できません/)).toBeTruthy();
  });

  it("上書きが許可されていない帳簿では操作を出さない", () => {
    renderField({}, false);

    expect(screen.queryByRole("button", { name: "法定区分を上書きする" })).toBeNull();
  });
});

describe("JournalLegalCategoryOverrideField の編集（#1880）", () => {
  it("上書き中の区分と理由を初期値にして開き、変えなければ保存できない。キャンセルで閉じる", () => {
    const { onSave } = renderField({ legalCategoryOverride: override });
    fireEvent.click(screen.getByRole("button", { name: "法定区分の上書きを編集" }));

    expect((screen.getByLabelText("区分の上書き") as HTMLSelectElement).value).toBe("research");
    expect((screen.getByLabelText("上書きの理由") as HTMLTextAreaElement).value).toBe(override.reason);
    expect((screen.getByRole("button", { name: "上書きを保存" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("区分の上書き"), { target: { value: "stay" } });
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(screen.queryByLabelText("区分の上書き")).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("外す確認でキャンセルしたら外さない", () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const { onSave } = renderField({ legalCategoryOverride: override });

    fireEvent.click(screen.getByRole("button", { name: "外す" }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("法定区分を持たない科目（要確認）の仕訳は上書きできず、科目の確定を促す", () => {
    renderField({ accountKey: "needs-review", status: "draft" });

    expect(screen.queryByRole("button", { name: "法定区分を上書きする" })).toBeNull();
    expect(screen.getByText(/科目を確定すると上書きできます/)).toBeTruthy();
  });

  it("公開中で上書きの無い仕訳は、変更できない理由を添える", () => {
    renderField({ status: "published" });

    expect(screen.getByText(/公開中の仕訳の法定区分は変更できません/)).toBeTruthy();
  });
});

describe("JournalPublicFields の法律上の区分（#1880）", () => {
  function renderPublicFields(entry: Partial<ReviewEntry>, readOnly: boolean) {
    const full = { ...base, ...entry };
    render(
      <JournalPublicFields
        fieldId="f"
        entry={full}
        input={full}
        accounts={accounts}
        year={2025}
        readOnly={readOnly}
        onChange={jest.fn()}
      />,
    );
  }

  it.each([true, false])("上書き中の仕訳は、上書きした区分に「上書き中」を添える（readOnly: %s）", (readOnly) => {
    renderPublicFields({ legalCategoryOverride: override }, readOnly);

    expect(screen.getByText(/法律上の区分：⑦ 調査研究費/)).toBeTruthy();
    expect(screen.getByText("（上書き中）")).toBeTruthy();
  });

  it("上書きの無い仕訳は科目の既定の区分を出す", () => {
    renderPublicFields({}, true);

    expect(screen.getByText(/法律上の区分：④ 事務所費/)).toBeTruthy();
    expect(screen.queryByText("（上書き中）")).toBeNull();
  });
});
