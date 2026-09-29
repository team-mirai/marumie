import { buildResearchFundDataNote } from "@/server/contexts/research-fund/domain/services/research-fund-data-note";

const monthly = Array.from({ length: 12 }, (_, index) => {
  const month = `2026-${String(index + 1).padStart(2, "0")}`;
  const granted = index >= 1 && index <= 7 ? 1_000_000 : 0;
  return { month, granted, spent: 0, published: granted > 0 };
});

function source(overrides: Partial<Parameters<typeof buildResearchFundDataNote>[0]> = {}) {
  return {
    dataNote: null,
    nextUpdateNote: "11月ごろ",
    monthly,
    unused: 4_790_000,
    ...overrides,
  };
}

describe("buildResearchFundDataNote", () => {
  it("説明文が無ければ掲載範囲・次回更新・未使用額をデータから埋めた既定文にする", () => {
    expect(buildResearchFundDataNote(source())).toBe(
      "2026年2月の当選以降、仕訳が完了した支出を掲載しています。費目は使途等報告書で定められた法律上の区分に加えて、チームみらい独自の詳細区分で表示することができます。現時点では峰島侑也議員事務所のみの試験公開ですが、今後他の所属議員の調研費も公開予定です。更新は不定期で、次回は11月ごろの予定です。使わなかった分（7ヶ月分で479万円）は年末時点で確定し、国庫に返還します。",
    );
  });

  it("帳簿の説明文があれば掲載範囲と分類の説明をそれに置き換える", () => {
    expect(buildResearchFundDataNote(source({ dataNote: "独自の説明です。" }))).toBe(
      "独自の説明です。更新は不定期で、次回は11月ごろの予定です。使わなかった分（7ヶ月分で479万円）は年末時点で確定し、国庫に返還します。",
    );
  });

  it("次回更新が未定・支給月が無い場合はその部分を省く", () => {
    const note = buildResearchFundDataNote(
      source({
        nextUpdateNote: null,
        monthly: monthly.map((month) => ({ ...month, granted: 0 })),
        unused: 0,
      }),
    );
    expect(note).toBe(
      "仕訳が完了した支出を掲載しています。費目は使途等報告書で定められた法律上の区分に加えて、チームみらい独自の詳細区分で表示することができます。現時点では峰島侑也議員事務所のみの試験公開ですが、今後他の所属議員の調研費も公開予定です。更新は不定期です。使わなかった分（0万円）は年末時点で確定し、国庫に返還します。",
    );
  });
});
