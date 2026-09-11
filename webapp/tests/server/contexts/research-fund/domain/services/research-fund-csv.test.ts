import type { ResearchFundExpenseView } from "@/server/contexts/research-fund/domain/models/research-fund-page";
import {
  buildResearchFundCsv,
  buildResearchFundCsvFilename,
  RESEARCH_FUND_CSV_HEADERS,
} from "@/server/contexts/research-fund/domain/services/research-fund-csv";

function view(overrides: Partial<ResearchFundExpenseView> = {}): ResearchFundExpenseView {
  return {
    id: "1",
    entryId: "1",
    date: "2026-04-23",
    month: "2026-04",
    description: "タクシー代",
    amount: 1200,
    detailed: { label: "タクシー代", color: "#111111" },
    legal: { label: "⑨ 滞在費", color: "#111111" },
    note: null,
    splitGroup: null,
    hasReceipt: false,
    ...overrides,
  };
}

describe("buildResearchFundCsv", () => {
  it("完了条件の列を順番どおりに出す", () => {
    const [header] = buildResearchFundCsv([]).split("\n");

    expect(header).toBe(
      '"日付","カテゴリー","法定区分","項目","金額","特記事項","分割グループ","領収書"',
    );
    expect(RESEARCH_FUND_CSV_HEADERS).toHaveLength(8);
  });

  it("支出1件を1行に書き出す", () => {
    const csv = buildResearchFundCsv([
      view({
        date: "2026-04-23",
        detailed: { label: "文房具・備品", color: "#111111" },
        legal: { label: "③ 備品・消耗品費", color: "#111111" },
        description: "ボールペン",
        amount: 330,
        note: "同一注文で3点購入",
        splitGroup: "order-1",
        hasReceipt: true,
      }),
    ]);

    expect(csv.split("\n")[1]).toBe(
      '"2026-04-23","文房具・備品","③ 備品・消耗品費","ボールペン","330","同一注文で3点購入","order-1","あり"',
    );
  });

  it("特記事項と分割グループが無ければ空欄にし、領収書の有無を出す", () => {
    const csv = buildResearchFundCsv([view({ note: null, splitGroup: null, hasReceipt: false })]);

    expect(csv.split("\n")[1]).toBe(
      '"2026-04-23","タクシー代","⑨ 滞在費","タクシー代","1200","","","なし"',
    );
  });

  it("ダブルクォートを含む値をエスケープする", () => {
    const csv = buildResearchFundCsv([view({ description: '書籍「"AI"入門」' })]);

    expect(csv).toContain('"書籍「""AI""入門」"');
  });

  it("カンマや改行を含む値でも列がずれない", () => {
    const csv = buildResearchFundCsv([view({ note: "打ち合わせ, 資料作成" })]);

    expect(csv.split("\n")[1]).toContain('"打ち合わせ, 資料作成"');
    // 区切りのカンマだけで数えると列が増えてしまうので、引用の外のカンマは7個のまま
    expect(csv.split("\n")).toHaveLength(2);
  });

  it("渡された順序をそのまま保つ（並べ替えは明細の組み立て側の責務）", () => {
    const csv = buildResearchFundCsv([
      view({ id: "1", description: "先頭" }),
      view({ id: "2", description: "2番目" }),
    ]);

    const rows = csv.split("\n");
    expect(rows[1]).toContain("先頭");
    expect(rows[2]).toContain("2番目");
  });

  it("支出が無ければヘッダーだけを返す", () => {
    expect(buildResearchFundCsv([]).split("\n")).toHaveLength(1);
  });
});

describe("buildResearchFundCsvFilename", () => {
  it("議員の slug と年度からファイル名を作る", () => {
    expect(buildResearchFundCsvFilename("mineshima", 2026)).toBe("research_fund_mineshima_2026.csv");
  });
});
