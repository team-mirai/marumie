import type {
  PublishedAccount,
  PublishedExpense,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import {
  buildResearchFundCsv,
  researchFundCsvFilename,
} from "@/server/contexts/research-fund/domain/services/research-fund-csv";

const accounts: Record<string, PublishedAccount> = {
  taxi: { label: "タクシー代", legalLabel: "⑨ 滞在費", legalCategoryKey: "stay" },
  "stationery-supplies": {
    label: "文房具・備品",
    legalLabel: "③ 備品・消耗品費",
    legalCategoryKey: "equipment-supplies",
  },
};

function expense(overrides: Partial<PublishedExpense> = {}): PublishedExpense {
  return {
    id: "1",
    entryId: "1",
    date: "2026-04-23",
    accountKey: "taxi",
    description: "タクシー代",
    amount: 1200,
    note: null,
    splitGroup: null,
    hasReceipt: false,
    ...overrides,
  };
}

function lines(csv: string): string[] {
  return csv.split("\n");
}

describe("buildResearchFundCsv", () => {
  it("ヘッダーと1行分の値を出す", () => {
    const csv = buildResearchFundCsv({
      accounts,
      expenses: [expense({ note: "会派で按分", splitGroup: "order-1", hasReceipt: true })],
    });

    expect(lines(csv)[0]).toBe(
      '"日付","カテゴリー","法定区分","項目","金額","特記事項","分割グループ","領収書"',
    );
    expect(lines(csv)[1]).toBe(
      '"2026-04-23","タクシー代","⑨ 滞在費","タクシー代","1200","会派で按分","order-1","あり"',
    );
  });

  it("特記事項・分割グループが無ければ空欄、領収書が無ければ「なし」", () => {
    const csv = buildResearchFundCsv({ accounts, expenses: [expense({ note: "   " })] });

    expect(lines(csv)[1]).toBe(
      '"2026-04-23","タクシー代","⑨ 滞在費","タクシー代","1200","","","なし"',
    );
  });

  it("値に含まれる引用符を2つ重ねて表す", () => {
    const csv = buildResearchFundCsv({
      accounts,
      expenses: [expense({ description: '書籍「"AI"入門」, 上巻' })],
    });

    expect(lines(csv)[1]).toContain('"書籍「""AI""入門」, 上巻"');
    // 引用符で囲んでいるので、値の中のカンマで列がずれない。
    expect(lines(csv)[1].split('","')).toHaveLength(8);
  });

  it("画面（B-4）と同じ並び順（日付の新しい順・同一注文はまとめる）で出す", () => {
    const csv = buildResearchFundCsv({
      accounts,
      expenses: [
        expense({ id: "10", date: "2026-04-01", splitGroup: "order-1" }),
        expense({ id: "11", date: "2026-04-01" }),
        expense({ id: "12", date: "2026-04-01", splitGroup: "order-1" }),
        expense({ id: "13", date: "2026-05-01" }),
      ],
    });

    expect(lines(csv).slice(1).map((line) => line.split(",")[0])).toEqual([
      '"2026-05-01"',
      '"2026-04-01"',
      '"2026-04-01"',
      '"2026-04-01"',
    ]);
  });

  it("科目マスタに無い科目でも行を落とさない", () => {
    const csv = buildResearchFundCsv({ accounts, expenses: [expense({ accountKey: "unknown" })] });

    expect(lines(csv)[1]).toContain('"その他","その他"');
  });

  it("公開中の支出が無ければヘッダーだけを出す", () => {
    expect(lines(buildResearchFundCsv({ accounts, expenses: [] }))).toHaveLength(1);
  });
});

describe("researchFundCsvFilename", () => {
  it("既存の取引 CSV に合わせて slug と日付を含める", () => {
    expect(researchFundCsvFilename("sample-taro", 2026, new Date("2026-09-11T02:00:00Z"))).toBe(
      "research_fund_sample-taro_2026_2026-09-11.csv",
    );
  });

  it("ファイル名に使えない文字を落とす", () => {
    expect(researchFundCsvFilename('a"; b', 2026, new Date("2026-09-11T02:00:00Z"))).toBe(
      "research_fund_a---b_2026_2026-09-11.csv",
    );
  });
});
