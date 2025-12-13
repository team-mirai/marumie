import { MfCsvLoader } from "@/server/contexts/data-import/infrastructure/mf/mf-csv-loader";
import { bufferToString } from "@/server/contexts/data-import/domain/services/encoding-converter";
import * as fs from "fs";
import * as path from "path";

describe("bufferToString (encoding-converter)", () => {
  let loader: MfCsvLoader;

  beforeEach(() => {
    loader = new MfCsvLoader();
  });

  describe("EncodingConverter + MfCsvLoader", () => {
    it("should handle Shift-JIS encoded CSV file", async () => {
      // テスト用のサンプルファイルを使用
      const csvPath = path.join(__dirname, "../../../../../data/sample-shift-jis.csv");

      const buffer = fs.readFileSync(csvPath);
      const csvString = bufferToString(buffer);

      const result = await loader.load(csvString);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check that the first record has proper Japanese text (not garbled)
      const firstRecord = result[0];
      expect(firstRecord.transaction_no).toBeTruthy();
      expect(firstRecord.transaction_date).toBeTruthy();
      expect(firstRecord.debit_account).toBeTruthy();

      // Check that Japanese characters are properly decoded
      expect(firstRecord.debit_account).not.toContain("�"); // No replacement characters
      expect(firstRecord.credit_account).not.toContain("�");
    });
  });
});
