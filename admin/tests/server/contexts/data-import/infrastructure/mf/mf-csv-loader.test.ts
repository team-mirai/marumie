import { MfCsvFormatError } from "@/server/contexts/data-import/domain/errors/mf-csv-format-error";
import { MfCsvLoader } from "@/server/contexts/data-import/infrastructure/mf/mf-csv-loader";

describe("MfCsvLoader", () => {
  let loader: MfCsvLoader;

  beforeEach(() => {
    loader = new MfCsvLoader();
  });

  describe("load", () => {
    it("should return empty array for empty CSV content", async () => {
      const result = await loader.load("");
      expect(result).toEqual([]);
    });

    it("should parse CSV content with headers", async () => {
      const csvContent = `取引No,取引日,借方勘定科目,借方補助科目,借方税区,借方部門,借方金額(円),借方税額,貸方勘定科目,貸方補助科目,貸方税区,貸方部門,貸方金額(円),貸方税額,摘要,起訖タグ,MF仕訳タイプ,決算整理仕訳,作成日時,作成者,最終更新日時,最終更新
1,2025/6/6,普通預金,【公人】テスト銀行本店普通12345,対象外,,1500000,0,寄附金,,対象外,,1500000,0,拠出 テスト太郎,テスト太郎,,,,,,`;

      const result = await loader.load(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        transaction_no: "1",
        transaction_date: "2025/6/6",
        debit_account: "普通預金",
        debit_sub_account: "【公人】テスト銀行本店普通12345",
        debit_department: "",
        debit_partner: "",
        debit_tax_category: "対象外",
        debit_invoice: "",
        debit_amount: "1500000",
        credit_account: "寄附金",
        credit_sub_account: "",
        credit_department: "",
        credit_partner: "",
        credit_tax_category: "対象外",
        credit_invoice: "",
        credit_amount: "1500000",
        description: "拠出 テスト太郎",
        friendly_category: "テスト太郎",
        memo: "",
      });
    });

    it("should handle multiple records", async () => {
      const csvContent = `取引No,取引日,借方勘定科目,借方補助科目,借方税区,借方部門,借方金額(円),借方税額,貸方勘定科目,貸方補助科目,貸方税区,貸方部門,貸方金額(円),貸方税額,摘要,起訖タグ,MF仕訳タイプ,決算整理仕訳,作成日時,作成者,最終更新日時,最終更新
1,2025/6/6,普通預金,【公人】テスト銀行本店普通12345,対象外,,1500000,0,寄附金,,対象外,,1500000,0,拠出 テスト太郎,テスト太郎,,,,,,
2,2025/6/7,事務費,備品購入,対象外,,50000,0,普通預金,【公人】テスト銀行本店普通12345,対象外,,50000,0,事務用品購入,備品,,,,,,`;

      const result = await loader.load(csvContent);

      expect(result).toHaveLength(2);
      expect(result[0].transaction_no).toBe("1");
      expect(result[1].transaction_no).toBe("2");
    });

    describe("欄の中に改行を含むCSV", () => {
      const header =
        "取引No,取引日,借方勘定科目,借方補助科目,借方税区,借方部門,借方金額(円),借方税額,貸方勘定科目,貸方補助科目,貸方税区,貸方部門,貸方金額(円),貸方税額,摘要,起訖タグ,メモ";

      it("引用符内の改行で1件が複数行に割れず、各列が正しく入る", async () => {
        const csvContent = [
          header,
          '1,2025/6/6,事務費,,対象外,,5000,0,普通預金,,対象外,,5000,0,"文具購入\n（ボールペン）",備品,"メモ1\nメモ2"',
          "2,2025/6/7,事務費,,対象外,,3000,0,普通預金,,対象外,,3000,0,切手購入,通信費,",
        ].join("\n");

        const result = await loader.load(csvContent);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          transaction_no: "1",
          transaction_date: "2025/6/6",
          debit_account: "事務費",
          debit_amount: "5000",
          credit_account: "普通預金",
          credit_amount: "5000",
          description: "文具購入\n（ボールペン）",
          friendly_category: "備品",
          memo: "メモ1\nメモ2",
        });
        expect(result[1]).toMatchObject({
          transaction_no: "2",
          description: "切手購入",
          friendly_category: "通信費",
          memo: "",
        });
      });

      it("CRLF 改行と \"\" のエスケープを含むCSVを読める", async () => {
        const csvContent = [
          header,
          '1,2025/6/6,事務費,,対象外,,5000,0,普通預金,,対象外,,5000,0,"""特急"" 便\r\n送料",備品,メモ',
          "2,2025/6/7,事務費,,対象外,,3000,0,普通預金,,対象外,,3000,0,切手購入,通信費,メモ2",
        ].join("\r\n");

        const result = await loader.load(csvContent);

        expect(result).toHaveLength(2);
        expect(result[0].description).toBe('"特急" 便\r\n送料');
        expect(result[0].friendly_category).toBe("備品");
        expect(result[0].memo).toBe("メモ");
        expect(result[1].memo).toBe("メモ2");
      });
    });

    it("should handle malformed CSV gracefully", async () => {
      const csvContent = "invalid,csv,content";

      await expect(loader.load(csvContent)).rejects.toThrow(MfCsvFormatError);
    });

    it("should handle CSV with missing columns", async () => {
      const csvContent = `取引No,取引日
1,2025/6/6`;

      const result = await loader.load(csvContent);
      expect(result).toHaveLength(1);
      expect(result[0].transaction_no).toBe("1");
      expect(result[0].transaction_date).toBe("2025/6/6");
    });
  });
});
