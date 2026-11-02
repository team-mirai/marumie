/**
 * @jest-environment jsdom
 */
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ExpenditureGroupEntryPicker } from "@/client/components/research-fund/ExpenditureGroupEntryPicker";
import type { LinkCandidate } from "@/server/contexts/research-fund/domain/models/expenditure-group";

// アイコンは ESM のみで配布されているので、テストでは空の要素に置き換える
jest.mock(
  "@phosphor-icons/react/dist/ssr",
  () => new Proxy({}, { get: (_, name) => (name === "__esModule" ? false : () => null) }),
);
// 書類の表示は「仕訳の確認・編集」と同じ部品。サーバーアクションを読み込むので、渡した書類だけ見える代役にする
jest.mock("@/client/components/research-fund/JournalDocumentPreview", () => ({
  JournalDocumentPreview: ({ documentId }: { documentId: string | null }) => (
    <p>書類のプレビュー：{documentId ?? "なし"}</p>
  ),
}));

function candidate(id: string, patch: Partial<LinkCandidate> = {}): LinkCandidate {
  return {
    id,
    entryDate: "2026-05-14",
    description: `明細${id}`,
    amount: 1000,
    groupId: null,
    groupTitle: null,
    payeeName: null,
    accountLabel: "交通費",
    note: "",
    memo: "",
    documentId: null,
    ...patch,
  };
}

const entries = [
  candidate("1", {
    description: "視察先への移動",
    entryDate: "2026-03-01",
    amount: 1200,
    payeeName: "東京タクシー",
    note: "国会図書館への往復",
    documentId: "7",
  }),
  candidate("2", { description: "資料の印刷", entryDate: "2026-05-14", amount: 3000 }),
  candidate("3", { description: "別件の書籍", groupId: "9", groupTitle: "議会質問づくり" }),
];

function Harness({ initial = [] }: { initial?: string[] }) {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(initial);
  return (
    <ExpenditureGroupEntryPicker
      entries={entries}
      groupId={null}
      selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds}
      maskings={{}}
      target={{ politicianId: "1", bookId: "3" }}
      pending={false}
    />
  );
}

function row(description: string) {
  return screen.getAllByRole("listitem").find((item) => item.textContent?.includes(description));
}

test("選んだ仕訳の件数・合計・期間を出し、絞り込みを変えても選択を保つ", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("checkbox", { name: "視察先への移動を紐づける" }));
  fireEvent.change(screen.getByLabelText("仕訳を検索"), { target: { value: "印刷" } });
  expect(row("視察先への移動")).toBeUndefined();
  fireEvent.click(screen.getByRole("checkbox", { name: "資料の印刷を紐づける" }));
  fireEvent.change(screen.getByLabelText("仕訳を検索"), { target: { value: "" } });
  expect(screen.getByRole("checkbox", { name: "視察先への移動を紐づける" }).getAttribute("aria-checked")).toBe("true");
  const summary = screen.getByRole("status", { name: "紐づけの集計" });
  expect(summary?.textContent).toContain("¥4,200");
  expect(summary?.textContent).toContain("2件");
  expect(summary?.textContent).toContain("2026.03.01 〜 05.14");
});

test("他の支出群に紐づいた仕訳は、どの支出群かを示して選べなくする", () => {
  render(<Harness />);
  expect((screen.getByRole("checkbox", { name: "別件の書籍を紐づける" }) as HTMLButtonElement).disabled).toBe(true);
  expect(row("別件の書籍")?.textContent).toContain("「議会質問づくり」に紐づけ済み");
});

test("行を押すと、支払先・特記事項・書類を詳細に出し、そこからも紐づけられる", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "視察先への移動の詳細を表示" }));
  const detail = screen.getByRole("complementary", { name: "仕訳の詳細" });
  expect(detail?.textContent).toContain("東京タクシー");
  expect(detail?.textContent).toContain("国会図書館への往復");
  expect(detail?.textContent).toContain("書類のプレビュー：7");
  fireEvent.click(within(detail).getByRole("button", { name: "この仕訳を紐づける" }));
  expect(screen.getByRole("checkbox", { name: "視察先への移動を紐づける" }).getAttribute("aria-checked")).toBe("true");
});

test("表示中をすべて選ぶと、絞り込んだ中の選べる仕訳だけを選ぶ", () => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("金額の上限"), { target: { value: "1500" } });
  fireEvent.click(screen.getByRole("button", { name: "表示中をすべて選ぶ" }));
  fireEvent.change(screen.getByLabelText("金額の上限"), { target: { value: "" } });
  expect(screen.getByRole("checkbox", { name: "視察先への移動を紐づける" }).getAttribute("aria-checked")).toBe("true");
  expect(screen.getByRole("checkbox", { name: "資料の印刷を紐づける" }).getAttribute("aria-checked")).toBe("false");
  expect(screen.getByRole("checkbox", { name: "別件の書籍を紐づける" }).getAttribute("aria-checked")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "表示中の選択を外す" }));
  expect(screen.getByRole("checkbox", { name: "視察先への移動を紐づける" }).getAttribute("aria-checked")).toBe("false");
});
