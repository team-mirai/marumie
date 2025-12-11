import { serializeOtherIncomeSection } from "@/server/domain/serializers/income-serializer";
import type { OtherIncomeSection } from "@/server/domain/converters/income-converter";

describe("serializeOtherIncomeSection", () => {
  it("serializes section into XML with escaping", () => {
    const section: OtherIncomeSection = {
      totalAmount: 200_000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          tekiyou: "テスト & サンプル",
          kingaku: 200_000,
          bikou: "<memo>",
        },
      ],
    };

    const xmlBuilder = serializeOtherIncomeSection(section);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<SYUUSHI07_06>");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&lt;memo&gt;");
    expect(xml).toContain("<MIMAN_GK/>");
  });

  it("serializes section with underThresholdAmount", () => {
    const section: OtherIncomeSection = {
      totalAmount: 300_000,
      underThresholdAmount: 50_000,
      rows: [
        {
          ichirenNo: "1",
          tekiyou: "テスト収入",
          kingaku: 250_000,
        },
      ],
    };

    const xmlBuilder = serializeOtherIncomeSection(section);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<KINGAKU_GK>300000</KINGAKU_GK>");
    expect(xml).toContain("<MIMAN_GK>50000</MIMAN_GK>");
    expect(xml).toContain("<TEKIYOU>テスト収入</TEKIYOU>");
    expect(xml).toContain("<KINGAKU>250000</KINGAKU>");
  });

  it("serializes empty bikou as self-closing tag", () => {
    const section: OtherIncomeSection = {
      totalAmount: 100_000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          tekiyou: "テスト",
          kingaku: 100_000,
        },
      ],
    };

    const xmlBuilder = serializeOtherIncomeSection(section);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<BIKOU/>");
  });
});

