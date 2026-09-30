import { buildResearchFundDataNote } from "@/server/contexts/research-fund/domain/services/research-fund-data-note";

const monthly = Array.from({ length: 12 }, (_, index) => {
  const month = `2026-${String(index + 1).padStart(2, "0")}`;
  const granted = index >= 1 && index <= 7 ? 1_000_000 : 0;
  return { month, granted, spent: 0, published: granted > 0 };
});

function source(overrides: Partial<Parameters<typeof buildResearchFundDataNote>[0]> = {}) {
  return {
    dataNote: null,
    monthly,
    ...overrides,
  };
}

describe("buildResearchFundDataNote", () => {
  it("説明文が無ければ最初の支給月から掲載範囲を埋めた既定文にする", () => {
    expect(buildResearchFundDataNote(source())).toBe(
      "2026年2月の当選以降、仕訳が完了した支出を掲載しています。費目は使途等報告書で定められた法律上の区分に加えて、チームみらい独自の詳細区分で表示することができます。現時点では峰島侑也議員事務所のみの試験公開ですが、今後他の所属議員の調研費も公開予定です。",
    );
  });

  it("帳簿の説明文があればそれをそのまま使う", () => {
    expect(buildResearchFundDataNote(source({ dataNote: "独自の説明です。" }))).toBe(
      "独自の説明です。",
    );
  });

  it("支給月が無い場合は当選以降の部分を省く", () => {
    const note = buildResearchFundDataNote(
      source({ monthly: monthly.map((month) => ({ ...month, granted: 0 })) }),
    );
    expect(note).toBe(
      "仕訳が完了した支出を掲載しています。費目は使途等報告書で定められた法律上の区分に加えて、チームみらい独自の詳細区分で表示することができます。現時点では峰島侑也議員事務所のみの試験公開ですが、今後他の所属議員の調研費も公開予定です。",
    );
  });
});
