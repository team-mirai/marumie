/**
 * @jest-environment node
 */
import { serializeGrantExpenditure } from "@/server/contexts/report/domain/services/grant-expenditure-serializer";
import type { GrantExpenditureSection } from "@/server/contexts/report/domain/models/grant-expenditure";

describe("serializeGrantExpenditure", () => {
  it("空のセクションでSYUUSHI07_16要素を生成する", () => {
    const section: GrantExpenditureSection = {
      totalAmount: 0,
      rows: [],
    };

    const result = serializeGrantExpenditure(section);
    const xml = result.toString();

    expect(xml).toContain("<SYUUSHI07_16>");
    expect(xml).toContain("<SHEET>");
    expect(xml).toContain("<KINGAKU_GK>0</KINGAKU_GK>");
    expect(xml).toContain("</SHEET>");
    expect(xml).toContain("</SYUUSHI07_16>");
  });

  it("総額を正しくフォーマットする", () => {
    const section: GrantExpenditureSection = {
      totalAmount: 1234567,
      rows: [],
    };

    const result = serializeGrantExpenditure(section);
    const xml = result.toString();

    expect(xml).toContain("<KINGAKU_GK>1234567</KINGAKU_GK>");
  });

  it("明細行を正しくシリアライズする", () => {
    const section: GrantExpenditureSection = {
      totalAmount: 100000,
      rows: [
        {
          ichirenNo: "1",
          shisyutuKmk: "光熱水費",
          kingaku: 100000,
          dt: new Date("2024-06-15"),
          honsibuNm: "テスト支部",
          jimuAdr: "東京都千代田区",
          bikou: "テスト備考",
        },
      ],
    };

    const result = serializeGrantExpenditure(section);
    const xml = result.toString();

    expect(xml).toContain("<ROW>");
    expect(xml).toContain("<ICHIREN_NO>1</ICHIREN_NO>");
    expect(xml).toContain("<SHISYUTU_KMK>光熱水費</SHISYUTU_KMK>");
    expect(xml).toContain("<KINGAKU>100000</KINGAKU>");
    expect(xml).toContain("<DT>R6/6/15</DT>");
    expect(xml).toContain("<HONSIBU_NM>テスト支部</HONSIBU_NM>");
    expect(xml).toContain("<JIMU_ADR>東京都千代田区</JIMU_ADR>");
    expect(xml).toContain("<BIKOU>テスト備考</BIKOU>");
    expect(xml).toContain("</ROW>");
  });

  it("備考がない場合は空のBIKOU要素を出力する", () => {
    const section: GrantExpenditureSection = {
      totalAmount: 50000,
      rows: [
        {
          ichirenNo: "1",
          shisyutuKmk: "事務所費",
          kingaku: 50000,
          dt: new Date("2024-07-01"),
          honsibuNm: "本部",
          jimuAdr: "大阪府大阪市",
        },
      ],
    };

    const result = serializeGrantExpenditure(section);
    const xml = result.toString();

    expect(xml).toContain("<BIKOU/>");
  });

  it("複数の明細行を正しくシリアライズする", () => {
    const section: GrantExpenditureSection = {
      totalAmount: 180000,
      rows: [
        {
          ichirenNo: "1",
          shisyutuKmk: "光熱水費",
          kingaku: 80000,
          dt: new Date("2024-06-01"),
          honsibuNm: "支部A",
          jimuAdr: "東京都",
        },
        {
          ichirenNo: "2",
          shisyutuKmk: "備品・消耗品費",
          kingaku: 100000,
          dt: new Date("2024-06-15"),
          honsibuNm: "支部B",
          jimuAdr: "神奈川県",
          bikou: "備考あり",
        },
      ],
    };

    const result = serializeGrantExpenditure(section);
    const xml = result.toString();

    expect(xml).toContain("<KINGAKU_GK>180000</KINGAKU_GK>");
    expect(xml).toContain("<ICHIREN_NO>1</ICHIREN_NO>");
    expect(xml).toContain("<ICHIREN_NO>2</ICHIREN_NO>");
    expect(xml).toContain("<SHISYUTU_KMK>光熱水費</SHISYUTU_KMK>");
    expect(xml).toContain("<SHISYUTU_KMK>備品・消耗品費</SHISYUTU_KMK>");
  });

  it("和暦日付を正しくフォーマットする（令和）", () => {
    const section: GrantExpenditureSection = {
      totalAmount: 50000,
      rows: [
        {
          ichirenNo: "1",
          shisyutuKmk: "組織活動費",
          kingaku: 50000,
          dt: new Date("2024-01-15"),
          honsibuNm: "テスト",
          jimuAdr: "東京都",
        },
      ],
    };

    const result = serializeGrantExpenditure(section);
    const xml = result.toString();

    expect(xml).toContain("<DT>R6/1/15</DT>");
  });
});
