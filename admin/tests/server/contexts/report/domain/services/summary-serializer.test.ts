import { serializeSummarySection } from "@/server/contexts/report/domain/services/summary-serializer";
import type { SummaryData } from "@/server/contexts/report/domain/models/summary-data";

describe("serializeSummarySection", () => {
  it("serializes basic summary data into XML format", () => {
    const summary: SummaryData = {
      syunyuSgk: 1000000,
      zennenKksGk: 100000,
      honnenSyunyuGk: 900000,
      sisyutuSgk: 500000,
      yokunenKksGk: 500000,
      kojinFutanKgk: null,
      kojinFutanSu: null,
      kojinKifuGk: 200000,
      kojinKifuBikou: null,
      tokuteiKifuGk: null,
      tokuteiKifuBikou: null,
      hojinKifuGk: null,
      hojinKifuBikou: null,
      seijiKifuGk: null,
      seijiKifuBikou: null,
      kifuSkeiGk: 200000,
      kifuSkeiBikou: null,
      atusenGk: null,
      atusenBikou: null,
      tokumeiKifuGk: null,
      tokumeiBikou: null,
      kifuGkeiGk: 200000,
      kifuGkeiBikou: null,
    };

    const xmlBuilder = serializeSummarySection(summary);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<SYUUSHI07_02>");
    expect(xml).toContain("<SHEET>");
    expect(xml).toContain("<SYUNYU_SGK>1000000</SYUNYU_SGK>");
    expect(xml).toContain("<ZENNEN_KKS_GK>100000</ZENNEN_KKS_GK>");
    expect(xml).toContain("<HONNEN_SYUNYU_GK>900000</HONNEN_SYUNYU_GK>");
    expect(xml).toContain("<SISYUTU_SGK>500000</SISYUTU_SGK>");
    expect(xml).toContain("<YOKUNEN_KKS_GK>500000</YOKUNEN_KKS_GK>");
    expect(xml).toContain("<KOJIN_KIFU_GK>200000</KOJIN_KIFU_GK>");
    expect(xml).toContain("<KIFU_SKEI_GK>200000</KIFU_SKEI_GK>");
    expect(xml).toContain("<KIFU_GKEI_GK>200000</KIFU_GKEI_GK>");
  });

  it("serializes null values as empty elements", () => {
    const summary: SummaryData = {
      syunyuSgk: 0,
      zennenKksGk: 0,
      honnenSyunyuGk: 0,
      sisyutuSgk: 0,
      yokunenKksGk: 0,
      kojinFutanKgk: null,
      kojinFutanSu: null,
      kojinKifuGk: 0,
      kojinKifuBikou: null,
      tokuteiKifuGk: null,
      tokuteiKifuBikou: null,
      hojinKifuGk: null,
      hojinKifuBikou: null,
      seijiKifuGk: null,
      seijiKifuBikou: null,
      kifuSkeiGk: 0,
      kifuSkeiBikou: null,
      atusenGk: null,
      atusenBikou: null,
      tokumeiKifuGk: null,
      tokumeiBikou: null,
      kifuGkeiGk: 0,
      kifuGkeiBikou: null,
    };

    const xmlBuilder = serializeSummarySection(summary);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<KOJIN_FUTAN_KGK/>");
    expect(xml).toContain("<KOJIN_FUTAN_SU/>");
    expect(xml).toContain("<KOJIN_KIFU_BIKOU/>");
    expect(xml).toContain("<TOKUTEI_KIFU_GK/>");
    expect(xml).toContain("<TOKUTEI_KIFU_BIKOU/>");
    expect(xml).toContain("<HOJIN_KIFU_GK/>");
    expect(xml).toContain("<HOJIN_KIFU_BIKOU/>");
    expect(xml).toContain("<SEIJI_KIFU_GK/>");
    expect(xml).toContain("<SEIJI_KIFU_BIKOU/>");
    expect(xml).toContain("<KIFU_SKEI_BIKOU/>");
    expect(xml).toContain("<ATUSEN_GK/>");
    expect(xml).toContain("<ATUSEN_BIKOU/>");
    expect(xml).toContain("<TOKUMEI_KIFU_GK/>");
    expect(xml).toContain("<TOKUMEI_KIFU_BIKOU/>");
    expect(xml).toContain("<KIFU_GKEI_BIKOU/>");
  });

  it("serializes all optional fields with values", () => {
    const summary: SummaryData = {
      syunyuSgk: 2000000,
      zennenKksGk: 500000,
      honnenSyunyuGk: 1500000,
      sisyutuSgk: 800000,
      yokunenKksGk: 1200000,
      kojinFutanKgk: 50000,
      kojinFutanSu: 10,
      kojinKifuGk: 300000,
      kojinKifuBikou: "個人寄附備考",
      tokuteiKifuGk: 100000,
      tokuteiKifuBikou: "特定寄附備考",
      hojinKifuGk: 200000,
      hojinKifuBikou: "法人寄附備考",
      seijiKifuGk: 150000,
      seijiKifuBikou: "政治団体寄附備考",
      kifuSkeiGk: 750000,
      kifuSkeiBikou: "寄附小計備考",
      atusenGk: 80000,
      atusenBikou: "あっせん備考",
      tokumeiKifuGk: 70000,
      tokumeiBikou: "政党匿名寄附備考",
      kifuGkeiGk: 900000,
      kifuGkeiBikou: "寄附合計備考",
    };

    const xmlBuilder = serializeSummarySection(summary);
    const xml = xmlBuilder.toString();

    // 党費
    expect(xml).toContain("<KOJIN_FUTAN_KGK>50000</KOJIN_FUTAN_KGK>");
    expect(xml).toContain("<KOJIN_FUTAN_SU>10</KOJIN_FUTAN_SU>");

    // 個人寄附
    expect(xml).toContain("<KOJIN_KIFU_GK>300000</KOJIN_KIFU_GK>");
    expect(xml).toContain("<KOJIN_KIFU_BIKOU>個人寄附備考</KOJIN_KIFU_BIKOU>");

    // 特定寄附
    expect(xml).toContain("<TOKUTEI_KIFU_GK>100000</TOKUTEI_KIFU_GK>");
    expect(xml).toContain("<TOKUTEI_KIFU_BIKOU>特定寄附備考</TOKUTEI_KIFU_BIKOU>");

    // 法人寄附
    expect(xml).toContain("<HOJIN_KIFU_GK>200000</HOJIN_KIFU_GK>");
    expect(xml).toContain("<HOJIN_KIFU_BIKOU>法人寄附備考</HOJIN_KIFU_BIKOU>");

    // 政治団体寄附
    expect(xml).toContain("<SEIJI_KIFU_GK>150000</SEIJI_KIFU_GK>");
    expect(xml).toContain("<SEIJI_KIFU_BIKOU>政治団体寄附備考</SEIJI_KIFU_BIKOU>");

    // 寄附小計
    expect(xml).toContain("<KIFU_SKEI_GK>750000</KIFU_SKEI_GK>");
    expect(xml).toContain("<KIFU_SKEI_BIKOU>寄附小計備考</KIFU_SKEI_BIKOU>");

    // あっせん
    expect(xml).toContain("<ATUSEN_GK>80000</ATUSEN_GK>");
    expect(xml).toContain("<ATUSEN_BIKOU>あっせん備考</ATUSEN_BIKOU>");

    // 政党匿名寄附
    expect(xml).toContain("<TOKUMEI_KIFU_GK>70000</TOKUMEI_KIFU_GK>");
    expect(xml).toContain("<TOKUMEI_KIFU_BIKOU>政党匿名寄附備考</TOKUMEI_KIFU_BIKOU>");

    // 寄附合計
    expect(xml).toContain("<KIFU_GKEI_GK>900000</KIFU_GKEI_GK>");
    expect(xml).toContain("<KIFU_GKEI_BIKOU>寄附合計備考</KIFU_GKEI_BIKOU>");
  });

  it("serializes zero amounts correctly", () => {
    const summary: SummaryData = {
      syunyuSgk: 0,
      zennenKksGk: 0,
      honnenSyunyuGk: 0,
      sisyutuSgk: 0,
      yokunenKksGk: 0,
      kojinFutanKgk: null,
      kojinFutanSu: null,
      kojinKifuGk: 0,
      kojinKifuBikou: null,
      tokuteiKifuGk: null,
      tokuteiKifuBikou: null,
      hojinKifuGk: null,
      hojinKifuBikou: null,
      seijiKifuGk: null,
      seijiKifuBikou: null,
      kifuSkeiGk: 0,
      kifuSkeiBikou: null,
      atusenGk: null,
      atusenBikou: null,
      tokumeiKifuGk: null,
      tokumeiBikou: null,
      kifuGkeiGk: 0,
      kifuGkeiBikou: null,
    };

    const xmlBuilder = serializeSummarySection(summary);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<SYUNYU_SGK>0</SYUNYU_SGK>");
    expect(xml).toContain("<ZENNEN_KKS_GK>0</ZENNEN_KKS_GK>");
    expect(xml).toContain("<HONNEN_SYUNYU_GK>0</HONNEN_SYUNYU_GK>");
    expect(xml).toContain("<SISYUTU_SGK>0</SISYUTU_SGK>");
    expect(xml).toContain("<YOKUNEN_KKS_GK>0</YOKUNEN_KKS_GK>");
    expect(xml).toContain("<KOJIN_KIFU_GK>0</KOJIN_KIFU_GK>");
    expect(xml).toContain("<KIFU_SKEI_GK>0</KIFU_SKEI_GK>");
    expect(xml).toContain("<KIFU_GKEI_GK>0</KIFU_GKEI_GK>");
  });
});
