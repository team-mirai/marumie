/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { PayeeLinkDialog } from "@/client/components/research-fund/PayeeLinkDialog";
import type { Payee } from "@/server/contexts/research-fund/domain/models/payee";

// アイコンは ESM のみで配布されているので、テストでは空の要素に置き換える
jest.mock(
  "@phosphor-icons/react/dist/ssr",
  () => new Proxy({}, { get: (_, name) => (name === "__esModule" ? false : () => null) }),
);
// 作成フォームはサーバーアクションを読み込むので、検索の初期値だけ見える代役に置き換える
jest.mock("@/client/components/research-fund/PayeeForm", () => ({
  PayeeForm: ({ defaultSearchQuery }: { defaultSearchQuery: string }) => (
    <p>作成フォーム（検索の初期値：{defaultSearchQuery}）</p>
  ),
}));

const payee = (id: string, name: string, address: string, invoice: string | null = null): Payee => ({
  id,
  politicianId: "1",
  name,
  postalCode: null,
  address,
  invoiceRegistrationNumber: invoice,
});

const payees = [
  payee("1", "東京ﾀｸｼｰ", "東京都千代田区千代田1-1", "T1234567890123"),
  payee("2", "東京タクシー株式会社", "東京都港区芝1-1"),
  payee("3", "貸会議室センター", ""),
];

function renderDialog(props: Partial<Parameters<typeof PayeeLinkDialog>[0]> = {}) {
  const onLink = jest.fn();
  const onOpenChange = jest.fn();
  render(
    <PayeeLinkDialog
      open
      onOpenChange={onOpenChange}
      description="「タクシー代」に支払先を紐づけます。"
      payees={payees}
      currentPayeeId={null}
      target={{ politicianId: "1", bookId: "1" }}
      defaultSearchQuery="書類の発行元"
      pending={false}
      onLink={onLink}
      onCreate={jest.fn()}
      {...props}
    />,
  );
  return { onLink, onOpenChange };
}

const search = () => screen.getByRole("combobox", { name: "支払先を検索" });
const options = () => within(screen.getByRole("listbox", { name: "支払先の候補" })).queryAllByRole("option");
const linkButton = () => screen.getByRole("button", { name: "紐づける" });

describe("PayeeLinkDialog", () => {
  it("検索窓の入力で、名前・住所・登録番号のいずれかに一致する候補に絞り込む（全角/半角は区別しない）", () => {
    renderDialog();
    expect(options()).toHaveLength(3);
    fireEvent.change(search(), { target: { value: "タクシー" } });
    expect(options().map((o) => o.textContent)).toEqual([
      expect.stringContaining("東京ﾀｸｼｰ"),
      expect.stringContaining("東京タクシー株式会社"),
    ]);
    fireEvent.change(search(), { target: { value: "港区" } });
    expect(options()).toHaveLength(1);
    fireEvent.change(search(), { target: { value: "t1234567890123" } });
    expect(options()).toHaveLength(1);
    expect(options()[0].textContent).toContain("T1234567890123");
  });

  it("候補をクリックしても選ぶだけで紐づけず、「紐づける」を押したときだけ紐づける", () => {
    const { onLink } = renderDialog();
    expect(linkButton()).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("option", { name: /貸会議室センター/ }));
    expect(onLink).not.toHaveBeenCalled();
    expect(screen.getByRole("option", { name: /貸会議室センター/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText(/紐づけ先：/).textContent).toBe("紐づけ先：貸会議室センター");
    expect(linkButton()).toHaveProperty("disabled", false);
    fireEvent.click(linkButton());
    expect(onLink).toHaveBeenCalledWith("3");
  });

  it("今の支払先と同じ候補を選んでいるときは「紐づける」を押せない", () => {
    renderDialog({ currentPayeeId: "2" });
    fireEvent.click(screen.getByRole("option", { name: /東京タクシー株式会社/ }));
    expect(linkButton()).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("option", { name: /東京ﾀｸｼｰ/ }));
    expect(linkButton()).toHaveProperty("disabled", false);
  });

  it("キーボードで候補を移動・選択でき、検索窓の Enter では紐づけも閉じもしない", () => {
    const { onLink, onOpenChange } = renderDialog();
    fireEvent.keyDown(search(), { key: "ArrowDown" });
    fireEvent.keyDown(search(), { key: "ArrowDown" });
    expect(options()[1].getAttribute("aria-selected")).toBe("true");
    expect(search().getAttribute("aria-activedescendant")).toBe(options()[1].id);
    fireEvent.keyDown(search(), { key: "ArrowUp" });
    expect(options()[0].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(search(), { key: "Enter" });
    expect(onLink).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(linkButton());
    expect(onLink).toHaveBeenCalledWith("1");
  });

  it("今の支払先があるときだけ、候補とは別に「紐づけを外す」を出す", () => {
    const { onLink } = renderDialog({ currentPayeeId: "3" });
    const current = screen.getByRole("region", { name: "現在の支払先" });
    expect(current.textContent).toContain("貸会議室センター");
    expect(within(screen.getByRole("listbox")).queryByRole("button", { name: "紐づけを外す" })).toBeNull();
    fireEvent.click(within(current).getByRole("button", { name: "紐づけを外す" }));
    expect(onLink).toHaveBeenCalledWith(null);
  });

  it("今の支払先が無いときは「紐づけを外す」を出さない", () => {
    renderDialog();
    expect(screen.queryByRole("button", { name: "紐づけを外す" })).toBeNull();
    expect(screen.queryByRole("region", { name: "現在の支払先" })).toBeNull();
  });

  it("一致する候補が無いときは見つからない旨を出し、検索語を初期値にして作成フォームへ進める", () => {
    renderDialog();
    fireEvent.change(search(), { target: { value: "存在しない会社" } });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByText("「存在しない会社」に一致する支払先は見つかりませんでした。")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "新しい支払先を作成して紐づける" }));
    expect(screen.getByText("作成フォーム（検索の初期値：存在しない会社）")).toBeTruthy();
  });

  it("検索語が無いまま作成に進むと、書類の発行元の名前を初期値にする", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "新しい支払先を作成して紐づける" }));
    expect(screen.getByText("作成フォーム（検索の初期値：書類の発行元）")).toBeTruthy();
  });
});
