import { serializePersonalDonationSection } from "@/server/contexts/report/domain/services/donation-serializer";
import type { PersonalDonationSection } from "@/server/contexts/report/domain/services/donation-converter";

describe("serializePersonalDonationSection", () => {
  it("serializes section into XML format", () => {
    const section: PersonalDonationSection = {
      totalAmount: 100000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "山田太郎",
          kingaku: 100000,
          dt: new Date("2024-06-15"),
          adr: "東京都渋谷区代々木1-1-1",
          syokugyo: "会社員",
          bikou: "寄附金受領 / MF行番号: 1",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };

    const xmlBuilder = serializePersonalDonationSection(section);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<SYUUSHI07_07>");
    expect(xml).toContain("<KUBUN1>");
    expect(xml).toContain("<KINGAKU_GK>100000</KINGAKU_GK>");
    expect(xml).toContain("<KIFUSYA_NM>山田太郎</KIFUSYA_NM>");
    expect(xml).toContain("<KINGAKU>100000</KINGAKU>");
    expect(xml).toContain("<ADR>東京都渋谷区代々木1-1-1</ADR>");
    expect(xml).toContain("<SYOKUGYO>会社員</SYOKUGYO>");
    expect(xml).toContain("<ZEIGAKUKOUJYO>0</ZEIGAKUKOUJYO>");
    expect(xml).toContain("<ROWKBN>0</ROWKBN>");
  });

  it("escapes special XML characters", () => {
    const section: PersonalDonationSection = {
      totalAmount: 50000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "田中 & 鈴木",
          kingaku: 50000,
          dt: new Date("2024-07-01"),
          adr: "<住所>テスト",
          syokugyo: "自営業",
          bikou: "備考メモ",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };

    const xmlBuilder = serializePersonalDonationSection(section);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("&amp;");
    expect(xml).toContain("&lt;住所&gt;");
  });

  it("serializes empty bikou as self-closing tag", () => {
    const section: PersonalDonationSection = {
      totalAmount: 30000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "佐藤花子",
          kingaku: 30000,
          dt: new Date("2024-08-01"),
          adr: "大阪府大阪市",
          syokugyo: "主婦",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };

    const xmlBuilder = serializePersonalDonationSection(section);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<BIKOU/>");
  });

  it("serializes empty section", () => {
    const section: PersonalDonationSection = {
      totalAmount: 0,
      sonotaGk: 0,
      rows: [],
    };

    const xmlBuilder = serializePersonalDonationSection(section);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<SYUUSHI07_07>");
    expect(xml).toContain("<KINGAKU_GK>0</KINGAKU_GK>");
    expect(xml).not.toContain("<ROW>");
  });
});
